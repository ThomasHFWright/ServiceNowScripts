var HAMScanningUtils = Class.create();
HAMScanningUtils.prototype = {
    initialize: function() {
        this.STATUS_SUCCESSFUL_EXPECTED =            "Successful/Expected";
        this.STATUS_SUCCESSFUL_SWAPPED =             "Successful/Swapped";
        this.STATUS_FAIL_ASSET_NON_EXISTENT =        "Failed/No existing asset record";
        this.STATUS_FAIL_ASSET_INCORRECT_LIFECYCLE = "Failed/Invalid asset life cycle stage";
        this.STATUS_FAIL_ASSET_INCORRECT_MODEL =     "Failed/Invalid scanned model";
        this.STATUS_FAIL_ASSET_INCORRECT_STOCKROOM = "Failed/Invalid scanned asset stockroom";
        this.STATUS_FAIL_INVALID_ASSET =             "Failed/Invalid asset scanned";

        this.MESSAGE_SUCCESS_EXPECTED_ASSET_CLOSED_TASK =  "{0} was expected and {1} was closed.";
        this.MESSAGE_SUCCESS_ASSET_SWAPPED =               "{0} was swapped onto {1} and the task was closed.";
		this.MESSAGE_SUCCESS_ASSET_SWAPPED_OTHER_RECORD =  "{0} was swapped out of {4} and onto {1} and {1} was closed.";
        this.MESSAGE_SUCCESS_ALREADY_SCANNED_CLOSED_TASK = "{0} has already been scanned on closed task {1}.";
        this.MESSAGE_FAIL_NO_ACTIVE_TASK =                 "There are no further active Tasks of the correct type, unable perform any update with {0}.";
        this.MESSAGE_FAIL_ASSET_NON_EXISTENT =             "{0} does not match any serial number or asset tag in the system.";
        this.MESSAGE_FAIL_ASSET_INCORRECT_LIFECYCLE =      "{0} is not in life cycle stage Inventory/Available and cannot be swapped into this {2}.";
        this.MESSAGE_FAIL_ASSET_INCORRECT_MODEL =          "{0} does not match any model on this {2} and is not a substitute of any model, and cannot be swapped into this {2}.";
        this.MESSAGE_FAIL_ASSET_INCORRECT_STOCKROOM =      "{0} is not in the same Stockroom as this {3} and cannot be swapped.";
        this.MESSAGE_FAIL_TASK_FALLBACK =                  "Unable to find a valid Task to update for {0}.";
        this.MESSAGE_FAIL_ASSET_NOT_IN_PARENT_RECORD =     "{0} is not part of this {2}.";
		this.MESSAGE_FAIL_ASSET_MOVE_REQ_INCORRECT_STATE = "{0} is not in life cycle stage Inventory or is Reserved and cannot be included in a Move Request.";
		this.MESSAGE_FAIL_ASSET_MOVE_REQ_DUP_REQ =         "{0} is already part of another Move Request {1}.";
		this.MESSAGE_FAIL_ASSET_MOVE_REQ_WRONG_STOCKROOM = "{0} is in stock in {1} and cannot be transferred out of the Stockroom you selected.";
		this.MESSAGE_FAIL_ASSET_MOVE_REQ_NO_STOCKROOM    = "{0} is not in stock in any Stockroom.";
        this.MESSAGE_FAIL_INTERNAL_ERROR =                 "Internal error: missing mandatory script parameter(s).";
        this.MESSAGE_FAIL_MISSING_SCANNED_ASSET_ID =       "Unable to process empty scanned asset ID.";
		this.MESSAGE_FAIL_NO_ASSETS_SCANNED =       	   "You must scan at least one asset. If you manually typed a serial number make sure to hit enter/done on your phone keyboard after editing the serial number.";

        this.SCANNED_ASSET_FIELD_NAME =        "u_scanned_asset";
        this.SCANNED_ASSET_ID_FIELD_NAME =     "u_scanned_asset_id";
        this.SCANNED_ASSET_STATUS_FIELD_NAME = "u_scanned_asset_status";
        this.SCAN_ASSET_TASK_TABLE_NAME =      "sn_hamp_scan_asset_task";

		this.TOLTASK_STAGE_REQUESTED = "requested";
		this.TOLTASK_STAGE_SHIPMENT_PREPARATION = "shipment_preparation";
        this.TOLTASK_STAGE_IN_TRANSIT = "in_transit";
        this.TOLTASK_STAGE_RECEIVED = "received";

        this.TRANSFER_ORDER_PARENT_FIELD = "transfer_order_line.transfer_order";
        this.TRANSFER_ORDER_MODEL_FIELD = "transfer_order_line.model";
        this.TRANSFER_ORDER_ASSET_FIELD = "transfer_order_line.asset";
        this.TRANSFER_ORDER_STOCKROOM_FIELD = "from_stockroom";
        this.TRANSFER_ORDER_STOCKROOM_LOCATION_TABLE = "alm_transfer_order";
        this.TRANSFER_ORDER_TASK_TABLE = "alm_transfer_order_line_task";
        this.TRANSFER_ORDER_STAGE_QUERY =    "stage=" + this.TOLTASK_STAGE_REQUESTED 
                                        + "^ORstage=" + this.TOLTASK_STAGE_SHIPMENT_PREPARATION 
                                        + "^ORstage=" + this.TOLTASK_STAGE_RECEIVED;
        this.TRANSFER_ORDER_PARENT_TABLE_LABEL = "Transfer Order";
        this.TRANSFER_ORDER_PARENT_ASSET_FIELD = "asset";
        this.TRANSFER_ORDER_PARENT_ASSET_REF_TABLE = "alm_transfer_order_line";
        this.TRANSFER_ORDER_PARENT_ASSET_REF_FIELD = "transfer_order_line";

        //REQUEST_PARENT_FIELD gets the parent.request field but is required in this format since the
        //parent reference is on the task table and request field is on sc_req_item (extends task)
        this.REQUEST_PARENT_FIELD = "parent.ref_sc_req_item.request";
        this.REQUEST_MODEL_FIELD = "model";
        this.REQUEST_ASSET_FIELD = "asset";
        this.REQUEST_STOCKROOM_FIELD = "stockroom";
        this.REQUEST_TASK_TABLE = "asset_task";
        this.REQUEST_TASK_QUERY = "sys_class_name=consume_asset_task^ORsys_class_name=" + this.SCAN_ASSET_TASK_TABLE_NAME;
        this.REQUEST_PARENT_TABLE_LABEL = "Request";
        this.REQUEST_TABLE_REFERENCE_STOCKROOM = "Asset Task";

		
        this.RITM_PARENT_FIELD = "parent";
        this.RITM_MODEL_FIELD = "model";
        this.RITM_ASSET_FIELD = "asset";
        this.RITM_STOCKROOM_FIELD = "stockroom";
        this.RITM_TASK_TABLE = "asset_task";
        this.RITM_TASK_QUERY = "sys_class_name=consume_asset_task^ORsys_class_name=" + this.SCAN_ASSET_TASK_TABLE_NAME;
        this.RITM_PARENT_TABLE_LABEL = "Requested Item";
        this.RITM_TABLE_REFERENCE_STOCKROOM = "Asset Task";

		this.RITM_TASK_QUERY_SELECT_FOR_DEPLOYMENT = "sys_class_name=consume_asset_task";
		this.RITM_TASK_QUERY_PREPARE_FOR_DEPLOYMENT  = "sys_class_name=" + this.SCAN_ASSET_TASK_TABLE_NAME
													+ "^task_name=prepare_for_deployment";
		this.RITM_TASK_QUERY_DEPLOY_ASSET_LOCAL_HO  = "sys_class_name=" + this.SCAN_ASSET_TASK_TABLE_NAME
													+ "^task_name=deploy_asset_local_handover";

        this.RITM_TO_PARENT_FIELD = "transfer_order_line.request_line";
        this.RITM_TO_MODEL_FIELD = "transfer_order_line.model";
        this.RITM_TO_ASSET_FIELD = "transfer_order_line.asset";
        this.RITM_TO_STOCKROOM_FIELD = "from_stockroom";
        this.RITM_TO_STOCKROOM_LOCATION_TABLE = "alm_transfer_order";
        this.RITM_TO_TASK_TABLE = "alm_transfer_order_line_task";
		//The following parameters are the locations of fields/values based on alm_transfer_order_Line_task
        this.RITM_TO_PARENT_ASSET_REF_TABLE = "alm_transfer_order_line"; //parent table containing reference to asset (when swapping)
        this.RITM_TO_PARENT_ASSET_REF_FIELD = "transfer_order_line"; //field on alm_transfer_order_Line_task containing reference to parent TOL (when swapping)
		this.RITM_TO_PARENT_ASSET_FIELD = "asset"; //field on alm_transfer_order_Line containing reference to asset (when swapping)
		this.RITM_TO_TABLE_REFERENCE_STOCKROOM = "Transfer Order Line";
       
        
		this.RITM_TO_TASK_QUERY_SELECT_FOR_TRANSFER = "stage=" + this.TOLTASK_STAGE_REQUESTED;
        this.RITM_TO_TASK_QUERY_PREPARE_FOR_TRANSFER = "stage=" + this.TOLTASK_STAGE_SHIPMENT_PREPARATION;
		this.RITM_TO_TASK_QUERY_RECEIVE_TRANSFER = "stage=" + this.TOLTASK_STAGE_RECEIVED;

        this.RECLAMATION_REQUEST_PARENT_FIELD = "asset_reclaim_line.asset_reclaim_request";
        this.RECLAMATION_REQUEST_MODEL_FIELD = "asset_reclaim_line.asset.model";
        this.RECLAMATION_REQUEST_ASSET_FIELD = "asset_reclaim_line.asset";
        this.RECLAMATION_REQUEST_STOCKROOM_FIELD = "return_stockroom";
        this.RECLAMATION_REQUEST_TASK_TABLE = "sn_hamp_asset_reclaim_task";
        this.RECLAMATION_REQUEST_PARENT_TABLE_LABEL = "Reclamation Line";

        this.TASK_CLOSE_STATE = "3";

        this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY = ".sys_class_name!=cmdb_consumable_product_model";

    },

	/*
     * Used to look up records related to a shipment to display in related lists
     * @parameter - source_table: the table which the shipment assets will relate to with the source_table field
	 * @parameter - source_table_ref_field: optional - if the referenced record has another reference to a record
	 * 				we are interested in looking up to return the ID of, put the field name containing that
	 * 				reference in here. E.g. If we want to look up Requested Items related to Transfer Order Lines
	 * 				enter "request_line" in this parameter
	 * @parameter - shipment_id: the sys_id of the shipment we wish to look up records from
    */
	retShipRelRec: function (shipment_id, source_table, source_table_ref_field) {
		
		var source_ids = [];
		var shipment_assets = new GlideRecord("sn_itam_common_m2m_shipment_asset");
		shipment_assets.addQuery("source_table",source_table);
		shipment_assets.addQuery("shipment", shipment_id);
		shipment_assets.query();
		while (shipment_assets.next()) {
			if(!source_table_ref_field)
				source_ids.push(shipment_assets.getValue("source_id"));
			else{
				var refFieldGR = new GlideRecord(source_table);
				if(refFieldGR.get(shipment_assets.getValue("source_id"))){
					if(refFieldGR.getValue(source_table_ref_field))
						source_ids.push(refFieldGR.getValue(source_table_ref_field));
				}
			}
			
		}
		return source_ids.toString();
	},

	/*
     * Used on the Mobile app as part of the move assets between stockroom function action
	 * Sets user session data regarding the move assets catalog item, which is then read by
	 * a client script
     * @parameter - parm_input: parameter passed in from Action item WriteBackAction
	 * @parameter - parm_variable: parameter passed in from Action item WriteBackAction
	 * @parameter - actionResult: parameter passed in from Action item WriteBackAction
    */
	moveAssetsBetweenStockroomsAction: function (parm_input, parm_variable, actionResult) {
		var errorCheck = false;

		if(!parm_input.asset_ids.length){
			gs.addErrorMessage(gs.getMessage(this.MESSAGE_FAIL_NO_ASSETS_SCANNED));
			return false;
		}
		if(!parm_input.from_stockroom){
			gs.addErrorMessage(gs.getMessage(this.MESSAGE_FAIL_INTERNAL_ERROR));
			return false;
		}

		var asset_sys_ids = [];

		//Let's check that each scanned asset ID exists in the stockroom
		for (var i = 0; i < parm_input.asset_ids.length; i++) {
			var scannedAssetID = parm_input.asset_ids[i];
			var assetGR = new GlideRecord("alm_asset");
			assetGR.addEncodedQuery("serial_number=" + scannedAssetID + "^ORasset_tag=" + scannedAssetID);
			assetGR.addQuery("stockroom", parm_input.from_stockroom);
			assetGR.setLimit(1);
			assetGR.query();
			if(assetGR.next()){
				//Lets check the assets are in the correct state/substate
				if(    assetGR.getValue("install_status") != "6" //in stock
					|| assetGR.getValue("substatus") == "reserved"
					|| assetGR.getValue("substatus") == "pending_transfer"
				){
					gs.addErrorMessage(gs.getMessage(this.MESSAGE_FAIL_ASSET_MOVE_REQ_INCORRECT_STATE, [scannedAssetID]));
					errorCheck = true;
				}
				else{
					//Check if the asset is in the impacted asset list of other move asset orders
					var impactedAsset = new GlideRecord('u_m2m_sc_req_item_alm_asset');
					impactedAsset.addEncodedQuery("sc_req_item.cat_item=c5fb7fd3878ac250b3d17f59dabb35ce^sc_req_item.active=true");
					impactedAsset.addEncodedQuery("alm_asset.serial_number=" + scannedAssetID + "^ORalm_asset.asset_tag=" + scannedAssetID);
					impactedAsset.query();
					if(impactedAsset.next()) {
						gs.addErrorMessage(gs.getMessage(this.MESSAGE_FAIL_ASSET_MOVE_REQ_DUP_REQ, [scannedAssetID, impactedAsset.sc_req_item.getDisplayValue()]));
						errorCheck = true;
					}
					else{
					//We're in the correct state and not in another request
						asset_sys_ids.push(assetGR.getValue("sys_id"));
					}
				}
			}
			else{
				//The scanned asset ID is not in the stockroom
				//Lets see if the asset exists and give an error based on the result
				var otherAsset = new GlideRecord("alm_asset");
				otherAsset.addEncodedQuery("serial_number=" + scannedAssetID + "^ORasset_tag=" + scannedAssetID);
				otherAsset.setLimit(1);
				otherAsset.query();
				if(otherAsset.next()){
					if(otherAsset.stockroom)
						gs.addErrorMessage(gs.getMessage(this.MESSAGE_FAIL_ASSET_MOVE_REQ_WRONG_STOCKROOM, [scannedAssetID, otherAsset.stockroom.getDisplayValue()]));
					else
						gs.addErrorMessage(gs.getMessage(this.MESSAGE_FAIL_ASSET_MOVE_REQ_NO_STOCKROOM, [scannedAssetID]));
				}
				else{
					gs.addErrorMessage(gs.getMessage(this.MESSAGE_FAIL_ASSET_NON_EXISTENT, [scannedAssetID]));
				}
				
				errorCheck = true;
			}

		}
		if(!errorCheck) {
			/*
			 * If there are no errors, populate client session data which will be read by a client script on the
			 * relevant catalog item
			 */
			gs.getSession().putClientData("move_assets_from_stockroom", parm_input.from_stockroom);
			gs.getSession().putClientData("move_assets_asset_ids", asset_sys_ids);
			if(parm_input.primary_reason_for_move)
				gs.getSession().putClientData("move_assets_primary_reason_for_move", parm_input.primary_reason_for_move);
			else
				gs.getSession().putClientData("move_assets_primary_reason_for_move", "");
		}
	},

    /*
     * Used on the Mobile app to show a list of Transfer Orders which will have at least one "Scan" available to use
     * returns a comma-separated list of transfer order sys_ids for use in a condition or reference qualifier
    */
    returnScannableTransferOrderIDs: function(){

        return this.returnScannableParentIDs(
            this.TRANSFER_ORDER_TASK_TABLE,
            this.TRANSFER_ORDER_MODEL_FIELD,
            this.TRANSFER_ORDER_PARENT_FIELD,
            this.TRANSFER_ORDER_STAGE_QUERY,
            true
        );

    },

    /*
     * Used on the Mobile app to show a list of scannable asset tasks within a Transfer order
     * returns a comma-separated list of alm_transfer_order_line_task sys_ids for use in a condition or reference qualifier
     * @parameter - recReqID: sys_id of a alm_transfer_order record to return the scannable asset tasks from
    */
    returnScannableTransferOrderTaskIDs: function(transferOrderID){

        return this.returnScannableTaskIDs(
            transferOrderID,
            this.TRANSFER_ORDER_PARENT_FIELD,
            this.TRANSFER_ORDER_MODEL_FIELD,
            this.TRANSFER_ORDER_TASK_TABLE,
            this.TRANSFER_ORDER_STAGE_QUERY
        );
    },

    /*
     * Used to check whether there are any active tasks in a specified stage in a Transfer Order
     * @parameter - transferOrderID: sys_id of Transfer Order to check
     * @parameter - stage: Stage of the Transfer Order Line Task to check, e.g. requested, in_transit, received
    */
    transferOrderTaskStageCondition: function(transferOrderID, stage) {

        var encodedQuery = "stage="+stage;

        return this.assetParentTaskCondition(
            transferOrderID,
            this.TRANSFER_ORDER_TASK_TABLE,
            this.TRANSFER_ORDER_MODEL_FIELD,
            this.TRANSFER_ORDER_PARENT_FIELD,
            encodedQuery
        );

    },

    /*
     * Used in the Execution script of the "Receive assets" Action item on Agent mobile
     * @parameter - transferOrderID: sys_id of Transfer Order being scanned
     * @parameter - scannedAssetID: string result of scan against an asset tag/serial number
     * @parameter - taskStage: the stage of the tasks to be updated e.g. requested, in_transit, received
    */
    transferOrderTaskScan: function(transferOrderID, scannedAssetID, taskStage) {

        var allowAssetSwap = false;
        var encodedQuery = "stage=" + taskStage;

        if(taskStage == this.TOLTASK_STAGE_REQUESTED)
            allowAssetSwap = true;

        var stockroomLocationID = transferOrderID;
        var taskFieldUpdateArray = [];

        return this.parentTaskScan(
            transferOrderID,
            scannedAssetID,
            this.TRANSFER_ORDER_TASK_TABLE,
            this.TRANSFER_ORDER_PARENT_FIELD,
            this.TRANSFER_ORDER_ASSET_FIELD,
            this.TRANSFER_ORDER_MODEL_FIELD,
            this.TASK_CLOSE_STATE,
            allowAssetSwap,
            this.REQUEST_STOCKROOM_FIELD,
            this.TRANSFER_ORDER_PARENT_TABLE_LABEL,
            this.TRANSFER_ORDER_PARENT_TABLE_LABEL,
            encodedQuery,
            taskFieldUpdateArray,
            this.TRANSFER_ORDER_PARENT_ASSET_REF_TABLE,
            this.TRANSFER_ORDER_PARENT_ASSET_REF_FIELD,
            this.TRANSFER_ORDER_PARENT_ASSET_FIELD,
            this.TRANSFER_ORDER_STOCKROOM_LOCATION_TABLE,
            stockroomLocationID
        );
    },

	/*
     * Used on the Mobile app to show a list of Requested Items which will have at least one active scannable
     * Transfer Order Line task which matches the input query
     * returns a comma-separated list of sc_req_item sys_ids for use in a condition or reference qualifier
    */
    returnScannableRITMIDsTOLTask: function(query){

		return this.returnScannableParentIDs(
            this.RITM_TO_TASK_TABLE,
            this.RITM_TO_MODEL_FIELD,
            this.RITM_TO_PARENT_FIELD,
			query,
            true
        );
    },

	/*
     * Used on the Mobile app to show a list of Requested Items which will have at least one active scannable
     * Asset Task that matches the input query
     * returns a comma-separated list of sc_req_item sys_ids for use in a condition or reference qualifier
    */
    returnScannableRITMIDsAssetTask: function(query){
		return this.returnScannableParentIDs(
            this.RITM_TASK_TABLE,
            this.RITM_MODEL_FIELD,
            this.RITM_PARENT_FIELD,
            query,
            true
        );
    },

	/*
     * Used to check whether there are any active TOL tasks in a specified stage in a RITM
     * @parameter - ritmOrderID: sys_id of Requested Item to check
     * @parameter - stage: Stage of the Transfer Order Line Task to check, e.g. requested, in_transit, received
    */
    ritmTOLTaskStageCondition: function(ritmID, stage) {

        var encodedQuery = "stage="+stage;

        return this.assetParentTaskCondition(
            ritmID,
            this.RITM_TO_TASK_TABLE,
            this.RITM_TO_MODEL_FIELD,
            this.RITM_TO_PARENT_FIELD,
            encodedQuery
        );

    },

	/*
     * Used to check whether there are any active TOL tasks in a specified stage in a RITM
     * @parameter - ritmOrderID: sys_id of Requested Item to check
     * @parameter - encodedQuery: encodedQuery to apply to asset_task records being looked up
    */
    ritmAssetTaskStageCondition: function(ritmID, encodedQuery) {

        return this.assetParentTaskCondition(
            ritmID,
            this.RITM_TASK_TABLE,
            this.RITM_MODEL_FIELD,
            this.RITM_PARENT_FIELD,
            encodedQuery
        );

    },

	/*
     * Used to check whether there are any active TOL tasks in Requested Stage or Consume Asset Tasks in a RITM
     * @parameter - ritmOrderID: sys_id of Requested Item to check
    */
	ritmTaskSelectCondition: function(ritmID){
		var answer =   this.ritmTOLTaskStageCondition(ritmID, this.TOLTASK_STAGE_REQUESTED)
					|| this.ritmAssetTaskStageCondition(ritmID, "sys_class_name=consume_asset_task");
		return answer;
	},

	/*
     * Used in the Execution script of various RITM Transfer Order scanning Action items on Agent mobile 
     * @parameter - ritmID: sys_id of Requested Item being scanned
     * @parameter - scannedAssetID: string result of scan against an asset tag/serial number
     * @parameter - assetTaskTable: the table of the task being scanned
	 * @parameter - allowAssetSwap: set to true to allow in stock available assets within the same stockroom to be swapped
     *              onto the task. Set to false to throw an error if a different asset than the one against the task is
	 *              scanned.
	 * @parameter - parametersObj: an object containing fields to be updated on a target record
    */
    ritmTaskScan: function(ritmID, scannedAssetID, assetTaskTable, allowAssetSwap, encodedQuery, parametersObj) {
		
		var taskFieldUpdateArray = [];
		if(parametersObj)
			taskFieldUpdateArray = this.convertMobileParametersToTaskFieldUpdateArray(parametersObj, assetTaskTable);
		
		
		var stockroomLocationID = "";
		var tolGR = new GlideRecord("alm_transfer_order_line");
		tolGR.addQuery("request_line", ritmID);
		tolGR.addQuery("request_line", "!=", "");
		tolGR.setLimit(1);
		tolGR.query();
		if(tolGR.next()){
			stockroomLocationID = tolGR.getValue("transfer_order");
		}


        return this.parentTaskScan(
            ritmID,
            scannedAssetID,
            assetTaskTable,
            this.RITM_TO_PARENT_FIELD,
            this.RITM_TO_ASSET_FIELD,
            this.RITM_TO_MODEL_FIELD,
            this.TASK_CLOSE_STATE,
            allowAssetSwap,
            this.RITM_TO_STOCKROOM_FIELD,
            this.RITM_PARENT_TABLE_LABEL,
            this.RITM_TO_TABLE_REFERENCE_STOCKROOM,
            encodedQuery,
			taskFieldUpdateArray,
            this.RITM_TO_PARENT_ASSET_REF_TABLE,
            this.RITM_TO_PARENT_ASSET_REF_FIELD,
            this.RITM_TO_PARENT_ASSET_FIELD,
            this.RITM_TO_STOCKROOM_LOCATION_TABLE,
            stockroomLocationID
        );

	},

	/*
     * Used in the Execution script of various RITM Consume Asset Task scanning Action items on Agent mobile
     * @parameter - ritmID: sys_id of Requested Item being scanned
     * @parameter - scannedAssetID: string result of scan against an asset tag/serial number
     * @parameter - assetTaskTable: the table of the task being scanned
	 * @parameter - allowAssetSwap: set to true to allow in stock available assets within the same stockroom to be swapped
     *              onto the task. Set to false to throw an error if a different asset than the one against the task is
	 *              scanned.
	 * @parameter - parametersObj: an object containing fields to be updated on a target record
    */
    ritmScanConsumeTaskScan: function(ritmID, scannedAssetID, assetTaskTable, allowAssetSwap, encodedQuery, parametersObj) {
		
		var taskFieldUpdateArray = [];
		if(parametersObj)
			taskFieldUpdateArray = this.convertMobileParametersToTaskFieldUpdateArray(parametersObj, assetTaskTable);

        return this.parentTaskScan(
            ritmID,
            scannedAssetID,
            assetTaskTable,
            this.RITM_PARENT_FIELD,
            this.RITM_ASSET_FIELD,
            this.RITM_MODEL_FIELD,
            this.TASK_CLOSE_STATE,
            allowAssetSwap,
            this.RITM_STOCKROOM_FIELD,
            this.RITM_PARENT_TABLE_LABEL,
            this.RITM_TABLE_REFERENCE_STOCKROOM,
            encodedQuery,
			taskFieldUpdateArray
        );

	},

	/*
     * Used in the Execution script of various RITM Scan Asset Task scanning Action items on Agent mobile
     * @parameter - ritmID: sys_id of Requested Item being scanned
     * @parameter - scannedAssetID: string result of scan against an asset tag/serial number
     * @parameter - assetTaskTable: the table of the task being scanned
	 * @parameter - allowAssetSwap: set to true to allow in stock available assets within the same stockroom to be swapped
     *              onto the task. Set to false to throw an error if a different asset than the one against the task is
	 *              scanned.
	 * @parameter - parametersObj: an object containing fields to be updated on a target record
    */
    ritmScanAssetTaskScan: function(ritmID, scannedAssetID, assetTaskTable, allowAssetSwap, encodedQuery, parametersObj) {
		
		var taskFieldUpdateArray = [];
		if(parametersObj)
			taskFieldUpdateArray = this.convertMobileParametersToTaskFieldUpdateArray(parametersObj, assetTaskTable);

        return this.parentTaskScan(
            ritmID,
            scannedAssetID,
            assetTaskTable,
            this.RITM_PARENT_FIELD,
            this.RITM_ASSET_FIELD,
            this.RITM_MODEL_FIELD,
            this.TASK_CLOSE_STATE,
            allowAssetSwap,
            this.RITM_STOCKROOM_FIELD,
            this.RITM_PARENT_TABLE_LABEL,
            this.RITM_TABLE_REFERENCE_STOCKROOM,
            encodedQuery,
			taskFieldUpdateArray
        );

	},

	/*
	 * Used to convert parameters passed in by mobile app to taskFieldUpdateArray format expected by parentTaskScan method
	 * @parameter - parametersObj: object created by app which contains all the parameters (questions) answered by user
	 * 				These should be set up in the app to match the field names on the table being updated
	 * 				Expected format for parametersObj:
	 * 					{
	 * 						"field_name_1": "value1",
	 * 						"field_name_2": "value2"
	 * 					}
	 * @parameter - tableToUpdate: table name which has the fields on. This is required in case any of the field names in
	 * 				the app are truncated due to 40 character limit required by mobile UI policies
	 * 
	*/
	convertMobileParametersToTaskFieldUpdateArray: function(parametersObj, tableToUpdate) {

		var taskFieldUpdateArray = [];

		//loop through all fields in parametersObj to convert format
		Object.keys(parametersObj).forEach(function(key){
			var fieldName = ""+key;
			if(fieldName.length === 40){
				/*
				 * If field name is exactly 40 characters, this is likely truncated due to mobile ui policy field name
				 * limit. We need to look up the actual field name with a starts with query
				*/ 

				var field = new GlideRecord("sys_dictionary");
				field.addQuery("name", tableToUpdate);
				field.addQuery("element", "STARTSWITH", key);
				field.addQuery("name", "!=", "");
				field.addQuery("element", "!=", "");
				field.setLimit(1);
				field.query();
				if(field.next()){
					fieldName = field.getValue("element");
				}
			}

			var fieldValue = {
				"fieldName": fieldName,
				"fieldValue": parametersObj[key]
			};

			taskFieldUpdateArray.push(fieldValue);

		});

		return taskFieldUpdateArray;

	},

    /*
     * Used on the Mobile app to show a list of Requests which will have at least one active scannable asset task
     * returns a comma-separated list of sc_request sys_ids for use in a condition or reference qualifier
    */
    returnScannableRequestIDs: function(){

        return this.returnScannableParentIDs(
            this.REQUEST_TASK_TABLE,
            this.REQUEST_MODEL_FIELD,
            this.REQUEST_PARENT_FIELD,
            this.REQUEST_TASK_QUERY,
            true
        );

    },

    /*
     * Used on the Mobile app to show a list of scannable asset tasks within a REQ
     * returns a comma-separated list of asset_task sys_ids for use in a condition or reference qualifier
     * @parameter - reqID: sys_id of a sc_request record to return the scannable asset tasks from
    */
    returnScannableREQAssetTaskIDs: function(reqID){

        return this.returnScannableTaskIDs(
            reqID,
            this.REQUEST_PARENT_FIELD,
            this.REQUEST_MODEL_FIELD,
            this.REQUEST_TASK_TABLE,
            this.REQUEST_TASK_QUERY
        );
    },

    /*
     * Used to check whether there are any active asset tasks in a Request
     * @parameter - reqID: sys_id of a sc_request record to check
     * @parameter - assetTaskTable: the table to look up the tasks from, e.g. consume_asset_task
    */
    assetREQTaskCondition: function(reqID, assetTaskTable){

        var encodedQuery = "";

        return this.assetParentTaskCondition(
            reqID,
            assetTaskTable,
            this.REQUEST_MODEL_FIELD,
            this.REQUEST_PARENT_FIELD,
            encodedQuery
        );

    },

    /*
     * Used in the Execution script of the "Receive assets" Action item on Agent mobile
     * @parameter - reqID: sys_id of Request being scanned
     * @parameter - scannedAssetID: string result of scan against an asset tag/serial number
     * @parameter - assetTaskTable: the table of the task being scanned
    */
    requestTaskScan: function(reqID, scannedAssetID, assetTaskTable) {
        
        var encodedQuery = "";
        var allowAssetSwap = false;

        if(assetTaskTable == "consume_asset_task")
            allowAssetSwap = true;

        return this.parentTaskScan(
            reqID,
            scannedAssetID,
            assetTaskTable,
            this.REQUEST_PARENT_FIELD,
            this.REQUEST_ASSET_FIELD,
            this.REQUEST_MODEL_FIELD,
            this.TASK_CLOSE_STATE,
            allowAssetSwap,
            this.REQUEST_STOCKROOM_FIELD,
            this.REQUEST_PARENT_TABLE_LABEL,
            this.REQUEST_TABLE_REFERENCE_STOCKROOM,
            encodedQuery
        );
    },

    /*
     * Used on the Mobile app to show a list of Reclamation Requests which will have at least one active scannable task
     * returns a comma-separated list of asset_reclamation_request sys_ids for use in a condition or reference qualifier
    */
    returnScannableReclamationRequestIDs: function(taskName){

        var encodedQuery = "task_name=" + taskName;

        return this.returnScannableParentIDs(
            this.RECLAMATION_REQUEST_TASK_TABLE,
            this.RECLAMATION_REQUEST_MODEL_FIELD,
            this.RECLAMATION_REQUEST_PARENT_FIELD,
            encodedQuery,
            true
        );

    },

    /*
     * Used on the Mobile app to show a list of scannable asset tasks within a Reclamation Request
     * returns a comma-separated list of sn_hamp_asset_reclaim_task sys_ids for use in a condition or reference qualifier
     * @parameter - recReqID: sys_id of a asset_reclamation_request record to return the scannable asset tasks from
     * @parameter - taskName: comma-separated list of Task Names to filter the reclamation tasks by
    */
    returnScannableReclamationRequestTaskIDs: function(recReqID, taskName){

        var encodedQuery = "task_nameIN" + taskName;

        return this.returnScannableTaskIDs(
            recReqID,
            this.RECLAMATION_REQUEST_PARENT_FIELD,
            this.RECLAMATION_REQUEST_MODEL_FIELD,
            this.RECLAMATION_REQUEST_TASK_TABLE,
            encodedQuery
        );
    },

    /*
     * Used to check whether there are any active asset tasks of a certain Task Name in a Reclamation Request
     * @parameter - recReqID: sys_id of a asset_reclamation_request record to check
     * @parameter - taskName: the Task Name to filter the sn_hamp_asset_reclaim_task records
    */
    assetReclamationRequestTaskCondition: function(recReqID, taskName){

        var encodedQuery = "task_name=" + taskName;

        return this.assetParentTaskCondition(
            recReqID,
            this.RECLAMATION_REQUEST_TASK_TABLE,
            this.RECLAMATION_REQUEST_MODEL_FIELD,
            this.RECLAMATION_REQUEST_TASK_TABLE,
            encodedQuery
        );

    },

    /*
     * Used in the Execution script of the "Receive assets" Action item on Agent mobile
     * @parameter - transferOrderID: sys_id of Transfer Order being scanned
     * @parameter - scannedAssetID: string result of scan against an asset tag/serial number
     * @parameter - taskStage: the stage of the tasks to be updated e.g. requested, in_transit, received
    */
    reclamationTaskScan: function(reclamationRequestID, scannedAssetID, taskName) {

        var allowAssetSwap = false;
        var taskNameQuery = "task_name=" + taskName;

        //We're not allowing asset swaps on reclamation tasks, so we can ignore most of the optional parameters of parentTaskScan

        var taskFieldUpdateArray = [];

        if(taskName == "receive"){
            taskFieldUpdateArray = [{"fieldName": "is_reclaimed", "fieldValue": "true"}];
        }

        return this.parentTaskScan(
            reclamationRequestID,
            scannedAssetID,
            this.RECLAMATION_REQUEST_TASK_TABLE,
            this.RECLAMATION_REQUEST_PARENT_FIELD,
            this.RECLAMATION_REQUEST_ASSET_FIELD,
            this.RECLAMATION_REQUEST_MODEL_FIELD,
            this.TASK_CLOSE_STATE,
            allowAssetSwap,
            this.RECLAMATION_REQUEST_STOCKROOM_FIELD,
            this.RECLAMATION_REQUEST_PARENT_TABLE_LABEL,
            this.RECLAMATION_REQUEST_PARENT_TABLE_LABEL,
            taskNameQuery,
            taskFieldUpdateArray
        );
    },

    /*
     * Used on the Mobile app to show a list of parent records which will have at least one active scannable task
     * returns a comma-separated list of parent record sys_ids for use in a condition or reference qualifier
     * @parameter - taskTable: the table to look up the scannable tasks from, e.g. consume_asset_task
     * @parameter - modelField: field or dot-walk fields on the scanned task which reference the asset model
     * @parameter - parentField: field or dot-walk fields on the scanned task which reference the parent record
     * @parameter - encodedQuery: (optional) extra query to apply to the GlideRecord lookup
     * @parameter - myGroupsOnly: (optional) set to true to limit the results to only include tasks assigned to the
     *              logged in user's groups
	 * @parameter - returnArray: (optional) set to true to return an array rather than a string of comma-separated
	 * 				sys_ids.
    */
    returnScannableParentIDs: function(taskTable, modelField, parentField, encodedQuery, myGroupsOnly, returnArray){

        var parentIDs = [];

        var parentGa = new GlideAggregate(taskTable);
        parentGa.addActiveQuery();
        parentGa.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
        //Limit to one of my assignment groups or to me
        if(myGroupsOnly)
            parentGa.addEncodedQuery("assignment_groupDYNAMICd6435e965f510100a9ad2572f2b47744^ORassigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe");
        if(encodedQuery)
            parentGa.addEncodedQuery(encodedQuery);
        parentGa.setGroup(true);
        parentGa.groupBy(parentField);
        parentGa.query();
        while(parentGa.next()){
            parentIDs.push(parentGa.getValue(parentField));
        }

		if(returnArray)
			return parentIDs;
		else
			return "sys_idIN" + parentIDs.toString() + "^ORDERBYDESCsys_created_on";

    },

    returnScannableTaskIDs: function(parentID, parentField, modelField, taskTable, encodedQuery, onlyIDs){
        var assetTaskIDs = [];

        var taskGr = new GlideAggregate(taskTable);
        taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
        if(encodedQuery)
            taskGr.addEncodedQuery(encodedQuery);
        taskGr.addQuery(parentField, parentID);
        taskGr.setGroup(true);
        taskGr.query();
        while(taskGr.next()){
            assetTaskIDs.push(taskGr.sys_id.toString());
        }
        if(onlyIDs)
            return assetTaskIDs.toString();

        var returnQuery = "sys_idIN" +assetTaskIDs.toString();
        returnQuery += "^ORDERBYDESCactive^ORDERBYDESC" + this.SCANNED_ASSET_STATUS_FIELD_NAME + "^ORDERBYDESCsys_created_on";

        return returnQuery;
    },

    /*
     * Used to check whether there are any active scannable tasks in a parent record
     * @parameter - parentID: sys_id of a parent record to check
     * @parameter - taskTable: the table to look up the scannable tasks from, e.g. consume_asset_task
     * @parameter - parentField: field or dot-walk fields on the scanned task which reference the parent record
     * @parameter - modelField: field or dot-walk fields on the scanned task which reference the asset model
     * @parameter - encodedQuery: an optional extra query to apply to the GlideRecord lookup
    */
    assetParentTaskCondition: function(parentID, taskTable, modelField, parentField, encodedQuery){

        var taskGr = new GlideRecord(taskTable);
        taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
        taskGr.addActiveQuery();
        taskGr.addQuery(parentField, parentID);
        if(encodedQuery)
            taskGr.addEncodedQuery(encodedQuery);
        taskGr.setLimit(1);
        taskGr.query();
        return taskGr.hasNext();
        
    },

    /*
     * Used in the Execution script of the "Receive assets" Action item on Agent mobile when scanning a list of assets.
     * @parameter - parentID: sys_id of parent record which contains the scannable tasks.
     * @parameter - scannedAssetID: string result of scan against an asset tag/serial number.
     * @parameter - taskTable: table of the task being scanned.
     * @parameter - parentField: field or dot-walk fields on the scanned task which reference the parent record.
     * @parameter - assetField: field or dot-walk fields on the scanned task which reference the asset.
     * @parameter - modelField: field or dot-walk fields on the scanned task which reference the asset model.
     * @parameter - closureState: state which the scanned task should be set to upon closure .
     * @parameter - allowAssetSwap: set to true to allow in stock available assets within the same stockroom to be swapped
     *              onto the task. Set to false to throw an error if a different asset than the one against the task is
	 *              scanned.
     * @parameter - stockroomField: (optional) Required if allowAssetSwap is true. the field name containing the stockroom reference on either the scanned task or the
	 *              table defined in stockroomLocationTable.
     * @parameter - parentTableLabel: The label to include in error messages to represent the parent table being scanned.
     * @parameter - tableReferenceStockroom: (optional) Required if allowAssetSwap is true. The label to include in error messages regarding assets not matching
     *              the stockroom being scanned in. E.g. For Transfer Orders this would be "Transfer Order" and for
     *              Requests this would be "Asset Task".
     * @parameter - encodedQuery: (optional) extra query to apply to the GlideRecord lookup for scannable tasks.
     * @parameter - taskFieldUpdateArray: (optional) an array of objects containing details of fields to update on
     *              the scannable task record on a successful closure. E.g. setting the "Is asset reclaimed?"
     *              field on the "Receive asset" Hardware Asset Reclamation Task
     *              Format: [{"fieldName": fieldName1, "fieldValue": fieldValue1},
     *                       {"fieldName": fieldName2, "fieldValue": fieldValue2}]
     * @parameter - parentRecordAssetRefTable: (optional) if the asset field is on a different table to the scanned task,
     *              this should be the table name. Leave empty or false if not used.
     *              e.g. In Transfer orders, the alm_transfer_order_line table contains the reference to the asset being
     *              scanned, so this parameter would be set to "alm_transfer_order_line".
     * @parameter - parentAssetRefField: (optional)  if the asset field is on a different table to the scanned task,
     *              this should be the field name (on the scanned task table) containing the reference to the table
	 *              containing the asset field. Leave empty if not used.
     *              e.g. In Transfer orders, the alm_transfer_order_line table contains the reference to the asset being
     *              scanned, not the alm_transfer_order_line_task table, in this example this parameter would be the
     *              "transfer_order_line" field on the alm_transfer_order_line_task table.
     * @parameter - parentAssetField: (optional) the field name of the asset reference on the table defined in
     *              parentRecordAssetRefTable.
     * @parameter - stockroomLocationTable: (optional) the table containing the reference to the stockroom assets are
     *              being scanned in (if this is not on the scanned task). Leave out if this on the scanned task.
     * @parameter - stockroomLocationID: (optional) the ID of the record containing the reference to the stockroom.
     *              Only relevant if the stockroom is not referenced on the task being scanned
    */
    parentTaskScan: function(parentID, scannedAssetID, taskTable, parentField, assetField, modelField, closureState, allowAssetSwap, stockroomField, parentTableLabel, tableReferenceStockroom, encodedQuery, taskFieldUpdateArray, parentRecordAssetRefTable, parentAssetRefField, parentAssetField, stockroomLocationTable, stockroomLocationID) {

        var response = {
            "lineInfoMessage": "",
            "lineErrorMessage": ""
        };

        scannedAssetID = scannedAssetID.toString().trim();

        var scannedAssetStatus = "";
        var scannedAssetSysID = false;

        var lineInfoMessage = "";
        var lineErrorMessage = "";

        if(!scannedAssetID){
            response = {
                "lineInfoMessage": "",
                "lineErrorMessage": gs.getMessage(this.MESSAGE_FAIL_MISSING_SCANNED_ASSET_ID)
            };
            return response;
        }
        //Throw an error if there are any missing mandatory parameters
        if(!parentID || !taskTable || !parentField || !assetField || !modelField || !closureState  || !parentTableLabel){
            response = {
                "lineInfoMessage": "",
                "lineErrorMessage": gs.getMessage(this.MESSAGE_FAIL_INTERNAL_ERROR)
            };
            return response;
        }
        //If we're allowing asset swaps, throw an error if there are any missing mandatory parameters required for asset swaps
        if(allowAssetSwap && (!stockroomField || !tableReferenceStockroom)){
            response = {
                "lineInfoMessage": "",
                "lineErrorMessage": gs.getMessage(this.MESSAGE_FAIL_INTERNAL_ERROR)
            };
            return response;
        }

        //Set these for use later, in case we need to update a RITM variables
        var variablesToUpdate = false;
        var ritmGr = new GlideRecord("sc_req_item");

        //need to check that there are any active tasks first
        if (!this.assetParentTaskCondition(parentID, taskTable, modelField, parentField, encodedQuery)) {
            lineErrorMessage += gs.getMessage(this.MESSAGE_FAIL_NO_ACTIVE_TASK, [scannedAssetID]);
        } else {

            //First check if there is a task with the scanned asset already on it
            var taskGr = new GlideRecord(taskTable);
            taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
            taskGr.addQuery(parentField, parentID);
            taskGr.addEncodedQuery(assetField + ".serial_number=" + scannedAssetID + "^OR" + assetField + ".asset_tag=" + scannedAssetID);
            if(encodedQuery)
                taskGr.addEncodedQuery(encodedQuery);
            taskGr.setLimit(1);
            taskGr.query();
            if (taskGr.next()) {
                taskGr.setValue(this.SCANNED_ASSET_FIELD_NAME, taskGr.getElement(assetField).toString());
                taskGr.setValue(this.SCANNED_ASSET_ID_FIELD_NAME, scannedAssetID);
                taskGr.setValue(this.SCANNED_ASSET_STATUS_FIELD_NAME, this.STATUS_SUCCESSFUL_EXPECTED);

                if (taskGr.active) {
                    //If we find an active task, close it
                    taskGr.setValue("state", closureState);

                    //If there are any extra fields to set on the task during closure, run through them now
                    if(taskFieldUpdateArray && taskFieldUpdateArray.length){
                        for (i = 0; i < taskFieldUpdateArray.length; i++) {
							var notEmpty = false;
                            //Check if the field to update is a variable
                            if(taskFieldUpdateArray[i].fieldName.indexOf("variables_") == 0){
                                variablesToUpdate = true;
								if(!ritmGr.sys_id)
									ritmGr.get(taskGr[parentField].toString());
                                //grab the variable name after "variables_"
                                var variableName = taskFieldUpdateArray[i].fieldName.split("variables_")[1];
								if(variableName.indexOf("ne_") == 0){
									notEmpty = true;
									//Do not update if prefixed with "ne_" meaning "Not Empty" and the value is empty
									variableName = variableName.split("ne_")[1];
								}
								if(!notEmpty || (notEmpty && taskFieldUpdateArray[i].fieldValue))
									ritmGr.variables[variableName] = taskFieldUpdateArray[i].fieldValue;
                            }
                            else if (!notEmpty || (notEmpty && taskFieldUpdateArray[i].fieldValue))
                                taskGr.setValue(taskFieldUpdateArray[i].fieldName, taskFieldUpdateArray[i].fieldValue);
                        } 
                    }

                    lineInfoMessage += gs.getMessage(this.MESSAGE_SUCCESS_EXPECTED_ASSET_CLOSED_TASK, [scannedAssetID, taskGr.number.toString()]);
                } else {
                    //if the task is already closed, return a message that this asset has already been scanned
                    lineInfoMessage += gs.getMessage(this.MESSAGE_SUCCESS_ALREADY_SCANNED_CLOSED_TASK, [scannedAssetID, taskGr.number.toString()]);
                }
                
                if(variablesToUpdate)
                    ritmGr.update();

                taskGr.update();

            }
            else{
				
                /*
				 * If we're here, it means that the scanned asset is not on one of the tasks in our parent, 
				 * so we have to check whether to throw an error, or attempt to swap the asset in if it is valid
				 * 
                 * We only need to swap out an asset if we've allowed it
                 * otherwise we just need to update an available task with the failed scan result
                */

				//Collate the list of scannable models within this Parent record
				var modelIDs = [];
				var taskGa = new GlideAggregate(taskTable);
				taskGa.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
				taskGa.addQuery(parentField, parentID);
				taskGa.setGroup(true);
				taskGa.groupBy(modelField);
				taskGa.query();
				while(taskGa.next()){
                    //We're allowing users to scan any of the model's substitutes.
                    var substitutes = new global.WrightHAMSourcingLogic().getModelSubstitutes(taskGa.getValue(modelField), true);
					// substitutes includes the value in taskGa.getValue(modelField)
                    modelIDs = modelIDs.concat(substitutes);
				}

                //Let's check the asset exists with the same model as in the scanned parent record
                var assetGR = new GlideRecord("alm_asset");
                assetGR.addEncodedQuery("serial_number=" + scannedAssetID + "^ORasset_tag=" + scannedAssetID);
				assetGR.addQuery("model", "IN", modelIDs.toString());
                assetGR.setLimit(1);
                assetGR.query();

                var swappedRecordDisplay = "";

				//If not look up from any model
				if (!assetGR.hasNext()) {
					assetGR = new GlideRecord("alm_asset");
					assetGR.addEncodedQuery("serial_number=" + scannedAssetID + "^ORasset_tag=" + scannedAssetID);
					assetGR.setLimit(1);
					assetGR.query();
				}

                var taskGr2 = new GlideRecord(taskTable);

                if (!assetGR.next()) {

                    scannedAssetStatus = this.STATUS_FAIL_ASSET_NON_EXISTENT;
                    lineErrorMessage = gs.getMessage(this.MESSAGE_FAIL_ASSET_NON_EXISTENT);

                    //If asset ID doesn't exist, show an error to the user, and update one of the scannable tasks with the result
                    taskGr2 = this.getAvailableAssetTask(parentID, scannedAssetID, taskTable, modelField, parentField, encodedQuery);

                }
                else if (!allowAssetSwap) {

                    scannedAssetSysID = assetGR.sys_id.toString();

                    //If we're not swapping the asset, throw an error
                    //We could technically throw this before looking up the asset, but it's useful for the user to know an asset doesn't exist or the wrong barcode has been scanned
                    scannedAssetStatus = this.STATUS_FAIL_INVALID_ASSET;
                    lineErrorMessage = this.MESSAGE_FAIL_ASSET_NOT_IN_PARENT_RECORD;
                    
                    taskGr2 = this.getAvailableAssetTask(parentID, scannedAssetID, taskTable, modelField, parentField, encodedQuery, assetGR.model.toString(), stockroomField, assetGR.stockroom.toString());
                }
                else {

                    scannedAssetSysID = assetGR.sys_id.toString();
					//We're allowing users to scan a model which is a substitute of the model on our task, so lets look up all the models
					//that contain our model as a substitute
					var assetModelSubstitutes = new global.WrightHAMSourcingLogic().getModelsModelIsASubstituteOf(assetGR.getValue("model"));
                   
                    //Now we'll try and swap the asset into a task

					/* 
					 * We also need to check whether the asset is reserved in another swappable scan asset task or transfer order line
					 * If we find our asset is not yet "locked down" in another process we will swap it out of that other process
					 * and move it into our swappable process
					 */
					var tolCheckGR = new GlideRecord("alm_transfer_order_line");
					var tolCheck = false;

					var catCheckGR = new GlideRecord("consume_asset_task");
					var catCheck = false;

                    //If the asset is not In stock/Available throw an error
                    var stateFailCheck = assetGR.install_status != sn_hamp.HAMConstants.ASSET_STATUSES.IN_STOCK || assetGR.substatus != sn_hamp.HAMConstants.ASSET_SUB_STATUSES.AVAILABLE;

                    //If the found asset does not match the model of any active scannable task in the parent record, then throw an error
                    var modelFailCheck = new GlideRecord(taskTable);
                    modelFailCheck.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
                    if(encodedQuery)
                        modelFailCheck.addEncodedQuery(encodedQuery);
                    modelFailCheck.addQuery(parentField, parentID);
                    modelFailCheck.addQuery(modelField, "IN", assetModelSubstitutes);
                    modelFailCheck.addActiveQuery();
                    modelFailCheck.setLimit(1);
                    modelFailCheck.query();
                    modelFailCheck = !modelFailCheck.hasNext();

					//TODO: Update stockroomFailCheck so that it checks against all the stockrooms against all active tasks and not just 1
					//Use case is when sourcing from more than 1 stockroom - multiple Transfer Orders or consume asset tasks in different stockrooms against one RITM

                    var stockroomFailCheck = false;
                    //If the asset is not in the same stockroom as the scannable task, throw an error
                    if(stockroomLocationTable){
                        //The stockroom reference is not on the scanned task, so let's check the record which references the stockroom
                        stockroomFailCheck = new GlideRecord(stockroomLocationTable);
                        stockroomFailCheck.addQuery("sys_id", stockroomLocationID);
                        stockroomFailCheck.addQuery(stockroomField, assetGR.stockroom);
                        stockroomFailCheck.setLimit(1);
                        stockroomFailCheck.query();
                        stockroomFailCheck = !stockroomFailCheck.hasNext();
                    }
                    else{
                        //Do the stockroom check against one of the available scan tasks instead
                        stockroomFailCheck = new GlideRecord(taskTable);
                        stockroomFailCheck.addActiveQuery();
                        stockroomFailCheck.addQuery(modelField, "IN", assetModelSubstitutes);
                        stockroomFailCheck.addQuery(parentField, parentID);
                        stockroomFailCheck.addQuery(stockroomField, assetGR.stockroom);
                        if(encodedQuery)
                            stockroomFailCheck.addEncodedQuery(encodedQuery);
                        stockroomFailCheck.setLimit(1);
                        stockroomFailCheck.query();
                        stockroomFailCheck = !stockroomFailCheck.hasNext();
                    }

                    if (stateFailCheck) {
						//Let's see if the asset is in another swappable record
						//First check if the asset is in another Draft Transfer Order Line
						tolCheckGR.addQuery("stage", "draft");
						tolCheckGR.addQuery("asset", scannedAssetSysID);
						tolCheckGR.setLimit(1);
						tolCheckGR.query();
						tolCheck = tolCheckGR.hasNext() == true;
						
						if(!tolCheck){
							//If not, check if the asset is in an active Consume Asset Task
							catCheckGR.addQuery("active", true);
							catCheckGR.addQuery("asset", scannedAssetSysID);
							catCheckGR.setLimit(1);
							catCheckGR.query();
							catCheck = catCheckGR.hasNext() == true;
						}

						//If asset is not on another available record, and not In Stock Available, throw error
						if(!tolCheck && !catCheck){
							scannedAssetStatus = this.STATUS_FAIL_ASSET_INCORRECT_LIFECYCLE;
							lineErrorMessage = this.MESSAGE_FAIL_ASSET_INCORRECT_LIFECYCLE;
						}
						else {
							//We can swap, but the asset came from another record and an asset was swapped into that
							scannedAssetStatus = this.STATUS_SUCCESSFUL_SWAPPED;
							lineInfoMessage = this.MESSAGE_SUCCESS_ASSET_SWAPPED_OTHER_RECORD;
						}

                    } else if (modelFailCheck) {
                        //If the asset is not the same model as any of the model against any of the active tasks, throw an error
                        scannedAssetStatus = this.STATUS_FAIL_ASSET_INCORRECT_MODEL;
                        lineErrorMessage = this.MESSAGE_FAIL_ASSET_INCORRECT_MODEL;
                    } else if (stockroomFailCheck) {
                        //If the asset is not in the same stockroom as any of the active tasks, throw an error
                        scannedAssetStatus = this.STATUS_FAIL_ASSET_INCORRECT_STOCKROOM;
                        lineErrorMessage = this.MESSAGE_FAIL_ASSET_INCORRECT_STOCKROOM;
                    } else {
                        //No errors occurred, we are good to swap the asset into the task
                        scannedAssetStatus = this.STATUS_SUCCESSFUL_SWAPPED;
                        lineInfoMessage = this.MESSAGE_SUCCESS_ASSET_SWAPPED;
                    }

					//If the asset is not in stock/available, but is in another active Consume Asset Task or Draft Transfer Order Line
					//then we need to move the asset from that other task/TOL and replace the asset on that task/TOL with another available asset
					if(stateFailCheck && (tolCheck || catCheck)){
                        var swappedRecord;
						if(tolCheck){
							tolCheckGR.next();
							swappedRecord = this.replaceExistingAsset(tolCheckGR, "model", "asset", "from_stockroom");
							if(swappedRecord)
								swappedRecordDisplay = swappedRecord.getDisplayValue();
							
						}
						else if(catCheck){
							catCheckGR.next();
							swappedRecord = this.replaceExistingAsset(catCheckGR, "model", "asset", "stockroom");
							if(swappedRecord)
								swappedRecordDisplay = swappedRecord.getDisplayValue();
						}

					}

                    taskGr2 = this.getAvailableAssetTask(parentID, scannedAssetID, taskTable, modelField, parentField, encodedQuery, assetGR.model.toString(), stockroomField, assetGR.stockroom.toString());
                    
                }
                //Below we make the update to the task that was found with all the logic above
                if (taskGr2.next()) {

                    if (scannedAssetStatus == this.STATUS_SUCCESSFUL_SWAPPED && scannedAssetSysID) {

                        if(parentRecordAssetRefTable){
                            var parentGr = new GlideRecord(parentRecordAssetRefTable);
                            if(parentGr.get(taskGr2[parentAssetRefField])){
                                parentGr.setValue(parentAssetField, scannedAssetSysID);
                                parentGr.update();
                            }
                        }
                        else{
                            taskGr2.setValue(assetField, scannedAssetSysID);
                        }
                        taskGr2.state = closureState;

                    }

                    taskGr2.setValue(this.SCANNED_ASSET_ID_FIELD_NAME, scannedAssetID);
                    taskGr2.setValue(this.SCANNED_ASSET_STATUS_FIELD_NAME, scannedAssetStatus);

                    if (scannedAssetSysID) {
                        taskGr2.setValue(this.SCANNED_ASSET_FIELD_NAME, scannedAssetSysID);
                    }

                    taskGr2.update();

                    if (lineInfoMessage) {
                        lineInfoMessage = gs.getMessage(lineInfoMessage, [scannedAssetID, taskGr2.number.toString(), gs.getMessage(parentTableLabel), gs.getMessage(tableReferenceStockroom), swappedRecordDisplay]);
                    }
                    if (lineErrorMessage) {
                        lineErrorMessage = gs.getMessage(lineErrorMessage, [scannedAssetID, taskGr2.number.toString(), gs.getMessage(parentTableLabel), gs.getMessage(tableReferenceStockroom)]);
                    }
                }
                else {
                    //None of the above logic found a task to update, we don't expect this to happen
                    lineErrorMessage = gs.getMessage(this.MESSAGE_FAIL_TASK_FALLBACK, [scannedAssetID]);
                }
            }
        }

        response = {
            "lineInfoMessage": lineInfoMessage,
            "lineErrorMessage": lineErrorMessage
        };
        return response;
    },

	/*
     * Replaces the asset of a swappable record such as an Active Consume Asset task or 
	 * Draft Transfer Order Line with another available asset in the same stockroom
	 * Returns updated recordGR if asset swapped, false if not swapped
     * @parameter - recordGR: GlideRecord of record referencing the asset to be swapped
     * @parameter - assetField: the field name on the GlideRecord containing the asset reference
     * @parameter - stockroomField: the field name on the GlideRecord containing the stockroom to swap from
    */ 
	replaceExistingAsset: function(recordGR, modelField, assetField, stockroomField){
		if(!recordGR || !recordGR.sys_id || !recordGR.getValue(modelField) || !recordGR.getValue(assetField) || !recordGR.getValue(stockroomField))
			return false;
		
		var oldAssetGr = new GlideRecord("alm_asset");
		if (!oldAssetGr.get(recordGR.getValue(assetField)))
			return false;

		var substitutes = new global.WrightHAMSourcingLogic().getModelSubstitutes(recordGR.getValue(modelField), true);

		//Let's check if there is a valid replacement asset for the model/substitutes of the record
		var replacementAsset = new GlideRecord("alm_asset");
		replacementAsset.addQuery("stockroom", recordGR.getValue(stockroomField));
		replacementAsset.addQuery("install_status", sn_hamp.HAMConstants.ASSET_STATUSES.IN_STOCK);
		replacementAsset.addQuery("substatus", sn_hamp.HAMConstants.ASSET_SUB_STATUSES.AVAILABLE);
		replacementAsset.addQuery("model", "IN", substitutes.toString());
		replacementAsset.setLimit(1);
		replacementAsset.query();

		if(!replacementAsset.next())
			return false;
		
		recordGR.setValue(assetField, replacementAsset.getValue("sys_id"));
		recordGR.update();

		return recordGR;

	},

    /*
     * Returns a relevant Asset Tasks available to be updated as part of a scan
     * @parameter - parentID: sys_id of parent record containing the scannable tasks
     * @parameter - scannedAssetID: string result of scan against an asset tag/serial number
     * @parameter - taskTable: the table of the task to be updated
     * @parameter - parentField: the field on the scanned task which contains the reference to the parentID
     * @parameter - encodedQuery: (optional) extra query to apply to the GlideRecord lookup against the tasks
     *                            (e.g. the stage of Transfer order line tasks)
     * @parameter - modelID: (optional) the model of the asset being scanned (if found)
     * @parameter - stockroomField: (optional) the field or dot-walk that contains
     * @parameter - stockroomID: (optional) the model of the asset being scanned (if found)
    */  
    getAvailableAssetTask: function(parentID, scannedAssetID, taskTable, modelField, parentField, encodedQuery, modelID, stockroomField, stockroomID) {

        //First check if this asset ID has already been scanned
        taskGr = new GlideRecord(taskTable);
        taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
        taskGr.addQuery(parentField, parentID);
        taskGr.addQuery(this.SCANNED_ASSET_ID_FIELD_NAME, scannedAssetID);

        if(encodedQuery){
            taskGr.addEncodedQuery(encodedQuery);
        }

        taskGr.setLimit(1);
        taskGr.query();

        if (!taskGr.hasNext()) {
            //If the asset ID has not already been scanned, find a task that has no scan against it with the same model (or a substitute) and in the same stockroom as the scanned asset
            taskGr = new GlideRecord(taskTable);
            taskGr.addActiveQuery();
            taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
            taskGr.addQuery(parentField, parentID);
            taskGr.addQuery(this.SCANNED_ASSET_ID_FIELD_NAME, "");
            taskGr.orderBy("sys_updated_on");

            if(modelID){
                //We're allowing users to scan any of the model's substitutes
                var substitutes = new global.WrightHAMSourcingLogic().getModelSubstitutes(taskGr.getValue(modelField));
                taskGr.addQuery(modelField, "IN", substitutes.toString());
            }
            if(stockroomField && stockroomID){
                taskGr.addQuery(stockroomField, stockroomID);
            }
            if(encodedQuery){
                taskGr.addEncodedQuery(encodedQuery);
            }

            taskGr.setLimit(1);
            taskGr.query();

            if (!taskGr.hasNext()) {
                //If there are no fresh tasks without scans, find the oldest updated task with a failed scan with the same model (or a substitute) and in the same stockroom as the scanned asset
                taskGr = new GlideRecord(taskTable);
                taskGr.addActiveQuery();
                taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
                taskGr.addQuery(parentField, parentID);
                taskGr.addQuery(this.SCANNED_ASSET_ID_FIELD_NAME, "!=", "");
                taskGr.addQuery(this.SCANNED_ASSET_STATUS_FIELD_NAME, "!=", this.STATUS_SUCCESSFUL_EXPECTED);
                taskGr.orderBy("sys_updated_on");

                if(modelID)
                    taskGr.addQuery(modelField, "IN", substitutes.toString());
                if(stockroomField && stockroomID){
                    taskGr.addQuery(stockroomField, stockroomID);
                }
                if(encodedQuery){
                    taskGr.addEncodedQuery(encodedQuery);
                }

                taskGr.setLimit(1);
                taskGr.query();

                if(!taskGr.hasNext() && modelID){
                    //If the asset ID has not already been scanned, find a task that has no scan against it against any model in the same stockroom as the scanned asset
                    taskGr = new GlideRecord(taskTable);
                    taskGr.addActiveQuery();
                    taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
                    taskGr.addQuery(parentField, parentID);
                    taskGr.addQuery(this.SCANNED_ASSET_ID_FIELD_NAME, "");
                    taskGr.orderBy("sys_updated_on");

                    if(stockroomField && stockroomID){
                        taskGr.addQuery(stockroomField, stockroomID);
                    }
                    if(encodedQuery){
                        taskGr.addEncodedQuery(encodedQuery);
                    }

                    taskGr.setLimit(1);
                    taskGr.query();

                    if (!taskGr.hasNext()) {
                        //If there are no fresh tasks without scans, find the oldest updated task with a failed scan against any model in the same stockroom as the scanned asset
                        taskGr = new GlideRecord(taskTable);
                        taskGr.addActiveQuery();
                        taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
                        taskGr.addQuery(parentField, parentID);
                        taskGr.addQuery(this.SCANNED_ASSET_ID_FIELD_NAME, "!=", "");
                        taskGr.addQuery(this.SCANNED_ASSET_STATUS_FIELD_NAME, "!=", this.STATUS_SUCCESSFUL_EXPECTED);
                        taskGr.orderBy("sys_updated_on");

                        if(stockroomField && stockroomID){
                            taskGr.addQuery(stockroomField, stockroomID);
                        }
                        if(encodedQuery){
                            taskGr.addEncodedQuery(encodedQuery);
                        }

                        taskGr.setLimit(1);
                        taskGr.query();
                    }
                }
                if(!taskGr.hasNext() && modelID || (stockroomField && stockroomID)){
                    
                    //If the asset ID has not already been scanned, find a task that has no scan against it against any model or stockroom
                    taskGr = new GlideRecord(taskTable);
                    taskGr.addActiveQuery();
                    taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
                    taskGr.addQuery(parentField, parentID);
                    taskGr.addQuery(this.SCANNED_ASSET_ID_FIELD_NAME, "");
                    taskGr.orderBy("sys_updated_on");

                    if(encodedQuery){
                        taskGr.addEncodedQuery(encodedQuery);
                    }

                    taskGr.setLimit(1);
                    taskGr.query();

                    if (!taskGr.hasNext()) {
                        //If there are no fresh tasks without scans, find the oldest updated task with a failed scan against any model or stockroom
                        taskGr = new GlideRecord(taskTable);
                        taskGr.addActiveQuery();
                        taskGr.addEncodedQuery(modelField + this.MODEL_EXCLUDE_CONSUMABLES_ENCODED_QUERY);
                        taskGr.addQuery(parentField, parentID);
                        taskGr.addQuery(this.SCANNED_ASSET_ID_FIELD_NAME, "!=", "");
                        taskGr.addQuery(this.SCANNED_ASSET_STATUS_FIELD_NAME, "!=", this.STATUS_SUCCESSFUL_EXPECTED);
                        taskGr.orderBy("sys_updated_on");
                        
                        if(encodedQuery){
                            taskGr.addEncodedQuery(encodedQuery);
                        }

                        taskGr.setLimit(1);
                        taskGr.query();
                    }
                }
            }
        }
        return taskGr;
    },

    type: 'HAMScanningUtils'
};