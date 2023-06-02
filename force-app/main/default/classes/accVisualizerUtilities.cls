public without sharing class accVisualizerUtilities {
    public accVisualizerUtilities() {

    }

    @AuraEnabled
    public static Object_Visualizer__mdt getObjectVisualizer(string searchObject) {
        Object_Visualizer__mdt obj_visualizer =  [SELECT MasterLabel, Last_Date_Updated__c, Object_Related_Objects__c FROM Object_Visualizer__mdt WHERE MasterLabel=:searchObject LIMIT 1];
        return obj_visualizer;
    }

    @AuraEnabled
    public static string getObjectName(string incomingRecord){
        Id id = Id.valueOf(incomingRecord);
        return String.valueOf(id.getsobjecttype());
    }

    @AuraEnabled
    public static List<SObject> getRows(List<String> ids, String objName) { // change return type later to list<SObject>
        // need to get the fields and then the actual query....
        // SObjectType accountType = Schema.getGlobalDescribe().get(objName); // holds the fields and we get the Account ones
        // Map<String,Schema.SObjectField> mfields = accountType.getDescribe().fields.getMap();
        
        // string tempQuery = 'SELECT '; // use this to make the select part of the query
        // for(string item: mfields.keySet()) {
        //     tempQuery = tempQuery + ' ' + item;
        // }

        // tempQuery = tempQuery + ' FROM ' + objName + ' WHERE Id in '
        String tempQuery = 'SELECT FIELDS(STANDARD) FROM '+ objName +' WHERE '; // this one is temporary! go back to get all fields
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
}