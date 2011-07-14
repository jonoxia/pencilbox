function ToolOptions(optList) {
    // expects like [{name: "filled", type: "bool", defawlt: false}]
    this._optList = optList;
    this._values = {};
    for (let x = 0; x < optList.length; x++) {
	this._values[optList[x].name] = optList[x].defawlt;
    }
}
ToolOptions.prototype = {
    generateHtml: function(rootElem) {
	$("#tool-opts").empty();
	let self = this;
	for (let x = 0; x < this._optList.length; x++) {
	    let ctrl;
	    let key = this._optList[x].name;
	    let curVal = this._values[key];
	    switch (this._optList[x].type) {
	    case "bool":
	    ctrl = $("<input type=\"checkbox\">");
	    ctrl.change(function() {
		    self.setValue(key, ctrl.attr("checked"));
		    g_toolInterface.updateToolImage();
		});
	    if (curVal) {
		ctrl.attr("checked", true);
	    } else {
		ctrl.attr("checked", false);
	    }
	    break;
	    case "scale":
	    // A 0 - 100 scale
		// TODO make this some kind of draggable slider thing
		// instead of a drop-down box, and give it more
		// inbetween values!
		ctrl = $("<select><option value='100'>100%</option>" +
			 "<option value='75'>75%</option>" +
			 "<option value='50'>50%</option>" +
			 "<option value='25'>25%</option>" +
			 "<option value='0'>0%</option></select>");
		ctrl.change(function() {
		  let selected = ctrl.children("option:selected").first();
		  self.setValue(key, parseInt(selected.val()));
		  g_toolInterface.updateToolImage();
	        });
		// Initially select the option corresponding to
		// current value:
		ctrl.children().each(function() {
			if ($(this).attr("value") == curVal) {
			    $(this).attr("selected", true);
			}
		    });
	    break;
	    }
	    $("#tool-opts").append(ctrl);
	    $("#tool-opts").append($("<span>" + key + "</span><br/>"));
	}
    },
    
    setValue: function(key, value) {
	this._values[key] = value;
    },

    getValue: function(key) {
	return this._values[key];
    }
};


function Tool(defaultSize, optList) {
    // TODO size could be a ToolOption couldn't it?
    this._trueSize = defaultSize;
    this.size = Math.floor( this._trueSize + 0.5 );
    this.actionPoints = [];
    if (optList) {
	this.options = new ToolOptions(optList);
    } else {
	this.options = null;
    }
}
Tool.prototype = {
    generateOptionHtml: function(rootElem) {
	if (this.options) {
	    this.options.generateHtml(rootElem);
	} else {
	    $("#tool-opts").empty();
	}
    },

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

    down: function(ctx, x, y, isDblClick) {
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
	let fill = false;
	if (this.options && this.options.getValue("fill")) {
	    fill = true;
	}

	let styles = {lineWidth: self.size,
		      strokeStyle: self.getStrokeStyle(),
		      lineCap: self.getLineCap(),
	              lineJoin: self.getLineJoin(),
		      fillStyle: g_toolInterface.getPaintColor()};
	let worldPts = activeLayer.screenToWorldMulti(this.actionPoints,
						      this.sizeIsOdd());
	return new DrawAction(activeLayer, worldPts, styles, fill);
    },

    resetRecordedAction: function() {
	$("#debug").html("Reset recorded action.");
	this.actionPoints = [];
    },

    getOptions: function() {
    }
}

let pen = new Tool(1.0, [{name: "fill",
			   type: "bool", defawlt: false}]);
pen.display = function(penCtx, x, y) {
    penCtx.beginPath();
    penCtx.arc(x, y, this.size/2, 0, 2*Math.PI, true);
    penCtx.fillStyle = g_toolInterface.getPenColor().style;
    penCtx.fill();
};
pen.drawCursor = pen.display;


let eraser = new Tool(10.0, [{name: "round",
			      type: "bool", defawlt: false}]);
