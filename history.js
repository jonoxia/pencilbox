/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Pencilbox.
 *
 * The Initial Developer of the Original Code is Jono Xia.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Jono X <jono@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

function DrawAction(layer, pointList, styleInfo, isFill) {
    // Expects pointList in world coordinates, like all actions
    this.layer = layer;
    this.ctx = layer.getContext();
    this.pts = pointList;
    this.styleInfo = styleInfo;
    // styleInfo is an object that can contain:
    // .lineWidth, .strokeStyle, .fillStyle, .lineCap
    this.isFill = isFill;
}
DrawAction.prototype = {
    replay: function(newCtx) {
	// call with no arguments to replay in original context, or
	// pass in a context to draw into that context.
	let ctx = newCtx ? newCtx : this.ctx;
        if (this.pts.length > 0) {
	    // TODO next line is slightly wrong: it always uses
	    // this.layer - in some cases actions are replayed to
	    // different layers than they started in so need to take
	    // that into account.
	    let opacity = this.layer.getOpacity();
	    ctx.beginPath();
	    if (this.styleInfo.strokeStyle) {
		// TODO bug: strokeStyle.copy is not a function?
		let strokeColor = this.styleInfo.strokeStyle.copy();
		strokeColor.a *= opacity;
		ctx.strokeStyle = strokeColor.style;
	    }
	    if (this.styleInfo.fillStyle) {
		let fillColor = this.styleInfo.fillStyle.copy();
		fillColor.a *= opacity;
		ctx.fillStyle = fillColor.style;
	    }
	    if (this.styleInfo.lineWidth) {
		ctx.lineWidth = this.styleInfo.lineWidth;
	    }
	    if (this.styleInfo.lineCap) {
		ctx.lineCap = this.styleInfo.lineCap;
	    }
	    if (this.styleInfo.lineCap) {
		ctx.lineJoin = this.styleInfo.lineJoin;
	    }
	    ctx.moveTo(this.pts[0].x, this.pts[0].y);
	    for (let i = 1; i < this.pts.length; i++) {
		ctx.lineTo(this.pts[i].x, this.pts[i].y);
	    }
	    if (this.isFill) {
		ctx.fill();
	    } else {
		ctx.stroke();
	    }
	}
    },

    toJSON: function() {
	let self = this;
	/* Can't save the layer to json as it's a live object ref
	 * Instead, save the layerName which we can use to match
	 * the action back up to the layer when reconstructing. */
	let styleInfo = {};
	if (self.styleInfo.lineWidth != undefined) {
	    styleInfo.lineWidth = self.styleInfo.lineWidth;
	}
	if (self.styleInfo.lineCap != undefined) {
	    styleInfo.lineCap = self.styleInfo.lineCap;
	}
	if (self.styleInfo.strokeStyle != undefined) {
	    styleInfo.strokeStyle = self.styleInfo.strokeStyle.toJSON();
	}
	if (self.styleInfo.fillStyle != undefined) {
	    styleInfo.fillStyle = self.styleInfo.fillStyle.toJSON();
	}
	return {type: "draw",
		layerName: self.layer.getName(),
		points: self.pts,  // already json more or less
		styleInfo: styleInfo,
		isFill: self.isFill,
		};
    },

    restoreStyleFromJSON: function(styleInfo) {
	if (styleInfo.lineWidth != undefined) {
	    this.styleInfo.lineWidth = styleInfo.lineWidth;
	}
	if (styleInfo.lineCap != undefined) {
	    this.styleInfo.lineCap = styleInfo.lineCap;
	}
	if (styleInfo.strokeStyle != undefined) {
	    let color = new Color();
	    color.fromJSON(styleInfo.strokeStyle);
	    this.styleInfo.strokeStyle = color;
	}
	if (styleInfo.fillStyle != undefined) {
	    let color = new Color();
	    color.fromJSON(styleInfo.fillStyle);
	    this.styleInfo.fillStyle = color;
	}
    }
};

