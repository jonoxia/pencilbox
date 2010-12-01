function SpeechBubble(text, style) {
    // These will be global and shared by all instances:
    this.borderLineSize = 2.0;
    this.padding = 15;
    this.cornerRadius = 15;
    this.tailBaseWidth = 30;
    this.normalFont = "12pt sans-serif";
    this.emFont = "bold italic 12pt sans-serif";
    this.lineHeight = 20;
    
    // These are instance specific (and need an interface for setting)
    this.text = text;
    this.textSpans = [];
    this.style = style; // regular, caption, thought?
    
    // Pick a place to start out the bubble:
    let x = 25 * g_dialogue.numBubbles;
    this.center = g_dialogue.dialogueLayer.screenToWorld(200 + x, 200);
    this.tailTip = g_dialogue.dialogueLayer.screenToWorld(300 + x, 400);
    this.maxLineWidth = 200;

    // Call these to recalc when data changes:
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
	// newText is XML; parse out the style tags!
	// TODO don't recreate the parser every time here
	let parser = new DOMParser();
	let dom = parser.parseFromString(newText, "text/xml");
	let doc = dom.documentElement;
	if (doc.nodeName == "parsererror") {
	    // can't parse - take text literally
	    this.style = "talk";
	    this.textSpans = [ { words: newText,
				 style: null} ];
			       
	} else {
	    this.style = doc.nodeName;
	    // could be "talk", "thought", or "caption".
	    this.textSpans = [];
	    for (let i = 0; i < doc.childNodes.length; i++) {
		let node = doc.childNodes[i];
		if (node.nodeValue != null) {
		    this.textSpans.push( {words: node.nodeValue,
				style: null} );
		} else {
		    this.textSpans.push(
		      {words: node.childNodes[0].nodeValue,
		       style: node.nodeName} );
		}
	    }
	}

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
	let lines = [];
	let thisLine = [];
	let lineWidth = 0;
	let thisSegment = [];
	let segmentWidth = 0;
	for (let i = 0; i < this.textSpans.length; i++) {
	    let words = this.textSpans[i].words.split(" ");
	    let style = this.textSpans[i].style;
	    if (style == "em") {
		ctx.font = this.emFont;
	    } else {
		ctx.font = this.normalFont;
	    }
	    for (let j = 0; j < words.length; j++) {
		if (words[j].length == 0) {
		    continue;
		}
		// Don't forget to include width of the space!
		let thisWidth = ctx.measureText(words[j] + " ").width;
		if (lineWidth + thisWidth > this.maxLineWidth) {
		    thisLine.push({words: thisSegment.join(" "),
				style: style,
				width: segmentWidth});
		    lines.push(thisLine);
		    thisLine = [];
		    thisSegment = [];
		    lineWidth = 0;
		    segmentWidth = 0;
		}
		thisSegment.push(words[j]);
		lineWidth += thisWidth;
		segmentWidth += thisWidth;
	    }
	    thisLine.push({words: thisSegment.join(" "),
			style: style,
			width: segmentWidth});
	    segmentWidth = 0;
	    thisSegment = [];
	}
	lines.push(thisLine);
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
	this.tailIntercept = {x: intercept.x, y: intercept.y};
    },
    render: function(ctx) {
	ctx.font = this.normalFont;
	ctx.textAlign = "start";
	ctx.lineWidth = this.borderLineSize;
	ctx.strokeStyle = "rgb(0,0,0)";
	ctx.fillStyle = "rgb(255, 255, 255)";
	switch (this.style) {
	case "talk":
	    this.renderTalk(ctx);
	break;
	case "thought":
	    this.renderThought(ctx);
        break;
	case "caption":
	    this.renderCaption(ctx);
	break;
	}
	let x = this.left + this.padding;
	let y = this.top + this.padding + (this.lineHeight/2);
	ctx.fillStyle = "rgb(0, 0, 0)";
	for (let i = 0; i < this.lines.length; i++) {
	    for (let j = 0; j < this.lines[i].length; j++) {
		let segment = this.lines[i][j];
		if (segment.style == "em") {
		    ctx.font = this.emFont;
		} else {
		    ctx.font = this.normalFont;
		}
		ctx.fillText(segment.words, x, y);
		x += segment.width;
	    }
	    x = this.left + this.padding;
	    y += this.lineHeight;
	}
    },
    renderCaption: function(ctx) {
	let width = this.right - this.left;
	let height = this.bottom - this.top;
	ctx.fillRect(this.left, this.top, width, height);
	ctx.strokeRect(this.left, this.top, width, height);
    },
    renderThought: function(ctx) {
	// TODO
	let width = this.right - this.left;
	let height = this.bottom - this.top;
	
	// Bubble trail where tail would be:
	let tailCenter;
	let self = this;
	switch (this.tailInterceptSide) {
	case "bottom":
	    tailCenter = {x: self.tailIntercept.x, y: self.bottom};
	    break;
	case "top":
	    tailCenter = {x: self.tailIntercept.x, y: self.top};
	    break;
	case "left":
	    tailCenter = {x: self.left, y: self.tailIntercept.y};
	    break;
	case "right":
	    tailCenter = {x: self.right, y: self.tailIntercept.y};
	    break;
	}
	// Three bubbles of decreasing size:
	ctx.beginPath();
	ctx.arc(tailCenter.x, tailCenter.y,
		this.tailBaseWidth, 0, 2*Math.PI, false);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.arc((tailCenter.x + this.tailTip.x)/2,
		(tailCenter.y + this.tailTip.y)/2,
		this.tailBaseWidth/2, 0, 2*Math.PI, false);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(this.tailTip.x,
		this.tailTip.y,
		this.tailBaseWidth/4, 0, 2*Math.PI, false);
	ctx.fill();
	ctx.stroke();

	// The curvy outline:
	ctx.beginPath();
	let x = this.left;
	for (let i = 0; i < 5; i++) {
	    ctx.arc(this.left + i* width/5 + width/10,  this.top,
		    width/10, Math.PI, 0, false);
	}
	for (let i = 0; i < 3; i++) {
	    ctx.arc(this.right, this.top + i* height/3 + height/6,
		    height/6, 3*Math.PI/2, Math.PI/2, false);
	}
	for (let i = 0; i < 5; i++) {
	    ctx.arc(this.right - i* width/5 - width/10,  this.bottom,
		    width/10, 0, Math.PI, false);
	}
	for (let i = 0; i < 3; i++) {
	    ctx.arc(this.left, this.bottom - i* height/3 - height/6,
		    height/6, Math.PI/2, 3*Math.PI/2, false);
	}
	ctx.fill();
	ctx.stroke();

    },
    renderTalk: function(ctx) {
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
    }
};

