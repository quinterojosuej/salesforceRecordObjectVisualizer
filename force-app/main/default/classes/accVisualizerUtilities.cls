public without sharing class accVisualizerUtilities {
    public accVisualizerUtilities() {

    }

    @AuraEnabled
    public static Object_Visualizer__mdt getObjectVisualizer(string searchObject) {

        Object_Visualizer__mdt obj_visualizer = [SELECT MasterLabel, Last_Date_Updated__c, Object_Related_Objects__c, DeveloperName__c FROM Object_Visualizer__mdt WHERE DeveloperName__c=:searchObject LIMIT 1];
        return obj_visualizer;
  
    }

    // @AuraEnabled
    // public static String checkStatusOfJobId(String id){
    //     DeployRequest deployRequest = [SELECT Id, Status, StartDate, CompletedDate FROM DeployRequest WHERE Id=:id];
    //     return deployRequest.Status;
    // }

    @AuraEnabled
    public static string getObjectName(string incomingRecord){
        Id id = Id.valueOf(incomingRecord);
        return String.valueOf(id.getsobjecttype());
    }

    @AuraEnabled
    public static List<SObject> getParentRows(List<String> ids, String devName){

        String tempQuery = 'SELECT FIELDS(STANDARD) FROM '+ devName +' WHERE '; // this one is temporary! go back to get all fields
        Iterator<String> strIdIter = ids.iterator();
        string id;
        while(strIdIter.hasNext()) {

            id = strIdIter.next();
            tempQuery = tempQuery + 'Id=\'' + id + '\'';
            if (strIdIter.hasNext()) {
                tempQuery = tempQuery + ' OR ';
            }
        }

        List<SObject> rowsToReturn = Database.query(tempQuery);
        return rowsToReturn;

    }

    @AuraEnabled
    public static List<SObject> getRows(List<String> ids, String devName, String parentDevName) { // change return type later to list<SObject>
        // need to get the fields and then the actual query....

        // tempQuery = tempQuery + ' FROM ' + objName + ' WHERE Id in '
        String tempQuery = 'SELECT FIELDS(STANDARD) FROM '+ devName +' WHERE '; // this one is temporary! go back to get all fields
        Iterator<String> strIdIter = ids.iterator();
        string id;
        while(strIdIter.hasNext()) {

            id = strIdIter.next();
            tempQuery = tempQuery + parentDevName +'.Id=\'' + id + '\''; // should 
            if (strIdIter.hasNext()) {
                tempQuery = tempQuery + ' OR ';
            }
        }

        List<SObject> rowsToReturn = new List<SObject>();

        try {
            rowsToReturn = Database.query(tempQuery);
        } catch(QueryException err) {
            // the object is not there
            return new List<SObject>();
        }
        return rowsToReturn;
    }

    @AuraEnabled
    public static string getMetaDataLookups(String apiName){

        String toReturn = '';
        
        Map<String, Schema.SObjectType> schemaMeta = Schema.getGlobalDescribe();
        Schema.DescribeSObjectResult accountDescribe = schemaMeta.get(apiName).getDescribe();
        // the child relations!
        Schema.ChildRelationship[] childRelationships = accountDescribe.getChildRelationships();

        for(Schema.ChildRelationship childRel : childRelationships) {
            // Gets the child object name
            Schema.SObjectType childName = childRel.getChildSObject();
            // gets the field name 
            Schema.SObjectField fieldName = childRel.getField();
            // gets the relationship name
            String relName = childRel.getRelationshipName();
            if(relName != null && 
            (relName != 'AttachedContentDocuments' && relName != 'Attachments' && relName != 'RecordAssociatedGroups' && 
            relName != 'CombinedAttachments' && relName !='ContactRequests' && relName !='ContentDocumentLinks' && relName !='FeedSubscriptionsForEntity' &&
            relName != 'Notes' && relName != 'NotesAndAttachments' && relName != 'Feeds' && relName != 'Histories' && relName !='OpportunityHistories' &&
            relName != 'Shares' && relName != 'ProcessInstances' && relName != 'ProcessSteps' && relName != 'RecordActions' && relName != 'RecordActionHistories' &&
            relName != 'TopicAssignments')
            ) {
                Schema.DescribeFieldResult fieldDescribe = fieldName.getDescribe();
                Integer fieldDisplayType = fieldDescribe.getRelationshipOrder();
                //if(relName.contains('__r') ) { // relation objects use __r
                    // toReturn = toReturn +'displayType:'+ fieldDisplayType + ', relName:' + relName + ', fieldName:' + fieldName + ',childName:' + childName +'\n';
                    toReturn = toReturn + relName + '\r\n';
                //}
            }
            
        }
        return toReturn;
    }

    @AuraEnabled
    public static Id createMetaDataRecord(String apiName, String lookups, String devName){
        
        return createMetadata.createAccVisualizerMetadata(apiName, lookups, devName);
    }

    @AuraEnabled
    public static Id updateMetadataLookup(String recordName, String lookups) {

        return createMetadata.updateAccVisualizerLookups(recordName, lookups);
    }
}