function EraserStrokeAction(layer, pointsList, size) {
    this.layer = layer;
    this.ctx = layer.getContext();
    this.points = pointsList;  // expected in world coordinates
    this.size = size;
}
EraserStrokeAction.prototype = {
    replay: function(newCtx) {
	let ctx = newCtx ? newCtx : this.ctx;
	for (let i= 0; i < this.points.length; i++) {
	    ctx.clearRect( this.points[i].x - this.size/2,
			   this.points[i].y - this.size/2,
			   this.size,
			   this.size );
	}
    },

    toJSON: function() {
	let self = this;
	return {type: "eraser",
		layerName: self.layer.getName(),
		points: self.points,
		size: self.size
		};
    }
};

function ClearRegionAction(layer, pointsList) {
    // Note: This expects pointsList in world coordinates.
    this.layer = layer;
    this.ctx = layer.getContext();
    this.points = pointsList;
}
ClearRegionAction.prototype = {
    replay: function(newCtx) {
	// call with no arguments to replay in original context, or
	// pass in a context to draw into that context.
	let ctx = newCtx ? newCtx : this.ctx;
	/*let width = this.right - this.left;
	let height = this.bottom - this.top;
	ctx.clearRect(this.left, this.top, width, height);*/
	ctx.save();
	// erase to transparent by setting composite operation to
	// copy.
	ctx.globalCompositeOperation = 'destination-out';
	//ctx.fillStyle = 'rgba(0,0,0,0)';
	ctx.beginPath();
	ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i= 1; i < this.points.length; i++) {
	    ctx.lineTo(this.points[i].x, this.points[i].y);
	}
	ctx.fill();
	ctx.restore();
    },

    toJSON: function() {
	let self = this;
	/* Can't save the layer to json as it's a live object ref
	 * Instead, save the layerName which we can use to match
	 * the action back up to the layer when reconstructing. */
	return {type: "clear",
		layerName: self.layer.getName(),
		points: self.pts
		};
    }
};

function ImportImageAction(layer, img, x, y) {
    // Note: This expects x, y in world coordinates.
    this.layer = layer;
    this.ctx = layer.getContext();
    this.importPt = {x: x, y: y};
    this.img = img;
}
ImportImageAction.prototype = {
    replay: function(newCtx) {
	let ctx = newCtx ? newCtx : this.ctx;
	// TODO error here with data: no
	ctx.drawImage(this.img, this.importPt.x, this.importPt.y);
    },

    toJSON: function() {
	// Not yet being reconstructed.
	/* TODO This is going to be hard.  The image may not have come
	 * from a URL so we have to actually save the pixel level
	 * data and serialize that to a string to store it in JSON! */
	let self = this;
	return {type: "image",
		layerName: self.layer.getName(),
		point: self.importPt
		};
    }

};

function ChangeScriptAction(newScript) {
    this.newScript = newScript;
    this.layer = g_dialogue.dialogueLayer;
}
ChangeScriptAction.prototype = {
    replay: function(newCtx) {
	if (g_dialogue) {
	    g_dialogue.setScript(this.newScript);	
	    g_dialogue.makeBubblesFromText();
	}
	if ($("#dialogue-edit-area")) {
	    $("#dialogue-edit-area").val(this.newScript);
	}
    },

    toJSON: function() {

	let self = this;
	return {type: "script",
		layerName: self.layer.getName(),
	        text: self.newScript};
    }
};

function MoveBalloonAction(balloonIndex, controlPoint, point) {
    this.balloonIndex = balloonIndex;
    this.controlPoint = controlPoint;
    this.point = point;
    this.layer = g_dialogue.dialogueLayer;
};
MoveBalloonAction.prototype = {
    replay: function(newCtx) {
	let balloon = g_dialogue.getBalloonByIndex(this.balloonIndex);
	switch(this.controlPoint) {
	case "tailTip":
	    balloon.setTailTip(this.point);
	    break;
	case "main":
	    balloon.setCenter(this.point);
	    break;
	case "leftEdge": case "rightEdge":
	    balloon.setWidth(this.point.x);
	    break;
	}
    },

    toJSON: function() {
	let self = this;
	return {type: "balloon",
		layerName: self.layer.getName(),
		balloonIndex: self.balloonIndex,
		controlPoint: self.controlPoint,
		point: self.point};
    }
};

