import { LightningElement, api, track } from 'lwc';

import getObjectName from '@salesforce/apex/accVisualizerUtilities.getObjectName';
import getRows from '@salesforce/apex/accVisualizerUtilities.getRows';
import getParentRows from '@salesforce/apex/accVisualizerUtilities.getParentRows';


export default class DrillDownOuterComponent extends LightningElement {
    @api recordId;
    @api objectName;

    @api incomingObj; // aka it's coming from the child
    @api hasForObjDisplay = false;
    @api canDrillDown = false; // this one is coming later as i need to check if there are children
    @api displayData;

    @api queriedData = {}; // it is objectName with list of objects with all data

    columns = [
        { label: 'Id', fieldName: 'Id', type: 'Id' },
        { label: 'Name', fieldName: 'Name', type: 'text' }
    ]

    async connectedCallback() {// starting point
        this.objectName = await this.getObjectName(this.recordId);
    }

    async getObjectName(idVal) { // TODO finish this with a map or a table of sorts
        // return String(idVal)[0] + String(idVal)[1] + String(idVal)[2];
        return await getObjectName( { incomingRecord : this.recordId } ) //WTF is this??
    }

    async drillDownButtonClick(event) { // child does something async
        await this.template.querySelector('c-drill-down-inner-component').drillDownParentButtonClicked(this.incomingObj);
    }

    async handleObjHitEvent(event) { 
        this.incomingObj = event.detail; // come back to rename this to just incomingObj
        // this.hasForObjDisplay = true;
        // on teh HTML we add on+NAME_OF_EVENT={handleObjHitEvent}
        console.log("event on outer component ", JSON.stringify(this.incomingObj))

        if(!this.queriedData.hasOwnProperty(this.incomingObj["objName"])) { // make it
            this.queriedData[this.incomingObj["objName"]] = {"ids": [], "rows": []}
            // ids is to make the query easier adn the rows is the whole data
        }
        
        // query with the parent obj relationship
        let queryObjName = null;
        let queryObjId = null;
        let queryParentObjName = null;
        // check if parent is "parent"
        if(this.incomingObj["objName"] == this.objectName) {
            queryObjId = [ this.recordId ];
            queryObjName = this.objectName;
        }
        // if not original "parent" check if it is in the queriedData
        if(this.queriedData[this.incomingObj["parent"]]){ // might be obsolete if statement? just else should work
            // queryObjId = this.queriedData[this.incomingObj["parent"]]; // fix this
            queryObjId = this.queriedData[this.incomingObj["parent"]].map( (val, ind) => {
                return val.Id;
            })
            queryObjName = this.incomingObj["objName"];
            queryParentObjName = this.incomingObj["parent"]
        }

        console.log(queryObjId, "queryObjName", queryObjName, "queryObjId:");
        queryObjId.forEach( (val, ind) => {
            console.log('QueryObjeId:', val) // to see what is loaded
        });
        // make query
        if( this.incomingObj["parent"].length == 0 && (queryObjId != null && queryObjName != null) ) {
            console.log('true parent apex call');
            this.queriedData[queryObjName] = await getParentRows( { ids : queryObjId, objName: queryObjName} );
            // this.queriedData[queryObjName] = tempVal[0]
            console.log('after get ParentROws:', this.objectName , this.queriedData[this.objectName][0].Id)

        }
        else if(queryObjId != null && queryObjName != null) { // we
            /// go and fix teh getRows and finish implementing
            // need the lookup ids and the lookup obj name and the current obj name
            console.log('child obj apex  call');
            this.queriedData[queryObjName] = await getRows( { ids: queryObjId, objName: queryObjName, parentObjName: queryParentObjName } );
            console.log('after getRows:', this.objectName, this.queriedData[queryObjName]);
        }
        else{ // this is where the user did not bother to click the previous one. remove first drillDown on inner

        }

        this.displayData = this.queriedData[queryObjName]
        if(this.incomingObj.lookups) { // this or a ternary i thinks
            this.canDrillDown = true;
        }
        else{
            this.canDrillDown = false;
        }
        this.hasForObjDisplay = true;

    }


}