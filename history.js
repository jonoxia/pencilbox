function DrawAction(layer, pointList, lineWidth, strokeStyle, fillStyle,
		    isFill) {
    this.layer = layer;
    this.ctx = layer.getContext();
    this.pts = [];
    let scale = layer._scale;
    let xTrans = layer._xTranslate;
    let yTrans = layer._yTranslate;
    let xCen = layer._center.x;
    let yCen = layer._center.y;
    for each (let pt in pointList) {
	    // This is an inverse transform to turn the point from
	    // screen coordinates (in which it was drawn) back into
	    // world coordinates.  Should be a method of Layer?
	    this.pts.push( {x: (pt.x - xTrans - xCen* ( 1-scale))/ scale,
			y: (pt.y - yTrans - yCen * (1-scale))/scale } );
	}
    this.lineWidth = lineWidth;
    this.strokeStyle = strokeStyle;
    this.fillStyle = fillStyle;
    this.isFill = isFill;
}
DrawAction.prototype = {
    replay: function(newCtx) {
	// call with no arguments to replay in original context, or
	// pass in a context to draw into that context.
	let ctx = newCtx ? newCtx : this.ctx;
        if (this.pts.length > 0) {
	    ctx.beginPath();
	    if (this.strokeStyle) {
		ctx.strokeStyle = this.strokeStyle;
	    }
	    if (this.fillStyle) {
		ctx.fillStyle = this.fillStyle;
	    }
	    if (this.lineWidth) {
		ctx.lineWidth = this.lineWidth;
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
    }
};

function ImportImageAction(layer, img, x, y) {
    this.layer = layer;
    this.ctx = layer.getContext();
    let scale = layer._scale;
    let xTrans = layer._xTranslate;
    let yTrans = layer._yTranslate;
    let xCen = layer._center.x;
    let yCen = layer._center.y;
    // reverse transform import point
    this.importPt = ( {x: (x - xTrans - xCen* ( 1-scale))/ scale,
			y: (y - yTrans - yCen * (1-scale))/scale } );
    this.img = img;
}
ImportImageAction.prototype = {
    replay: function(newCtx) {
	let ctx = newCtx ? newCtx : this.ctx;
	ctx.drawImage(this.img, this.importPt.x, this.importPt.y);
    }
};

function History() {
    this.actionList = [];
    this.currPtr = 0;
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
	$("#debug").html(str);
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
    }
};
