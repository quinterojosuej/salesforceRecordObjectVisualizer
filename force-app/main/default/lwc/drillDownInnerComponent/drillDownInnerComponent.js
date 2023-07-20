import { LightningElement, api } from 'lwc';

import getObjectVisualizer from '@salesforce/apex/accVisualizerUtilities.getObjectVisualizer' // gets custom object to drill with

export default class DrillDownInnerComponent extends LightningElement {
    @api incomingRecord;
    @api incomingOjectName;
    @api outgoingObj;

    @api standards = {  // for sizing and spacing, basically constants apart of the vertical_lengths
        "vertical_text_offset": 10, // used for the words
        "rect_width": 60.5, // these are the current dimensions of the rectangles
        "rect_height": 20.5,
        "rect_y": 35.5,
        "rect_x": 70.5,
        "vertical_lengths": 
            {
                0: 1 // the key is the y val and the value is how many at that y val
            }
        

    };

    @api orderObj = {}; // will house what is the running structure of the data;
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
        // get max width and height of parent container to set the dimensions
        let parentOfCanvas = this.template.querySelector('div'); // there is only one div ya know
        (await (this.getCanvas())).setAttribute('width', parentOfCanvas.getBoundingClientRect().width);
        (await (this.getCanvas())).setAttribute('height', parentOfCanvas.getBoundingClientRect().height*2);
        // start with drawing parent square and text
        await this.drawParent();
    }

    // param is the object we are working with here
    async drillDown(drillObj) { // will try to get all the correspoding object's lookups
        // this next part is to handle a populated row of values getting more 
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

        // iterate over the objects lookups, also turn to a list of strings before hand lol
        console.log('before the drillObj iterations:', JSON.stringify(drillObj["lookups"]));
        // console.log(JSON.stringify(drillObj["lookups"].split(/\r\n|\r|\n/g)))
        let currXInd=0;
        if(drillObj["lookups"]){
            // drillObj["lookups"] = drillObj["lookups"].split(/\r\n|\r|\n/g);
            drillObj["lookups"].forEach( async (val, ind) => {
                // check no DUPLICATE values, like self referencing cases
                if(!(this.orderObj[val])) {
                
                // query for each lookup 
                let checkMeta = await this.checkGetCorrespondingMetadata(val);
                console.log("drillDown checkMeta:", checkMeta)
                if(Object.keys(checkMeta) != 0) { // add it to the order obj
                    // console.log('inside first if:', checkMeta.MasterLabel, '(y,x)', drillObj["nestValY"]+1, ind + nestValXOffSet)
                    this.orderObj[val] = {
                        "objName": checkMeta.MasterLabel,
                        "devName": checkMeta.DeveloperName__c,
                        "Id": checkMeta.Id,
                        // "lookups": checkMeta.Object_Related_Objects__c.split(/\r\n/g),
                        "lookups": checkMeta.Object_Related_Objects__c ? checkMeta.Object_Related_Objects__c.split(/\r\n|\r|\n/g) : [],
                        "nestValX": currXInd + nestValXOffSet, // it is the first one after all
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
                        "nestValX": currXInd + nestValXOffSet, // it is the first one after all
                        "nestValY": drillObj["nestValY"]+1,
                        "parent": drillObj["objName"],
                        "parentDevName": drillObj["devName"]
                    }
                    this.drawer(this.orderObj[val])
                }
                currXInd = currXInd +1;
            }
            else{
                console.log('duplicate value filtered:', val)
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
                "nestValX": 0, // it is the parent after all
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
        canvas.rect(toDrawData["nestValX"]*this.standards["rect_x"], 
        toDrawData["nestValY"]*this.standards["rect_y"], 
        this.standards["rect_width"], this.standards["rect_height"]);

        canvas.stroke();
        canvas.fill();
        console.log('finished making rectangle');

        // draw words second
        canvas.font = '10px Sans-serif';
        canvas.strokeStyle = 'black';
        canvas.lineWidth = 2;

        // it goes (text, x, y)
        canvas.strokeText(toDrawData["objName"], toDrawData["nestValX"]*this.standards["rect_x"], toDrawData["nestValY"]*this.standards['rect_y']+this.standards['vertical_text_offset']);
        canvas.fillStyle = 'white';
        canvas.fillText(toDrawData["objName"], toDrawData["nestValX"]*this.standards["rect_x"], toDrawData["nestValY"]*this.standards['rect_y']+this.standards['vertical_text_offset']);
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
        canvas.rect(0 * this.standards["rect_x"], 
        0 * this.standards["rect_y"], 
        this.standards['rect_width'], 
        this.standards['rect_height']);

        canvas.stroke();
        canvas.fill();
        console.log('finished making rectangle');

        // draw words second
        canvas.font = '10px Sans-serif';
        canvas.strokeStyle = 'black';
        canvas.lineWidth = 2;

        // it goes (text, x, y)
        canvas.strokeText(this.orderObj[parent]['objName'], 0*this.standards['rect_x'], 0*this.standards['rect_y']+this.standards['vertical_text_offset']);
        canvas.fillStyle = 'white';
        canvas.fillText(this.orderObj[parent]['objName'], 0*this.standards['rect_x'], 0*this.standards['rect_y']+this.standards['vertical_text_offset']);
        console.log('finished making words')
    }

    async getCanvas() { // to simplify the canvas call
        console.log('in getCanvas');
        return this.template.querySelector('canvas'); // gets the html element
    }

    async hitSendUp(yInd, xInd) { // hit something and need to send to parent
        // first, find what object we are on
        console.log('in the hitSendUp');
        let keys = Object.keys(this.orderObj)
        let hitObj;

        keys.forEach( (key, ind) => { // need a break inside if statement
            console.log('line 205 (y,x)', key, this.orderObj[key]["nestValY"], this.orderObj[key]["nestValX"])
            if(this.orderObj[key]["nestValX"] == xInd && this.orderObj[key]["nestValY"] == yInd) { // should have a break in here..
                console.log('line 207');
                hitObj = { ...this.orderObj[key] };
            }
        })
        console.log('hitSendUp',JSON.stringify(hitObj))
        // second, send it up
        const sendUpEvent = new CustomEvent("objhitevent", { // lowercase mandatory
            detail: hitObj
        });
        // let the trace happen
        await this.traceLines(hitObj)
        // let parent populate
        this.dispatchEvent(sendUpEvent);
    }

    async traceLines(hitObj) {

        console.log('traceLine hitObj', JSON.stringify(hitObj), hitObj['parent'].length, JSON.stringify(this.incomingObjName));
        
        // call the cleaner
        await this.canvasCleaner();
        if(hitObj['objName'] != this.incomingOjectName) {
            console.log('traceLine hitObj is not parent', hitObj['objName'])
            // call the line maker
            await this.lineMaker(hitObj);
        }

    }

    async lineMaker(hitObj) {
        console.log('in the lineMaker, number of verticals', Object.keys(this.standards['vertical_lengths']).length);
        // first thing is to get the parent object until we can't, matches lenght of keys
        let gatheredObjs = [hitObj]; // probably not needed
        let currObj = hitObj;
        
        // gather the ones we will be traversing through, could've drawn the lines here actualy
        Object.keys(this.standards['vertical_lengths']).forEach( ( _, ind) => {
            // console.log('in hte loop of linemaker:', currObj['parent'],JSON.stringify(this.orderObj[hitObj['parent']]))
            if(this.orderObj[currObj['parent']]) {
                currObj = this.orderObj[currObj['parent']]
            }
            else{
                currObj = this.orderObj[currObj['parent']+'__c'] 
            }

            gatheredObjs.push(currObj)
        })

        console.log('gatheredObjs: ', JSON.stringify(gatheredObjs));

        // get the canvas
        let canvas = await this.getCanvas();
        canvas = canvas.getContext('2d')

        let lineStartX = -1;
        let lineStartY = -1
        let lineEndX = -1;
        let lineEndY = -1;
        let tempCalc;
        gatheredObjs.forEach( (val, ind) => {
            // console.log(val);
            if(val && lineEndX != -1) { // skips the null val of the parent first val
                console.log('linEndX is not empty', JSON.stringify(val))
                lineStartX = lineEndX;
                lineStartY = lineEndY;

                lineEndX = val['nestValX'];
                lineEndY = val['nestValY'];
                
                // actually draw
                canvas.beginPath();
                // these work by x, y
                tempCalc = (this.standards['rect_y']*lineEndY) + 2 + this.standards['rect_height']
                // console.log('in the lineMaker tempCalc1: ', tempCalc, lineEndY)
                canvas.moveTo(this.standards['rect_x'] * lineEndX, tempCalc );

                tempCalc = (this.standards['rect_y'] * lineStartY) - 2;
                // console.log('in the lineMaker tempCalc2: ', tempCalc, lineStartY)
                canvas.lineTo(this.standards['rect_x'] * lineStartX, tempCalc);

                canvas.stroke();

            }
            else if(val && lineEndX == -1) { // sets the first val 
                console.log('lineEndX is empty', JSON.stringify(val))
                lineEndX = val['nestValX'];
                lineEndY = val['nestValY'];
            }
        })
    }

    async canvasCleaner() { // will clear the inbetween of the object rows
        console.log('in the canvasClearner')
        let canvas = await this.getCanvas();
        canvas = canvas.getContext("2d");

        Object.keys(this.standards['vertical_lengths']).forEach( (val, ind) => {
            // this one goes x, y, width, height
            canvas.clearRect(0, (ind)*this.standards['rect_y'] + this.standards['rect_height']+1,
             1000, this.standards['rect_y'] - this.standards['rect_height'] - 2)
             // +1 and -2 are because i don't want to draw on top of the objects
        })
        console.log('finished cleaning');
    }

    async noParent() { // this is our event in case no parent meta
        const sendUpEvent = new CustomEvent('noparentevent',  {
            detail: {isParent: false}
        });
        this.dispatchEvent(sendUpEvent);
    }

    @api
    async drillDownParentButtonClicked(someParam) { // someParam is the object from the parent, called by parent
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

    async canvasClick(event) { // this LONG one is for clicking in rectangle
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
            topYVal = yInd * this.standards['rect_y'];
            bottomYVal = (yInd * this.standards['rect_y']) + this.standards['rect_height']*2;

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
                leftXVal = xInd * this.standards['rect_x'];
                rightXVal = (xInd * this.standards['rect_x']) + this.standards['rect_width'];
                
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