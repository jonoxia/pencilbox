function Tool(defaultSize) {
    this._trueSize = defaultSize;
    this.size = Math.floor( this._trueSize + 0.5 );
    this.actionPoints = [];
}
Tool.prototype = {
    getStrokeStyle: function() {
	return g_toolInterface.getPenColor();
    },

    sizeIsOdd: function() {
	return (this.size / 2 != Math.floor(this.size / 2));
    },

    getLineCap: function() {
	return "butt";
    },

    getLineJoin: function() {
	return "miter";
    },

    down: function(ctx, x, y) {
	// round up size to next whole number:
	this.resetRecordedAction();
	this.actionPoints.push( {x: x, y: y} );
	ctx.beginPath();
	ctx.moveTo(x, y);

    },

    up: function(ctx, x, y) {
	// TODO actually multiply lineWidth by current scaling factor
	this.actionPoints.push( {x: x, y: y} );
    },

    drag: function(ctx, x, y) {
	// TODO offset by half-pixel if odd?  See
	// https://developer.mozilla.org/en/Canvas_tutorial/Applying_styles_and_colors#A_lineWidth_example
	// Multiply lineWidth by current scaling factor to know what
	// width todraw the preview at:
	ctx.lineWidth = this.size * g_drawInterface.getZoomLevel();
	ctx.lineCap = this.getLineCap();
	ctx.strokeStyle = this.getStrokeStyle().style;
	ctx.lineTo(x, y);
	ctx.stroke();
	this.actionPoints.push( {x: x, y: y} );
    },

    display: function(penCtx, x, y) {
    },

    drawCursor: function(penCtx, x, y) {
    },

    changeSize: function(ratio) {
	this._trueSize *= ratio;
	// round off effective size:
	this.size = Math.floor( this._trueSize + 0.5 );
	// minimum:
	if (this.size < 1.0) {
	    this.size = 1.0;
	}
    },

    getRecordedAction: function() {
	let activeLayer = g_drawInterface.getActiveLayer();
	let self = this;
	let styles = {lineWidth: self.size,
		      strokeStyle: self.getStrokeStyle(),
		      lineCap: self.getLineCap(),
	              lineJoin: self.getLineJoin()};
	let worldPts = activeLayer.screenToWorldMulti(this.actionPoints,
						      this.sizeIsOdd());
	return new DrawAction(activeLayer, worldPts, styles, false);
    },

    resetRecordedAction: function() {
	this.actionPoints = [];
    }
}

let pen = new Tool(1.0);
pen.display = function(penCtx, x, y) {
    penCtx.beginPath();
    penCtx.arc(x, y, this.size/2, 0, 2*Math.PI, true);
    penCtx.fillStyle = g_toolInterface.getPenColor().style;
    penCtx.fill();
};
pen.drawCursor = pen.display;

let eraser = new Tool(10.0);
// This is a square eraser that erases to transparent
// Could also have round one that erases to white (same as 100% opacity
// paintbrush) - but round & transparent is hard because there's no
// ClearCircle().
eraser.display = function(penCtx, x, y) {
    penCtx.strokeStyle=Colors.black.style;
    penCtx.lineWidth = 1.0;
    penCtx.strokeRect(x - this.size/2, y - this.size/2,
		      this.size, this.size);
};
eraser.drawCursor = eraser.display;
eraser.drag = function(ctx, x, y) {
    // Don't scale up eraser, so it stays the same size on the screen
    // when you zoom in.

    ctx.clearRect(x - this.size/2, y - this.size/2,
		      this.size, this.size);
    this.actionPoints.push( {x: x, y: y} );
};
eraser.getRecordedAction = function() {
    let activeLayer = g_drawInterface.getActiveLayer();
    // Scale down the eraser when you zoom in, so it stays the
    // same size on screen and you can do precision erasing:
    let width = this.size / g_drawInterface.getZoomLevel();
    // TODO round off width to some kind of whole number?
    let points = activeLayer.screenToWorldMulti(this.actionPoints);
    return new EraserStrokeAction(activeLayer, points,
				  width);
};


