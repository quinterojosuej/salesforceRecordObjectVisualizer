import { LightningElement, api } from 'lwc';

import getObjectVisualizer from '@salesforce/apex/accVisualizerUtilities.getObjectVisualizer' // gets custom object to drill with

export default class DrillDownInnerComponent extends LightningElement {
    @api incomingRecord;
    @api incomingOjectName;
    @api outgoingObj;

    @api standards = {  // for sizing and spacing, basically constants apart of the vertical_lengths
        "horizontal_sizing": 60,
        "vertical_sizing": 20, 
        "horizontal_edge_spacing": 15,
        "vertical_edge_spacing": 15, // used in parent
        "vertical_text_offset": 10, // used in parent
        "horizontal_spacing": 75, // this one is just the horizontal size plus the edge spacing
        "vertical_spacing": 45, // this one is just vertical the size plus hte edge spacing
        "vertical_lengths": 
            {
                0: 1 // the key is the y val and the value is how many at that y val
            }
        

    };

    @api orderObj = {}; // will house what is the structure of the data;
    // example one:
    // this.orderObj[val] = {
    //     "objName": STRING,
    //     "devName": STRING
    //     "Id": Id,
    //     "lookups": [STRING, STRING],
    //     "nestValX": ###, // it is the first one after all
    //     "nestValY": ####,
    //     "parent": STRING
    // }

    async connectedCallback() {
        let metaOutput = await this.checkGetCorrespondingMetadata(String(this.incomingOjectName));
        if(Object.keys(metaOutput).length != 0) { // there is data
            await this.startOrderObj(metaOutput);
            await this.startCanvas();
        } else{ // no data, send it back up! 
            await this.noParent()
        }

        // await this.drillDown(this.orderObj[this.orderObj["parentObj"]]); // the parentObj is just label
    }

    async startCanvas() {
        // start with drawing parent square and text
        await this.drawParent();
    }

    // param is the object we are working with here
    async drillDown(drillObj) { // will try to get all the correspoding object's lookups
        // needed for when user drills down one object and then the next one
        let nestValXOffSet = 0
        if(this.standards['vertical_lengths'][drillObj['nestValY'] + 1]){ // we have it and now need to add the offset
            console.log('drillDown adding more items to row')
            nestValXOffSet = this.standards['vertical_lengths'][drillObj['nestValY'] + 1]
            this.standards['vertical_lengths'][drillObj['nestValY'] + 1] += drillObj['lookups'].length;
            console.log('drillDown adding more items to row. new length:', this.standards['vertical_lengths'][drillObj['nestValY'] + 1]-drillObj['lookups'].length, 'added length:', drillObj['lookups'].length)
        }
        else{
            this.standards['vertical_lengths'][drillObj['nestValY'] + 1] = drillObj['lookups'].length;
            console.log('drillDown first for the row.', drillObj['nestValY'] + 1 , this.standards['vertical_lengths'][drillObj['nestValY'] + 1])
        }

        // iterate over the objects lookups, also turn to like a list of strings before hand lol
        console.log('before the drillObj iterations:', JSON.stringify(drillObj["lookups"]));
        // console.log(JSON.stringify(drillObj["lookups"].split(/\r\n|\r|\n/g)))
        if(drillObj["lookups"]){
            // drillObj["lookups"] = drillObj["lookups"].split(/\r\n|\r|\n/g);
            drillObj["lookups"].forEach( async (val, ind) => {
                // query each lookup 
                let checkMeta = await this.checkGetCorrespondingMetadata(val);
                console.log("drillDown checkMeta:", checkMeta)
                if(Object.keys(checkMeta) != 0) { // add it to the order obj
                    this.orderObj[val] = {
                        "objName": checkMeta.MasterLabel,
                        "devName": checkMeta.DeveloperName__c,
                        "Id": checkMeta.Id,
                        // "lookups": checkMeta.Object_Related_Objects__c.split(/\r\n/g),
                        "lookups": checkMeta.Object_Related_Objects__c ? checkMeta.Object_Related_Objects__c.split(/\r\n|\r|\n/g) : [],
                        "nestValX": ind + nestValXOffSet, // it is the first one after all
                        "nestValY": drillObj["nestValY"]+1,
                        "parent": drillObj["objName"],
                        "parentDevName": drillObj["devName"]
                    }
                    this.drawer(this.orderObj[val])
                }
                else {
                    this.orderObj[val] = {
                        "objName": val,
                        "devName": null,
                        "Id": null,
                        "lookups": null,
                        "nestValX": ind + nestValXOffSet, // it is the first one after all
                        "nestValY": drillObj["nestValY"]+1,
                        "parent": drillObj["objName"],
                        "parentDevName": drillObj["devName"]
                    }
                    this.drawer(this.orderObj[val])
                }
                
            })
        }


    }