function RectanglePanelAction(panelId, left, top, width, height) {
    this._panelId = panelId;
    this._left = left;
    this._top = top;
    this._width = width;
    this._height = height;
    this.layer = g_panels.panelLayer;
};
RectanglePanelAction.prototype = {
    replay: function(newCtx) {
	// TODO this only works for rectangle panels -- will need
	// another type of action for polygon and round panels.
	if (g_panels) {
	    panel = g_panels.getPanelById(this._panelId);
	    if (panel) {
		panel.setLocation(this._left, this._top, 
				  this._width, this._height);
	    } else {
		let id = this._panelId;
		g_panels.pushPanel( new RectanglePanel(this._left,
						       this._top,
						       this._width,
						       this._height,
						       {id: id}));
	    }
	}
    },
    toJSON: function() {
	let self = this;
	return {type: "rectanglePanel",
		layerName: self.layer.getName(),
		panelId: self._panelId,
		left: self._left,
		top: self._top,
		width: self._width,
		height: self._height};
    }
};

function History() {
    this.actionList = [];
    this.currPtr = 0;
    // On page load, if there is data in local storage,
    // restore history from that data:
    // this.loadFromLocalStorage();
}
History.prototype = {
    /*debug: function() {
	$("#debug").html("History has " + this.actionList.length +
			 " items, pointer is at " + this.currPtr);
			 },*/
    pushAction: function( action ) {
	if (!action) {
	    return;
	}
	if (this.currPtr < this.actionList.length - 1) {
	    // if we are somewhere back in the undo stack and we do 
	    // a new positive action, discard the popped actions.
	    this.actionList = this.actionList.slice(0, this.currPtr);
	}
	this.actionList.push(action);
	this.currPtr = this.actionList.length;
	debug("Action pushed - currPtr now " + this.currPtr);
    },

    replayActions: function() {
	let str = "Replaying actions ";
	for (let i = 0; i < this.currPtr; i++) {
	    this.actionList[i].replay();
	    str += i + ", ";
	}
    },

    replayActionsForLayer: function(layer, overrideCtx) {
	// If overrideCtx is not provided, it will replay the actions
	// to the layer's own context.
	for (let i = 0; i < this.currPtr; i++) {
	    if (!this.actionList[i]) {
		//$("#debug").html("Null action at " + i);
		// TODO confirmed: Panel move actions and speechbubble move actions
		// (but not script actions!) are null here.
	    }
	    if (this.actionList[i].layer == layer) {
		this.actionList[i].replay(overrideCtx); //layer.getContext());
	    }
	}
    },

    undo: function() {
	
	if (this.currPtr > 0 ) {
	    g_dialogue.reset();
	    g_panels.reset();
	    g_drawInterface.clearAllLayers();
	    this.currPtr -= 1;
	    //this.replayActions();
	    g_drawInterface.updateAllLayerDisplays(); // will replay 
	    debug("Undone - currPtr now " + this.currPtr);
	}
    },

    redo: function() {
	if (this.currPtr < this.actionList.length) {
	    this.currPtr += 1;
	    g_drawInterface.updateAllLayerDisplays();
	    debug("Redone - currPtr now " + this.currPtr);
	}
    },

    serialize: function() {
	/* Turn the whole history into a giant JSON string!
	 * (For perf reasons, at some point in the future we'll probably
	 * need to turn the history into an image at some point and
	 * serialize the checkpoint bitmap plus any actions past
	 * the checkpoint...) */

	let historyObj = {};
	historyObj.currPtr = this.currPtr;
	historyObj.actions = [];
	for (let i = 0; i < this.actionList.length; i++) {
	    let jsonObj = this.actionList[i].toJSON();
	    historyObj.actions.push(jsonObj);
	}
	return JSON.stringify(historyObj);
    },

    recreate: function(historyString) {
	debug("History string is " + historyString);
	let historyObj = JSON.parse(historyString);
	// Layers must already have been recreated when this
	// is called.
	this.actionList = [];
	for (let i = 0; i < historyObj.actions.length; i++) {
	    let actionData = historyObj.actions[i];
	    let layerName = actionData.layerName;
	    let layer = g_drawInterface.getLayerByName(layerName);
	    if (!layer) {
		continue;
	    }
	    let action;
	    switch (actionData.type) {
	    case "draw":
		action = new DrawAction(layer,
					actionData.points,
					{},
					actionData.isFill);
		/* DrawAction constructor transforms points to world
		 * coords (this is inconsistent with other actions!)
		 * The following line is a workaround: */
		action.pts = actionData.points;
		action.restoreStyleFromJSON(actionData.styleInfo);
		break;
	    case "clear":
		action = new ClearRegionAction(layer,
					       actionData.points);
		break;
	    case "eraser":
		action = new EraserStrokeAction(layer,
						actionData.points,
						actionData.size);

		break;
	    case "image":
		let img = null; // TODO store image data in json
		let pt = actionData.point;
		action = new ImportImageAction(layer, img, pt.x, pt.y);
		break;
	    case "rectanglePanel":
		action = new RectanglePanelAction(actionData.panelId,
						  actionData.left,
						  actionData.top,
						  actionData.width,
						  actionData.height);
		break;
	    case "script":
		action = new ChangeScriptAction(actionData.text);
		break;
	    case "balloon":
		action = new MoveBalloonAction(actionData.balloonIndex,
					       actionData.controlPoint,
					       actionData.point);
		break;
	    default:
		break;
	    }
	    this.actionList.push(action);
	}

	this.currPtr = historyObj.currPtr;
    },

    saveToLocalStorage: function() {
	debug("Saving to local storage...");
	let historyString = this.serialize();
	let layerString = g_drawInterface.serializeLayers();
	window.localStorage.setItem("history", historyString);
	window.localStorage.setItem("layers", layerString);
	//$("#debug").html("Saved.");
    },

    loadFromLocalStorage: function() {
	//$("#debug").html("Loading from local storage...");
	let layerString = window.localStorage.getItem("layers");
	let historyString = window.localStorage.getItem("history");
	if (!layerString || !historyString || layerString == "" || historyString == "") {
	    let str = "";
	    if (!layerString || layerString == "") {
		str += "No layer string.";
	    }
	    if (!historyString || historyString == "") {
		str += " No history string.";
	    }
	    debug(str);
	    return;
	}
	g_drawInterface.recreateLayers(layerString);
	this.recreate(historyString);
	debug("Loaded.");
    },

    saveToServer: function(title) {
	let historyString = this.serialize();
	let layerString = g_drawInterface.serializeLayers();
	let json = {title: title,
		    history: historyString,
		    layers: layerString};
	jQuery.ajax({url: "save.py",
		    data: json,
		    type: "POST",
		    success: function(data, textStatus) {
		        debug(data);
                    },
                    error: function(req, textStatus, error) {
		        debug("error " + textStatus + "; " + error);
	            },
		    dataType: "html"});
    },

    loadFromServer: function(title, callback) {
	let self = this;
	jQuery.getJSON("load.py", {title: title}, function(data) {
		if (data.layers != "" && data.history != "") {
		    g_drawInterface.recreateLayers(data.layers);
		    self.recreate(data.history);
		    debug("Loaded from server!");
		    callback();
		} else {
		    debug("No data from server!");
		    callback();
		}
	    });
    },
    
    wipe: function() {
	this.actionList = [];
	this.currPtr = 0;
    }
};

/* TODO need to call g_history.serialize() automatically on some
 * sort of timer and put the results in localStorage.
 * The timer should be perhaps 10 seconds after you add an action?
 * (if you add more actions in those 10 seconds the timer resets.)
 * So it's saving whenever the action list has changed AND you're
 * idle for 10 seconds.*/
