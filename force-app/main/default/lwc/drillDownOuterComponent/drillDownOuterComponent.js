import { LightningElement, api, track } from 'lwc';

import getObjectName from '@salesforce/apex/accVisualizerUtilities.getObjectName';
import getRows from '@salesforce/apex/accVisualizerUtilities.getRows';
import getParentRows from '@salesforce/apex/accVisualizerUtilities.getParentRows';
import getMetaDataLookups from '@salesforce/apex/accVisualizerUtilities.getMetaDataLookups'
import createMetaDataRecord from '@salesforce/apex/accVisualizerUtilities.createMetaDataRecord'
import updateMetadataLookup from '@salesforce/apex/accVisualizerUtilities.updateMetadataLookup'
// this next one is because i'm brute checking the next step... need a better solution
import getObjectVisualizer from '@salesforce/apex/accVisualizerUtilities.getObjectVisualizer' // gets custom object to drill with

export default class DrillDownOuterComponent extends LightningElement {
    @api recordId;
    @api objectName;

    @api parentMetadataMissing = false;

    @api incomingObj; // aka it's coming from the child
    @api hasForObjDisplay = false;
    @api canDrillDown = false; // this one is coming later as i need to check if there are children
    @api displayData;

    @api queriedData = {}; // it is objectName with list of objects with all data

    columns = [
        { label: 'Id', fieldName: 'Id', type: 'Id' },
        { label: 'Name', fieldName: 'Name', type: 'text' },
        { label: 'Link', fieldName: 'Link', type:'url', typeAttributes: { target: '_blank' } }
    ]

    async connectedCallback() {// starting point
        this.objectName = await this.getObjectName(this.recordId);
    }

    async getObjectName(idVal) {
        return await getObjectName( { incomingRecord : this.recordId } ) //WTF is this??
    }

    async drillDownButtonClick(event) { // child does something async
        await this.template.querySelector('c-drill-down-inner-component').drillDownParentButtonClicked(this.incomingObj);
    }

    async attemptDrillDownButtonClick(event) { // this is to check why no lookups :shrugs:
        console.log('in the attemptDrillDownButtonClick', this.incomingObj['objName'])
        // first, distinguish if no metadata or no lookups

        // if no metadata, then make it
        let queueId = null;
        let deploySuccess = false;
        if(this.incomingObj['Id'] === null){
            console.log('Id is null ')
            let lookupOutput = await getMetaDataLookups( { apiName : this.incomingObj['objName']})
            console.log('lookupOutput:', lookupOutput)
            
            // the reason for the ternary is custom vs standard objects, annoying i know
            queueId = await createMetaDataRecord( { apiName: this.incomingObj['objName'].includes('__c') ? this.incomingObj['objName'].replace('__c', '') : this.incomingObj['objName'], lookups: lookupOutput, devName: this.incomingObj['objName']} )
            console.log('in the otherside of createMetaDataRecord', queueId);
            
            if(queueId) {
                while (!deploySuccess) {
                    try{ // oh no... there has to be a better way wtf
                        await getObjectVisualizer( { searchObject : this.incomingObj['objName'] } )
                        deploySuccess = true;

                        await this.template.querySelector('c-drill-down-inner-component').drillDownParentMetadataFix(this.incomingObj['objName']);

                    }
                    catch(err) {
                        console.log('err, try again');
                    }
                }
            }
        }
        // if no lookups then go and check for any
        else if(this.incomingObj['lookups'].length == 0){ // applies to opportunity obj
            console.log('empty lookups', JSON.stringify(this.incomingObj))
            let lookupOutput = await getMetaDataLookups( { apiName : this.incomingObj['objName']});
            console.log('empty lookups after call ', lookupOutput)

            queueId = await updateMetadataLookup( { recordName: this.incomingObj['objName'], lookups: lookupOutput} );
            console.log('in the otherside of updateMetadataLookup', queueId);
            
            if(queueId) {
                while (!deploySuccess) {
                    try{ // oh no... there has to be a better way wtf
                        let temp = await getObjectVisualizer( { searchObject : this.incomingObj['objName'] } )
                        // deploySuccess = await checkStatusOfJobId( { id: queueId} ); // did not work
                        console.log('in hte infinite loop:', JSON.stringify(temp))
                        if(temp.Object_Related_Objects__c.length > 1){ // fck it lol
                            deploySuccess = true;
                        }

                        await this.template.querySelector('c-drill-down-inner-component').drillDownParentMetadataFix(this.incomingObj['objName']);

                    }
                    catch(err) {
                        console.log('err, try again');
                    }
                }
            }
        }
        else{
            console.log("i'm a dumbass, check the ifs before this")
        }
        // no else because, then you wouldn't be here lmao
    }