    async startOrderObj(metaOutput) { 
        this.orderObj["parentObj"] = metaOutput.MasterLabel;

        this.orderObj[metaOutput.MasterLabel] = { // add the object in question
                "objName": metaOutput.MasterLabel,
                "devName": metaOutput.DeveloperName__c,
                "Id": metaOutput.Id,
                "lookups": metaOutput.Object_Related_Objects__c.split(/\r\n|\r|\n/g),
                "nestValX": 0, // it is the first one after all
                "nestValY": 0,
                "parent": [],
                "parentDevName": '',
        }
        // stuff just won't console.log, just loop
        this.orderObj[this.orderObj["parentObj"]]['lookups'].forEach( (val, ind) => { console.log(ind, val) });
        console.log("this.orderObj", this.orderObj["parentObj"])
    }

    async drawer(toDrawData) {
        console.log('drawer:', toDrawData['objName']);
        let canvas = await this.getCanvas();
        canvas = canvas.getContext("2d");
        canvas.beginPath();
        console.log('path began')

        // draw rectangle first
        canvas.fillStyle = 'hsl('+ String(toDrawData["nestValY"]*15) +',95%,50%)';
        // it goes x, y, width, height
        canvas.rect(toDrawData["nestValX"]*this.standards["horizontal_spacing"]+this.standards["horizontal_edge_spacing"], 
        toDrawData["nestValY"]*this.standards["vertical_spacing"], 
        this.standards["horizontal_sizing"], this.standards["vertical_sizing"]);

        canvas.stroke();
        canvas.fill();
        console.log('finished making rectangle');

        // draw words second
        canvas.font = '10px Sans-serif';
        canvas.strokeStyle = 'black';
        canvas.lineWidth = 2;
        // it goes (text, x, y)
        canvas.strokeText(toDrawData["objName"], toDrawData["nestValX"]*this.standards["horizontal_spacing"]+this.standards["horizontal_edge_spacing"], toDrawData["nestValY"]*this.standards['vertical_spacing']+this.standards['vertical_text_offset']);
        canvas.fillStyle = 'white';
        canvas.fillText(toDrawData["objName"], toDrawData["nestValX"]*this.standards["horizontal_spacing"]+this.standards["horizontal_edge_spacing"], toDrawData["nestValY"]*this.standards['vertical_spacing']+this.standards['vertical_text_offset']);
        console.log('finished making words')
    }

    async drawParent() {
        let parent = this.orderObj["parentObj"];
        let canvas = await this.getCanvas();
        canvas = canvas.getContext("2d");
        canvas.beginPath();

        // draw rectangle first
        canvas.fillStyle = 'hsl('+ String(this.orderObj[parent]["nestValY"]*15) +',95%,50%)';
        // it goes x, y, width, height
        // canvas.rect(this.orderObj[parent]["nestValX"]*30+10, this.orderObj[parent]["nestValY"]*30+10, 30, 20);
        canvas.rect(this.standards["horizontal_edge_spacing"], 
        this.standards["vertical_edge_spacing"], 
        this.standards['horizontal_sizing'], 
        this.standards['vertical_sizing']);

        canvas.stroke();
        canvas.fill();
        console.log('finished making rectangle');

        // draw words second
        canvas.font = '10px Sans-serif';
        canvas.strokeStyle = 'black';
        canvas.lineWidth = 2;
        // it goes (text, x, y)
        // canvas.strokeText(this.orderObj[parent]["objName"], this.orderObj[parent]["nestValX"]*30+10, this.orderObj[parent]["nestValY"]*30+20);
        canvas.strokeText(this.orderObj[parent]['objName'], this.standards['horizontal_edge_spacing'], this.standards['vertical_edge_spacing']+this.standards['vertical_text_offset']);
        canvas.fillStyle = 'white';
        // canvas.fillText(this.orderObj[parent]["objName"], this.orderObj[parent]["nestValX"]*30+10, this.orderObj[parent]["nestValY"]*30+20);
        canvas.fillText(this.orderObj[parent]['objName'], this.standards['horizontal_edge_spacing'], this.standards['vertical_edge_spacing']+this.standards['vertical_text_offset']);
        console.log('finished making words')
    }

    async drawSomething() {
        let canvas = await this.getCanvas().getContext("2d");
        console.log('in the drawSomething');
        canvas.beginPath();
        canvas.fillStyle = '#D3D3D3';
        console.log('part of the drawSomething26')

        canvas.rect(10, 10, canvas.measureText("Hello world").width+10, 20); // it goes x, y, width, height
        canvas.stroke();
        canvas.fill();

        canvas.fillStyle = '#000000';
        canvas.font = "serif";
        canvas.fillText("Hello world", 20, 20); // it goes text, x, y

        console.log('end of the thing i guess');
    }

    async getCanvas() { // to get the context of our canvas
        console.log('in the getCanvas');
        return this.template.querySelector('canvas'); // gets the html
    }

