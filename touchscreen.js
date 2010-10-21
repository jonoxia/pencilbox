var g_drawInterface = null;
var g_toolInterface = null;
var g_history = null;
var g_dialogue = null;

// Speech bubble improvements:

// 4. Make a better way to switch to speech bubble tool
// Why isn't speech bubble cursor icon appearing?
// 6. Implement styles inside of speech bubbles (<code>, <em>, <whisper>)
// 7. Conjoined bubbles (where tail of one merges into another?)

// Initial stroke doesn't have scaled thickness (although it looks
// correct after scaling)

// Improvements to export:
// - Export all layers together (i.e. replay them all to a single canvas)
// - Scale to 100% before exporting
// - Make canvas big enough to include everything up to boundaries
// (Note: that means we need boundaries!!

// After that: Adjustable transparency!

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

    replayActionsForLayer: function(layer) {
	for (let i = 0; i < this.currPtr; i++) {
	    if (this.actionList[i].layer == layer) {
		this.actionList[i].replay(layer.getContext());
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


function Tool(defaultSize) {
    this.size = defaultSize;
    this.actionPoints = [];
}
Tool.prototype = {
    getStrokeStyle: function() {
	return "rgb(0, 0, 0)"; 
    },

    down: function(ctx, x, y) {
	this.resetRecordedAction();
	ctx.beginPath();
	ctx.moveTo(x, y);
	this.actionPoints.push( {x: x, y: y} );
    },

    up: function(ctx, x, y) {
	// TODO actually multiply lineWidth by current scaling factor
	ctx.lineWidth = this.size;
	ctx.strokeStyle = this.getStrokeStyle();
        ctx.lineTo(x, y);
	ctx.stroke();
	this.actionPoints.push( {x: x, y: y} );
    },

    drag: function(ctx, x, y) {
	// TODO actually multiply lineWidth by current scaling factor
	ctx.lineWidth = this.size;
	ctx.strokeStyle = this.getStrokeStyle();
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
	if (this.size < 0.5) {
	    this.size = 0.5;
	}
    },

    getRecordedAction: function() {
	let activeLayer = g_drawInterface.getActiveLayer();
	return new DrawAction(activeLayer,
			      this.actionPoints,
			      this.size,
			      this.getStrokeStyle(),
			      null,
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
    penCtx.fillStyle="rgb(0, 0, 0)"; 
    penCtx.fill();
};
pen.drawCursor = pen.display;

let eraser = new Tool(10.0);
eraser.getStrokeStyle = function() {
    return "rgb(255, 255, 255)";
}
eraser.display = function(penCtx, x, y) {
    penCtx.beginPath();
    penCtx.arc(x, y, this.size/2, 0, 2*Math.PI, true);
    penCtx.fillStyle="rgb(255, 255, 255)";
    penCtx.fill();
    penCtx.lineWidth = 1.0;
    penCtx.strokeStyle="rgb(0, 0, 0)"; 
    penCtx.stroke();
};
eraser.drawCursor = eraser.display;

let line = new Tool(1.0);
line.display = function(penCtx, x, y) {
    penCtx.strokeStyle="rgb(0, 0, 0)"; 
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
      ctx.strokeStyle="rgb(0, 0, 0)"; 
      ctx.lineWidth = this.size;
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
};

function Color(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
}
Color.prototype = {
    equals: function(color2) {
	return this.r == color2.r &&
	this.g == color2.g &&
	this.b == color2.b &&
	this.a == color2.a;
    },
    toStr: function() {
	return "(" + this.r + "," + this.g + "," + this.b + "," + this.a + ")";
    }
};

function move(pt, dir) {
    switch (dir) {
    case "up":
	return {x: pt.x, y: pt.y - 1};
    case "down":
	return {x: pt.x, y: pt.y + 1};
    case "left":
	return {x: pt.x - 1, y: pt.y};
    case "right":
	return {x: pt.x + 1, y: pt.y};
    default:
	$("#debug").html("Invalid dir: " + dir);
    }
}
function clockwise(dir) {
    switch(dir) {
    case "up":
	return "right";
    case "right":
	return "down";
    case "down":
	return "left";
    case "left":
	return "up";
    }
}
function counterclockwise(dir) {
    switch(dir) {
    case "up":
	return "left";
    case "left":
	return "down";
    case "down":
	return "right";
    case "right":
	return "up";
    }
}

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
    let fillColor = new Color(255, 0, 0, 255);
    let bm = new BitManipulator(ctx, 950, 600);
    this.lastDrawCtx = ctx;

    this.actionPoints = bucket.edgeFindingAlgorithm(bm, x, y);
    ctx.fillStyle = "rgb(255,0,0)";
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
    return new DrawAction(activeLayer,
			  this.actionPoints,
			  null,
			  null,
			  "rgb(255,0,0)",
			  true);
};


textBalloonTool = new Tool(0);
textBalloonTool.getStrokeStyle = function() {
    return null;
};
textBalloonTool.down = function(ctx, x, y) {
    let grabbitation = g_dialogue.getGrabPt(x, y);
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
	switch (this.controlPoint) {
	case "tailTip":
	    this.balloon.setTailTip({x: x, y: y});
            g_dialogue.dialogueLayer.updateDisplay();
	    break;
	case "main":
            this.balloon.setCenter({x: x, y: y});
            g_dialogue.dialogueLayer.updateDisplay();
	    break;
	case "leftEdge": case "rightEdge":
            let dx = Math.abs(this.balloon.center.x - x);
	    if (dx > this.balloon.cornerRadius) {
		this.balloon.setWidth( 2 * dx );
                g_dialogue.dialogueLayer.updateDisplay();
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
    img.src = "icons/ballon-quotation.png";
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



function BitManipulator(context, width, height) {
    this.context = context;
    this.width = width;
    this.height = height;
    this.dataBlob = this.context.getImageData(0, 0, width, height);
}
BitManipulator.prototype = {
    getColorAt: function(x, y) {
	let i = 4 * (y * this.width + x);
	let r = this.dataBlob.data[i];
	let g = this.dataBlob.data[i + 1];
	let b = this.dataBlob.data[i + 2];
	let a = this.dataBlob.data[i + 3];
	return new Color(r, g, b, a);
    },

    getColorAtPt: function(pt) {
	return this.getColorAt(pt.x, pt.y);
    },

    setColorAt: function(x, y, color) {
	let i = 4 * (y * this.width + x);
	this.dataBlob.data[i] = color.r;
	this.dataBlob.data[i + 1] = color.g;
	this.dataBlob.data[i + 2] = color.b;
	this.dataBlob.data[i + 3] = color.a;
    },

    save: function() {
	this.context.putImageData(this.dataBlob, 0, 0);
    }    
};


function SpeechBubble(text) {
    // These will be global and shared by all instances:
    this.borderLineSize = 2.0;
    this.padding = 15;
    this.cornerRadius = 15;
    this.tailBaseWidth = 30;
    this.font = "12pt Arial";  // seems to be ignored?
    this.lineHeight = 20;
    
    // These are instance specific (and need an interface for setting)
    this.text = text;
    this.center = {x: Math.floor(Math.random() * 900 + 1),
		   y: Math.floor(Math.random() * 600 + 1)};
    this.tailTip = {x: 500, y: 600};
    this.maxLineWidth = 200;

    this.wrapText();
    this.calcBoundingBox();
    this.calcTail();
};
SpeechBubble.prototype = {
    setWidth: function(newWidth) {
	this.maxLineWidth = newWidth - 2 * this.padding;
	this.wrapText();
	this.calcBoundingBox();
	this.calcTail();
    },
    setText: function(newText) {
	this.text = newText;
	this.wrapText();
	this.calcBoundingBox();
	this.calcTail();
    },
    setTailTip: function(newPt) {
	this.tailTip = newPt;
	this.calcTail();
    },
    setCenter: function(newPt) {
	this.center = newPt;
	this.calcBoundingBox();
	this.calcTail();
    },
    calcBoundingBox: function() {
	let width = this.maxLineWidth + 2 * this.padding;
	let height = this.lines.length * this.lineHeight + 2 * this.padding;
	if (width < 2 * (this.cornerRadius + this.padding)) {
	    width = 2 * (this.cornerRadius + this.padding);
	}
	if (height < 2 * (this.cornerRadius + this.padding)) {
	    height = 2 * (this.cornerRadius + this.padding);
	}

	this.left = this.center.x - width/2;
	this.right = this.center.x + width/2;
	this.top = this.center.y - height/2;
	this.bottom = this.center.y + height/2;
    },
    getBoundingBox: function() {
	let self = this;
	return {left: self.left,
		right: self.right,
		top: self.top,
		bottom: self.bottom};
    },
    wrapText: function() {
	let ctx = g_dialogue.dialogueLayer.getContext();
	ctx.font = this.font;
	let words = this.text.split(" ");
	let lines = [];
	let thisLine = [];
	let lineWidth = 0;
	for (let i = 0; i < words.length; i++) {
	    if (words[i].length == 0) {
		continue;
	    }
	    // Don't forget to include width of the space!
	    let thisWidth = ctx.measureText(words[i] + " ").width;
	    if (lineWidth + thisWidth > this.maxLineWidth) {
		lines.push(thisLine.join(" "));
		thisLine = [];
		lineWidth = 0;
	    }
	    thisLine.push(words[i]);
	    lineWidth += thisWidth;
	}
	lines.push(thisLine.join(" "));
	this.lines = lines;
    },
    calcTail: function() {
	// calculate where tail goes

	// If tailTip is *inside* bubble, don't draw a tail:
	if (this.tailTip.x > this.left && this.tailTip.x < this.right &&
	    this.tailTip.y > this.top && this.tailTip.y < this.bottom) {
	    this.tailInterceptSide = "none";
	    return;
	}

	let dx = this.tailTip.x - this.center.x;
	let dy = this.tailTip.y - this.center.y;
	// Intercept is the point where line from center to tailtip
	// intersects border of balloon.
	// Use intercept to calculate left and right tail base;
	// they're tailBaseWidth pixels apart, centered around
	// intercept point unless that would make it too far left
	// or right, in which case pin it within the bounds of
	// that side.
	let intercept = {x: 0, y: 0}; 
	let interceptL, interceptR, interceptT, interceptB;
	let interceptSide;

	// Decide what side of the bubble the tail comes out of:
	let aspectRatio = (this.right-this.left)/(this.bottom-this.top);
	// Aspect ratio matters because we want to favor the longer
	// dimension - for bubbles wider than they are tall, we usually
	// want tail on the top or bottom.
	if (Math.abs(dx) > aspectRatio * Math.abs(dy)) {
	    // Left/right > above/below so tail will be to left or
	    // right...
	    if (dx < 0) {  // left
		interceptSide = "left";
		intercept.y = this.center.y + 
		    dy * (this.left - this.center.x)/dx;
	    } else {  // right
		interceptSide = "right";
		intercept.y = this.center.y + 
		    dy * (this.right - this.center.x)/dx;
	    }
	    interceptT = intercept.y - this.tailBaseWidth / 2;
	    interceptB = intercept.y + this.tailBaseWidth / 2;
            if (interceptB > this.bottom - this.cornerRadius) {
		// too far down
	        interceptB = this.bottom - this.cornerRadius;
	        interceptT = interceptB - this.tailBaseWidth;
		if (interceptT < this.top + this.cornerRadius) {
		    interceptT = this.top + this.cornerRadius;
		}
            } 
	    if (interceptT < this.top + this.cornerRadius) {
		// too far up
	        interceptT = this.top + this.cornerRadius;
	        interceptB = interceptT + this.tailBaseWidth;
		if (interceptB > this.bottom - this.cornerRadius) {
		    interceptB = this.bottom - this.cornerRadius;
		}
            }
	} else {
	    // Tail will be above or below...
	    if (dy < 0) {  // above
		interceptSide = "top";
		intercept.x = this.center.x + 
                    dx * (this.top - this.center.y)/dy;
	    } else {  // below
		interceptSide = "bottom";
		intercept.x = this.center.x + 
		    dx * (this.bottom - this.center.y)/dy;
	    }
	    interceptL = intercept.x - this.tailBaseWidth / 2;
	    interceptR = intercept.x + this.tailBaseWidth / 2;
            if (interceptR > this.right - this.cornerRadius) {
		// Too far right
	        interceptR = this.right - this.cornerRadius;
	        interceptL = interceptR - this.tailBaseWidth;
            } else if (interceptL < this.left + this.cornerRadius) {
		// Too far left
	        interceptL = this.left + this.cornerRadius;
	        interceptR = interceptL + this.tailBaseWidth;
            }
	}
	this.tailInterceptSide = interceptSide;
	this.tailBase = {top: interceptT,
			 left: interceptL,
			 right: interceptR,
			 bottom: interceptB};
    },
    render: function() {
	let ctx = g_dialogue.dialogueLayer.getContext();
	ctx.font = this.font;
	ctx.textAlign = "start";
	ctx.lineWidth = this.borderLineSize;
	ctx.strokeStyle = "rgb(0,0,0)";
	ctx.fillStyle = "rgb(255, 255, 255)";

	ctx.beginPath();
	// top edge:
	ctx.moveTo( this.left + this.cornerRadius, this.top);
	if (this.tailInterceptSide == "top") {
	    // tail from top:
	    ctx.lineTo( this.tailBase.left, this.top);
	    ctx.lineTo( this.tailTip.x, this.tailTip.y );
	    ctx.lineTo( this.tailBase.right, this.top);
	}
	ctx.lineTo( this.right - this.cornerRadius, this.top);
	// top-right curve
	ctx.arc( this.right - this.cornerRadius,
		 this.top + this.cornerRadius,
		 this.cornerRadius, 3 * Math.PI/2, 0, false);
	// right edge:
	if (this.tailInterceptSide == "right") {
	    ctx.lineTo( this.right, this.tailBase.top);
	    ctx.lineTo( this.tailTip.x, this.tailTip.y );
	    ctx.lineTo( this.right, this.tailBase.bottom);
	}
	ctx.lineTo( this.right, this.bottom - this.cornerRadius);
	//bottom-right curve:
	ctx.arc( this.right - this.cornerRadius,
		 this.bottom - this.cornerRadius,
		 this.cornerRadius, 0, Math.PI/2, false);
	// bottom edge:
	if (this.tailInterceptSide == "bottom") {
	    // tail from bottom:
	    ctx.lineTo( this.tailBase.right, this.bottom);
	    ctx.lineTo( this.tailTip.x, this.tailTip.y );
	    ctx.lineTo( this.tailBase.left, this.bottom);
	}
	ctx.lineTo( this.left + this.cornerRadius, this.bottom);
	//bottom-this.left curve:
	ctx.arc( this.left + this.cornerRadius,
		 this.bottom - this.cornerRadius,
		 this.cornerRadius, Math.PI/2, Math.PI, false);
	// left edge:
	if (this.tailInterceptSide == "left") {
	    ctx.lineTo( this.left, this.tailBase.bottom);
	    ctx.lineTo( this.tailTip.x, this.tailTip.y );
	    ctx.lineTo( this.left, this.tailBase.top);
	}
	ctx.lineTo( this.left, this.top + this.cornerRadius);
	//top-left curve:
	ctx.arc( this.left + this.cornerRadius,
		 this.top + this.cornerRadius,
		 this.cornerRadius, Math.PI, 3*Math.PI/2, false);

	// clear area
	ctx.fill();
	ctx.stroke();

	let x = this.left + this.padding;
	let y = this.top + this.padding + (this.lineHeight/2);
	for (let i = 0; i < this.lines.length; i++) {
	    ctx.fillStyle = "rgb(0, 0, 0)";
	    ctx.fillText(this.lines[i], x, y);
	    y += this.lineHeight;
	}
    }
};


function GestureInterpreter(gestureLibrary, offsetX, offsetY) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.touchPoints = {};
    this.touchPointCount = 0;
    this.library = gestureLibrary;
    this.gestureDirections = [];

    this.twoFingerMode = null;
    this.pinchFirstDist = null;
}
GestureInterpreter.prototype = {
    touchDown: function(evt) {
	let id = evt.streamId;
	let x = evt.pageX - this.offsetX;
	let y = evt.pageY - this.offsetY;
	this.touchPoints[id] = { newX: x,
				 newY: y,
				 oldX: x,
				 oldY: y,
				 id: id};
	this.touchPointCount ++;
    },

    touchMove: function(evt) {
	let id = evt.streamId;
	let pt = this.touchPoints[id];
	if (pt) {
	    // is it possible for this not to be defined at this point?
	    pt.oldX = pt.newX;
	    pt.oldY = pt.newY;
	    pt.newX = evt.pageX - this.offsetX;
	    pt.newY = evt.pageY - this.offsetY;
	    // following lines are debug:
	    /*if (this.ctx) {
            	    this.ctx.strokeStyle = pt.color;
		    this.ctx.beginPath();
		    this.ctx.moveTo(pt.oldX, pt.oldY);
		    this.ctx.lineTo(pt.newX, pt.newY);
		    this.ctx.stroke();
		    }*/
	    this.interpretGesture(id);
	} else {
	    $("#debug").html("NOT POINT");
	}
    },

    touchUp: function(evt) {
	let id = evt.streamId;
	delete this.touchPoints[id];
	/*let self = this;
	let x;
	let remainPts = [x for (x in self.touchPoints)];
	$("#debug").html("Deleted pt " + id + "; points remaining: " + remainPts.join(", "));*/
	this.touchPointCount --;
	if (this.touchPointCount == 0) {
	    this.finalizeGesture();
	    this.gestureDirections = [];
	    this.twoFingerMode = null;
	    this.pinchFirstDist = null;
	}
    },

    interpretGesture: function(movedId) {
	let tchPts = this.touchPoints;
	let x;
	let pts = [tchPts[x] for (x in tchPts)];
	if (this.touchPointCount == 2) {
	    // 2-finger gesture - pinch or drag?
	    let ptA = pts[0];
	    let ptB = pts[1];
	    if (!ptA || !ptB) {
		// Can happen when one finger is outside canvas
		return;
	    }

	    // pinch - how much did distance change?
	    let dx = ptA.oldX - ptB.oldX; 
	    let dy = ptA.oldY - ptB.oldY;
	    distPre = Math.sqrt(dx*dx + dy*dy);
	    dx = ptA.newX - ptB.newX;
	    dy = ptA.newY - ptB.newY;
	    distPost = Math.sqrt(dx*dx + dy*dy);
	    
	    let delta = distPost - distPre;

	    let dxA = ptA.newX - ptA.oldX;
	    let dyA = ptA.newY - ptA.oldY;
	    let dxB = ptB.newX - ptB.oldX;
	    let dyB = ptB.newY - ptB.oldY;
	    /*$("#debug").html("dxA = " + dxA + ", dyA = " + dyA + 
	      "dxB = " + dxB + ", dyB = " + dyB );*/
	    /*$("#debug").html(ptA.id + ": " + ptA.oldX + ", " + ptA.oldY + " -> " +
			     ptA.newX + ", " + ptA.newY + "<br/>" +
			     ptB.id + ": " + ptB.oldX + ", " + ptB.oldY + " -> " +
			     ptB.newX + ", " + ptB.newY + "moved one: " + movedId);*/

	    // either pan OR zoom, don't do both.  Pan if the drag
	    // distance > change in distance between fingers.
	    let dist = (Math.sqrt(dxA*dxA + dyA*dyA) +
			Math.sqrt(dxB*dxB + dyB*dyB)) / 2;

	    /*let sign = function(x) {
		if (x>0) return 1;
		if (x<0) return -1;
		if (x==0) return 0;
		}*/

	    //$("#debug").html("2fing drag distance " + dist + " vs" +
	    //		     " delta is " + delta );

	    /*+ "same x direction? " +
			     (sign(dxA) == sign(dxB)?"yes":"no") + 
			     "same y direction? " + 
			     (sign(dyA) == sign(dyB)?"yes":"no"));*/

	    if (!this.pinchFirstDist) {
		this.pinchFirstDist = distPost;
	    }
	    // if twofingermode is undefined, decide it now
	    if (!this.twoFingerMode) {
		if (Math.abs(dist) > Math.abs(delta)) {
		    //if (dxA * dxB > 0 && dyA * dyB > 0 && Math.abs(dist) > 0) {
		    this.twoFingerMode = "drag";
		    $("#debug").html("dist = " + dist + " delta = " + delta + " Set to drag.");
		} else if (Math.abs(dist) > 0 && Math.abs(delta) > 0) {
		    this.twoFingerMode = "pinch";
		    $("#debug").html("dist = " + dist + " delta = " + delta + " Set to pinch.");
		}
		//If they are equal (e.g. both zero) then nothing
		// will happen.
	    }

	    if (this.twoFingerMode == "drag" &&
		this.library.twoFingers.drag) {
		    this.library.twoFingers.drag((dxA + dxB)/4,
						 (dyA + dyB)/4);

	    }
	    if (this.twoFingerMode == "pinch" &&
		this.library.twoFingers.pinch) {
		let ratio = (distPost + distPre) / (2 * distPre);
		this.library.twoFingers.pinch(ratio);
	    }
	}
	if (this.touchPointCount == 1) {
	    let movingPt = this.touchPoints[movedId];
	    // 1-finger gesture -- pie menu to pick tool
	    let dx = movingPt.newX - movingPt.oldX;
	    let dy = movingPt.newY - movingPt.oldY;

	    // invisible pie menu!
	    if (dy < -5 && Math.abs(dy) > Math.abs(dx)) {
		this.gestureDirections.push("up");
	    }
	    else if (dy > 5 && Math.abs(dy) > Math.abs(dx)) {
		this.gestureDirections.push("down");
	    }
	    else if (dx < -5 && Math.abs(dx) > Math.abs(dy)) {
		this.gestureDirections.push("left");
	    }
	    else if (dx > 5 && Math.abs(dx) > Math.abs(dy)) {
		this.gestureDirections.push("right");
	    }
	}
    },

    finalizeGesture: function() {
	for each (let gestureCmd in this.library.oneFinger) {
          let curDir = "";
          let matched = 0;
	  let pattern = gestureCmd.directions;
          for each (let dir in this.gestureDirections) {
	    if (dir != curDir) {
	      curDir = dir;
	      if (dir == pattern[matched]) {
	 	matched += 1;
		if (matched == pattern.length) {
		    gestureCmd.command();
		    return;
		}
	      } else {
		  break;
	      }
	    }
	  } 
	}
    },
};

function ToolAreaInterface() {
    this.toolCanvas = $("#pen-size-canvas").get(0);
    this.penCtx = this.toolCanvas.getContext("2d");
    let self = this;

    this.offsetX = this.toolCanvas.offsetLeft;
    this.offsetY = this.toolCanvas.offsetTop;
    this.selectedTool = pen;

    this.library = {
	oneFinger: [
	    {directions: ["left", "down", "right", "up"],
             command: function() {
		    g_history.undo();
		    //$("#debug").html("Undo");
		}},
            {directions: ["down", "right", "up", "left"],
             command: function() {
		    g_history.undo();
		    //$("#debug").html("Undo");
		}},
            {directions: ["right", "down", "left", "up"],
             command: function() {
		    g_history.redo();
		    //$("#debug").html("Redo");
		}},
            {directions: ["down", "left", "up", "right"],
             command: function() {
		    g_history.redo();
		    //$("#debug").html("Redo");
		}},
            {directions: ["up"],
	     command: function() {
		    self.setTool(pen);
		}},
            {directions: ["down"],
 	     command: function() {
		    self.setTool(eraser);
		}},
            {directions: ["left"],
	     command: function() {
		    self.setTool(line);
		}},
            {directions: ["right"],
	     command: function() {
		    self.setTool(bucket);
		}}
	],
	twoFingers: {
	    pinch: function(ratio) {
		self.selectedTool.changeSize( ratio );
		self.updateToolImage();
	    }
	}
    };

    this.interpreter = new GestureInterpreter(this.library,
					      this.offsetX,
					      this.offsetY);

    this.toolCanvas.addEventListener("MozTouchDown", function(evt) {
	    self.interpreter.touchDown(evt); }, false);
    this.toolCanvas.addEventListener("MozTouchMove", function(evt) {
	    self.interpreter.touchMove(evt); }, false);
    this.toolCanvas.addEventListener("MozTouchUp", function(evt) {
	    self.interpreter.touchUp(evt); }, false);
    // There's supposed to be mozInputSource that tells us "pen or finger" but I don't seem to have it.
    // However, I only seem to get MozTouch events when I touch with finger, not when I touch with pen

}
ToolAreaInterface.prototype = {
    setTool: function(newTool) {
	this.selectedTool = newTool;
	this.updateToolImage();
    },

    updateToolImage: function() {
	this.penCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
	this.selectedTool.display(this.penCtx, 60, 60);
    }
};

function Layer(index) {
  let can = $("#the-canvas").get(0);
  this.width = can.width;
  this.height = can.height;
  this.index = index;

  this.name = "Layer " + index;

  this.tag = $("<canvas></canvas>");
  this.tag.appendTo('body');
  this.tag.attr("width", this.width);
  this.tag.attr("height", this.height);
  this.tag.css("position", "absolute");
  this.tag.css("z-index", "" + index);
  this.tag.css("left", $("#the-canvas").offset().left);
  this.tag.css("top", $("#the-canvas").offset().top);

  // for debug:
  let self = this;
  this.tag.bind("mousedown", function(evt) { 
	  $("#debug").html("Mousedowned on " + self.name + " index " + self.index);});

  this.displayCanvas = this.tag.get(0);
  this.displayContext = this.displayCanvas.getContext("2d");

  this.visible = true;

  this._scale = 1.0;
  this._xTranslate = 0;
  this._yTranslate = 0;
  this._center = {x: this.width/2,
		  y: this.height/2};

  this.tableRow = $("<tr></tr>");
  // <tr><td>Layer 0</td><td><input type="checkbox"></input></td>
  let cell = $("<td></td>");
  this.radioBtn = $("<input type=\"radio\" name=\"layers-radioset\"></input>");
  this.radioBtn.attr("value", this.index);
  this.radioBtn.change(
   function() {
     let sel = $("input[name='layers-radioset']:checked").val();
     g_drawInterface.setActiveLayer(sel);
   });

  cell.append(this.radioBtn);
  this.tableRow.append(cell);
  this.titleCell = $("<td></td>");
  this.titleCell.html(this.name);
  this.tableRow.append(this.titleCell);
  cell = $("<td></td>");
  let checkBox = $("<input type=\"checkbox\" checked=\"true\"></input>");
  let self = this;
  checkBox.bind("click", function() {
	  self.setVisible(checkBox.attr("checked"));
      });
  cell.append(checkBox);
  this.tableRow.append(cell);
  this.tableRow.appendTo("#layers-table");
}
Layer.prototype = {
    setIndex: function(newIndex) {
	this.index = newIndex;
	this.tag.css("z-index", "" + newIndex);
	this.radioBtn.attr("value", newIndex);
    },
    getIndex: function() {
	return this.index;
    },
    setName: function(newName) {
	this.name = newName;
	this.titleCell.html(newName);
    },
    getName: function() {
	return this.name;
    },
    getContext: function() {
	return this.displayContext;
    },
    setVisible: function(newVal) {
	this.visible = newVal;	
	this.tag.css("display", newVal?"block":"none");
    },
    clearLayer: function() {
	this.displayContext.clearRect(0, 0, this.width, 
				      this.height);
    },
    updateDisplay: function() {
	this.displayContext.clearRect(0, 0, this.width, this.height);
	this.displayContext.save();
	this.displayContext.translate(
	  this._xTranslate + this._center.x * (1-this._scale),		
	  this._yTranslate + this._center.y * (1-this._scale));
	this.displayContext.scale(this._scale, this._scale);
	/*this.displayContext.translate(this._xTranslate,
	  this._yTranslate);*/
	// replay everything in this layer
	g_history.replayActionsForLayer(this);
	this.displayContext.restore();
    },
    scale: function(factor) {
	let oldScale = this._scale;
	this._scale = this._scale * factor;
	// don't allow just any crazy scale - snap to a whole multiple
	// of 0.2.
	//this._scale = Math.floor(this._scale * 5) / 5.0;
	// Pin it between minimum and maximum values:
	if (this._scale < 0.2) {
	    this._scale = 0.2;
	}
	if (this._scale > 5.0) {
	    this._scale = 5.0;
	}
	this.updateDisplay();
    },
    pan: function(xFactor, yFactor) {
	// Use scale factor because e.g. if you pan 100 screen pixels when zoomed in to 2x,
	// we only need to move 50 real pixels to get an effect matching your gesture.
	this._xTranslate += xFactor; ///this._scale;
	this._yTranslate += yFactor; ///this._scale;
	this.updateDisplay();
    }
};

function DrawAreaInterface() {
    let cursorCanvas = $("#the-canvas").get(0);
    this.width = cursorCanvas.width;
    this.height = cursorCanvas.height;

    this.layers = [];

    let newLayer = new Layer(-1);
    this.layers.push(newLayer);
    this.activeLayer = newLayer;

    this.cursorCtx = cursorCanvas.getContext("2d");
    this.offsetX = cursorCanvas.offsetLeft;
    this.offsetY = cursorCanvas.offsetTop;

    this.mouseIsDown = false;

    let self = this;    
    $("#the-canvas").bind("mousedown", function(evt) { self.mouseDownHandler(evt); });
    $("#the-canvas").bind("mouseup", function(evt) {self.mouseUpHandler(evt); });
    $("#the-canvas").bind("mousemove", function(evt) {self.mouseMoveHandler(evt); });

    let library = {
	oneFinger: [],
	twoFingers: {
	    pinch: function(ratio) {
		self.zoom(ratio);
	    },
	    drag: function(xMovement, yMovement) {
		self.pan(xMovement, yMovement);
	    }
	}
    };

    this.interpreter = new GestureInterpreter(library,
					      this.offsetX,
					      this.offsetY);

    cursorCanvas.addEventListener("MozTouchDown", function(evt) {
	    self.interpreter.touchDown(evt); }, false);
    cursorCanvas.addEventListener("MozTouchMove", function(evt) {
	    self.interpreter.touchMove(evt); }, false);
    cursorCanvas.addEventListener("MozTouchUp", function(evt) {
	    self.interpreter.touchUp(evt); }, false);

}
DrawAreaInterface.prototype = {
    getSelectedTool: function() {
	return g_toolInterface.selectedTool;
    },
    getDrawCtx: function() {
	return this.activeLayer.getContext();
    },
    setActiveLayer: function(index) {
	for (let i = 0; i < this.layers.length; i++) {
	    if (this.layers[i].getIndex() == index) {
		this.activeLayer = this.layers[i];
		break;
	    }
	}
    },
    getActiveLayer: function() {
	return this.activeLayer;
    },
    newLayer: function() {
	// create at bottom, for now
	let lowestLayer = 0;
	for (let i = 0; i < this.layers.length; i++) {
	    if (this.layers[i].getIndex() < lowestLayer) {
		lowestLayer = this.layers[i].getIndex();
	    }
	}
	this.layers.push( new Layer(lowestLayer - 1) );
    },

    mouseUpHandler: function(evt) {
	if (this.interpreter.touchPointCount > 0) return;

	let x = evt.pageX - this.offsetX;
	let y = evt.pageY - this.offsetY;
	let tool = this.getSelectedTool();
        this.getSelectedTool().up(this.getDrawCtx(), x, y);
	this.mouseIsDown = false;
	// Record action to undo history
	g_history.pushAction(tool.getRecordedAction());
	tool.resetRecordedAction();
    },

    mouseDownHandler: function(evt) {
	if (this.interpreter.touchPointCount > 0) return;
	this.getSelectedTool().resetRecordedAction();

	let x = evt.pageX - this.offsetX;
	let y = evt.pageY - this.offsetY;
	this.mouseIsDown = true;	    
	this.getSelectedTool().down(this.getDrawCtx(), x, y);
    },

    mouseMoveHandler: function(evt) {
	if (this.interpreter.touchPointCount > 0) return;

	this.cursorCtx.clearRect(0, 0, this.width, this.height);
	let x = evt.pageX - this.offsetX;
	let y = evt.pageY - this.offsetY;

	this.getSelectedTool().drawCursor(this.cursorCtx, x, y);
	if (this.mouseIsDown) {
	    this.getSelectedTool().drag(this.getDrawCtx(), x, y);
	}
    },

    zoom: function(factor) {
	for (let i = 0; i < this.layers.length; i++) {
	    if (this.layers[i].scale) {
		this.layers[i].scale(factor);
	    } else {
		$("#debug").html("This.layers[i] is " + this.layers[i]);
	    }
	}
    },
    pan: function(xFactor, yFactor) {
	for (let i = 0; i < this.layers.length; i++) {
	    this.layers[i].pan(xFactor, yFactor);
	}
    },
    clearAllLayers: function(){
	for (let i = 0; i < this.layers.length; i++) {
	    this.layers[i].clearLayer();
	}
    },
    updateAllLayerDisplays: function() {
	// TODO not used -- delete?
	for (let i = 0; i < this.layers.length; i++) {
	    this.layers[i].updateDisplay();
	}
    }
};

function DialogueManager() {
    this.allSpeech = "";
    this.bubbles = [];
    this.dialogueLayer = new Layer(-1);
    this.dialogueLayer.setName( "Text Layer");
    // TODO
    // Doing horrible violence to the layer encapsulation here
    // should probably be a subclass.
    let self = this;
    let theLayer = this.dialogueLayer;
    let ctx = this.dialogueLayer.displayContext;
    this.dialogueLayer.updateDisplay = function() {
	ctx.clearRect(0, 0, theLayer.width, theLayer.height);
	ctx.save();
	ctx.translate(
	  theLayer._xTranslate + theLayer._center.x * (1-theLayer._scale),		
	  theLayer._yTranslate + theLayer._center.y * (1-theLayer._scale));
	ctx.scale(theLayer._scale, theLayer._scale);
	self.renderAllBubbles();
	ctx.restore();
    },
    g_drawInterface.layers.push(theLayer);
}
DialogueManager.prototype = {
    addBubble: function(text) {
	this.bubbles.push( new SpeechBubble(text) );
    },

    renderAllBubbles: function() {
	let ctx = this.dialogueLayer.getContext();
	for (let i = 0; i < this.bubbles.length; i++) {
	    this.bubbles[i].render(ctx);
	}
    },

    makeBubblesFromText: function(text) {
	let lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
	    if (i < this.bubbles.length) {
		// Modify text in existing bubbles...
		this.bubbles[i].setText(lines[i]);
	    } else {
		// And add new bubbles for new lines:
		this.addBubble(lines[i]);
	    }
	}
	// Remove bubbles if number of lines has decreased:
	if (this.bubbles.length > lines.length) {
	    this.bubbles = this.bubbles.slice(0, lines.length);
	}
	this.dialogueLayer.clearLayer();
	this.renderAllBubbles();
    },

    getGrabPt: function(x, y) {
	// Balloons can be grabbed by: tailtip, right edge, left
	// edge, or main body.
	let margin = 15;
	for (let i = 0; i < this.bubbles.length; i++) {
	    let balloon = this.bubbles[i];
	    let box = balloon.getBoundingBox();
	    if (Math.abs( x - box.left) < margin &&
		y > box.top && y < box.bottom) {
		return {balloon: balloon,
			controlPoint: "leftEdge"};
	    }

	    if (Math.abs( x - box.right) < margin &&
		y > box.top && y < box.bottom) {
		return {balloon: balloon,
			controlPoint: "rightEdge"};
	    }
	    
	    if (x > box.left && x < box.right &&
		y > box.top && y < box.bottom) {
		return {balloon: balloon,
			controlPoint: "main"};
	    }

	    if (Math.abs( x - balloon.tailTip.x ) < margin &&
		Math.abs( y - balloon.tailTip.y ) < margin) {
		return {balloon: balloon,
			controlPoint: "tailTip"};
	    }
	}
	return null;
    }
};

function saveHandler() {
    // There's a securtiy exception that can happen if you try to
    // save a canvas that thinks it contains an image loaded from
    // a different server...

    // To save images:
    // 1. Composite all layers onto a single canvas, big enough to hold whole comic
    // (scald to 100%)
    let canvas = g_drawInterface.getActiveLayer().displayCanvas;
    // 2. Turn canvas into data URL like this:
    let dataUrl = canvas.toDataURL("image/png");
    let postArgs = {data: dataUrl.split(",")[1],
		filename: "mypic"};

    // 3. AJAX post the data url to "www.evilbrainjono.net/multicanvas/export.py" with
    //     args data = data filename = filename.
    jQuery.ajax({url:"export.py",
		data: postArgs,
		type: "POST",
		success: function(data, textStatus) {
                  $("#debug").html(data);
	        },
		error: function(req, textStatus, error) {
		$("#debug").html("error " + textStatus + "; " + error);
	        },
		dataType: "html"});
    
    // 4. Python script converts to .png and saves image, generates name, sends you back a link.
}


$(function() {
        document.multitouchData = true;

	g_history = new History();
	g_toolInterface = new ToolAreaInterface();
	g_drawInterface = new DrawAreaInterface();
	g_dialogue = new DialogueManager();

	let loadHandler = function() {
	    // TODO interface for picking a local image to upload
	    var img = new Image();   // Create new Image object  
	    img.onload = function(){  
		g_drawInterface.getDrawCtx().drawImage(img, 0, 0);
		g_history.pushAction(
	          new ImportImageAction(
                    g_drawInterface.getActiveLayer(), img, 0, 0
		  )
                );
	    }  
	    img.src = 'myImage.png';
	};
	$("#save-btn").bind("click", saveHandler);
	$("#load-btn").bind("click", loadHandler);
	$("#new-layer-btn").bind("click", function() { g_drawInterface.newLayer(); } );

	$("#dialogue-edit-area").bind("change", function() {
	  g_dialogue.makeBubblesFromText($("#dialogue-edit-area").val());
	  g_toolInterface.setTool(textBalloonTool);
	    });

});