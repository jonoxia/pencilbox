function DrawAction(layer, pointList, styleInfo, isFill) {
    this.layer = layer;
    this.ctx = layer.getContext();
    this.pts = [];
    for each (let pt in pointList) {
	    // Points are given in screen coordinates, but need to be
	    // stored in world coordinates.
	    this.pts.push( layer.screenToWorld(pt.x, pt.y) );
	}
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
	    ctx.beginPath();
	    if (this.styleInfo.strokeStyle) {
		ctx.strokeStyle = this.styleInfo.strokeStyle;
	    }
	    if (this.styleInfo.fillStyle) {
		ctx.fillStyle = this.styleInfo.fillStyle;
	    }
	    if (this.styleInfo.lineWidth) {
		ctx.lineWidth = this.styleInfo.lineWidth;
	    }
	    if (this.styleInfo.lineCap) {
		ctx.lineCap = this.styleInfo.lineCap;
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
	return {type: "draw",
		layerName: self.layer.getName(),
		points: self.pts,  // already json more or less
		styleInfo: self.styleInfo,
		isFill: self.isFill
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

function History() {
    this.actionList = [];
    this.currPtr = 0;
    // On page load, if there is data in local storage,
    // restore history from that data:
    this.loadFromLocalStorage();
}
History.prototype = {
    debug: function() {
	$("#debug").html("History has " + this.actionList.length +
			 " items, pointer is at " + this.currPtr);
    },
    pushAction: function( action ) {
	if (!action) {
	    return;
	}
	if (this.currPtr < this.actionList.length - 1) {
	    // if we are somewhere back in the undo stack and we do 
	    // a new positive action, discard the popped actions.
	    this.actionList = this.actionList.slice(0, this.currPtr);
	    // test this for off-by-one-errors.
	}
	this.actionList.push(action);
	this.currPtr = this.actionList.length;

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
	    if (this.actionList[i].layer == layer) {
		this.actionList[i].replay(overrideCtx); //layer.getContext());
	    }
	}
    },

    undo: function() {
	if (this.currPtr > 0 ) {
	    this.currPtr -= 1;
	    g_drawInterface.clearAllLayers();
	    this.replayActions();
	}
    },

    redo: function() {
	if (this.currPtr < this.actionList.length) {
	    this.currPtr += 1;
	    this.actionList[this.currPtr - 1].replay();
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
	let historyObj = JSON.parse(historyString);
	// Layers must already have been recreated when this
	// is called.
	this.actionList = [];
	for (let i = 0; i < historyObj.actions.length; i++) {
	    let actionData = historyObj.actions[i];
	    let layerName = actionData.layerName;
	    let layer = g_drawInterface.getLayerByName(layerName);
	    let action;
	    switch (actionData.type) {
	    case "draw":
		action = new DrawAction(layer,
					actionData.points,
					actionData.styleInfo,
					actionData.isFill);
		/* DrawAction constructor transforms points to world
		 * coords (this is inconsistent with other actions!)
		 * The following line is a workaround: */
		action.pts = actionData.points;
		break;
	    case "clear":
		action = new ClearRegionAction(layer,
					       actionData.points);
		break;
	    case "image":
		let img = null; // TODO 
		let pt = actionData.point;
		action = new ImportImageAction(layer, img, pt.x, pt.y);
		break;
	    }
	    this.actionList.push(action);
	}

	this.currPtr = historyObj.currPtr;
    },

    saveToLocalStorage: function() {
	$("#debug").html("Saving to local storage...");
	let historyString = this.serialize();
	let layerString = g_drawInterface.serializeLayers();
	window.localStorage.setItem("history", historyString);
	window.localStorage.setItem("layers", layerString);
	$("#debug").html("Saved.");
    },

    loadFromLocalStorage: function() {
	$("#debug").html("Loading from local storage...");
	let layerString = window.localStorage.getItem("layers");
	let historyString = window.localStorage.getItem("history");
	// TODO how do we tell if an item is not set?  Will it
	// return empty string?
	if (!layerString || !historyString) {
	    $("#debug").html("Nothing in local storage.");
	    return;
	}
	g_drawInterface.recreateLayers(layerString);
	this.recreate(historyString);
	$("#debug").html("Loaded.");
    }
};

/* TODO need to call g_history.serialize() automatically on some
 * sort of timer and put the results in localStorage.
 * The timer should be perhaps 10 seconds after you add an action?
 * (if you add more actions in those 10 seconds the timer resets.)
 * So it's saving whenever the action list has changed AND you're
 * idle for 10 seconds.*/
