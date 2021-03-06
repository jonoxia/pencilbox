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

function SpeechBubble(text, style) {
    // These will be global and shared by all instances:
    this.borderLineSize = 2.0;
    this.padding = 15;
    this.cornerRadius = 15;
    this.tailBaseWidth = 30;
    this._fonts = {
	normal: "12pt cursive",  // was sans-serif
	em: "bold italic 12pt cursive",
	title: "bold small-caps 18pt serif",
        whisper: "lighter 10pt cursive"};
    // TODO lineHeight actually needs to vary by which font is used
    // - if there are several segments in one line, that line needs to
    // be as tall as the lineHeight of the font of the highest segment.
    this.lineHeight = 20;
    
    // These are instance specific (and need an interface for setting)
    this.textSpans = [];
    this.style = style; // regular, caption, thought?
    
    // Pick a place to start out the bubble:
    var x = 25 * g_dialogue.numBubbles;
    this.center = g_dialogue.dialogueLayer.screenToWorld(200 + x, 200);
    this.tailTip = g_dialogue.dialogueLayer.screenToWorld(300 + x, 400);
    this.maxLineWidth = 200;

    this.setText(text);
};
SpeechBubble.prototype = {
    getFont: function(tagName) {
	if (this._fonts[tagName]) {
	    return this._fonts[tagName];
	} else {
	    return this._fonts.normal;
	}
    },
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
	var parser = new DOMParser();
	var dom = parser.parseFromString(newText, "text/xml");
	var doc = dom.documentElement;
	var node;
	if (doc.nodeName == "parsererror") {
	    // can't parse - take text literally
	    this.style = "talk";
	    this.textSpans = [ { words: newText,
				 style: null} ];
			       
	} else {
	    this.style = doc.nodeName;
	    // could be "talk", "thought", or "caption".
	    this.textSpans = [];
	    for (var i = 0; i < doc.childNodes.length; i++) {
		node = doc.childNodes[i];
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
	var width = this.maxLineWidth + 2 * this.padding;
	var height = this.lines.length * this.lineHeight + 2 * this.padding;
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
	var self = this;
	return {left: self.left,
		right: self.right,
		top: self.top,
		bottom: self.bottom};
    },
    wrapText: function() {
	var ctx = g_dialogue.dialogueLayer.getContext();
	var lines = [];
	this.lineWidths = [];
	var thisLine = [];
	var lineWidth = 0;
	var thisSegment = [];
	var segmentWidth = 0;
	var words, style, thisWidth;
	for (var i = 0; i < this.textSpans.length; i++) {
	    words = this.textSpans[i].words.split(" ");
	    style = this.textSpans[i].style;
	    ctx.font = this.getFont(style);
	    for (var j = 0; j < words.length; j++) {
		if (words[j].length == 0) {
		    continue;
		}
		// Don't forget to include width of the space!
		thisWidth = ctx.measureText(words[j] + " ").width;
		if (lineWidth + thisWidth > this.maxLineWidth) {
		    thisLine.push({words: thisSegment.join(" "),
				style: style,
				width: segmentWidth});
		    this.lineWidths.push(lineWidth);
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
	this.lineWidths.push(lineWidth);
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

	var dx = this.tailTip.x - this.center.x;
	var dy = this.tailTip.y - this.center.y;
	// Intercept is the point where line from center to tailtip
	// intersects border of balloon.
	// Use intercept to calculate left and right tail base;
	// they're tailBaseWidth pixels apart, centered around
	// intercept point unless that would make it too far left
	// or right, in which case pin it within the bounds of
	// that side.
	var intercept = {x: 0, y: 0}; 
	var interceptL, interceptR, interceptT, interceptB;
	var interceptSide;

	// Decide what side of the bubble the tail comes out of:
	var aspectRatio = (this.right-this.left)/(this.bottom-this.top);
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
	case "yell":
	    this.renderYell(ctx);
        break;
	case "caption":
	    this.renderCaption(ctx);
	break;
	// Any other tag name will not render any border around
	// text -- useful for sound effects and titles!
	}
	// Render each line in turn: Each line can have multiple
	// segments (with different styles applied to them).
	var x = (this.left + this.right)/2; // manual centering
	var y = this.top + this.padding + (this.lineHeight/2);
	var lineWidth, segment;
	ctx.fillStyle = "rgb(0, 0, 0)";
	for (var i = 0; i < this.lines.length; i++) {
	    lineWidth = this.lineWidths[i];
	    x = (this.left + this.right)/2  - (lineWidth)/2;
	    for (var j = 0; j < this.lines[i].length; j++) {
		segment = this.lines[i][j];
		ctx.font = this.getFont(segment.style);
		ctx.fillText(segment.words, x, y);
		x += segment.width;
	    }
	    y += this.lineHeight;
	}
    },
    renderCaption: function(ctx) {
	var width = this.right - this.left;
	var height = this.bottom - this.top;
	ctx.fillRect(this.left, this.top, width, height);
	ctx.strokeRect(this.left, this.top, width, height);
    },
    renderYell: function(ctx) {
	// TODO spiky balloon -- parametrically do an inner and
	// an outer ellipse, zigzag between them stochastically.
    },
    renderThought: function(ctx) {
	var width = this.right - this.left;
	var height = this.bottom - this.top;
	var tailCenter;
	var self = this;

	// The curvy outline, using Parametric equation of ellipse:
	// x = a * cos(t)
	// y = b * sin(t)
	// as t goes from 0 to 2pi.
	var t = 0; 
	var centerX = this.left + width/2;
	var centerY = this.top + height/2;
	var oldX = centerX + (width/2) * Math.cos(t);
	var oldY = centerY + (height/2) * Math.sin(t);
	var step, x, y, radius;
	ctx.beginPath();
	while (t < 2 * Math.PI) {
	    step = 0.2 + 0.2 * Math.random();
	    t += step;
	    if (t >= 2*Math.PI) {
		t = 2*Math.PI;
	    }
	    x = centerX + (width/2) * Math.cos(t);
	    y = centerY + (height/2) * Math.sin(t);
	    radius = Math.sqrt((x-oldX)*(x-oldX) + (y-oldY)*(y-oldY));
	    ctx.arc(x, y, 3*radius/4, t - Math.PI/2, t + Math.PI/2, false);
	    oldX = x;
	    oldY = y;
	}
	ctx.lineWidth = 2*this.borderLineSize;
	ctx.stroke();
	ctx.fill();

	ctx.lineWidth = this.borderLineSize;
	// Bubble trail where tail would be:
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
	default:
	    tailCenter = null;
	}
	// Three bubbles of decreasing size:
	if (tailCenter != null) {
	    ctx.beginPath();
	    ctx.arc((2*tailCenter.x + this.tailTip.x)/3,
		    (2*tailCenter.y + this.tailTip.y)/3,
		    this.tailBaseWidth/2, 0, 2*Math.PI, false);
	    ctx.fill();
	    ctx.stroke();
	    ctx.beginPath();
	    ctx.arc((tailCenter.x + 2*this.tailTip.x)/3,
		    (tailCenter.y + 2*this.tailTip.y)/3,
		    this.tailBaseWidth/3, 0, 2*Math.PI, false);
	    ctx.fill();
	    ctx.stroke();
	    ctx.beginPath();
	    ctx.arc(this.tailTip.x,
		    this.tailTip.y,
		    this.tailBaseWidth/4, 0, 2*Math.PI, false);
	    ctx.fill();
	    ctx.stroke();
	}
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
    var manager = this;
    var theLayer = this.dialogueLayer;
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
	for (var i = 0; i < this.bubbles.length; i++) {
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
	// TODO this behaves oddly if you add a line to the middle
	// or delete a line from the middle...  it thinks you modified
	// every line after that.
	var lines = this.allSpeech.split("\n");
	var validLines = [];
	var i;
	for (i = 0; i < lines.length; i++) {
	    if (lines[i].length > 0) {
		validLines.push(lines[i]);
	    }
	}
	for (i = 0; i < validLines.length; i++) {
	    if (i < this.bubbles.length) {
		// Modify text in existing bubbles...
		this.bubbles[i].setText(validLines[i]);
	    } else {
		// And add new bubbles for new lines:
		this.addBubble(validLines[i]);
	    }
	}
	// Remove bubbles if number of lines has decreased:
	if (this.bubbles.length > validLines.length) {
	    this.bubbles = this.bubbles.slice(0, validLines.length);
	}
    },

    getGrabPt: function(x, y) {
	// Balloons can be grabbed by: tailtip, right edge, left
	// edge, or main body.
	var margin = 15;
	// go backwards through list so that balloons that appear
	// frontmost (i.e. drawn last)
	// get grabbed before ones in the back
	var balloon, box;
	for (var i = this.bubbles.length -1; i >= 0; i--) {
	    balloon = this.bubbles[i];
	    box = balloon.getBoundingBox();
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
    var layer = g_dialogue.dialogueLayer;
    var worldPt = layer.screenToWorld(x, y);
    var grabbitation = g_dialogue.getGrabPt(worldPt.x, worldPt.y);
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
	var balloon = g_dialogue.getBalloonByIndex(this.balloon);
	var layer = g_dialogue.dialogueLayer;
	var worldPt = layer.screenToWorld(x, y);
	var dx;
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
            dx = Math.abs(balloon.center.x - worldPt.x);
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
    var img = new Image();  
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

