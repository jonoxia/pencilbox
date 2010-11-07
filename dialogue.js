function SpeechBubble(text) {
    // These will be global and shared by all instances:
    this.borderLineSize = 2.0;
    this.padding = 15;
    this.cornerRadius = 15;
    this.tailBaseWidth = 30;
    this.font = "12pt Arial";
    this.lineHeight = 20;
    
    // These are instance specific (and need an interface for setting)
    this.text = text;
    
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
    render: function(ctx) {
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

function DialogueManager() {
    this.allSpeech = "";
    this.bubbles = [];
    this.dialogueLayer = new Layer(-1);
    this.dialogueLayer.setName( "Text Layer");
    let manager = this;
    let theLayer = this.dialogueLayer;
    theLayer.onRedraw = function(ctx) {
	manager.renderAllBubbles(ctx);
    }
    g_drawInterface.layers.push(theLayer);
}
DialogueManager.prototype = {
    addBubble: function(text) {
	this.bubbles.push( new SpeechBubble(text) );
    },

    renderAllBubbles: function(ctx) {
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
	this.dialogueLayer.updateDisplay();
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
    },

    get numBubbles() {
	return this.bubbles.length;
    }
};