function DialogueManager() {
    this.allSpeech = "";
    this.bubbles = [];
    this.dialogueLayer = new Layer(-1);
    this.dialogueLayer.setName( "Text Layer");
    let manager = this;
    let theLayer = this.dialogueLayer;
    theLayer.onRedraw = function(ctx) {
	//manager.makeBubblesFromText();
	manager.renderAllBubbles(ctx);
    }
    g_drawInterface.layers.push(theLayer);
}
DialogueManager.prototype = {
    addBubble: function(text) {
	this.bubbles.push( new SpeechBubble(text) );
    },

    renderAllBubbles: function(ctx) {
	if (!ctx) {
	    ctx = this.dialogueLayer.getContext();
	}
	for (let i = 0; i < this.bubbles.length; i++) {
	    this.bubbles[i].render(ctx);
	}
    },

    getScript: function() {
	return this.allSpeech;
    },

    setScript: function(script) {
	this.allSpeech = script;
    },

    makeBubblesFromText: function() {
	let lines = this.allSpeech.split("\n");
	let x;
	lines = [lines[x] for (x in lines) if (lines[x].length > 0)];
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
		return {balloon: i,
			controlPoint: "leftEdge"};
	    }

	    if (Math.abs( x - box.right) < margin &&
		y > box.top && y < box.bottom) {
		return {balloon: i,
			controlPoint: "rightEdge"};
	    }
	    
	    if (x > box.left && x < box.right &&
		y > box.top && y < box.bottom) {
		return {balloon: i,
			controlPoint: "main"};
	    }

	    if (Math.abs( x - balloon.tailTip.x ) < margin &&
		Math.abs( y - balloon.tailTip.y ) < margin) {
		return {balloon: i,
			controlPoint: "tailTip"};
	    }
	}
	return null;
    },

    getBalloonByIndex: function(i) {
	return this.bubbles[i];
    },

    get numBubbles() {
	return this.bubbles.length;
    },
    
    reset: function() {
	this.allSpeech = "";
	this.bubbles = [];
    }
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
    $("#debug").html("Down");
};
textBalloonTool.up = function(ctx, x, y) {
    this.balloon = null;
    this.controlPoint = null;
};
textBalloonTool.drag = function(ctx, x, y) {
    if ((this.balloon != null) && this.controlPoint) {
	let balloon = g_dialogue.getBalloonByIndex(this.balloon);
	let layer = g_dialogue.dialogueLayer;
	let worldPt = layer.screenToWorld(x, y);
	this.lastControlPoint = this.controlPoint;
	this.lastActionPoint = worldPt;
	this.lastBalloon = this.balloon;
	switch (this.controlPoint) {
	case "tailTip":
	    balloon.setTailTip(worldPt);
	    break;
	case "main":
            balloon.setCenter(worldPt);
	    break;
	case "leftEdge": case "rightEdge":
            let dx = Math.abs(balloon.center.x - worldPt.x);
	    if (dx > balloon.cornerRadius) {
		balloon.setWidth( 2 * dx );
		this.lastActionPoint = {x: 2*dx, y: 0};
            }
	    break;
	default:
	    $("#debug").html("Control point is " + this.controlPoint);
	}
	layer.updateWithoutReplay();
    } else {
	$("#debug").html("No balloon to drag.");
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
    if (this.lastControlPoint == null || this.lastBalloon == null) {
	return null;
    }
    return new MoveBalloonAction(this.lastBalloon,
				 this.lastControlPoint,
				 this.lastActionPoint);
};
textBalloonTool.resetRecordedAction = function() {
    this.lastControlPoint = null;
    this.lastActionPoint = null;
    this.lastBalloon = null;
};