let line = new Tool(1.0);
line.display = function(penCtx, x, y) {
    penCtx.strokeStyle= this.getStrokeStyle().style;
    penCtx.lineWidth = this.size;
    penCtx.beginPath();
    penCtx.moveTo(x - 20, y - 20);
    penCtx.lineTo(x+ 20, y+20);
    penCtx.stroke();
};
line.down = function(ctx, x, y) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    this.startX = x;
    this.startY = y;
    this.inProgress = true;
    this.actionPoints.push( {x: x, y: y} );
};
line.up = function(ctx, x, y) {
    ctx.lineWidth = this.size;
    ctx.lineTo(x, y);
    ctx.stroke();
    this.lastDrawCtx = ctx;
    this.inProgress = false;
    this.actionPoints.push( {x: x, y: y} );
};
line.drag = function(ctx, x, y) {
};
line.drawCursor = function(ctx, x, y) {
    $("#the-canvas").css("cursor", "crosshair");
    if (this.inProgress) {
      ctx.strokeStyle=this.getStrokeStyle().style;
      ctx.lineWidth = this.size;
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
};

let bucket = new Tool(0);
bucket.display = function(penCtx, x, y) {
    let img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = 'icons/paint-can.png'; 
};
bucket.down = function(ctx, x, y) {
};
bucket.up = function(ctx, x, y) {
    let layer = g_drawInterface.getActiveLayer();
    let bm = new BitManipulator(ctx, layer.width, layer.height);
    this.lastDrawCtx = ctx;

    this.actionPoints = edgeFindingAlgorithm(bm, x, y);
    ctx.fillStyle = g_toolInterface.getPaintColor().style;
    ctx.beginPath();
    ctx.moveTo(this.actionPoints[0].x, this.actionPoints[0].y);
    for (let i = 1; i < this.actionPoints.length; i++) {
	ctx.lineTo(this.actionPoints[i].x, this.actionPoints[i].y);
    }
    ctx.fill();
};
bucket.drag = function(ctx, x, y) {
};
bucket.drawCursor = function(ctx, x, y) {
    // this doesn't work, not sure why.
    $("#the-canvas").css("cursor", "url(icons/paint-can.png)");
};
bucket.getRecordedAction = function() {
    let activeLayer = g_drawInterface.getActiveLayer();
    let style = {fillStyle: g_toolInterface.getPaintColor()};
    let worldPts = activeLayer.screenToWorldMulti(this.actionPoints,
						  false);
    return new DrawAction(activeLayer, worldPts, style, true);
};

let rectangle = new Tool(1.0);
rectangle.display = function(penCtx, x, y) {
    penCtx.strokeStyle=this.getStrokeStyle().style;
    penCtx.lineWidth = this.size;
    penCtx.beginPath();
    penCtx.moveTo(x - 20, y - 20);
    penCtx.lineTo(x+ 20, y-20);
    penCtx.lineTo(x+ 20, y+20);
    penCtx.lineTo(x- 20, y+20);
    penCtx.lineTo(x- 20, y-20);
    penCtx.stroke();
};
rectangle.down = function(ctx, x, y) {
    this.startX = x;
    this.startY = y;
    this.inProgress = true;
};
rectangle.up = function(ctx, x, y) {
    ctx.lineWidth = this.size;
    ctx.strokeStyle=this.getStrokeStyle().style;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.startX, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, this.startY);
    ctx.lineTo(this.startX, this.startY);
    ctx.stroke();
    this.endX = x;
    this.endY = y;
    this.lastDrawCtx = ctx;
    this.inProgress = false;
};
rectangle.drag = function(ctx, x, y) {
};
rectangle.drawCursor = function(ctx, x, y) {
    $("#the-canvas").css("cursor", "crosshair");
    if (this.inProgress) {
      ctx.strokeStyle=this.getStrokeStyle().style;
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.startX, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, this.startY);
      ctx.lineTo(this.startX, this.startY);
      ctx.stroke();
    }
};
rectangle.getRecordedAction = function() {
    let activeLayer = g_drawInterface.getActiveLayer();
    let pointList = [];
    let self = this;
    pointList.push({x: self.startX, y: self.startY});
    pointList.push({x: self.startX, y: self.endY});
    pointList.push({x: self.endX, y: self.endY});
    pointList.push({x: self.endX, y: self.startY});
    pointList.push({x: self.startX, y: self.startY});
    let styles = {strokeStyle: self.getStrokeStyle(),
		  lineWidth: self.size,
		  lineCap: self.getLineCap()}
    let worldPts = activeLayer.screenToWorldMulti(pointList,
						  this.sizeIsOdd());
    return new DrawAction(activeLayer, worldPts, styles, false);
    // TODO Later
    // Implement filled rectangle simply by setting that last
    // false to a true
};
rectangle.resetRecordedAction = function() {
    // Nothing to do
};


