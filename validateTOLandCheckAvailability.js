var consumableStatus = undefined; // Using as part of FSM drop-off
var isDropOff = current.transfer_order.drop_off;

validateTOLandCheckAvailability();

function validateTOLandCheckAvailability() {
   if (!isValidChange())
      return;
   processChange();
}

function isValidChange() {
   if (current.stage != 'draft' && current.asset.changes()) {
      return false;
   }
   
   if (current.stage != 'draft') {
      // no change other than state change can be made after transfer order
      // left draft stage
      gs.addErrorMessage(gs.getMessage('Transfer order line definition cannot be changed in stage other than draft'));
      current.setAbortAction(true);
      return false;
   }
   
   if (current.quantity_requested <= 0) {
      gs.addErrorMessage(gs.getMessage('Transfer order line must request a quantity greater than 0'));
      current.setAbortAction(true);
      return false;
   }

   if (isDropOff && !current.asset.nil() && !(current.asset.substatus == 'available' || current.asset.substatus == 'defective')) {
        gs.addErrorMessage(gs.getMessage('Only available and defective parts are allowed to drop off'));
        current.setAbortAction(true);
        return false;
   }

   return true;
}

function processChange() {
   // determine source stockroom
   var fromStockroom = current.from_stockroom;
   if (!current.transfer_order.nil())
      fromStockroom = current.transfer_order.from_stockroom;
   
   // the substatus that we consider available is different for FSM returns
   var availableSubstatus = undefined;

   if (isDropOff)
      availableSubstatus = getAssetStatus(current);
   else
      availableSubstatus = new AssetUtils().determineAvailableStatus(current);
   
   var isRealAsset = (!current.asset.nil() && current.asset.sys_class_name != 'alm_consumable');
   if (isRealAsset)
      processRealAsset(fromStockroom, availableSubstatus);
   else {
      processConsumable(fromStockroom, availableSubstatus);
	  if(isDropOff)
        // as part of `processConsumable` we are clearing asset value - 
        // and to get the selected asset's status again with `updateConsumableUsed` we are reusing same the status we got before 
        consumableStatus = availableSubstatus; 
    }
   
   // only run for consumables
   if (current.stage == 'draft'  && (current.quantity_requested.changes() || current.model.changes() || current.operation() == 'insert')) {
      if (previous.model.sys_class_name == 'cmdb_consumable_product_model' || previous.model.asset_tracking_strategy == 'track_as_consumable') {
         releaseConsumable(previous.asset);
      }
      
      if (current.model.sys_class_name == 'cmdb_consumable_product_model' || current.model.asset_tracking_strategy == 'track_as_consumable')
         updateConsumableUsed();
      
   }
}

/*
 * Check quantity is in sync between asset and transfer order line Check
 * location, model and state are compatible between asset and transfer order
 * line
 */
function processRealAsset(fromStockroom, availableSubstatus) {
   var asset = current.asset;
   // Check for Insert and Stay on an Asset TOL
   if (asset.active_to == true && current.operation() == 'insert') {
      if(current.return_from_tol.nil()) {
         gs.addErrorMessage(gs.getMessage('You have attempted to add an asset already on an active transfer order line'));
         current.setAbortAction(true);
      } else {
         // Return tols are read-only and have no 'insert-and-stay' option.
         // The real asset associate with the rtol has already been managed
         // when it was added to the tol that the return is from.
         return;
      }
   }
   
   // ensure quantity requested follows asset quantity constraints
   if (parseInt(current.quantity_requested, 10) != parseInt(asset.quantity, 10))
      current.quantity_requested = asset.quantity;
   
   // last sanity check that asset is valid for this transfer
   // we should never enter one of those cases so I lump them together
   if (asset.model != current.model || asset.stockroom != fromStockroom ||
      asset.install_status != '6' || !(asset.substatus == availableSubstatus ||
   asset.substatus == 'pre_allocated' || asset.substatus == 'defective')) {
      // severe inconsistency, should never happen, abort action and log
      // details
      gs.print('Inventory Management - Severe inconsistency between asset [id ' +
      asset.sys_id + '] and transfer order line[id ' + current.sys_id + '], aborting action');
      gs.addErrorMessage(gs.getMessage('Severe inconsistency between asset and transfer order line'));
      current.setAbortAction(true);
   }
   
   if (current.asset.changes())
      releaseAsset(previous.asset);
}

