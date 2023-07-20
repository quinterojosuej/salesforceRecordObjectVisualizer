public class createMetadata implements Metadata.DeployCallback{
    public void handleResult(Metadata.DeployResult result, Metadata.DeployCallbackContext context) {
        if (result.status == Metadata.DeployStatus.Succeeded) { // i should really just have somekind of return. don't konw how tho... this worked
            System.debug(' success : '+ result);
        } else {
            System.debug(' fail : '+ result);
        }
    }

    public static Id updateAccVisualizerLookups(String recordName, String lookups) {
        Object_Visualizer__mdt customMetadataRecord = [SELECT Id, MasterLabel FROM Object_Visualizer__mdt WHERE MasterLabel=:recordName LIMIT 1];
        Metadata.CustomMetadata customMetadata = new Metadata.CustomMetadata();
        customMetadata.fullName = 'Object_Visualizer.' + recordName;
        customMetadata.label = recordName;
        // i only need 1. so i think this is fine tbh
        Metadata.CustomMetadataValue customLookups = new Metadata.CustomMetadataValue();
        customLookups.field = 'Object_Related_Objects__c';
        customLookups.value = lookups;
        customMetadata.values.add(customLookups);

        Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();
        mdContainer.addMetadata(customMetadata);
        createMetadata callback = new createMetadata();
        Id jobId = Metadata.Operations.enqueueDeployment(mdContainer, callback);

        return jobId;
    }

    public static Id createAccVisualizerMetadata(String label, String lookups, String devName) { 
        DateTime nowDateTime = DateTime.now();
        Date nowDate = nowDateTime.date();

        Metadata.CustomMetadata customMetadata =  new Metadata.CustomMetadata();
        customMetadata.fullName = 'Object_Visualizer.' + label; //'Object_Visualizer.Admin';
        customMetadata.label = label; //'Admin';

        // there's a way to automate this, but i only have these 2 so. good for now
        Metadata.CustomMetadataValue customLookups = new Metadata.CustomMetadataValue();
        customLookups.field = 'Object_Related_Objects__c';
        customLookups.value = lookups;//'test';
        customMetadata.values.add(customLookups);
        Metadata.CustomMetadataValue customLastDate = new Metadata.CustomMetadataValue();
        customLastDate.field = 'Last_Date_Updated__c';
        customLastDate.value = nowDate;
        customMetadata.values.add(customLastDate);
        Metadata.CustomMetadataValue customDeveloperName = new Metadata.CustomMetadataValue();
        customDeveloperName.field = 'DeveloperName__c'; 
        customDeveloperName.value = devName; // devName
        customMetadata.values.add(customDeveloperName);

        Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();
        mdContainer.addMetadata(customMetadata);
        createMetadata callback = new createMetadata();
        Id jobId = Metadata.Operations.enqueueDeployment(mdContainer, callback);
        
        return jobId; // gonna query for this one on the other side
    }
}