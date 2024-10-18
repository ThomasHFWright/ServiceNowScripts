var FlowStageStateUtils = Class.create();
FlowStageStateUtils.prototype = {
    initialize: function() {
    },

	/*
	 * Updates the Stage of an input record and also updates the Stage UI without the need
	 * to use a Flow to control the stages at the top level. Can use subflows and call this script.
	 * Returns a JSON object used by stage_state records to display the Stage UI of Stage fields.
	 * @parameter: flowID (mandatory) - sys_id of the sys_hub_flow record to look up stages from.
	 * @parameter: stage (mandatory) - stage value to update the record to.
	 * @parameter: recordID (mandatory) - sys_id of the record with the Stage to update.
	 * @parameter: finalStageComplete - true/false if true will set the stage being updated to to "complete"
	 * 									if false or null will be in_progress. Set this to true on the last 
	 * 									Stage of the flow.
	 */
	returnStageStatus: function(flowID, stage, recordID, finalStageComplete){

		if(!flowID || !stage || !recordID)
			throw "Invalid inputs, one or more of flowID, stage, or recordID is empty.";

		//Look up all stages related to this flow
		var stageGR = new GlideRecord("sys_hub_flow_stage");
		stageGR.addQuery("flow", flowID);
		stageGR.orderBy('order');
		stageGR.query();

		//Look up the current stage to check the order later for whether stages have been skipped
		var currentStage = new GlideRecord("sys_hub_flow_stage");
		currentStage.addQuery("flow", flowID);
		currentStage.addQuery("value", stage);
		currentStage.setLimit(1);
		currentStage.query();
		if(!currentStage.next())
			throw "Invalid stage: " + stage;
		
		//Look up existing stages which have completed to keep as completed in new object
		var existingStages = new GlideRecord("stage_state");
		existingStages.addQuery("id", recordID);
		existingStages.setLimit(1);
		existingStages.query();
		var hasExistingStages = existingStages.hasNext();
		var existingStagesArr = [];
		var completedStages = [];
		var stageField = "";
		if(existingStages.next()){
			stageField = existingStages.getValue("field");
			existingStagesArr = JSON.parse(existingStages.getValue("stage_status"));
			for (var i = 0; i < existingStagesArr.length; i++) {
				var existingStageObj = existingStagesArr[i];
				if(existingStageObj.status == "complete" || existingStageObj.status == "in_progress"){
					completedStages.push(existingStageObj.stage.value);
				}
			}
		}

		//For every stage against the flow, let's check whether we should display it and populate the right
		//attributes such as state/value/label
		var stageArr = [];
		while(stageGR.next()){

			//Uses Java duration format, e.g. PT300S for 5 minutes
			var duration = "PT" + new GlideDateTime(stageGR.getValue("duration")).getNumericValue()/1000 + "S";

			var stageValue = stageGR.getValue("value");
			var inProgress = false;
			var status = "pending"; //default stages to pending, and override below
			//If the stage looked up equals our input stage
			if(stageValue == stage){
				if(!finalStageComplete){
					//set input stage to in progress
					status = "in_progress";
					inProgress = true;
				}
				else{
					//unless finalStageComplete is true, then set to complete
					status = "complete";
				}
			}
			//If stage already completed previously, keep as complete
			else if(hasExistingStages && completedStages.includes(stageValue)){
				status = "complete";
			}
			//If input stage is later than a stage that has not completed, mark it as skipped
			else if(hasExistingStages && currentStage.order > stageGR.order){
				status = "skipped";
			}

			//Do not show optional stages if they have not completed or are not in progress
			if(stageGR.always_show || status == "complete" || status == "in_progress"){
				var stageObj = {
					"stage": {
						"label": stageGR.getValue("label"),
						"value": stageValue,
						"duration": duration,
						"expected": true,
						"order": stageGR.getValue("order"),
						"statusLabels": JSON.parse(stageGR.getValue("states"))
					},
					"status": status,
					"approvers": [],
					"inProgress": inProgress
				};
				stageArr.push(stageObj);
			}
		}

		var returnObj = {};
		returnObj.stage_state = JSON.stringify(stageArr);
		returnObj.stage_field = stageField;
		return returnObj;

	},

    type: 'FlowStageStateUtils'
};