    async hitSendUp(yInd, xInd) { // come back and fix this
        // first, find what object we are on
        console.log('in the hitSendUp');
        let keys = Object.keys(this.orderObj)
        let hitObj;

        keys.forEach( (key, ind) => { // need a break inside if statement
            // console.log('line 193', key, this.orderObj[key]["nestValX"], this.orderObj[key]["nestValX"])
            if(this.orderObj[key]["nestValX"] == xInd && this.orderObj[key]["nestValY"] == yInd) { // should have a break in here..
                console.log('line 194');
                hitObj = { ...this.orderObj[key] };
            }
        })
        console.log('hitSendUp',JSON.stringify(hitObj))
        // second, send it up
        const sendUpEvent = new CustomEvent("objhitevent", { // lowercase mandatory
            detail: hitObj
          });

        this.dispatchEvent(sendUpEvent);
    }

    async noParent() {
        const sendUpEvent = new CustomEvent('noparentevent',  {
            detail: {isParent: false}
        });
        this.dispatchEvent(sendUpEvent);
    }

    @api
    async drillDownParentButtonClicked(someParam) { // someParam is the object from the parent
        console.log('drill down clicked, param:', someParam.objName)
        await this.drillDown(someParam)
    }

    @api
    async drillDownParentMetadataFix(fromParent) {
        // object already drawn, just populate the structure and send up again
        console.log('drillDownParentMetadataFix', fromParent);
        let tempMeta = await this.checkGetCorrespondingMetadata(fromParent)
        
        this.orderObj[fromParent]['Id'] = tempMeta['Id'];
        this.orderObj[fromParent]['devName'] = tempMeta['DeveloperName__c'];
        this.orderObj[fromParent]["lookups"] = tempMeta['Object_Related_Objects__c'].split(/\r\n|\r|\n/g);
        console.log('drillDownMetadataFix:', JSON.stringify(tempMeta))
        // now that we populated the thing, send it back up
        const sendUpEvent = new CustomEvent("objhitevent", {
            detail: {...this.orderObj[fromParent]}
        });
        this.dispatchEvent(sendUpEvent);
    }

    async checkGetCorrespondingMetadata(incomingObj) {
        try{
            // console.log("this.incomingRecord: ", this.incomingRecord)
            console.log("this.incomingOjectName: ", incomingObj)

            let output = await getObjectVisualizer( { searchObject : incomingObj } );
            console.log("checkGetCorresponding:", output);// it comes as a json object 
            return output;
        }
        catch( e ) {
            console.log('error in checkGetCorresponding:', e);
            return {};
        }

    }

    async canvasClick(event) {
        // console.log('clicked', event); // the event holds the x and y coordinate so we can detect if we click a rect
        let rect = await this.getCanvas()
        rect = rect.getBoundingClientRect(); //fix up the getcanvas 
        let xClick = event.clientX - rect.left;
        let yCLick = event.clientY - rect.top;
        console.log("Coordinate x: " + xClick, 
                    "Coordinate y: " + yCLick)
        
        let topYVal;
        let bottomYVal;
        let leftXVal;
        let rightXVal;

        let Xind = -1; // no negatives are possible
        let Yind = -1; // so it works out later

        // working on new one here
        console.log('vertical_lengths:', JSON.stringify(this.standards['vertical_lengths']))
        Object.keys(this.standards['vertical_lengths']).every( async (yVal, yInd) => {
            // console.log('hitless', yInd) 
            topYVal = yInd * this.standards['vertical_spacing'] + this.standards['vertical_sizing'];
            bottomYVal = (yInd+1) * this.standards['vertical_spacing'];

            if( (yCLick > topYVal) && (yCLick < bottomYVal) ) { // in the y range
                console.log('hit ind:', yInd,'y space to hit: topYval', topYVal, 'bottomYVal', bottomYVal);
                Yind = yInd
                return false;
            }
            else{
                // console.log('no hit ind:', yInd,'y space to hit: topYval', topYVal, 'bottomYVal', bottomYVal);
                return true; // we return false to break out so yeah
            }
        })

        if(Yind > -1) {
            console.log('this.standards[Yind]', JSON.stringify(this.standards.vertical_lengths))
            // console.log('JSON.stringify', JSON.stringify(Array(this.standards[Yind]).fill(0)))
            Array(this.standards.vertical_lengths[String(Yind)]).fill(0).every( (xVal, xInd) => {
                console.log('xInd', xInd);
                leftXVal = xInd * this.standards['horizontal_spacing'] + this.standards['horizontal_edge_spacing'];
                rightXVal = (xInd + 1) * this.standards['horizontal_spacing'];
                
                if(  (xClick > leftXVal) && (xClick < rightXVal) ) {
                    Xind = xInd;
                    return false;
                }
                else{
                    return true;
                }
            })

        }

        if(Xind > -1 && Yind > -1) { // if there is any value
            console.log('Xind:', Xind, 'Yind', Yind);
            await this.hitSendUp(Yind, Xind);
        }
        
    }


}