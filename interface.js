function GestureInterpreter(gestureLibrary, offsetX, offsetY) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.touchPoints = {};
    this.touchPointCount = 0;
    this.library = gestureLibrary;
    this.gestureDirections = [];

    this.pinchFirstDist = null;

    this.pieMenu = null;
    this.locMenus = null;
    this.activeMenu = null;
    if (gestureLibrary.oneFinger) {
	if (gestureLibrary.oneFinger.pieMenu) {
	    this.pieMenu = gestureLibrary.oneFinger.pieMenu;
	}
	if (gestureLibrary.oneFinger.locationMenus) {
	    this.locMenus = gestureLibrary.oneFinger.locationMenus;
	}
    }
}
GestureInterpreter.prototype = {
    hasMenus: function() {
	return (this.pieMenu || this.locMenus);
    },
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

	if (this.touchPointCount == 1 && this.hasMenus()) {
	    this.menuMouseDown(evt);
	}
	if (this.touchPointCount == 2 && this.pieMenu) {
	    this.activeMenu.cancel();
	    this.activeMenu = null;
	}
    },

    menuMouseDown: function(evt) {
	let x = evt.pageX - this.offsetX;
	let y = evt.pageY - this.offsetY;
	if (this.locMenus) {
	    for (let i = 0; i < this.locMenus.length; i++) {
		if (this.locMenus[i].isPtInside(x, y)) {
		    this.locMenus[i].onMouseDown(evt);
		    this.activeMenu = this.locMenus[i];
		    return;
		}
	    }
	}
	if (this.pieMenu) {
	    this.pieMenu.onMouseDown(evt);
	    this.activeMenu = this.pieMenu;
	}
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

	    if (this.touchPointCount == 1 && this.activeMenu) {
		this.activeMenu.onMouseMove(evt);
	    } else {
		this.interpretGesture(id);
	    }
	} else {
	    $("#debug").html("NOT POINT");
	}
    },

    touchUp: function(evt) {
	let id = evt.streamId;
	delete this.touchPoints[id];
	this.touchPointCount --;
	if (this.touchPointCount == 0) {
	    this.finalizeGesture();
	    this.gestureDirections = [];
	    this.pinchFirstDist = null;
	    if (this.activeMenu) {
		this.activeMenu.onMouseUp(evt);
		this.activeMenu = null;
	    }
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

	    // either pan OR zoom, don't do both.  Pan if the drag
	    // distance > change in distance between fingers.
	    let dist = (Math.sqrt(dxA*dxA + dyA*dyA) +
			Math.sqrt(dxB*dxB + dyB*dyB)) / 2;

	    if (!this.pinchFirstDist) {
		this.pinchFirstDist = distPost;
	    }

	    if (this.library.twoFingers.drag) {
		this.library.twoFingers.drag((dxA + dxB)/4,
						 (dyA + dyB)/4);
	    }
	    if (this.library.twoFingers.pinch) {
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
	// Look for one-finger directional gestures matching the
	// directions you moved in.
	if (!this.library.oneFinger) {
	    return;
	}
	let gestures = this.library.oneFinger.directionalGestures;
	if (!gestures) {
	    return;
	}
	for each (let gestureCmd in gestures) {
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
    }
};

function ColorMenu(x, y, width, height, defaultColor) {
    this.color = defaultColor;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}
ColorMenu.prototype = {
    redraw: function(ctx) {
	ctx.beginPath();
	ctx.moveTo(this.x, this.y);
	ctx.lineTo(this.x + this.width, this.y);
	ctx.lineTo(this.x + this.width, this.y + this.height);
	ctx.lineTo(this.x, this.y + this.height);
	ctx.lineTo(this.x, this.y);
	ctx.fillStyle = this.color.style;
	ctx.fill();
	ctx.strokeStyle = Colors.black.style;
	ctx.stroke();
    },

    onMouseDown: function(evt) {
	$("#debug").html("Color menu mousedown");
    },

    onMouseMove: function(evt) {
	$("#debug").html("Color menu mousemove");
    },

    onMouseUp: function(evt) {
	$("#debug").html("Color menu mouseup");
    },

    isPtInside: function(x, y) {
	return (x >= this.x && x <= this.x + this.width &&
		y >= this.y && y <= this.y + this.height);
    }
};

function ToolAreaInterface() {
    this.toolCanvas = $("#pen-size-canvas").get(0);
    this.penCtx = this.toolCanvas.getContext("2d");
    let self = this;

    this.offsetX = this.toolCanvas.offsetLeft;
    this.offsetY = this.toolCanvas.offsetTop;
    this.selectedTool = pen;

    let self = this;
    let itemList = [{name: "Pencil", icon: "icons/pencil.png",
		     execute: function() {self.setTool(pen);}},
		    {name: "Eraser", icon: "icons/eraser.png",
		     execute: function() {self.setTool(eraser);}},
		    {name: "Bucket", icon: "icons/paint-can.png",
		     execute: function() {self.setTool(bucket);}},
		    {name: "Line", icon: "icons/ruler.png",
		     execute: function() {self.setTool(line);}},
		    {name: "Rectangle", icon: "icons/ruler-crop.png",
		     execute: function() {self.setTool(rectangle);}},
		    {name: "Paintbrush", icon: "icons/paint-brush.png",
		     execute: function() {self.setTool(paintbrush);}},
		    {name: "Select", icon: "icons/border.png",
		     execute: function() {self.setTool(rectSelect);}},
		    {name: "Lasso", icon: "icons/wand.png",
		     execute: function() {self.setTool(lasso);}}
	];		     
    let toolMenu = new GridMenu( this.toolCanvas, itemList, 64, false );
    // Allow tool menu and pinch gesture to coexist:
    // Send events primarily to GestureInterpreter, do the pie
    // menu in response to the one finger thing.  (If a second
    // finger goes down, cancel the pie menu)

    // Make color menus
    let bottom = this.toolCanvas.height - 60;
    let penColorMenu = new ColorMenu(10, bottom, 50, 50,
				      Colors.black);
    let paintColorMenu = new ColorMenu(70, bottom, 50, 50,
					Colors.red);
    let bgColorMenu = new ColorMenu(130, bottom, 50, 50,
				     Colors.white);
    this.colorMenus = [penColorMenu, paintColorMenu, bgColorMenu];

    this.library = {
	oneFinger: {
	    pieMenu: toolMenu,
	    locationMenus: [penColorMenu, paintColorMenu,
			    bgColorMenu],
	    directionalGestures: [
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
		}}
				  ]},
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
    // However, I only seem to get MozTouch events when I touch with finger, not when I touch with pen*/

    this.redrawMenus();
}
ToolAreaInterface.prototype = {
    setTool: function(newTool) {
	this.selectedTool = newTool;
	this.updateToolImage();
    },

    updateToolImage: function() {
	this.penCtx.clearRect(0, 0, this.toolCanvas.width, this.toolCanvas.height);
	this.selectedTool.display(this.penCtx, 60, 60);
	this.redrawMenus();
    },
    
    redrawMenus: function() {
	for (let i = 0; i < this.colorMenus.length; i++) {
	    this.colorMenus[i].redraw(this.penCtx);
	}
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

    this.pageWidth = 750; // TODO need an interface for setting these...!
    this.pageHeight = 1200;

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
    getPageDimensions: function() {
	return {width: this.pageWidth, height: this.pageHeight};
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
    },
    exportAllLayers: function(exportCtx) {
	for (let i = 0; i < this.layers.length; i++) {
	    g_history.replayActionsForLayer(this.layers[i], exportCtx);
	    this.layers[i].onRedraw(exportCtx);
	}
    }
};