// This is a square eraser that erases to transparent
// Could also have round one: beginPath() arc() clearPath())
eraser.display = function(penCtx, x, y) {
    penCtx.strokeStyle=Colors.black.style;
    penCtx.lineWidth = 1.0;
    if (this.options.getValue("round")) {
      penCtx.beginPath();
      penCtx.arc(x, y, this.size/2, 0, 2*Math.PI, true);
      penCtx.strokeStyle=Colors.black.style;
      penCtx.stroke();
    } else {
      penCtx.strokeRect(x - this.size/2, y - this.size/2,
                        this.size, this.size);
    }
};
eraser.drawCursor = eraser.display;
eraser.drag = function(ctx, x, y) {
    // Don't scale up eraser, so it stays the same size on the screen
    // when you zoom in.
    if (this.options.getValue("round")) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, this.size/2, 0, 2*Math.PI, true);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.clearRect(x - this.size/2, y - this.size/2,
                        this.size, this.size);
    }
    this.actionPoints.push( {x: x, y: y} );
};
eraser.getRecordedAction = function() {
    let activeLayer = g_drawInterface.getActiveLayer();
    // Scale down the eraser when you zoom in, so it stays the
    // same size on screen and you can do precision erasing:
    let width = this.size / g_drawInterface.getZoomLevel();
    // TODO round off width to some kind of whole number?
    let points = activeLayer.screenToWorldMulti(this.actionPoints, false);
    return new EraserStrokeAction(activeLayer, points,
				  width, this.options.getValue("round"));
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
line.down = function(ctx, x, y, isDblClick) {
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

let bucket = new Tool(0, [{name: "tolerance",
			   type: "scale", defawlt: 0},
                          {name: "ignore other layers",
                           type: "bool", defawlt: true}]);
// WHY DO HUMANS LEAVE CERTAIN RECEPTACLES WHERE ANYONE CAN SEE THEM
bucket.paintAction = null;
bucket.tmpLayer = null;
bucket.display = function(penCtx, x, y) {
    let img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = 'icons/paint-can.png'; 
};
bucket.down = function(ctx, x, y, isDblClick) {
};
bucket.up = function(ctx, x, y) {
    let parentLayer = g_drawInterface.getActiveLayer();
    let tolerance = this.options.getValue("tolerance");

    // Create the temp layer if it doesn't already exist:
    if (this.tmpLayer == null) {
      this.tmpLayer = new Layer(-1, {hidden: true});
      this.tmpLayer.setName("Temporary paint layer");
      // TODO set size of tmpLayer to size of parent layer
    }

    /* The temp layer will be used for a full scale
     * reconstruction of the underlying layer(s), which will then be
     * turned into a bit manipulator and erased.  That will get us
     * a bit manipulator containing the source data at 100% zoom.
     * Then we erase the temp layer and re-use it to draw the pixels of
     * the paint fill, which will be captured as a data url and turned 
     * into a plopBitmapAction. */
    this.tmpLayer.clearLayer();
    let paintCtx = this.tmpLayer.getContext();

    // TODO if the obey lines from other layers option is turned on,
    // then also replay those other layers into the paint context.
    g_history.replayActionsForLayer(parentLayer, paintCtx);

    let bm = new BitManipulator(paintCtx, this.tmpLayer.width,
                                this.tmpLayer.height);

    // We've got the bit data, now clear the tmp layer and paint it in
    this.tmpLayer.clearLayer();
    paintCtx.strokeStyle = g_toolInterface.getPaintColor().style;
    // tmpLayer doesn't share parentLayer's transform, so de-transform
    // the location of the click:
    let worldPt = parentLayer.screenToWorld(x, y);
    let fillMap = betterEdgeFinder(paintCtx, bm, worldPt.x, worldPt.y,
                                   tolerance);

    // TODO optimization: clip layer to size of bounding rectangle
    // of filled region (see layer.pngSnapshot) to make the
    // resulting png smaller
    let pngDataUrl = this.tmpLayer.displayCanvas.toDataURL("image/png");

    let paintPng = new Image();
    let paintAction = new PlopBitmapAction(parentLayer, paintPng,
                                           0, 0, 1);
    paintPng.onload = function() {
	parentLayer.doActionNow(paintAction);
    };
    paintPng.src = pngDataUrl;
    
    this.paintAction = paintAction;
    this.tmpLayer.clearLayer();
};
bucket.drag = function(ctx, x, y) {
};
bucket.drawCursor = function(ctx, x, y) {
    // this doesn't work, not sure why.
    $("#the-canvas").css("cursor", "url(icons/paint-can.png)");
};
bucket.getRecordedAction = function() {
    if (this.paintAction) {
	return this.paintAction;
    }
    return null;
};

let rectangle = new Tool(1.0, [{name: "fill", type: "bool",
				defawlt: false}]);
rectangle.display = function(penCtx, x, y) {
    penCtx.clearRect(x - 20, y - 20, 40, 40);
    penCtx.strokeStyle=this.getStrokeStyle().style;
    penCtx.lineWidth = this.size;
    penCtx.beginPath();
    penCtx.moveTo(x - 20, y - 20);
    penCtx.lineTo(x+ 20, y-20);
    penCtx.lineTo(x+ 20, y+20);
    penCtx.lineTo(x- 20, y+20);
    penCtx.lineTo(x- 20, y-20);
    if (this.options.getValue("fill")) {
	penCtx.fill();
    } else {
	penCtx.stroke();
    }
};
rectangle.down = function(ctx, x, y, isDblClick) {
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
    let self = this;
    this.actionPoints = [
        {x: self.startX, y: self.startY},
        {x: self.startX, y: self.endY},
        {x: self.endX, y: self.endY},
        {x: self.endX, y: self.startY},
        {x: self.startX, y: self.startY} ];
    return Tool.prototype.getRecordedAction.call(this);
};
rectangle.resetRecordedAction = function() {
    // Nothing to do
};

let ellipse = new Tool(1.0, [{name: "fill", type: "bool",
			      defawlt: false},
{name: "circle", type: "bool", defawlt: false},
{name: "center", type: "bool", defawlt: true}]);
ellipse.display = function(penCtx, x, y) {
    penCtx.strokeStyle = this.getStrokeStyle().style;
    penCtx.lineWidth = this.size;
    penCtx.beginPath();
    penCtx.arc(x, y, 30, 0, Math.PI *2, false);
    if (this.options.getValue("fill")) {
	penCtx.fill();
    } else {
	penCtx.stroke();
    }
};
ellipse.down = function(ctx, x, y, isDblClick) {
    this.startX = x;
    this.startY = y;
    this.inProgress = true;
};
ellipse.up = function(ctx, x, y) {
    this.endX = x;
    this.endY = y;
    this._drawEllipse(ctx, this.endX, this.endY);
    this.inProgress = false;
};
ellipse.drag = function(ctx, x, y) {
};
ellipse.drawCursor = function(ctx, x, y) {
    // TODO if center is checked, then startX and startY are center,
    // otherwise they're a corner.
    $("#the-canvas").css("cursor", "crosshair");
    if (this.inProgress) {
	this._drawEllipse(ctx, x, y);
    }
};
ellipse._getDimensions = function(x, y) {
    let dx = Math.abs(x - this.startX);
    let dy = Math.abs(y - this.startY);
    if (dx == 0 || dy == 0) {
	return null;
    }
    if (this.options.getValue("circle")) {
	if (dx > dy) {
	    dy = dx;
	} else {
	    dx = dy;
	}
    }
    return {dx: dx, dy: dy};
};
ellipse._drawEllipse = function(ctx, x, y) {
    let dimensions = this._getDimensions(x, y);
    if (dimensions == null) {
	return;
    }
    ctx.save();
    ctx.translate(this.startX, this.startY);
    ctx.scale(dimensions.dx, dimensions.dy);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI *2, false);
    ctx.restore();
    if (this.options.getValue("fill")) {
	ctx.fillStyle = g_toolInterface.getPaintColor().style;
	ctx.fill();
    } else {
	ctx.lineWidth = this.size;
	ctx.strokeStyle = this.getStrokeStyle().style;
	ctx.stroke();
    }
};
ellipse.getRecordedAction = function() {
    let activeLayer = g_drawInterface.getActiveLayer();
    let dimensions = this._getDimensions(this.endX, this.endY);
    if (dimensions == null) {
	return null;
    }
    let dx = dimensions.dx / g_drawInterface.getZoomLevel();
    let dy = dimensions.dy / g_drawInterface.getZoomLevel();
    let worldCenter = activeLayer.screenToWorld(this.startX,
						this.startY);
    let self = this;
    let styleInfo = {
	lineWidth: self.size,
	strokeStyle: self.getStrokeStyle(),
	lineCap: self.getLineCap(),
	lineJoin: self.getLineJoin(),
	fillStyle: g_toolInterface.getPaintColor()};
    let isFill = this.options.getValue("fill");
    return new EllipseAction(activeLayer, worldCenter, dx, dy,
			     styleInfo, isFill);
};
ellipse.resetRecordedAction = function() {
    // Nothing to do
};


let paintbrush = new Tool(10.0, [{name: "opacity", type: "scale",
				  defawlt: 50}]);
// TODO paintbrush needs a way to set messiness
// as well as size and opacity... but we have to define 'messiness' first.
paintbrush.getStrokeStyle = function() {
    let color = g_toolInterface.getPaintColor().copy();
    color.a = this.options.getValue("opacity") / 100;
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
eyedropper.down = function(ctx, x, y, isDblClick) {
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


let polygon = new Tool(1.0, [{name: "close", type: "bool", defawlt: true},
                             {name:"fill", type: "bool", defawlt: false}
                      ]);
polygon.firstPoint = null;
polygon.inProgress = false;
polygon.display = function(penCtx, x, y) {
    penCtx.strokeStyle = this.getStrokeStyle().style;
    penCtx.lineWidth = this.size;
    penCtx.beginPath();
    penCtx.lineTo(x-30, y);
    penCtx.lineTo(x-15, y -30);
    penCtx.lineTo(x+30, y-30);
    penCtx.lineTo(x, y);
    penCtx.lineTo(x+15, y+30);
    if (this.options.getValue("close")) {
        penCtx.lineTo(x-30, y);
    }
    if (this.options.getValue("fill")) {
	penCtx.fill();
    } else {
	penCtx.stroke();
    }
};
polygon.down = function(ctx, x, y, isDblClick) {
    if (isDblClick) {
	// Double click = end the polygon
	if (this.inProgress) {
	    $("#debug").html("Ended polygon");
            if (this.options.getValue("close")) {
                // close the loop:
                let fp = this.firstPoint;
                this.actionPoints.push({x: fp.x, y: fp.y});
	    }
        }
	this.inProgress = false;
    } else if (!this.inProgress) {
	$("#debug").html("Started polygon");
	this.resetRecordedAction();
	this.inProgress = true;
	this.firstPoint = {x: x, y: y};
	this.actionPoints.push({x: x, y: y});
    }
};
polygon.up = function(ctx, x, y) {
    if (this.inProgress) {
	this.actionPoints.push({x: x, y: y});
    }
};
polygon.drag = function(ctx, x, y) {
};
polygon.getRecordedAction = function() {
    // Record no action until the whole polygon is done:
    if (this.inProgress) {
	return null;
    } else {
	return Tool.prototype.getRecordedAction.call(this);
    }
};
polygon.drawCursor = function(ctx, x, y) {
    $("#the-canvas").css("cursor", "crosshair");
    if (this.inProgress) {
      ctx.strokeStyle=this.getStrokeStyle().style;
      ctx.lineWidth = this.size;
      ctx.beginPath();
      ctx.moveTo(this.firstPoint.x, this.firstPoint.y);
      //$("#debug").html("Len is " + this.actionPoints.length);
      for (let i = 0; i < this.actionPoints.length; i++) {
	  ctx.lineTo(this.actionPoints[i].x, this.actionPoints[i].y);
      }
      ctx.lineTo(x, y);
      ctx.stroke();
    }
};

// More tools:
// Fancy line tool? (TBH i never use these)

// A gradient fill tool (Canvas supports it!!) Could also be a
// selection option?

