var WrightInventoryUtil = Class.create();
WrightInventoryUtil.prototype = {
    initialize: function() {
    },

    type: 'WrightInventoryUtil'
};

/* 
    * Copy of sn_itam_common.InventoryUtil.getTotalTransferInstockForDistributionChannel
	* Edited to include substitute model logic
	* global.ProcSourceRequestManager().getRequestItemsForWorkspace was edited to use this function
	* Returns a count of total assets of a given model available for TO
    * and taking into consideration distribution channel and location coverage
*/
WrightInventoryUtil.getTotalTransferInstockForDistributionChannel = function(model, userLocation, excludeStockroom) {
	var gr = new GlideAggregate('alm_asset');
	var counter = 0;
	global.AssetUtils.addAssetQuery(gr, global.AssetUtils.ASSET_FUNCTION_FEATURE.SOURCING);
	//Edited line below for substitute model logic
	gr.addQuery('model.sys_id', 'IN', new global.WrightHAMSourcingLogic().getModelSubstitutes(model));
	gr.addQuery('install_status', global.AssetUtils.INSTOCK_STATUS);
	gr.addQuery('substatus', global.AssetUtils.AVAILABLE_SUBSTATUS);
	var inboundStockRooms;
	//This excludeStockroom is the destination stockroom && is not null if request is of type HAM Stock order.
	if (!gs.nil(excludeStockroom)) {
		inboundStockRooms = Object.keys(sn_itam_common.InventoryUtil.getStockroomsServicingBaseStockroom(excludeStockroom));
		gr.addQuery('stockroom', 'IN', inboundStockRooms);
		gr.addQuery('stockroom', 'NOT IN', excludeStockroom);
	}
	else {
	if(!gs.nil(userLocation) && !gs.nil(userLocation.sys_id)) {
		var stockroomsServingLoc = new sn_itam_common.InventoryUtil()._getStockroomsServicingLocation(userLocation.sys_id);
		var userLocationSockrooms = sn_itam_common.InventoryUtil.getStockroomsBasedOnLocation(userLocation.sys_id);
		if(!gs.nil(userLocationSockrooms))
			stockroomsServingLoc.push.apply(stockroomsServingLoc, userLocationSockrooms);
		inboundStockRooms = Object.keys(sn_itam_common.InventoryUtil.getStockroomsServicingLocationCoverageStockrooms(stockroomsServingLoc));
		if(inboundStockRooms.length > 0)
			gr.addQuery('stockroom', 'IN', inboundStockRooms);
		else
			return counter;
		gr.addQuery('stockroom', 'NOT IN', stockroomsServingLoc);
		gr.addQuery('stockroom.location', 'NOT IN', userLocation.sys_id);
	}
	}
	gr.addAggregate('SUM', 'quantity');
	//Commented out line below for substitute model logic
	//gr.groupBy('model');
	gr.query();
	if (gr.next()) {
		counter = parseInt(gr.getAggregate('SUM', 'quantity'));
	}
	return counter;
};