let paintbrush = new Tool(10.0);
// TODO paintbrush needs a way to set messiness and opacity as well
// as size.  
paintbrush.getStrokeStyle = function() {
    this.transparency = 0.5;
    let color = g_toolInterface.getPaintColor().copy();
    color.a = this.transparency;
    return color;
};
paintbrush.getLineCap = function() {
    return "round";
};
paintbrush.getLineJoin = function() {
    return "round";
};
paintbrush.display = function(penCtx, x, y) {
    let displaySize = this.size * g_drawInterface.getZoomLevel();
    penCtx.beginPath();
    penCtx.arc(x, y, displaySize/2, 0, 2*Math.PI, true);
    penCtx.fillStyle=this.getStrokeStyle().style;
    penCtx.fill();
    penCtx.lineWidth = 1.0;
    penCtx.strokeStyle=Colors.black.style;
    penCtx.stroke();
};
paintbrush.drawCursor = paintbrush.display;
paintbrush.drag = function(ctx, x, y) {
    // Preview on cursor context, not main draw context!
    let ctx = g_drawInterface.cursorCtx;
    // Multiply lineWidth by current scaling factor for preview width:
    ctx.lineWidth = this.size * g_drawInterface.getZoomLevel();
    ctx.lineCap = this.getLineCap();
    ctx.lineJoin = this.getLineJoin();
    ctx.beginPath();
    ctx.moveTo(this.actionPoints[0].x, this.actionPoints[0].y);
    for (let i = 1; i < this.actionPoints.length; i++) {
	ctx.lineTo(this.actionPoints[i].x, this.actionPoints[i].y);
    }
    ctx.strokeStyle = this.getStrokeStyle().style;
    ctx.stroke();
    this.actionPoints.push( {x: x, y: y} );
};


let eyedropper = new Tool(1.0);
eyedropper.display = function(penCtx, x, y) {
    let img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = "icons/pipette.png";
};
eyedropper.down = function(ctx, x, y) {
};
eyedropper.up = function(ctx, x, y) {
    // do it here
    let layer = g_drawInterface.getActiveLayer();
    let bm = new BitManipulator(ctx, layer.width, layer.height);
    let color = bm.getColorAt(x, y);
    color.a = 1.0;
    g_toolInterface.setPaintColor(color);
};
eyedropper.drag = function(ctx, x, y) {
};
eyedropper.drawCursor = function(ctx, x, y) {
};
eyedropper.getRecordedAction = function() {
    // Setting the color never generates an action
    return null;
};
eyedropper.resetRecordedAction = function() {
    // Nothing to do
};


// More tools:
// Filled rect (an option on rect tool?)
// Porygon (like pencil but adds a new point to actionPoints list
// only when you click - options: close or not, fill or not)
// Fancy line tool? (TBH i never use these)
// Ellipse tool!!
// Magic-wand selector (select continuous region)
// 

// A gradient fill tool (Canvas supports it!!) Could also be a
// selection option?

// In general, tools need individualized setting controls beyond
// the all-purpose color and line width controls.  Bucket needs to
// be able to set sensitivity, paintbush transparency (and noise!)
// rectangle filled-or-not-filledness, etc.  When we have ellipse, it will
// need filledness, circleness, and orthogonality of axis

// But what I really want to play with is... selections!!!