    async handleObjHitEvent(event) { // need to either turn these to function or like make it simpler somehow
        this.incomingObj = event.detail;
        // this.hasForObjDisplay = true;
        // on teh HTML we add on+NAME_OF_EVENT={handleObjHitEvent}
        console.log("event on outer component ", JSON.stringify(this.incomingObj))

        if(!this.queriedData.hasOwnProperty(this.incomingObj["devName"])) { // make it
            this.queriedData[this.incomingObj["objName"]] = {"ids": [], "rows": []}
            // ids is to make the query easier adn the rows is the whole data
        }
        
        // query with the parent obj relationship
        let queryObjName = null;
        let queryObjId = null;
        let queryParentObjName = null;
        // check if parent object
        if(this.incomingObj["devName"] == this.objectName) { // true dev name
            queryObjId = [ this.recordId ];
            queryObjName = this.objectName;
        }
        // if not root "parent" check if it is in the queriedData
        if(this.queriedData[this.incomingObj["parentDevName"]]){ // might be obsolete if statement? just else should work
            // queryObjId = this.queriedData[this.incomingObj["parent"]]; // fix this
            console.log('this.queriedData[this.incomingObj["parentDevName"]]', JSON.stringify(this.queriedData[this.incomingObj["parentDevName"]]))
            queryObjId = this.queriedData[this.incomingObj["parentDevName"]].map( (val, ind) => {
                return val.Id;
            })
            console.log('line 135')
            queryObjName = this.incomingObj["devName"];
            queryParentObjName = this.incomingObj["parentDevName"];
        }

        console.log("queryObjName", queryObjName, "queryObjId:",queryObjId, ); // to see what's here
        queryObjId.forEach( (val, ind) => {
            console.log('QueryObjeId:', val) // to see what is loaded
        });

        // make query, first is parent 
        if( this.incomingObj["parentDevName"].length == 0 && (queryObjId != null && queryObjName != null) ) {
            console.log('true parent apex call');
            this.queriedData[queryObjName] = await getParentRows( { ids : queryObjId, devName: queryObjName} );
            // tempVal = await getParentRows( { ids : queryObjId, objName: queryObjName} );
            // this.queriedData[queryObjName] = tempVal[0]
            console.log('after get ParentROws:', this.objectName , this.queriedData[this.objectName][0].Id)
            // console.log('after get ParentROws:', this.objectName , tempVal[this.objectName][0].Id)
        }
        else if(queryObjId != null && queryObjName != null) { // this one for child objs
            /// go and fix teh getRows and finish implementing
            // need the lookup ids and the lookup obj name and the current obj name
            console.log('child obj apex  call queryObjId:', queryObjId.length);
            // List<String> ids, String devName, String parentDevName
            this.queriedData[queryObjName] = await getRows( { ids: queryObjId, devName: this.incomingObj['devName'], parentDevName: this.incomingObj['parentDevName'] } );

            // console.log('after getRows:', this.objectName, tempVal);
            console.log('after getRows:', this.objectName, JSON.stringify(this.queriedData[queryObjName]));

        }
        else{ // this is where the user did not bother to click the previous one. remove first drillDown on inner
            // mayber needed???
            
        }

        if (this.queriedData[queryObjName] && this.queriedData[queryObjName].length > 0) { // aka we got something

            this.queriedData[queryObjName].forEach( (val, ind) => { // to make the link
                val['Link'] = '/' + val.Id;
            })

            this.displayData = this.queriedData[queryObjName]
            if(this.incomingObj.lookups.length > 0) { // this or a ternary i thinks
                this.canDrillDown = true;
            }
            else{ // obviously if we don't have any lookups. then no drill downs
                this.canDrillDown = false;
            }
            this.hasForObjDisplay = true;

        }
        else{ 
            this.displayData = queryObjName
            this.hasForObjDisplay = false;
            this.canDrillDown = false;

            this.queriedData[queryObjName] = null;
        }
    }

    async handleNoParentEvent(event) {
        console.log('handleNoParentEvent', event);
        this.parentMetadataMissing = true;
        
        let lookupOutput = await getMetaDataLookups( { apiName : this.objectName})
        console.log('lookupOutput:', lookupOutput)
        let queueId = await createMetaDataRecord( { apiName: this.objectName.includes('__c') ? this.objectName.replace('__c', '') : this.objectName, lookups: lookupOutput, devName: this.objectName} )
        console.log('in the otherside of noParent', queueId);
        let deploySuccess = false;
        
        if(queueId) {
            while (!deploySuccess) {
                try{ // i mean... u know what. it works :shrugs:
                    await getObjectVisualizer( { searchObject : this.objectName } )
                    deploySuccess = true;

                    // await this.template.querySelector('c-drill-down-inner-component').drillDownParentMetadataFix(this.incomingObj['objName']);
                    this.parentMetadataMissing = false; // succesfully got something!

                }
                catch(err) {
                    console.log('err, try again');
                }
            }
        }
        // end of sequence 
    }


}