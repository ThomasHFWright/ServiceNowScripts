var ProcSourceRequestManager = Class.create();
ProcSourceRequestManager.C_STOCK_ORDER_SYS_ID = '4109aa5fdb22001015a8ffefbf961984';
ProcSourceRequestManager.prototype = {

    initialize: function(request) {
        this.request = request;
        this.isSAMEnabled = GlidePluginManager.isActive('com.snc.software_asset_management');
        this.isSAMPActive = GlidePluginManager.isActive('com.snc.samp');
        this.isSAMSActive = GlidePluginManager.isActive('com.snc.sams');
        this.isHAMPActive = GlidePluginManager.isActive('com.sn_hamp');
        this.isEAMActive = GlidePluginManager.isActive('com.sn_eam');
        this.isPhyAssetActive = GlidePluginManager.isActive('com.sn_phy_assets');
        this.isServiceLocationActive = this.isPhyAssetActive && (new TableUtils('sn_itam_common_m2m_stockroom_location').tableExists())
            && sn_itam_common.InventoryUtil && sn_itam_common.InventoryUtil.prototype._getStockroomsServicingLocation;
        this.isDistributionChannelActive = this.isPhyAssetActive && (new TableUtils('sn_itam_common_m2m_stockroom_channel').tableExists());
        this.errorsInRequest = 0;
        // Order combinations Arrays
        this.LOTOPO_ARR = ['local', 'transfer', 'purchase'];
        this.LOTO_ARR = ['local', 'transfer'];
        this.TOPO_ARR = ['transfer', 'purchase'];

        this.tablePropertyMap = {};
        this.tablePropertyMap['sys_user'] = {
            property: 'com.snc.procurement.sourcing.sys_user.searchField',
            defaultValue: 'name'
        };
        this.tablePropertyMap['alm_stockroom'] = {
            property: 'com.snc.procurement.sourcing.alm_stockroom.searchField',
            defaultValue: 'name'
        };
        this.tablePropertyMap['cmdb_ci'] = {
            property: 'com.snc.procurement.sourcing.cmdb_ci.searchField',
            defaultValue: 'name'
        };
        this.tablePropertyMap['samp_sw_metric_group'] = {
            property: 'com.snc.procurement.sourcing.samp_sw_metric_group.searchField',
            defaultValue: 'name'
        };
        this.allowLocalStockroomInTO = false;
        if (gs.getProperty('glide.asset.procurement.sourcing.local_stock_transfer') === 'true') {
            this.allowLocalStockroomInTO = true;
        }
    },

    _isSAMEnabled: function() {
        return this.isSAMEnabled == 'true' || this.isSAMEnabled == true;
    },

    getAllStockRoom: function() {
        var stockrooms = this._getRecordObject('alm_stockroom',
            [],
            ['sys_id', 'name', 'quantity']);
        return (new JSON()).encode(stockrooms);
    },

    getVendorsForModelForWorkspace: function(modelId) {
        return this._getVendors(modelId);
    },


    getRequestItemsForWorkspace: function(scReqSysid, scReqTaskSysid) {
        var reqItems = JSON.parse(this.getRequestItemsInternal(scReqSysid, scReqTaskSysid));
        var request = {};
        var procSourceRequestManager = new global.ProcSourceRequestManager();
        reqItems.forEach(function(reqItem) {
            var gr = new GlideRecord('sys_attachment');
            gr.addQuery('table_name', 'ZZ_YY' + reqItem.cat_item.sys_class_name);
            gr.addQuery('file_name', 'picture');
            gr.addQuery('table_sys_id', reqItem.cat_item.sys_id);
            gr.query();
            if (gr.hasNext()) {
                gr.next();
                reqItem.cat_item.picture = gr.getValue('sys_id') + '.iix';
            }
            if(procSourceRequestManager.isDistributionChannelActive && sn_itam_common.InventoryUtil.getDistributionChannelUserPreference() === 'true') {
                //This is the check for HAM/EAM stock order request, where excludeStockroom is the destination stockroom and is not empty
                var excludeStockroom;
                if((GlidePluginManager.isActive('com.sn_hamp') && sn_hamp.StockOrderUtils.isStockOrderItem(reqItem.cat_item.sys_id))
                || (GlidePluginManager.isActive('com.sn_eam') && sn_eam.StockOrderUtils.isStockOrderItem(reqItem.cat_item.sys_id))) {
                    excludeStockroom = reqItem.dest_stockroom.value;
                }
                var transferTotal = sn_itam_common.InventoryUtil.getTotalTransferInstockForDistributionChannel(reqItem.cat_item.model, reqItem.requested_user.location, excludeStockroom);
                reqItem['transfer_instock'] = reqItem['local_instock'] + transferTotal;
                if (!procSourceRequestManager.allowLocalStockroomInTO) {
                    reqItem['transfer_instock'] = transferTotal;
                }
                var userLocationStockrooms = sn_itam_common.InventoryUtil.getStockroomsBasedOnLocation(reqItem.requested_user.location.sys_id);
                var userLocationServicingStockrooms = sn_itam_common.InventoryUtil.getDestinationStockroomsServicingUserLocation(reqItem.requested_user.location.sys_id, userLocationStockrooms);
                reqItem.defaultServicableStockrooms = userLocationServicingStockrooms;
            }
        });

        reqItems = this.transformToWSCompatibleInput(reqItems);
        request.request_items = reqItems;
        var pluginsStatus = {
			'isSAMEnabled' : this.isSAMEnabled,
            'isSAMPEnabled' : this.isSAMPActive,
            'isDistributionChannelActive' : this.isDistributionChannelActive
		};
        //To set state variable to be used for user prefernces in Distribution Channel
        if(this.isDistributionChannelActive && sn_itam_common.InventoryUtil.getDistributionChannelUserPreference() === 'true') {
            request.considerDistributionChannel = true;
        }
        else {
            request.considerDistributionChannel = false;
        }
        var messages = {
            'CANNOT_ASSIGN_MORE_THAN_AVAILABLE_RIGHTS': gs.getMessage('Cannot assign more than available rights'),
            'DUPLICATE_ENTITLEMENT': gs.getMessage('Duplicate entitlement'),
            'PROVIDE_QUANTITY_MORE_THAN_ZERO': gs.getMessage('Provide quantity more than zero'),
            'REQUEST_ITEMS_SOURCED': gs.getMessage('Congratulations! All assets for this request have been successfully sourced. Please refer to the request record for more information.'),
            'RIGHTS_CANNOT_BE_MORE_THAN_AVAILABLE': gs.getMessage('Rights cannot be more than available'),
            'SELECT_DESTINATION_STOCKROOM': gs.getMessage('Select destination stockroom'),
            'SELECT_DEVICE_TO_COMPLETE_ALLOCATION': gs.getMessage('Select the device to complete device allocation'),
            'SELECT_DEVICE_TO_COMPLETE_ASSIGNMENT': gs.getMessage('Select the device to complete device assignment'),
            'SELECT_ENTITLEMENT': gs.getMessage('Select entitlement'),
            'SELECT_LICENSE': gs.getMessage('Select license'),
            'SELECT_LICENSE_METRIC': gs.getMessage('Select license metric'),
            'SELECT_METRIC_GROUP': gs.getMessage('Select metric group'),
            'SELECT_RESERVED_FOR': gs.getMessage('Select reserved for'),
            'SELECT_SOURCE_STOCKROOM': gs.getMessage('Select source stockroom'),
            'SELECT_TYPE': gs.getMessage('Select type'),
            'SELECT_USER_TO_COMPLETE_ALLOCATION': gs.getMessage('Select the user to complete user allocation'),
            'SELECT_USER_TO_COMPLETE_ASSIGNMENT': gs.getMessage('Select the user to complete user assignment'),
            'SELECT_VENDOR': gs.getMessage('Select vendor'),
            'SOURCE_QUANITY_MORE_THAN_INSTOCK': gs.getMessage('Source quantity cannot be more than instock'),
            'SOURCED_RIGHTS_EXCEED_AVAILABLE_RIGHTS': gs.getMessage('Sourced rights across requests for an item cannot exceed the available rights'),
            'TOTAL_QUANTITY_SOURCE_STOCKROOM_EXCEED_INSTOCK': gs.getMessage('Total source quantity of all orders for selected source stockroom exceeded in-stock quantity'),
            'TOTAL_QUANTITY_EXCEED_TO_BE_SOURCED_QUANTITY': gs.getMessage('Total quantity of all orders for selected request item exceeds the quantity to be sourced'),
            'TOTAL_RIGHTS_EXCEED_AVAILABLE_RIGHTS': gs.getMessage('Total rights of all assignments for selected license exceeded available rights'),
            'UNABLE_TO_COMPLETE_OPERATION': gs.getMessage('Unable to complete operation, review errors below'),

            // Messages for button tooltips
            'localstock_TOOLTIP': gs.getMessage('Click this button to create stock order'),
            'transfer_TOOLTIP': gs.getMessage('Click this button to create transfer order'),
            'sampurchase_TOOLTIP': gs.getMessage('Click this button to create purchase order'),
            'purchase_TOOLTIP': gs.getMessage('Click this button to create purchase order'),
            'allocation_TOOLTIP': gs.getMessage('Click this button to create allocation'),
            'samassignment_TOOLTIP': gs.getMessage('Click this button to create assignment'),
            'assignment_TOOLTIP': gs.getMessage('Click this button to create assignment'),
        };
		
		request.pluginsStatus = pluginsStatus;
		request.messages = messages;
        return JSON.stringify(request);
    },

    transformToWSCompatibleInput: function(reqItems) {
        var rItemsForWs = [];

        reqItems.forEach(function(ritm) {
            var showCard = ritm.showCard;
            var cards = [];

            if (ritm.item_model_type != 'software') {
                if (showCard.local) {
                    cards.push({
                        cardLabel: gs.getMessage('Local stock'),
                        cardValue: ritm.local_instock,
                        buttonLabel: gs.getMessage('Consume'),
                        selectable: ritm.local_instock > 0,
                        buttonClickValue: 'localstock'
                    });
                }

                if (showCard.transfer) {
                    cards.push({
                        cardLabel: gs.getMessage('Transferable stock'),
                        cardValue: ritm.transfer_instock,
                        buttonLabel: gs.getMessage('Transfer'),
                        selectable: ritm.transfer_instock > 0,
                        buttonClickValue: 'transfer'
                    });

                }

                if (showCard.purchase) {
                    cards.push({
                        cardLabel: gs.getMessage('Vendor purchase'),
                        cardValue: ritm.remain_quantity,
                        buttonLabel: gs.getMessage('Purchase'),
                        selectable: ritm.hasVendors,
                        buttonClickValue: 'purchase'
                    });
                }
            } else {
				var hasTotalRights = false;
				if (ritm.total_rights > 0) {
					hasTotalRights = true;
				}
				if (this.isSAMPActive) {
					cards.push({
                        cardLabel: gs.getMessage('Available rights'),
                        cardValue: ritm.total_rights,
                        buttonLabel: gs.getMessage('Allocate'),
                        selectable: hasTotalRights,
                        buttonClickValue: 'allocation'
                    });
				}
				else {
					if (this.isSAMEnabled){
						cards.push({
							cardLabel: gs.getMessage('Available rights'),
							cardValue: ritm.total_rights,
							buttonLabel: gs.getMessage('Assign'),
							selectable: hasTotalRights,
							buttonClickValue: 'samassignment'
						});
					} else {
						cards.push({
							cardLabel: gs.getMessage('Available rights'),
							cardValue: ritm.total_rights,
							buttonLabel: gs.getMessage('Assign'),
							selectable: hasTotalRights,
							buttonClickValue: 'assignment'
						});
					}
				}
                if (showCard.purchase) {
					if (this.isSAMSActive) {
						cards.push({
							cardLabel: gs.getMessage('Vendor purchase'),
							cardValue: ritm.remain_quantity,
							buttonLabel: gs.getMessage('Purchase'),
							selectable: ritm.hasVendors,
							buttonClickValue: 'sampurchase'
						});
					} else {
						cards.push({
							cardLabel: gs.getMessage('Vendor purchase'),
							cardValue: ritm.remain_quantity,
							buttonLabel: gs.getMessage('Purchase'),
							selectable: ritm.hasVendors,
							buttonClickValue: 'purchase'
						});
					}
                    
                }
            }

			ritm.cards = cards;
        }, this);

		return reqItems;
    },

    getRequestItemsInternal: function(scReqSysid, scReqTaskSysid) {
        var reqItems = this._getRequestData(scReqSysid, scReqTaskSysid);

        //add support for EAM Items
        var EAMreqItems = [];
        if (this.isEAMActive && sn_eam.EAMProcSourceRequestManager &&
            sn_eam.EAMProcSourceRequestManager.prototype._EAMgetRequestData) {
            var eamProcSourceRequestManager = new sn_eam.EAMProcSourceRequestManager();
            EAMreqItems = eamProcSourceRequestManager._EAMgetRequestData(scReqSysid);
            reqItems = reqItems.concat(EAMreqItems);
            if (reqItems.length > 0) {
                return JSON.stringify(reqItems);
            }
        }

        var HAMreqItems = [];
        if (this.isHAMPActive && sn_hamp.HAMProcSourceRequestManager &&
            sn_hamp.HAMProcSourceRequestManager.prototype._HAMgetRequestData) {
            var hamProcSourceRequestManager = new sn_hamp.HAMProcSourceRequestManager();
            HAMreqItems = hamProcSourceRequestManager._HAMgetRequestData(scReqSysid);
            reqItems = reqItems.concat(HAMreqItems);
        }
        return JSON.stringify(reqItems);
    },

    getSCRequestItems: function() {
        var scReqSysid = this.request.getParameter('sysparm_scReq');
        var scReqTaskSysid = this.request.getParameter('sysparm_scReqTask');
        return this.getRequestItemsInternal(scReqSysid, scReqTaskSysid);
    },

    _getRequestData: function(scReqSysid, scReqTaskSysid) {
        var reqItems = this._getRecordObject('sc_req_item',
            [{
                    key: 'request',
                    value: scReqSysid
                },
                {
                    key: 'sourced',
                    value: 'false'
                },
                [{
                    key: 'cat_item.model',
                    value: 'null',
                    operator: '!='
                }]
            ],
            ['sys_id', 'number', 'quantity', 'quantity_sourced', 'request', 'price', 'state', 'received', 'sourced', 'requested_for'], {
                'cat_item': {
                    table: 'sc_cat_item',
                    fields: ['sys_class_name', 'cost', 'sys_id', 'model', 'name', 'category']
                },
                'request': {
                    table: 'sc_request',
                    fields: ['sys_id', 'requested_for']
                }
            });
        for (var i = 0; i < reqItems.length; i++) {
            var item = reqItems[i];
            this._setInitialUIProperties(item);
            item['remain_quantity'] = parseInt(item.quantity) - parseInt(item.quantity_sourced);
            item.cat_item.displayName = item.cat_item.name;

            this._populateUserInfo(item);

            if (item.cat_item.model) {
                if (this.isEAMActive){
                    var modelGr = new GlideRecord(global.AssetManagementConstants.MODEL_CLASSES.PRODUCT_MODEL);
                    modelGr.get(item.cat_item.model);
                    if(modelGr.ref_sn_ent_model.model_type == sn_eam.EAMConstants.MODEL_TYPE.USERASSEMBLED){
                        item.showCard.purchase = false;
                    }
                }
                this._getSourceableData(item, '');
            }

            if (item.showCard.local &&
                this._getLocation(item)) {
                this._populateLocalOrderInfo(item);
            }
        }
        return reqItems;
    },

    _populateUserInfo: function(item) {
        var requestedFor = item.requested_for || item.request.requested_for;
        item.requested_user = {};
        if (!gs.nil(requestedFor)) {
            var userColumns = ['sys_id', 'name', 'location'];
            userColumns.push(item.userSearchField);
            var userInfo = this._getRecordObject('sys_user',
                [{
                    key: 'sys_id',
                    value: requestedFor
                }],
                userColumns,{
                    'location':{
                        table:'cmn_location',
                        fields:['name']
                    }
                });
            item.requested_user = userInfo.length === 1 ? userInfo[0] : {};
        }
        return item;
    },

    _getSourceableData: function(item, excludeStockroom) {
        item['item_model_type'] = this._getItemModelType(item.cat_item.model);
        /* Get aggregated count to enable/disable Add TO/PO/ASGN actions */
        item['hasVendors'] = (new AssetUtils()).hasVendors(item.cat_item.model);
        if (item.item_model_type == 'software') {
            if (this.isSAMPActive) {
                item.total_rights = this._getAvailableRightsInSAMP(item.cat_item.model);
            } else if (this._isSAMEnabled() && this._isCounterRan(this.request.getParameter('sysparm_model'))) {
                item.total_rights = (new SoftwareItemProcessor()).getValuation(item.cat_item.model);
            } else {
                item.total_rights = this._getAvailableRights(item.cat_item.model);
            }
        } else {
            item['total_instock'] = this._getTotalInstockForModel(item.cat_item.model, excludeStockroom);
            item['local_instock'] = this._getLocalInstockForModel(item, excludeStockroom);
            item['transfer_instock'] = item['total_instock'];
            if (!this.allowLocalStockroomInTO) {
                item['transfer_instock'] -= item['local_instock'];
            }
        }
        return item;
    },


    _populateLocalOrderInfo: function(item) {
        var defaultUser = {};
        defaultUser.displayValue = item.requested_user[item.userSearchField];
        defaultUser.value = item.requested_user.sys_id;
        item.userDefault.local = JSON.stringify(defaultUser);
        var assetGr = this._getAssetForLocalDefaultStockroom(item.cat_item.model, item.sourceExclude.local, this._getLocation(item));
        if (!gs.nil(assetGr)) {
            var sourceStockroom = {};
            sourceStockroom['name'] = assetGr.stockroom.name + '';
            sourceStockroom['sys_id'] = assetGr.stockroom + '';
            sourceStockroom['instock'] = assetGr.getAggregate('SUM', 'quantity');
            // Auto-populate Source Stockroom for Local Order
            item.sourceDefault.local = JSON.stringify(sourceStockroom);
        }
        // Auto-populate Destination Stockroom for Transfer Order
        var destStockroom = this._findInDestStockroomList(item.destQualifier.transfer, this._getLocation(item), item.stockroomSearchField);
        if (!gs.nil(destStockroom)) {
            item.destDefault.transfer = destStockroom;
        }
        // Auto-populate Destination Stockroom for Purchase Order
        if (!gs.nil(destStockroom) && item.destQualifier.transfer === item.destQualifier.purchase) {
            item.destDefault.purchase = destStockroom;
        } else {
            destStockroom = this._findInDestStockroomList(item.destQualifier.purchase, this._getLocation(item), item.stockroomSearchField);
            if (!gs.nil(destStockroom)) {
                item.destDefault.purchase = destStockroom;
            }
        }
        return item;
    },

    _setInitialUIProperties: function(item) {
        // All UI cards should be visible by default
        item.showCard = this._setObjectDefaultValue(true, this.LOTOPO_ARR);

        // Source stockroom and Vendor should be editable by default
        item.sourceReadOnly = this._setObjectDefaultValue(false, this.LOTO_ARR);
        item.vendorReadOnly = this._setObjectDefaultValue(false, ['purchase']);

        // Input for source stockroom is Object/JSON
        item.sourceDefault = this._setObjectDefaultValue(JSON.stringify({}), this.LOTO_ARR);

        // All stockrooms shouild be available for sourcing
        item.sourceExclude = this._setObjectDefaultValue('', this.LOTO_ARR);

        // User and destination stockroom should be editable by default
        item.userReadOnly = this._setObjectDefaultValue(false, ['local']);
        item.destReadOnly = this._setObjectDefaultValue(false, this.TOPO_ARR);

        // Input for user and destination stockroom is Object/JSON
        item.userDefault = this._setObjectDefaultValue(JSON.stringify({}), ['local']);
        item.destDefault = this._setObjectDefaultValue(JSON.stringify({}), this.TOPO_ARR);

        // Only avtive users should be selected
        item.userQualifier = this._setObjectDefaultValue('active=true', ['local']);
        // Any stockroom can be selected as destination by default
        item.destQualifier = this._setObjectDefaultValue('', this.TOPO_ARR);

        // Default search field for stockroom is 'name'
        item.stockroomSearchField = this._getSerachField('alm_stockroom');
        // Default search field for user is 'name'
        item.userSearchField = this._getSerachField('sys_user');
        // Default search field for device is 'name'
        item.deviceSearchField = this._getSerachField('cmdb_ci');
        // Default search field for metric_group is 'name'
        item.metricGroupSearchField = this._getSerachField('samp_sw_metric_group');
    },

    _getSerachField: function(table) {
        var propertyValue = AssetUtils.getAssetProperty(this.tablePropertyMap[table].property, this.tablePropertyMap[table].defaultValue);
        var gr = new GlideRecord(table);
        if (gr.isValidField(propertyValue)) {
            return propertyValue;
        } else {
            return this.tablePropertyMap[table].defaultValue;
        }
    },

    _setObjectDefaultValue: function(defaultValue, keys, obj) {
        var variableObj = obj || {};
        keys.forEach(function(key) {
            variableObj[key] = defaultValue;
        });
        return variableObj;
    },

    _getAvailableRights: function(model, license) {
        var totalLicenses = 0;
        var allocatedLicenses = 0;
        var availableLicenses = 0;
        var licenseGr = new GlideAggregate('alm_license');
        licenseGr.addQuery('model', model);
        licenseGr.addQuery("install_status", "1"); /* Only consider in-use license */
        if (license)
            licenseGr.addQuery('sys_id', license);
        licenseGr.addAggregate('SUM', 'rights');
        licenseGr.groupBy('model');
        licenseGr.query();

        if (licenseGr.next()) {
            totalLicenses = licenseGr.getAggregate('SUM', 'rights');
        }

        var entitlementGr = new GlideAggregate('alm_entitlement');
        entitlementGr.addQuery('licensed_by.model', model);
        entitlementGr.addQuery("licensed_by.install_status", "1"); /* Only consider in-use license */
        if (license)
            entitlementGr.addQuery('licensed_by', license);
        entitlementGr.addAggregate('COUNT');
        entitlementGr.query();

        if (entitlementGr.next()) {
            allocatedLicenses = entitlementGr.getAggregate('COUNT');
        }

        return (totalLicenses - allocatedLicenses);
    },

    _getAvailableRightsInSAMP: function(swModel) {
        var rightsGr = new GlideAggregate('alm_license');
        rightsGr.addQuery('model', swModel);
        rightsGr.addQuery('install_status', '1'); // Consider only In use license
        rightsGr.addQuery('product_type', '!=', 'maintenance'); // Exclude maintenance entitlements
        rightsGr.addAggregate('SUM', 'allocations_available');
        rightsGr.setGroup(false);
        rightsGr.query();
        rightsGr.next();
        return Number(rightsGr.getAggregate('SUM', 'allocations_available'));
    },

    /* Decide type of item (software/hardware) based on requested item's model*/
    _getItemModelType: function(model) {
        var type = '';
        if (model) {
            var modelGr = new GlideRecord('cmdb_model');
            modelGr.get(model);
            if (modelGr.instanceOf('cmdb_hardware_product_model')) {
                type = 'hardware';
            } else if (modelGr.instanceOf('cmdb_software_product_model')) {
                type = 'software';
            }
        }
        return type;
    },

    getSourceStockRoomForItem: function() {
        var model = this.request.getParameter('sysparm_model');
        var stockrooms = [];
        var gr2 = new GlideAggregate("alm_asset");
        global.AssetUtils.addAssetQuery(gr2, global.AssetUtils.ASSET_FUNCTION_FEATURE.SOURCING);
        if (model)
            gr2.addQuery("model", model);
        gr2.addQuery("install_status", "6");
        gr2.addQuery("substatus", "available");
        gr2.groupBy("stockroom");
        gr2.query();
        while (gr2.next()) {
            var stockroom = {};
            stockroom.name = gr2.stockroom.name + '';
            stockroom.sys_id = gr2.stockroom.sys_id + '';
            stockrooms.push(stockroom);
        }
        return (new JSON()).encode(stockrooms);
    },

    _getTotalInstockForModel: function(model, excludeStockroom) {
        var gr = new GlideAggregate('alm_asset');
        var counter = 0;
        global.AssetUtils.addAssetQuery(gr, global.AssetUtils.ASSET_FUNCTION_FEATURE.SOURCING);
        gr.addQuery('model', 'IN', new global.WrightHAMSourcingLogic() .getModelSubstitutes(model));
        gr.addQuery('install_status', global.AssetUtils.INSTOCK_STATUS);
        gr.addQuery('substatus', global.AssetUtils.AVAILABLE_SUBSTATUS);
        //Stock order exclude stock in requested stockroom
        if (!gs.nil(excludeStockroom))
            gr.addQuery('stockroom', 'NOT IN', excludeStockroom);
        gr.addAggregate('SUM', 'quantity');
        //gr.groupBy('model');
        gr.query();
        if (gr.next()) {
            counter = parseInt(gr.getAggregate('SUM', 'quantity'));
        }
        return counter;
    },

     /* 
     * Returns array of Location SysIds
     * Contains the requested user's location and all its parents
     */
	_getAllParentLocations: function(userLocation) {
		var gr = GlideRecord('cmn_location');
		var parentLocations = [];
		var locId = userLocation;
		while(locId) {
			gr.get(locId);
			if(gr.isValidRecord()) {
				parentLocations.push(gr.sys_id.toString());
				locId = gr.parent;
			} else {
				break;
			}
		}
		return parentLocations;
	},

     /* 
     * Returns array of Stockroom SysIds
     * Contains all the stockrooms that support given user location
	 * Support is defined in sn_itam_common_m2m_stockroom_location table
	 * Excludes all the Stockrooms that have active=false for
	 * the location or any of its parents.
     */
	_getStockroomsServicingLocation: function(userLocation) {
		var parentLocations = this._getAllParentLocations(userLocation);
		//Get all stockrooms that have any of the parent locations supported
		var stockroomGr = new GlideAggregate("sn_itam_common_m2m_stockroom_location");
		stockroomGr.addQuery('location', 'IN', parentLocations);
		stockroomGr.addQuery('active', true);
		stockroomGr.groupBy('stockroom');
		stockroomGr.query();
		var stockroomsServingLoc = [];
		while(stockroomGr.next()) {
			stockroomsServingLoc.push(stockroomGr.getValue("stockroom"));
		}
		//Remove all those stockrooms where any of the parent location is active false
		stockroomGr.initialize();
		stockroomGr.addQuery('location', 'IN', parentLocations);
		stockroomGr.addQuery('active', false);
		stockroomGr.groupBy('stockroom');
		stockroomGr.query();
		while(stockroomGr.next()) {
			var index = stockroomsServingLoc.indexOf(stockroomGr.getValue("stockroom"));
			if (index > -1) {
			stockroomsServingLoc.splice(index, 1);
			}
		}
		return stockroomsServingLoc;
	},

    /* 
     * Returns count of available assets of a model
     * present in stockrooms of requested user's location.
     * 
     * Returns 0, if it is stock order or 
     *requested user's location is empty.
     */
    _getLocalInstockForModel: function(item, excludeStockroom) {
        if (!item.showCard.local ||
            !this._getLocation(item)) {
            return 0;
        }
        var count = 0;
        var gr = new GlideAggregate('alm_asset');
        global.AssetUtils.addAssetQuery(gr, global.AssetUtils.ASSET_FUNCTION_FEATURE.SOURCING);
        gr.addQuery('model', 'IN', new global.WrightHAMSourcingLogic() .getModelSubstitutes(item.cat_item.model));
        gr.addQuery('install_status', global.AssetUtils.INSTOCK_STATUS);
        gr.addQuery('substatus', global.AssetUtils.AVAILABLE_SUBSTATUS);
        if (!gs.nil(excludeStockroom))
            gr.addQuery('stockroom', 'NOT IN', excludeStockroom);
        var stockroomQc = gr.addQuery('stockroom.location', this._getLocation(item));
        if(this.isServiceLocationActive) {
            //Consider all the stockrooms for Consume Local that service user's location
            var inventoryUtil = new sn_itam_common.InventoryUtil();
            var stockroomsServingLoc = inventoryUtil._getStockroomsServicingLocation(this._getLocation(item));
			if (!gs.nil(stockroomsServingLoc))
			stockroomQc.addOrCondition('stockroom', 'IN', stockroomsServingLoc);
		}
		
        gr.addAggregate('SUM', 'quantity');
        //gr.groupBy('model');
        gr.setOrder(false);
        gr.query();
        if (gr.next()) {
            count = parseInt(gr.getAggregate('SUM', 'quantity'));
        }
        return count;
    },

    _findInDestStockroomList: function(qualifier, location, displayColumn) {
        var destStockroom = {};
        var gr = new GlideRecord('alm_stockroom');
        if (!gs.nil(qualifier)) {
            gr.addEncodedQuery(qualifier);
        }
        gr.addQuery('location', location);
        gr.setLimit(2);
        gr.query();
        while (gr.next()) {
            if (!gr.hasNext()) {
                destStockroom['value'] = gr.getValue('sys_id');
                destStockroom['displayValue'] = gr.getDisplayValue(displayColumn);
                return JSON.stringify(destStockroom);
            }
            break;
        }
        return '';
    },

    _addSourceStockroomConditions: function(gr, model, excludeStockroom, userLocation, orderType, distributionChannel) {
        global.AssetUtils.addAssetQuery(gr, global.AssetUtils.ASSET_FUNCTION_FEATURE.SOURCING);
        gr.addQuery('model', 'IN', new global.WrightHAMSourcingLogic() .getModelSubstitutes(model));
        gr.addQuery('install_status', '6');
        gr.addQuery('substatus', 'available');
        if(orderType === 'transfer_order' && this.isDistributionChannelActive && !gs.nil(distributionChannel) && distributionChannel.length > 0) {
            gr.addQuery('stockroom', 'IN', distributionChannel);
        }
        if (!gs.nil(userLocation)) {
            if ('local_order' === String(orderType)) {
                var stockroomQc = gr.addQuery('stockroom.location', 'IN', userLocation);
                if(this.isServiceLocationActive) {
                    //Consider all stockrooms for Consume Local that service user's location
                    var inventoryUtil = new sn_itam_common.InventoryUtil();
                    var stockroomsServingLoc = inventoryUtil._getStockroomsServicingLocation(userLocation);
					if (!gs.nil(stockroomsServingLoc))
						stockroomQc.addOrCondition('stockroom', 'IN', stockroomsServingLoc);
				}
            } else {
                if (!this.allowLocalStockroomInTO) {
                    gr.addQuery('stockroom.location', 'NOT IN', userLocation);
                    //For HAM/EAM stock order flow - excludeStockroom is destination stockroom which is fixed
                    if(this.isServiceLocationActive && (gs.nil(excludeStockroom) || String(excludeStockroom) === '')) {
                        //Exclude all stockrooms that service user's location from TO
                        //since they will be cosidered for Consume local
                        var inventoryUtils = new sn_itam_common.InventoryUtil();
                        var excludeSRs = inventoryUtils._getStockroomsServicingLocation(userLocation);
						if (!gs.nil(excludeSRs))
							gr.addQuery('stockroom', 'NOT IN', excludeSRs);
					}
                }
            }
        }
        if (!gs.nil(excludeStockroom))
            gr.addQuery('stockroom', 'NOT IN', excludeStockroom);
        gr.addAggregate('SUM', 'quantity');
        gr.groupBy('stockroom');
    },

    _getAssetForLocalDefaultStockroom: function(model, excludeStockroom, userLocation) {
        var counter = 0;
        var gr = new GlideAggregate('alm_asset');
        this._addSourceStockroomConditions(gr, model, excludeStockroom, userLocation, 'local_order');
        gr.setLimit(2);
        gr.query();
        while (gr.next()) {
            if (!gr.hasNext()) {
                return gr;
            }
            break;
        }
        return '';
    },

    _getSourceStockroomWithQuantityForItem: function(model, excludeStockroom, userLocation, orderType, distributionChannelFlag) {
        var stockrooms = [];
        var considerDistributionChannel = this.isDistributionChannelActive && !gs.nil(distributionChannelFlag) && distributionChannelFlag;
        var distributionChannel = [];
        var channelStockroomsWithRank = {};
        if(considerDistributionChannel && orderType === 'transfer_order') {
            //To include channel of only excluded stockroom which is the destination for HAM/EAM stock order flow
            if(!gs.nil(excludeStockroom)) {
                channelStockroomsWithRank = sn_itam_common.InventoryUtil.getStockroomsServicingBaseStockroom(excludeStockroom);
                distributionChannel = Object.keys(channelStockroomsWithRank);
                if(distributionChannel.length === 0) {
                    return stockrooms;
                }
            }
            else {
            if(!gs.nil(userLocation)) {
                var userLocationStockrooms = sn_itam_common.InventoryUtil.getStockroomsBasedOnLocation(userLocation);
                if(!gs.nil(userLocationStockrooms) && userLocationStockrooms.length > 0) {
                    channelStockroomsWithRank = sn_itam_common.InventoryUtil.getStockroomsServicingBaseStockroom(userLocationStockrooms[0]);
                    distributionChannel = Object.keys(channelStockroomsWithRank);
                } else {
                    var stockroomsServingLoc = new sn_itam_common.InventoryUtil()._getStockroomsServicingLocation(userLocation);
                    if(stockroomsServingLoc.length > 0) {
                        channelStockroomsWithRank = sn_itam_common.InventoryUtil.getStockroomsServicingLocationCoverageStockrooms(stockroomsServingLoc);
                        distributionChannel = Object.keys(channelStockroomsWithRank);
                    }
                }
                if(distributionChannel.length === 0) {
                    return stockrooms;
                }
            }
        }
        }
        
        var counter = 0;
        var gr = new GlideAggregate('alm_asset');
        this._addSourceStockroomConditions(gr, model, excludeStockroom, userLocation, orderType, distributionChannel);
        gr.query();
        while (gr.next()) {
            var stockroom = {};
            stockroom['name'] = gr.stockroom.name + '';
            stockroom['sys_id'] = gr.stockroom + '';
            counter = gr.getAggregate('SUM', 'quantity');
            stockroom['instock'] = counter;
            if(considerDistributionChannel) {
                stockroom['rank'] = channelStockroomsWithRank[gr.stockroom.toString()];
            }
            stockrooms.push(stockroom);
        }
        if(considerDistributionChannel) {
            stockrooms.sort(function (x, y) {
                return x.rank - y.rank;
            });
        }
        return stockrooms;
    },

    getSourceStockroomWithQuantityForItemForWorkspace: function(ritmId, modelId, excludeStockroom, userLocation, orderType, distributionChannelFlag) {
        var stockrooms = [];
        if (modelId) {
            stockrooms = this._getSourceStockroomWithQuantityForItem(modelId, excludeStockroom, userLocation, orderType, distributionChannelFlag);
        }
        return stockrooms;
    },

    getSourceStockroomWithQuantityForItem: function() {
        var itemSysid = this.request.getParameter('sysparm_itemsysid');
        var modelSid = this.request.getParameter('sysparm_model');
        var excludeStockroom = this.request.getParameter('sysparm_excludeStockroom');
        var userLocation = this.request.getParameter('sysparm_userLocation');
        var orderType = this.request.getParameter('sysparm_orderType');
        var stockrooms = [];
        if (modelSid) {
            stockrooms = this._getSourceStockroomWithQuantityForItem(modelSid, excludeStockroom, userLocation, orderType);
        }
        return (new JSON()).encode(stockrooms);
    },

    getAvailableQuantity: function() {
        var data = {};
        var stockroom = this.request.getParameter('sysparm_stockroom');
        var model = this.request.getParameter('sysparm_model');
        data['quantity'] = (new AssetUtils()).getAvailableQuantity(model, stockroom);
        return (new JSON()).encode(data);
    },

    _getVendors: function(model) {
        var data = [];
        var vendorsStr = (new AssetUtils()).getVendors(model);
        if (vendorsStr) {
            var vendors = vendorsStr.split('^');
            var i = 1;
            while (i < vendors.length) {
                var vendor = {};
                vendor['name'] = vendors[i];
                /* Extract name and cost */
                var matches = vendors[i].match(/(.*)\((.*)\)/);
                if (matches.length > 2) {
                    vendor['display_name'] = matches[1];
                    vendor['cost'] = matches[2];
                }
                i++;
                vendor['outOfStock'] = vendors[i];
                i++;
                var records = vendors[i].split('|');
                if (records.length >= 2) {
                    vendor['vendorTable'] = records[0];
                    vendor['catItemSysid'] = records[1];
                }
                i++;
                data.push(vendor);
            }
        }
        return data;
    },

    findVendors: function() {
        var data = [];
        var model = this.request.getParameter('sysparm_model');
        gs.info('Model = ' + model);
        if (model) {
            data = this._getVendors(model);
        }
        return (new JSON()).encode(data);
    },

    _getLicensesInternal: function(modelSysId) {
        var validLicenses = [];
        if (modelSysId) {
            /* Get all 'InStock' licenses for the model */
            var licenses = this._getRecordObject('alm_license',
                [{
                    key: 'install_status',
                    value: 1
                }, {
                    key: 'model',
                    value: modelSysId
                }],
                ['sys_id', 'model', 'rights', 'license_key', 'asset_tag', 'display_name', 'install_state', 'substate', 'vendor']);
            /* Update actual available rights from entitlement */
            for (var i = 0; i < licenses.length; i++) {
                var license = this._getLicenseDetails(licenses[i]);
                var available = parseInt(license['available']);
                if (isNaN(available) || available == 0)
                    continue;
                validLicenses.push(license);
            }
        }
        return validLicenses;
    },

    getLicenses: function() {
         var validLicenses = [];
         var modelSysId = this.request.getParameter('sysparm_model');
         validLicenses = this._getLicensesInternal(modelSysId);
         return (new JSON()).encode(validLicenses);
    },

	getLicensesForWorkspace: function(modelSysId) {
        var validLicenses = [];
        validLicenses = this._getLicensesInternal(modelSysId);
        return validLicenses;
    },
	
    _getEntitlementsInternal: function(modelSysId) {
        var validLicenses = [];
        if (modelSysId) {
            // Get all licenses for the model with available allocations
            var licenses = this._getRecordObject('alm_license',
                [{
                    key: 'install_status',
                    value: 1
                }, {
                    key: 'model',
                    value: modelSysId
                }, {
                    key: 'allocations_available',
                    operator: '>',
                    value: 0
                }, {
                    key: 'product_type',
                    operator: '!=',
                    value: 'maintenance'
                }],
                ['sys_id', 'model', 'rights', 'license_key', 'asset_tag', 'display_name', 'install_state', 'substate', 'vendor', 'allocations_available'], {
                    'license_metric': {
                        table: 'samp_sw_license_metric',
                        fields: ['name', 'metric_group', 'entitlement_type']
                    }
                }
            );
            // Use the index 'available' for the allocations available (pre-calculated by field)
            for (var i = 0; i < licenses.length; i++) {
                licenses[i].name = licenses[i].display_name;
                licenses[i].available = licenses[i].allocations_available;
                validLicenses.push(licenses[i]);
            }
        }
        return validLicenses;
    },
    
    // Method used from SW Source request when SAMP is active
    getEntitlements: function() {
        var validLicenses = [];
        var modelSysId = this.request.getParameter('sysparm_model');
        validLicenses = this._getEntitlementsInternal(modelSysId);
        return (new JSON()).encode(validLicenses);
    },

    getEntitlementsForWorkspace: function(modelSysId) {
        var validLicenses = [];
        validLicenses = this._getEntitlementsInternal(modelSysId);
        return validLicenses;
    },

    // Method used from SW Source request when SAMP is active
    getLicenseMetrics: function() {
        // Retrieve all the existing license metrics grouped by license metric group
        var licenseMetrics = {};
        var metricGroups;
        var lmGr = new GlideRecord('samp_sw_license_metric');
        lmGr.orderBy('name');
        lmGr.query();
        while (lmGr.next()) {
            metricGroups = (lmGr.metric_group + '').split(',');
            for (var mg = 0; mg < metricGroups.length; mg++) {
                if (!licenseMetrics.hasOwnProperty(metricGroups[mg])) {
                    licenseMetrics[metricGroups[mg]] = [];
                }
                licenseMetrics[metricGroups[mg]].push({
                    name: lmGr.name + '',
                    value: lmGr.sys_id + ''
                });
            }

        }
        return (new JSON()).encode(licenseMetrics);
    },

    _getLicenseDetails: function(license) {
        var noOfRights = license.rights;
        var unalloCatedDetails;
        var allocatedLicenses = 0;

        license.name = license.display_name; /* UI Editable Select custom cmponent refern name */

        /*
         * If SAM is not installed or Model does not have a counter or Counter associated to a model is not ran
         * the unallocated rights is calculated based on the entitlements assigned and rights available
         */
        if (this._isSAMEnabled() && this._isCounterRan(license.model))
            license.unallocated = (new SoftwareItemProcessor()).getUnAllocatedDetails(license);
        /* Always have available rights ( total - no of entitlements ) */
        license.available = this._getAvailableRights(license.model, license.sys_id);
        return license;
    },

    /*
     * Method which checks if the counter assoicated to a model is ran or not.
     */

    _isCounterRan: function(modelId) {
        var counterGr = new GlideRecord('sam_sw_counter');
        counterGr.addQuery('model', modelId);
        counterGr.addQuery('cached', true);
        counterGr.query();

        if (counterGr.next()) {
            return true;
        }
        return false;
    },
	
	processRequestInternal: function(scReqSysid, scTaskSysid, data) {
		var orderCounts = {
            po_order: 0,
            to_order: 0,
            asgn_order: 0,
            lo_order: 0
        };
        if(this.isEAMActive){
			orderCounts.eam_lo_order = 0;
			orderCounts.eam_consumable = 0;
		}
        data = (new JSON()).decode(data);
        var response = this._validate(scReqSysid, scTaskSysid, data);
        if (response.status == 'success') {
            for (var i = 0; i < data.length; i++) {
                var consilidateOrders = data[i].consolidate_pos || false;
                var reqItem = data[i].req_item_sys_id;
                var model = data[i].model;
                /* Already sourced quantity */
                var sourcedQuantity = data[i].sourced_quantity;
                /* toal quantity requested */
                var quantity = data[i].quantity;
                var remainQuantity = data[i].remain_quantity;
                var updatedCount = 0;
                /* Process Local Orders */
                if (!gs.nil(data[i].local_orders) && data[i].local_orders.length > 0)
                    updatedCount += this._processLocalOrders(reqItem, model, quantity, sourcedQuantity, remainQuantity, data[i].local_orders, orderCounts);
                /* Process Transfer Orders */
                if (!gs.nil(data[i].transfer_orders) && data[i].transfer_orders.length > 0)
                    updatedCount += this._processTransferOrders(reqItem, model, quantity, sourcedQuantity, remainQuantity, data[i].transfer_orders, orderCounts);
                /* Handle Software License assignment/entitlement */
                if (!gs.nil(data[i].assignments) && data[i].assignments.length > 0)
                    updatedCount += this._processAssignments(data[i].assignments, scReqSysid, scTaskSysid, orderCounts);
                /* Handle Software License entitlements (SAMP) */
                if (!gs.nil(data[i].allocations) && data[i].allocations.length > 0)
                    updatedCount += this._processAllocations(data[i].allocations, scReqSysid, scTaskSysid, orderCounts);
                /* Process Purchase orders if any */
                if (!gs.nil(data[i].purchase_orders) && data[i].purchase_orders.length > 0) {
                    updatedCount += this._processPurchaseOrders(reqItem, model, quantity, sourcedQuantity, remainQuantity, data[i].purchase_orders, consilidateOrders, orderCounts);
                }
                // updating the item
                if (updatedCount > 0)
                    this._updateRequestItemForRemainQuantity(reqItem, model, updatedCount);
            }
            this._updateSCTaskStatus(scReqSysid, scTaskSysid);

            if (this.errorsInRequest) {
                response.status = 'error';
                response.error_messages = [];
                var em = gs.getErrorMessages();
                var errorsCount = em.size();
                if (errorsCount) {
                    for (var e = 0; e < errorsCount; e++) {
                        response.error_messages.push(em.get(e));
                    }
                    gs.flushMessages();
                } else {
                    response.error_messages.push(gs.getMessage('Errors encountered in the Source Request process, please check system log'));
                }
            } else {
                response.status = 'success';
                response.asgn_count = orderCounts.asgn_order;
            }
            response.sr_messages = this.sourceRequestMessages(orderCounts);
        }
        return (new JSON()).encode(response);
	},

    processRequest: function() {
        /* Service catalog task */
        var scTaskSysid = this.request.getParameter('sysparm_sc_task');
        /* Service catalog request */
        var scReqSysid = this.request.getParameter('sysparm_sc_req');
        var data = this.request.getParameter('sysparm_sourcedata');
        return this.processRequestInternal(scReqSysid, scTaskSysid, data);
    },
    sourceRequestMessages: function(orderCounts) {
        var statusMsg = '';
        var status = [];
        if (orderCounts.po_order > 0) {
            status.push(gs.getMessage('{0} Purchase Order Line(s)', String(orderCounts.po_order)));
        }
        if (orderCounts.to_order > 0) {
            status.push(gs.getMessage('{0} Transfer Order Line(s)', String(orderCounts.to_order)));
        }
        if (orderCounts.lo_order > 0) {
            status.push(gs.getMessage('{0} Consume Asset Task(s)', String(orderCounts.lo_order)));
        }
        if(this.isEAMActive){
			if (orderCounts.eam_lo_order > 0) {
				status.push(gs.getMessage('{0} Enterprise Confirm Asset Task(s)', String(orderCounts.eam_lo_order)));
			}
			if (orderCounts.eam_consumable > 0) {
				status.push(gs.getMessage('{0} Local Consumable reservation(s)', String(orderCounts.eam_consumable)));
			}
		}
        if (orderCounts.asgn_order > 0) {
            if (this.isSAMPActive) {
                status.push(gs.getMessage('{0} License Allocation(s)', String(orderCounts.asgn_order)));
            } else {
                status.push(gs.getMessage('{0} License Assignment(s)', String(orderCounts.asgn_order)));
            }
        }
        if (status.length == 1) {
            statusMsg = gs.getMessage('{0} created successfully.', status);
        } else if (status.length == 2) {
            statusMsg = gs.getMessage('{0} and {1} created successfully.', status);
        } else if (status.length == 3) {
            statusMsg = gs.getMessage('{0} , {1} and {2} created successfully.', status);
        } else if (status.length == 4) {
            statusMsg = gs.getMessage('{0} , {1}, {2} and {3} created successfully.', status);
        } else if (status.length == 5) {
            statusMsg = gs.getMessage('{0} , {1}, {2}, {3} and {4} created successfully.', status);
        }
        return statusMsg;
    },

    _validate: function(scReqSysid, scTaskSysid, submitedData) {
        /* Compare submitted data with current data from DB for any concurrent modification */
        var currentReqData = this._getRequestData(scReqSysid, scTaskSysid);

        for (var index = 0; index < currentReqData.length; index++) {
            var currentReqItem = currentReqData[index];
            var submittedRegItem = this._getRequestItem(currentReqItem.sys_id, submitedData);
            if (submittedRegItem) {
                /* Copy user created order lines */
                currentReqItem.local_orders = submittedRegItem.local_orders;
                currentReqItem.transfer_orders = submittedRegItem.transfer_orders;
                currentReqItem.purchase_orders = submittedRegItem.purchase_orders;
                currentReqItem.assignments = submittedRegItem.assignments;
                currentReqItem.allocations = submittedRegItem.allocations;
            } else {
                this.log('Unable to find request item with sys_id ' + currentReqItem.sys_id);
            }
        }
        var validator = new SourceRequestValidator(currentReqData);
        return validator.validate();
    },

    _getRequestItem: function(reqItemSysid, reqData) {
        for (var i = 0; i < reqData.length; i++) {
            if (reqData[i].req_item_sys_id == reqItemSysid)
                return reqData[i];
        }
    },

    _processLocalOrders: function(reqItemSysid, model, quantity, sourcedQuantity, remainQuantity, localOrders, orderCounts) {
        var assetUtils = new AssetUtils();
        var updatedCount = 0;
        var reqItemGr = new GlideRecord('sc_req_item');
		reqItemGr.get(reqItemSysid);
        for (var i = 0; i < localOrders.length; i++) {
            var from = localOrders[i].source.sys_id;
            var reservedUser = localOrders[i].reservedUser.value;
            /* Quantity to be sourced from the source stockroom */
            var sourceQuant = localOrders[i].sourceQuantity;
            if (!this.isValidLocalOrder(from, reservedUser, sourceQuant)) {
                this.log('Skipping invalid local order request. Source: ' + from + ' user:' + reservedUser + ' quantity:' + sourceQuant);
                continue;
            }
            var avail = 0;
            try {
                avail = new global.WrightHAMSourcingLogic() .getAvailableQuantity(model, from);
            } catch (e) {}
            var consumeAmount;
            if ((avail != 0) && (parseInt(sourceQuant) > 0) && (parseInt(sourceQuant) >= parseInt(avail)))
                consumeAmount = parseInt(avail);
            if ((avail != 0) && (parseInt(sourceQuant) > 0) && (parseInt(sourceQuant) < parseInt(avail)))
                consumeAmount = parseInt(sourceQuant);
            var modelGR = new GlideRecord('cmdb_model');
            modelGR.get(model);
            // checking to see if we are using an asset or a consumable
            if (assetUtils.getAssetOrConsumable(modelGR) == 'consumable') {
                if (this._createLocalLineTasks(from, reservedUser, consumeAmount, modelGR, reqItemSysid, true)) {
                    if (this.isEAMActive && this._isValidEAMLocalOrder(reqItemGr)) {
                        orderCounts.eam_consumable += 1;
                    }else{
                        orderCounts.lo_order += 1;
                    }
                    updatedCount += consumeAmount;
                }
            } else {
                for (var j = 0; j < consumeAmount; j++) {
                    if (this._createLocalLineTasks(from, reservedUser, 1, modelGR, reqItemSysid, false)) {
                        if (this.isEAMActive && this._isValidEAMLocalOrder(reqItemGr)) {
                            orderCounts.eam_lo_order += 1;
                        }else{
                            orderCounts.lo_order += 1;
                        }
                        updatedCount += 1;
                    }
                }
            }
        }
        return updatedCount;
    },

    _isValidEAMLocalOrder: function(reqItemGr){
        return !gs.nil(reqItemGr) && ( typeof(reqItemGr.variables.eam_sourcing) !== 'undefined' || typeof (reqItemGr.variables.sn_eam_process) !== 'undefined' || reqItemGr.cat_item.sys_class_name + '' === 'sn_eam_enterprise_cat_item');
    },

    isValidLocalOrder: function(source, user, quantity) {
        if (gs.nil(source) || gs.nil(user) || parseInt(quantity) <= 0)
            return false;
        else
            return true;
    },

    _processTransferOrders: function(reqItemSysid, model, quantity, sourcedQuantity, remainQuantity, transferOrders, orderCounts) {
        var assetUtils = new AssetUtils();
        var updatedCount = 0;
        for (var i = 0; i < transferOrders.length; i++) {
            var from = transferOrders[i].source.sys_id;
            var dest = transferOrders[i].destination.value;
            /* Quantity to be sourced from the source stockroom */
            var sourceQuant = transferOrders[i].sourceQuantity;
            if (!this.isValidTransferOrder(from, dest, sourceQuant)) {
                this.log('Skipping invalid transfer order request. Source: ' + from + ' dest:' + dest + ' quantity:' + sourceQuant);
                continue;
            }
            var avail = 0;
            try {
                avail = new global.WrightHAMSourcingLogic() .getAvailableQuantity(model, from);
            } catch (e) {}
            var transAmount;
            if ((avail != 0) && (parseInt(sourceQuant) > 0) && (parseInt(sourceQuant) >= parseInt(avail)))
                transAmount = parseInt(avail);
            if ((avail != 0) && (parseInt(sourceQuant) > 0) && (parseInt(sourceQuant) < parseInt(avail)))
                transAmount = parseInt(sourceQuant);
            //ToDo: Understand this piece of code
            /*if(transAmount > remain)
            var transAmount = parseInt(remain);
            }*/
            var modelGR = new GlideRecord('cmdb_model');
            modelGR.get(model);
            // checking to see if we are using an asset or a consumable
            if (assetUtils.getAssetOrConsumable(modelGR) == 'consumable') {
                if (this._createTransferLine(from, dest, transAmount, modelGR, reqItemSysid, true)) {
                    orderCounts.to_order += 1;
                    updatedCount += transAmount;
                }
            } else {
                // creating TOL for assets
                for (var j = 0; j < transAmount; j++) {
                    if (this._createTransferLine(from, dest, 1, modelGR, reqItemSysid, false)) {
                        orderCounts.to_order += 1;
                        updatedCount += 1;
                    }
                }
            }
        } // End of transfer lines
        return updatedCount;
    },

    _processPurchaseOrders: function(reqItemSysid, model, quantity, sourcedQuantity, remainQuantity, purchaseOrders, consolidateOrders, orderCounts) {
        var totalCount = 0;
        for (var i = 0; i < purchaseOrders.length; i++) {
            // making purchase order for the rest of left quantities
            //var vendor = eval("vendor_" + i).split('|');
            var vendorTable = purchaseOrders[i].vendor.vendorTable;
            var catItemId = purchaseOrders[i].vendor.catItemSysid;
            var destSysid = purchaseOrders[i].destination.value;
            var vendorId;
            var vendorPrice = 0;
            var listPrice = 0;
            var partNumber = '';
            var catItemRecord = new GlideRecord(vendorTable);

            var item = new GlideRecord("sc_req_item");
            item.get(reqItemSysid);

            catItemRecord.get('sys_id', catItemId);
            if (vendorTable == 'pc_vendor_cat_item' || vendorTable == 'sc_cat_item') {
                vendorId = catItemRecord.vendor;
                vendorPrice = catItemRecord.price;
                listPrice = catItemRecord.list_price;
                partNumber = catItemRecord.product_id;
            }

            // var qRemain = parseInt(item.quantity) - parseInt(item.quantity_sourced);
            // item.quantity_sourced = parseInt(qRemain) + parseInt(item.quantity_sourced);
            /* NewBehavior: create purchase order for user given quantity */
            var purchaseQuantity = Number(purchaseOrders[i].purchaseQuantity);
            //            item.quantity_sourced = purchaseQuantity + parseInt(item.quantity_sourced);
            //            if(parseInt(item.quantity_sourced) >= parseInt(item.quantity)) {
            //                // mark the item as sourced
            //                item.sourced = true;
            //                this.hasItemSourced = true;
            //            }
            //            item.update();
            /* update SC Task for remain quantity or sourced flag */
            //this._updateRequestItemForRemainQuantity(reqItemSysid, purchaseQuantity);
            totalCount += purchaseQuantity;
            var metricGroup;
            var licenseMetric;
            if (this.isSAMSActive && item.cat_item.model.sys_class_name == 'cmdb_software_product_model') {
                metricGroup = purchaseOrders[i].metric_group.value;
                licenseMetric = purchaseOrders[i].license_metric.value;
            }
            (new ProcurementUtils()).createPOLine('', item, purchaseQuantity, vendorId, consolidateOrders, destSysid, vendorPrice, listPrice, metricGroup, licenseMetric, partNumber, model);
            orderCounts.po_order++;
        }
        return totalCount;
    },

    _createTransferLine: function(fromSysid, destSysid, transAmount, modelGR, reqItemSysid, isConsumable) {
        var req = new GlideRecord('alm_transfer_order_line');
        req.from_stockroom = fromSysid;
        req.to_stockroom = destSysid;
        req.model = modelGR.sys_id;
        req.quantity_requested = transAmount;
        req.request_line = reqItemSysid;
        try {
            if (!isConsumable) {
                req.asset = new global.WrightHAMSourcingLogic() .getFirstItem(modelGR, fromSysid, global.AssetUtils.INSTOCK_STATUS,
                    global.AssetUtils.AVAILABLE_SUBSTATUS);
            }
            var sysId = req.insert();
            return true;
        } catch (err) {
            this.errorsInRequest++;
            gs.error(err);
            return false;
        }
    },

    _createLocalLineTasks: function(fromSysid, reservedUser, consumeAmount, modelGr, reqItemSysid, isConsumable) {
        var assetId;
        var assetGr;
        var consumableGr;
        var oldReservedFor;
        var flowInputs = {};
        var flowName;
        var isAssetReserved = false;
        try {
            flowInputs.requested_item = this._getRecordFromId('sc_req_item', reqItemSysid);
            flowInputs.reserved_for = this._getRecordFromId('sys_user', reservedUser);
            flowInputs.stockroom = this._getRecordFromId('alm_stockroom', fromSysid);
            if (!isConsumable) {
                assetId = new global.WrightHAMSourcingLogic() .getFirstItem(modelGr, fromSysid, global.AssetUtils.INSTOCK_STATUS,
                    global.AssetUtils.AVAILABLE_SUBSTATUS);
                assetGr = this._getRecordFromId('alm_asset', assetId);
                oldReservedFor = assetGr.getValue('reserved_for');
                assetGr.setValue('install_status', global.AssetUtils.INSTOCK_STATUS);
                assetGr.setValue('substatus', global.AssetUtils.RESERVED_SUBSTATUS);
                assetGr.setValue('reserved_for', reservedUser);
                if (assetGr.update()) {
                    isAssetReserved = true;
                }
            } else {
                consumableGr = global.ProcurementUtils.getConsumble(modelGr, flowInputs.stockroom, global.AssetUtils.INSTOCK_STATUS,
                    global.AssetUtils.AVAILABLE_SUBSTATUS, consumeAmount);
                assetId = new Consumables().split(consumableGr.sys_id, consumeAmount, global.AssetUtils.INSTOCK_STATUS,
                    global.AssetUtils.RESERVED_SUBSTATUS, '', consumableGr.stockroom, consumableGr.location, '');
                if (assetId) {
                    isAssetReserved = true;
                }
                assetGr = global.ProcurementUtils.getConsumble(modelGr, flowInputs.stockroom, global.AssetUtils.INSTOCK_STATUS,
                    global.AssetUtils.RESERVED_SUBSTATUS, consumeAmount);
            }

            // if eam plugin is active and reqItem is associated with EAM WO CAT Item then skip Asset local Order subflow and trigger enterprise local order subflow
			if(this.isEAMActive && sn_eam.EAMSourcingAutomationAPI && sn_eam.EAMSourcingAutomationAPI.triggerLocalorder ){	
				
				var contextId = sn_eam.EAMSourcingAutomationAPI.triggerLocalorder(assetGr , consumeAmount ,reqItemSysid , reservedUser ,fromSysid , isConsumable);		
				if(!gs.nil(contextId))
					return true;
			}

			flowInputs.asset = assetGr;
			flowInputs.quantity = consumeAmount;
			flowName = this._getFlowDecision(flowInputs);
			sn_fd.FlowAPI.startSubflow(flowName, flowInputs);

            return true;
        } catch (err) {
            this.errorsInRequest++;
            if (isAssetReserved) {
                this._revertAssetChanges(assetGr, oldReservedFor, modelGr, flowInputs.stockroom, consumeAmount, isConsumable);
            }
            gs.error(err);
            return false;
        }
    },

    _getRecordFromId: function(table, sysId) {
        var gr = new GlideRecord(table);
        if (gr.get(sysId)) {
            return gr;
        }
        throw gs.getMessage('Record with sys_id {0} not found in {1}', [sysId, table]);
    },

    _getFlowDecision: function(flowInputs) {
        var defaultFlow = 'global.asset_local_order';
        var DECISION_ID = 'fb6220090f321010967863cda8767edf';
        var dtAPI = new sn_dt.DecisionTableAPI();
        var inputs = new Object();
        inputs.asset = flowInputs.asset.sys_id;
        inputs.requested_item = flowInputs.requested_item.sys_id;
        inputs.requested_for = flowInputs.reserved_for.sys_id;
        inputs.model = flowInputs.asset.model.sys_id;
        inputs.stockroom = flowInputs.stockroom.sys_id;
        var response;
        try {
            response = dtAPI.getDecision(DECISION_ID, inputs);
            if (gs.nil(response)) {
                defaultFlow = '';
            } else {
            defaultFlow = response.sys_scope.scope + '.' + response.internal_name;
            }
        } catch (err) {
            gs.error(err);
        }
        if (gs.nil(defaultFlow)) {
            throw gs.getMessage('Answer does not exist for Asset Local Order Subflow decision table');
        } else if (!global.AssetUtils.isFlowPresent(defaultFlow.split('.')[1])) {
            throw gs.getMessage('The subflow named: {0} does not exist',
                [defaultFlow.split('.')[1]]);
        }
        return defaultFlow;
    },

    _revertAssetChanges: function(asset, reservedFor, model, stockroom, consumeAmount, isConsumable) {
        var assetGr;
        var consumableId;
        var consumableGr;
        if (!isConsumable) {
            assetGr = this._getRecordFromId('alm_asset', asset.sys_id);
            assetGr.setValue('install_status', global.AssetUtils.INSTOCK_STATUS);
            assetGr.setValue('substatus', AssetUtils.AVAILABLE_SUBSTATUS);
            assetGr.setValue('reserved_for', reservedFor);
            assetGr.update();
        } else {
            consumableGr = global.ProcurementUtils.getConsumble(model, stockroom, global.AssetUtils.INSTOCK_STATUS,
                global.AssetUtils.RESERVED_SUBSTATUS, consumeAmount);
            consumableId = new Consumables().split(consumableGr.sys_id, consumeAmount, global.AssetUtils.INSTOCK_STATUS,
                global.AssetUtils.AVAILABLE_SUBSTATUS, '', consumableGr.stockroom, consumableGr.location, '');
        }
    },

    /*Update request item record with remaining quantity or completed sourced */
    _updateRequestItemForRemainQuantity: function(reqItemSysid, model, transAmount) {
        var item = new GlideRecord("sc_req_item");
        item.get(reqItemSysid);
        // item.quantity = item.quantity - transAmount;
        if (this.isEAMActive && sn_eam.EAMProcSourceRequestManager &&
            sn_eam.EAMProcSourceRequestManager.prototype._EAMupdateRequestItemForRemainQuantity &&
            (typeof(item.variables.sn_eam_asset_process) !== 'undefined') && item.variables.sn_eam_asset_process) {
            var eamProcSourceRequestManager = new sn_eam.EAMProcSourceRequestManager();
            eamProcSourceRequestManager._EAMupdateRequestItemForRemainQuantity(item, model, transAmount);
        } else if (this.isHAMPActive && sn_hamp.HAMProcSourceRequestManager &&
            sn_hamp.HAMProcSourceRequestManager.prototype._HAMupdateRequestItemForRemainQuantity &&
            (typeof(item.variables.sn_hamp_hw_asset_process) !== 'undefined') && item.variables.sn_hamp_hw_asset_process) {
            var hamProcSourceRequestManager = new sn_hamp.HAMProcSourceRequestManager();
            hamProcSourceRequestManager._HAMupdateRequestItemForRemainQuantity(item, model, transAmount);
        } else {
            item.quantity_sourced = parseInt(transAmount) + parseInt(item.quantity_sourced);
            var qRemain = parseInt(item.quantity) - parseInt(item.quantity_sourced);
            if (qRemain <= 0) {
                item.sourced = true;
            }
        }
        item.update();
    },

    _updateSCTaskStatus: function(scReqSysid, taskSysid) {
        if (this._hasAllItemsSourced(scReqSysid)) {
            var task = new GlideRecord("sc_task");
            task.get(taskSysid);
            task.setValue("state", 3);
            task.update();
        }
    },

    _hasAllItemsSourced: function(scReqSysid) {
        var hasUnsourced = false;
        var rq = new GlideRecord('sc_req_item');
        rq.addQuery('request', scReqSysid);
        rq.addQuery('sourced', 'false');

        if (this.isEAMActive && sn_eam.EAMProcSourceRequestManager &&
            sn_eam.EAMProcSourceRequestManager.prototype._addEAMRITMFilter &&
            (typeof(rq.variables.sn_eam_asset_process) !== 'undefined') && rq.variables.sn_eam_asset_process) {
            var eamProcSourceRequestManager = new sn_eam.EAMProcSourceRequestManager();
            eamProcSourceRequestManager._addEAMRITMFilter(rq);
        } else if (this.isHAMPActive && sn_hamp.HAMProcSourceRequestManager &&
            sn_hamp.HAMProcSourceRequestManager.prototype._addHAMRITMFilter) {
            var hamProcSourceRequestManager = new sn_hamp.HAMProcSourceRequestManager();
            hamProcSourceRequestManager._addHAMRITMFilter(rq);
        } else {
            rq.addNotNullQuery('cat_item.model');
        }
        //Ignore Closed Complete, Closed Incomplete and Closed Skipped records
        rq.addEncodedQuery('stateNOT IN3,4,7');
        rq.setLimit(1);
        rq.query();
        hasUnsourced = rq.getRowCount() > 0;
        return !hasUnsourced;
    },

    isValidTransferOrder: function(source, dest, quantity) {
        if (gs.nil(source) || gs.nil(dest) || parseInt(quantity) <= 0)
            return false;
        else
            return true;
    },

    _getRecordObject: function(table, queryParams, fields, refMap, orderBy) {
        var records = [];
        var gr = new GlideRecord(table);
        if (table === "sc_req_item") {
            gr.addEncodedQuery("stateNOT IN3,4,7");
        }
        if (queryParams) {
            for (var n = 0; n < queryParams.length; n++) {
                var qp = queryParams[n];
                if (Array.isArray(qp)) {
                    var q1 = gr.addQuery(qp[0].key, qp[0].operator, qp[0].value);
                    q1.addOrCondition(qp[1].key, qp[1].operator, qp[1].value);
                } else {
                    if (qp.operator)
                        gr.addQuery(qp.key, qp.operator, qp.value);
                    else
                        gr.addQuery(qp.key, qp.value);
                }
            }
        }
        if (orderBy)
            gr.orderBy(orderBy);
        gr.query();
        while (gr.next()) {
            var rec = {};
            if (table === 'sc_req_item' && !gs.nil(gr.variables.location)) {
                rec['requested_location'] = gr.variables.location.sys_id.toString();
                rec['requested_location_name'] = gr.variables.location.name.toString();
            }
            var glideElements = gr.getFields();
            rec['sys_id'] = gr.sys_id.toString();
            for (var i = 0; i < glideElements.size(); i++) {
                var glideElement = glideElements.get(i);
                //gs.info('Processing ' + glideElement.getName() + ' - ' + glideElement.getDisplayValue());
                if (!gs.nil(glideElement.toString()) && /* if no fields given then consider all otherwise consider specific */
                    (fields.length == 0 || (fields.length > 0 && fields.indexOf(glideElement.getName()) >= 0))) {
                    rec[glideElement.getName()] = glideElement.toString();
                }
                if (refMap && !gs.nil(refMap[glideElement.getName()])) {
                    var refDetails = refMap[glideElement.getName()];
                    var refSysid = glideElement.toString();
                    var refObjs = this._getRecordObject(refDetails.table, [{
                        key: 'sys_id',
                        value: refSysid
                    }], refDetails.fields);
                    if (!gs.nil(refObjs) && refObjs.length > 0) {
                        rec[glideElement.getName()] = refObjs[0];
                    }
                }
            }
            records.push(rec);
        }
        return records;
    },

    _processAllocations: function(assignments, scReqSysid, scTaskSysid, orderCounts) {
        var totalAsgnCount = 0;
        for (var i = 0; i < assignments.length; i++) {
            var assignment = assignments[i];
            var sysId = this._createAssignment(assignment, scReqSysid, scTaskSysid);
            if (gs.nil(sysId)) {
                this.log('ERROR: Unexpecting error encounter while inserting entitlement ' + JSON.stringify(assignment));
                this.errorsInRequest++;
            } else {
                totalAsgnCount += (Number)(assignment.quantity); //Increase by quantity
                orderCounts.asgn_order++;
            }
        }
        return totalAsgnCount;
    },

    _processAssignments: function(assignments, scReqSysid, scTaskSysid, orderCounts) {
        var totalAsgnCount = 0;
        for (var i = 0; i < assignments.length; i++) {
            var assignment = assignments[i];
            /* Add multiple assignments for given quantity */
            for (var count = 0; count < assignment.quantity; count++) {
                var sysId = this._createAssignment(assignment, scReqSysid, scTaskSysid);
                if (gs.nil(sysId)) {
                    this.log('ERROR: Unexpecting error encounter while inserting entitlement ' + JSON.stringify(assignment));
                    this.errorsInRequest++;
                } else {
                    totalAsgnCount++; //Increase by one, count only if the assignment gets created
                    orderCounts.asgn_order++;
                }
            }
        }
        return totalAsgnCount;
    },

    processAssignments: function(reqItemSysid, model, quantity, sourcedQuantity, remainQuantity, assignments, scReqSysid, scTaskSysid, orderCounts) {
        return this._processAssignments(assignments, scReqSysid, scTaskSysid, orderCounts);
    },

    /* Creates an assignment/entitlement record */
    _createAssignment: function(assignment, scReqSysid, scTaskSysid) {
        var gr;

        if (assignment.asgn_type.value == 'user') {
            gr = new GlideRecord('alm_entitlement_user');
            gr.setValue('assigned_to', assignment.user.value);
        } else if (assignment.asgn_type.value == 'device') {
            gr = new GlideRecord('alm_entitlement_asset');
            gr.setValue('allocated_to', assignment.device.value);
        }
        if (gr.isValid()) {
            gr.setValue('licensed_by', assignment.license.sys_id);
            if (this.isSAMPActive) {
                gr.setValue('metric_group', assignment.license.license_metric.metric_group);
                gr.setValue('license_metric', assignment.license.license_metric.sys_id);
                gr.setValue('quantity', assignment.quantity);
            }
            var sys_id = gr.insert();
            if (gs.nil(sys_id)) {
                this.log('ERROR: Unexpecting error encounter while inserting entitlement ' + JSON.stringify(assignment));
                this.errorsInRequest++;
                return;
            }
            this._auditLicensesAssigned(sys_id, assignment, scReqSysid, scTaskSysid);
            return sys_id;
        }
        return;
    },

    /* Keeps records of entitlement done*/
    _auditLicensesAssigned: function(almEntitlementSysid, assignment, scReqSysid, scTaskSysid) {
        var auditGR = new GlideRecord('alm_licenses_assigned');
        auditGR.initialize();
        auditGR.setValue('licensed_by', assignment.license.sys_id);
        auditGR.setValue('catalog_task', scTaskSysid);
        auditGR.setValue('request_no', scReqSysid);
        if (assignment.asgn_type.value == 'user')
            auditGR.setValue('assigned_to', assignment.user.value);
        else if (assignment.asgn_type.value == 'device')
            auditGR.setValue('allocated_to', assignment.device.value);
        auditGR.setValue('allocation', almEntitlementSysid);
        var sys_id = auditGR.insert();
        if (gs.nil(sys_id)) {
            this.log('ERROR: Unexpecting error encounter while auditing entitlement ' + JSON.stringify(assignment));
            this.errorsInRequest++;
            return;
        }
    },
	
    _processCounterRequestInternal: function(softwareModels) {
        var models = [];
        models = softwareModels.split(",");
        var samutil = new SAMUtil();
        samutil.beginCountersForModels(models);
    },
	
    _getLocation: function(item) {
        return item.requested_location ? item.requested_location : item.requested_user.location?item.requested_user.location.sys_id:'';
    },
    
	processCounterRequest: function() {
        var softwareModels = this.request.getParameter('sysparm_models');
        this._processCounterRequestInternal(softwareModels);
    },

	processCounterRequestForWorkspace: function(softwareModels) {
        this._processCounterRequestInternal(softwareModels);
    },

    log: function(msg) {
        gs.info('[ProcSourceRequestManager] ' + msg);
    },
    // This counter is used to validate there are errors in the system generated by this Script Include process
    errorsInRequest: 0,

    type: 'ProcSourceRequestManager'
};

/*
* Sets the user prefernce for Distribution Channel
*/
ProcSourceRequestManager.updateDistributionChannelUserPreference = function(distributionChannelFlag) {
	var userId = gs.getUserID();
	var userPrefGr = new GlideRecord('sys_user_preference');
	userPrefGr.addQuery('name','source_through_distribution_channel');
    userPrefGr.addQuery('user', userId);
	userPrefGr.query();
	if(userPrefGr.next()) {
		userPrefGr.value = String(distributionChannelFlag);
		userPrefGr.update();
	}
	else {
		new global.GlideQuery('sys_user_preference')
			.insert({ name: 'source_through_distribution_channel', user: userId, value : String(distributionChannelFlag) })
			.get();
	}
};