var WrightHAMSourcingLogic = Class.create();
WrightHAMSourcingLogic.prototype = {
    initialize: function() {
    },

	//Copied from the global.AssetUsageFilters EAM script include for use in HAM
	//Modified to include "returnArray" parameter
	//Looks up all the substitute models from a given model
	//model should be model sys_id
	//returnArray (optional) - set to true to return an array of model sys_ids instead of a comma-separated string
	getModelSubstitutes: function(model, returnArray) {
		
        var models = [];
        models.push(model);

        var modelSubstitutes = new GlideRecord("cmdb_m2m_model_substitute");
        modelSubstitutes.addQuery("model", model);
        modelSubstitutes.query();
        while (modelSubstitutes.next()) {
            models.push(modelSubstitutes.getValue("substitute"));
        }
        if(!returnArray)
            return models.toString();
        else
            return models;
    },

	//Looks up all the models that a model is a substitute of
	//Opposite of getModelSubstitutes above
	//model should be model sys_id
	//returnArray (optional) - set to true to return an array of model sys_ids instead of a comma-separated string
	getModelsModelIsASubstituteOf: function(model, returnArray) {
		var models = [];
        models.push(model);

        var modelSubstitutes = new GlideRecord("cmdb_m2m_model_substitute");
        modelSubstitutes.addQuery("substitute", model);
        modelSubstitutes.query();
        while (modelSubstitutes.next()) {
            models.push(modelSubstitutes.getValue("model"));
        }
        if(!returnArray)
            return models.toString();
        else
            return models;
	},

	//Copied and edited from the global.AssetUtils script include
	//Edited to use the getModelSubstitutes function
    getFirstItem: function(model, stockroom, status, substatus) {
        var gr = new GlideRecord('alm_asset');
        global.AssetUtils.addAssetQuery(gr, global.AssetUtils.ASSET_FUNCTION_FEATURE.SOURCING);
        gr.addQuery('model', 'IN', this.getModelSubstitutes(model.sys_id));
        gr.addQuery('install_status', status);
        gr.addQuery('substatus', substatus);
        gr.addQuery('stockroom', stockroom);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            return gr.sys_id;
        }
        throw gs.getMessage('{0} asset in State - {1} and Subsate - {2} not found',
            [model.display_name, status, substatus]);
    },

	//Copied and edited from the global.AssetUtils script include
	//Edited to use the getModelSubstitutes function
    getAvailableQuantity: function(modelSid, stockroomSid) {
        var gr = new GlideAggregate('alm_asset');
        var counter = 0;
        global.AssetUtils.addAssetQuery(gr, global.AssetUtils.ASSET_FUNCTION_FEATURE.SOURCING);
        gr.addQuery('model', 'IN', this.getModelSubstitutes(modelSid));
        gr.addQuery('install_status', '6');
        gr.addQuery('substatus', 'available');
        gr.addQuery('stockroom', stockroomSid);
        gr.addAggregate('SUM', 'quantity');
        gr.groupBy('stockroom');
        gr.query();
        if (gr.next())
            counter = gr.getAggregate('SUM', 'quantity');
        return counter;
    },

    type: 'WrightHAMSourcingLogic'
};