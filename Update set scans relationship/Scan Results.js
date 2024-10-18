(function refineQuery(current, parent) {

	//Set Applies to table to Update set [sys_update_set]
	//Set Queries from table to Scan Result [scan_result]

	/*
	 * This script looks up scan findings related to an update set
	 * First it looks up scan_target records related to the update set
	 * Then it looks up scan_combo records related to those scan_targets
	 * Finally it adds query conditions to the scan_result query to show scan results
	 * from the scan_combo records
	 */

	var scan_target = new GlideRecord("scan_target");
    scan_target.addQuery("record_id",parent.sys_id.toString());
    scan_target.query();
    var targetIDs = [];
    while(scan_target.next()){
        targetIDs.push(scan_target.getValue("sys_id"))
    }
    if(targetIDs.length){

        var scan_combo = new GlideRecord("scan_combo");
        var comboOrQuery = scan_combo.addQuery("targetsLIKE" + targetIDs[0]);
		//This array loop starts at 1 instead of 0 since we've already added the first
		//targetID to the query, and the rest will be orConditions
        for (var i = 1; i < targetIDs.length; i++) {
            comboOrQuery.addOrCondition("targetsLIKE" + targetIDs[i]);
        }
        
        scan_combo.query();
        if(scan_combo.next()){
            var OrQuery = current.addQuery("combo", scan_combo.sys_id.toString());
        }
        else{
			//This will not return any results to show in the related list
            current.addQuery("sys_id", "doesnotexist");
        }
        while(scan_combo.next()){
			//We have a while as well as an if so that the first row returned sets up
			//the orQuery, and the rest of the rows add to the orQuery
            OrQuery.addOrCondition("combo", scan_combo.sys_id.toString());
        }
    }
    else{
		//This will not return any results to show in the related list
        current.addQuery("sys_id", "doesnotexist");
    }

})(current, parent);