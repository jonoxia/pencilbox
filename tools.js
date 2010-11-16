function Tool(defaultSize) {
    this.size = defaultSize;
    this.actionPoints = [];
}
Tool.prototype = {
    getStrokeStyle: function() {
	return g_toolInterface.getPenColor();
    },

    getLineCap: function() {
	return "butt";
    },

    getLineJoin: function() {
	return "miter";
    },

    down: function(ctx, x, y) {
	// round up size to next whole number:
	this.size = Math.ceil(this.size);
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
	this.size *= ratio;
	// minimum:
	if (this.size < 1.0) {
	    this.size = 1.0;
	}
    },

    getRecordedAction: function() {
	let activeLayer = g_drawInterface.getActiveLayer();
	let self = this;
	let styles = {lineWidth: self.size,
		      strokeStyle: this.getStrokeStyle(),
		      lineCap: this.getLineCap(),
	              lineJoin: this.getLineJoin()};
	return new DrawAction(activeLayer, this.actionPoints, styles,
			      false);
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
    return new EraserStrokeAction(activeLayer, this.actionPoints,
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

let bucket = new Tool(1.0);
bucket.display = function(penCtx, x, y) {
    let img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = 'icons/paint-can.png'; 
};
bucket.down = function(ctx, x, y) {
};
bucket.edgeFindingAlgorithm = function(data, x, y) {
    // TODO this algorthm needs to treat edges of canvas as color
    // boundaries too.
    let megaList = [];
    let dir = "up";
    let pt = {x: x, y: y};
    let seedColor = data.getColorAt(x, y);
    // Go up until we hit a color boundary:
    while (seedColor.equals(data.getColorAt(pt.x, pt.y))) {
	pt = move(pt, dir);
	if (pt.y < 0) {
	    break;
	}
    }
    // Remember the point just before we hit -- we'll be trying to get
    // back here.
    pt = move(pt, "down");
    let keyPt = {x: pt.x, y: pt.y};
    // TODO this algorithm is going to have a problem with islands.
    // Now hug edges clockwise until we get back to this point.
    let dir = clockwise(dir);
    let i = 0;
    megaList.push({x: pt.x + 0.5, y: pt.y + 0.5});
    // the +0.5 is because canvas coords are actually between pixels - without
    // it we miss a row of pixels on the right and bottom
    while(i < 5000) {
	i++;
	// Throw out a feeler counterclockwise to see if there's more
	// seedColored space that way -- this ensures that we expand
	// outward as much as possible.
	let exploreDir = counterclockwise(dir);
	let explorePt = move(pt, exploreDir);
	// Figure out which way we need to move to hug the edge of
	// the line.
	let z = 0;
	let debugStr = "";
	while (!seedColor.equals(data.getColorAtPt(explorePt))) {
	    debugStr += explorePt.x + ", " + explorePt.y + ": "
		+ data.getColorAtPt(explorePt).toStr();
	    exploreDir = clockwise(exploreDir);
	    explorePt = move(pt, exploreDir);
	    z++;
	    if (z > 4) {
		$("#debug").html("Infinite inner loop: " + debugStr);
		break;
	    }
	}
	// Only record points when the direction changes
	if (dir != exploreDir) {
	    megaList.push({x: pt.x + 0.5, y: pt.y + 0.5});
	}
	dir = exploreDir;
	pt = move(pt, dir);
	if (pt.x == keyPt.x && pt.y == keyPt.y) {
	    break;
	}
    }
    return megaList;
};
bucket.up = function(ctx, x, y) {
    let layer = g_drawInterface.getActiveLayer();
    let bm = new BitManipulator(ctx, layer.width, layer.height);
    this.lastDrawCtx = ctx;

    this.actionPoints = bucket.edgeFindingAlgorithm(bm, x, y);
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
    return new DrawAction(activeLayer,
			  this.actionPoints,
			  style,
			  true);
};


textBalloonTool = new Tool(0);
textBalloonTool.getStrokeStyle = function() {
    return null;
};
textBalloonTool.down = function(ctx, x, y) {
    let layer = g_dialogue.dialogueLayer;
    let worldPt = layer.screenToWorld(x, y);
    let grabbitation = g_dialogue.getGrabPt(worldPt.x, worldPt.y);
    if (grabbitation) {
	this.balloon = grabbitation.balloon;
	this.controlPoint = grabbitation.controlPoint;
    } else {
	this.balloon = null;
	this.controlPoint = null;
    }
};
textBalloonTool.up = function(ctx, x, y) {
    this.balloon = null;
    this.controlPoint = null;
};
textBalloonTool.drag = function(ctx, x, y) {
    if (this.balloon && this.controlPoint) {
	let layer = g_dialogue.dialogueLayer;
	let worldPt = layer.screenToWorld(x, y);
	switch (this.controlPoint) {
	case "tailTip":
	    this.balloon.setTailTip(worldPt);
            layer.updateDisplay();
	    break;
	case "main":
            this.balloon.setCenter(worldPt);
            layer.updateDisplay();
	    break;
	case "leftEdge": case "rightEdge":
            let dx = Math.abs(this.balloon.center.x - worldPt.x);
	    if (dx > this.balloon.cornerRadius) {
		this.balloon.setWidth( 2 * dx );
                layer.updateDisplay();
            }
	    break;
	}
    }
};
textBalloonTool.display = function(penCtx, x, y) {
    let img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = "icons/balloon-quotation.png";
};
textBalloonTool.drawCursor = function(penCtx, x, y) {
};
textBalloonTool.changeSize = function(delta) {
};
textBalloonTool.getRecordedAction = function() {
    // TODO (for undo history)
    return null;
};
textBalloonTool.resetRecordedAction = function() {
    // TODO
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
    return new DrawAction(activeLayer, pointList, styles, false);
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