function processConsumable(fromStockroom, availableSubstatus) {
   if (current.operation() == 'insert')
      current.asset = "";
   // check availability of consumable in desired stockroom
   // compute available quantity for the requested model ( = already attached
   // when applicable + still in stock)
   var availableQuantity = !current.asset.nil() ? parseInt(
   current.asset.quantity, 10) : 0;
   gs.log(fromStockroom);
   availableQuantity += parseInt(new Consumables().getMaxInState(
   current.model, fromStockroom, '6', availableSubstatus, ''), 10);
   
   if (availableQuantity < parseInt(current.quantity_requested, 10)) {
      // not enough stok in this stockroom
      gs.addErrorMessage(gs.getMessage('Not enough stock, maximum available in the selected stockroom is {0}', availableQuantity));
      current.setAbortAction(true);
   }
}

function updateConsumableUsed() {
   var quantity_requested_int = parseInt(current.quantity_requested,10);
   // the substatus that we consider available is different for FSM returns
   var availableSubstatus = undefined;

   if (isDropOff)
       availableSubstatus = consumableStatus;
   else
       availableSubstatus = new AssetUtils().determineAvailableStatus(current);

   if ('pending_transfer' != availableSubstatus) {
      var con = getConsumable(quantity_requested_int, availableSubstatus);
      if (con != '') {
         var consumable = new Consumables().split(con.sys_id,
         quantity_requested_int, '6', 'pending_transfer', '',
         con.stockroom, con.location, con.assigned_to);
         current.asset = consumable;
        }
      else {
            gs.addErrorMessage(gs.getMessage('Unable to find {0} stock with quantity {1}', availableSubstatus, quantity_requested_int));
            current.setAbortAction(true);
        }
   } else {
      // this path is only exercised when inserting a return tol consumable
      var asset = current.return_from_tol.asset;
      current.asset = new Consumables().split(asset, quantity_requested_int, '6',
      'pending_transfer', '', asset.stockroom,
      asset.location, asset.assigned_to);
   }
}

function releaseAsset(sysid) {
   var ci = new GlideRecord('alm_asset');
   ci.addQuery('sys_id', sysid);
   ci.query();
   
   if (ci.next()) {
      ci.install_status = '6';
      if (ci.substatus != "pre_allocated")
         ci.substatus = 'available';
      ci.active_to = false;
      ci.update();
   }
}

function releaseConsumable(sysid) {
   var ci = new GlideRecord('alm_consumable');
   ci.addQuery('sys_id', sysid);
   ci.query();
   
   if (ci.next()) {
      ci.install_status = '6';
      ci.substatus = 'available';
      ci.active_to = false;
      ci.update();
   }
}

function getConsumable(qty, availableSubstatus) {
   var con = new GlideRecord('alm_consumable');
   if (current.transfer_order.from_stockroom != "")
      con.addQuery('stockroom', current.transfer_order.from_stockroom);
   else
      con.addQuery('stockroom', current.from_stockroom);
   con.addQuery('quantity', '>=', qty);
   con.addQuery('model', current.model);
   con.addQuery('install_status', '6');
   con.addQuery('substatus', availableSubstatus);
   con.query();
   
   if (con.next())
      return con;
   else
      return '';
}

function getAssetStatus(tol) {
    var availableStatus = undefined;

    if (isDropOff) {
        availableStatus = 'available';
        if (!tol.asset.nil()) {
            availableStatus = tol.asset.substatus;
        }
    }
	
    return availableStatus;
}
