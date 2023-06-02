import { LightningElement, api, track } from 'lwc';

import getObjectName from '@salesforce/apex/accVisualizerUtilities.getObjectName';
import getRows from '@salesforce/apex/accVisualizerUtilities.getRows';

export default class DrillDownOuterComponent extends LightningElement {
    @api recordId;
    @api objectName;

    @api incomingObjName; // aka it's coming from the child
    @api hasForObjDisplay = false;

    @api queriedData = {};


    async connectedCallback() {// starting point
        this.objectName = await this.getObjectName(this.recordId);
    }

    async getObjectName(idVal) { // TODO finish this with a map or a table of sorts
        // return String(idVal)[0] + String(idVal)[1] + String(idVal)[2];
        return await getObjectName( { incomingRecord : this.recordId } ) //WTF is this??
    }

    async drillDownButtonClick(event) { // child does something async
        await this.template.querySelector('c-drill-down-inner-component').drillDownParentButtonClicked(this.incomingObjName);
    }

    async handleObjHitEvent(event) { 
        this.incomingObjName = event.detail;
        this.hasForObjDisplay = true;
        // on teh HTML we add on+NAME_OF_EVENT={handleObjHitEvent}
        console.log("event on outer component ", this.incomingObjName)

        if(!this.queriedData.hasOwnProperty(this.incomingObjName["objName"])) { // make it
            this.queriedData[this.incomingObjName["objName"]] = {"ids": [], "rows": []}
            // ids is to make the query easier adn the rows is the whole data
        }
        
        // query with the parent obj relationship
        let queryObjName = null;
        let queryObjId = null;
        // check if parent is "parent"
        if(this.incomingObjName["objName"] == this.objectName) {
            queryObjId = [ this.recordId ];
            queryObjName = this.objectName;
        }
        // if not "parent" check if it is in the queriedData
        if(this.queriedData.hasOwnProperty(this.incomingObjName["parent"])){
            queryObjId = this.queriedData[this.incomingObjName["parent"]]["ids"]; // it is a list
            queryObjName = this.incomingObjName["parent"];
        }

        console.log(queryObjId, "queryObjName", queryObjName, "queryObjId:");
        queryObjId.forEach( (val, ind) => {
            console.log(val)
        });
        // use to make query
        if(queryObjId != null && queryObjName != null) {
            console.log('need to make apex query now');
            let tempVal = await getRows( { ids : queryObjId, objName: queryObjName} );
            console.log("tempVal", tempVal)
        }
    }


}