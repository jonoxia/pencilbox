/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License
 * at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and
 * limitations under the License.
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
 * Alternatively, the contents of this file may be used under the
 * terms of either the GNU General Public License Version 2 or later
 * (the "GPL"), or the GNU Lesser General Public License Version 2.1
 * or later (the "LGPL"), in which case the provisions of the GPL or
 * the LGPL are applicable instead of those above. If you wish to
 * allow use of your version of this file only under the terms of
 * either the GPL or the LGPL, and not to allow others to use your
 * version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the
 * notice and other provisions required by the GPL or the LGPL. If you
 * do not delete the provisions above, a recipient may use your
 * version of this file under the terms of any one of the MPL, the GPL
 * or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const DBL_CLICK_SPEED = 250;  //maximum milliseconds


function registerTouchXBrowser(element, touchapi, handler) {
    if (touchapi == "gecko") {
	// Set up touch API callbacks Firefox style:
      element.addEventListener("MozTouchDown", function(evt) {
              handler.touchDown(evt.streamId, evt.pageX, evt.pageY);
	  }, false);
      element.addEventListener("MozTouchMove", function(evt) {
	      handler.touchMove(evt.streamId, evt.pageX, evt.pageY);
	  }, false);
      window.addEventListener("MozTouchUp", function(evt) {
	      handler.touchUp(evt.streamId, evt.pageX, evt.pageY);
	  }, false);
    } else if (touchapi == "webkit") {
	// Setup touch API callbacks Webkit style:
	element.ontouchstart = function(e) {
          e.preventDefault();
          for (var i = 0; i < e.changedTouches.length; ++i) {  
            var t = e.changedTouches[i];
	    handler.touchDown(t.identifier, t.clientX, t.clientY); // maybe?
          }
	};
	element.ontouchmove = function(e) {
          e.preventDefault();
          for (var i = 0; i < e.changedTouches.length; ++i) { 
	    var t = e.changedTouches[i];
	    handler.touchMove(t.identifier, t.clientX, t.clientY); // maybe?
          }
	};
	element.ontouchend = function(e) {
          e.preventDefault();
          for (var i = 0; i < e.changedTouches.length; ++i) { 
            var t = e.changedTouches[i];
	    handler.touchUp(t.identifier, t.clientX, t.clientY); // maybe?
          }
	};
	element.ongesturechange = function() {
	    return false;
	};
    }
}



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
    // There's supposed to be mozInputSource that tells us "pen or finger" but I don't seem to have it.
    // However, I only seem to get MozTouch events when I touch with finger, not when I touch with pen*/
}
GestureInterpreter.prototype = {
    hasMenus: function() {
	return (this.pieMenu || this.locMenus);
    },
    touchDown: function(id, x, y) {
	var rel_x = x - this.offsetX;
	var rel_y = y - this.offsetY;
	this.touchPoints[id] = { newX: rel_x,
				 newY: rel_y,
				 oldX: rel_x,
				 oldY: rel_y,
				 id: id};
	this.touchPointCount ++;

	if (this.touchPointCount == 1 && this.hasMenus()) {
	    this.menuMouseDown(id, x, y);
	}
	if (this.touchPointCount == 2 && this.activeMenu) {
	    this.activeMenu.cancel();
	    this.activeMenu = null;
	}
    },

    menuMouseDown: function(id, x, y) {
	var rel_x = x - this.offsetX;
	var rel_y = y - this.offsetY;
	if (this.locMenus) {
	    for (var i = 0; i < this.locMenus.length; i++) {
		if (this.locMenus[i].isPtInside(rel_x, rel_y)) {
		    this.locMenus[i].onMouseDown(rel_x, rel_y);
		    this.activeMenu = this.locMenus[i];
		    return;
		}
	    }
	}
	if (this.pieMenu) {
	    this.pieMenu.onMouseDown(x, y);
	    this.activeMenu = this.pieMenu;
	}
    },

    touchMove: function(id, x, y) {
	var pt = this.touchPoints[id];
	if (pt) {
	    // is it possible for this not to be defined at this point?
	    pt.oldX = pt.newX;
	    pt.oldY = pt.newY;
	    pt.newX = x - this.offsetX;
	    pt.newY = y - this.offsetY;

	    if (this.touchPointCount == 1 && this.activeMenu) {
		this.activeMenu.onMouseMove(x, y);
	    }
	    this.interpretGesture(id);
	    
	} 
    },

    touchUp: function(id, x, y) {
	if (!this.touchPoints[id]) {
	    return;
	}
	delete this.touchPoints[id];
	this.touchPointCount --;
	if (this.touchPointCount == 0) {
	    this.finalizeGesture();
	    this.gestureDirections = [];
	    this.pinchFirstDist = null;
	    if (this.activeMenu) {
		this.activeMenu.onMouseUp(x, y);
		this.activeMenu = null;
	    }
	}
    },

    interpretGesture: function(movedId) {
	var tchPts = this.touchPoints;
	var x, ptA, ptB, dx, dy, delta, dxA, dyA, dxB, dyB, dist, ratio;
	var movingPt;
	var pts = [];
	// make an array of the points (values from object tchPts)
	for (x in tchPts) {
	    pts.push(tchPts[x]);
	}

	if (this.touchPointCount == 2) {
	    // 2-finger gesture - pinch or drag?
	    ptA = pts[0];
	    ptB = pts[1];
	    if (!ptA || !ptB) {
		// Can happen when one finger is outside canvas
		return;
	    }

	    // pinch - how much did distance change?
	    dx = ptA.oldX - ptB.oldX; 
	    dy = ptA.oldY - ptB.oldY;
	    distPre = Math.sqrt(dx*dx + dy*dy);
	    dx = ptA.newX - ptB.newX;
	    dy = ptA.newY - ptB.newY;
	    distPost = Math.sqrt(dx*dx + dy*dy);
	    
	    delta = distPost - distPre;

	    dxA = ptA.newX - ptA.oldX;
	    dyA = ptA.newY - ptA.oldY;
	    dxB = ptB.newX - ptB.oldX;
	    dyB = ptB.newY - ptB.oldY;

	    // either pan OR zoom, don't do both.  Pan if the drag
	    // distance > change in distance between fingers.
	    dist = (Math.sqrt(dxA*dxA + dyA*dyA) +
		    Math.sqrt(dxB*dxB + dyB*dyB)) / 2;

	    if (!this.pinchFirstDist) {
		this.pinchFirstDist = distPost;
	    }

	    if (this.library.twoFingers.drag) {
		this.library.twoFingers.drag((dxA + dxB)/4,
						 (dyA + dyB)/4);
	    }
	    if (this.library.twoFingers.pinch) {
		ratio = (distPost + distPre) / (2 * distPre);
		this.library.twoFingers.pinch(ratio);
	    }
	}
	if (this.touchPointCount == 1) {
	    movingPt = this.touchPoints[movedId];
	    // 1-finger gesture -- pie menu to pick tool
	    dx = movingPt.newX - movingPt.oldX;
	    dy = movingPt.newY - movingPt.oldY;

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
	var gestures = this.library.oneFinger.directionalGestures;
	var curDir, matched, pattern;
	if (!gestures) {
	    return;
	}
	var i, j, gestureCmd, dir;
	for (i in gestures) {
	  gestureCmd = gestures[i];
          curDir = "";
          matched = 0;
	  pattern = gestureCmd.directions;
          for (j in this.gestureDirections) {
            dir = this.gestureDirections[j];
	    if (dir != curDir) {
	      curDir = dir;
	      if (dir == pattern[matched]) {
	 	matched += 1;
		if (matched == pattern.length) {
		    gestureCmd.command();
		    // Dismiss menu if a mouse gesture was completed.
		    if (this.activeMenu) {
			this.activeMenu.cancel();
			this.activeMenu = null;
		    }

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

function ColorMenu(ctx, x, y, width, height, defaultColor) {
    this.ctx = ctx;
    this.color = defaultColor;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.allTheColors = [Colors.black,
			 Colors.scorchedBrown,
			 Colors.scabRed,
			 Colors.darkAngelsGreen,
			 Colors.ultramarinesBlue,

			 Colors.grey7,
			 Colors.brown,
			 Colors.red,
			 Colors.catachanGreen,
			 Colors.blue,

			 Colors.grey6,
			 Colors.bestialBrown,
			 Colors.tentaclePink,
			 Colors.jungleGreen,
			 Colors.mediumBlue,

			 Colors.grey5,
			 Colors.tallarnFlesh,
			 Colors.magenta,
			 Colors.goblinGreen,
			 Colors.hawkTurquoise,

			 Colors.grey4,
			 Colors.rouge,
			 Colors.lichePurple,
			 Colors.green,
			 Colors.cyan,

			 Colors.grey3,
			 Colors.bleachedBone,
			 Colors.blazingOrange,
			 Colors.yellowGreen,
			 Colors.iceBlue,

			 Colors.grey2,
			 Colors.ecru,
			 Colors.shiningGold,
			 Colors.yellow,
			 Colors.indigo,

			 Colors.grey1,
			 Colors.white


			 ];

    this.boxSize = this.width;
    this.boxesPerRow = 5; // TODO adjust dynamically to width of
    // canvas
}
ColorMenu.prototype = {
    redraw: function(ctx) {
	ctx.fillStyle = this.color.style;
	ctx.strokeStyle = Colors.black.style;
	ctx.fillRect(this.x, this.y, this.width, this.height);
	ctx.strokeRect(this.x, this.y, this.width, this.height);
    },

    onMouseDown: function(x, y) {
	this.startColor = this.color;
	var rowNum = 0;
	var theColor;
	for (var i = 0; i < this.allTheColors.length; i++) {
	    theColor = this.allTheColors[i];
	    x = ( i % this.boxesPerRow ) * this.boxSize;
	    y = this.y - (1 + Math.floor(i / this.boxesPerRow)) * this.boxSize;
	    this.ctx.fillStyle = theColor.style;
	    this.ctx.fillRect(x, y, this.boxSize, this.boxSize);
	    this.ctx.strokeRect(x, y, this.boxSize, this.boxSize);
	}
    },

    onMouseMove: function(x, y) {
        x = Math.floor(x / this.boxSize);
	y = Math.floor(( this.y - y) / this.boxSize);
	var index = y * this.boxesPerRow + x;
	if (index >= 0 && index < this.allTheColors.length) {
	    this.color = this.allTheColors[index];
	} else {
	    this.color = this.startColor;
	}
	this.redraw(this.ctx);
    },

    onMouseUp: function(x, y) {
	g_toolInterface.updateToolImage();
    },

    cancel: function() {
	g_toolInterface.updateToolImage();
    },

    isPtInside: function(x, y) {
	return (x >= this.x && x <= this.x + this.width &&
		y >= this.y && y <= this.y + this.height);
    }
};

function ToolAreaInterface(touchapi) {
    // touchapi is one of "gecko" or "webkit"
    this.toolCanvas = $("#pen-size-canvas").get(0);
    this.penCtx = this.toolCanvas.getContext("2d");
    var self = this;

    this.offsetX = this.toolCanvas.offsetLeft;
    this.offsetY = this.toolCanvas.offsetTop;
    this.selectedTool = pen;

    var itemList = [{name: "Line", icon: "icons/32x32/Line.png",
		     execute: function() {self.setTool(line);}},
		    {name: "S. Rect", icon: "icons/32x32/Selection.png",
		     execute: function() {self.setTool(rectSelect);}},
	            {name: "Curve", icon: "icons/32x32/Curve.png",
		     execute: function() {}},
                    {name: "Pencil", icon: "icons/32x32/Pencil.png",
		     execute: function() {self.setTool(pen);}},
		    {name: "Eraser", icon: "icons/32x32/Eraser.png",
		     execute: function() {self.setTool(eraser);}},
	            {name: "Select", icon: "icons/wand.png",
                     execute: function() {self.setTool(lasso);}},
	            {name: "S. Area", icon: "icons/32x32/Wizard.png",
                     execute: function() {self.setTool(magicWand);}},
	            {name: "Picker", icon: "icons/32x32/Dropper.png",
		     execute: function() {self.setTool(eyedropper);}},
		    {name: "Bucket", icon: "icons/32x32/Fill.png",
		     execute: function() {self.setTool(bucket);}},
	            {name: "Ellipse", icon: "icons/32x32/Ellipse.png",
		     execute: function() {self.setTool(ellipse);}},
	            {name: "Rect", icon: "icons/32x32/Rectangle.png",
		     execute: function() {self.setTool(rectangle);}},
		    {name: "Brush", icon: "icons/32x32/Fine_brush.png",
		     execute: function() {self.setTool(paintbrush);}},
                    {name: "Panel", icon: "icons/32x32/Grid.png",
		     execute: function() {self.setTool(panelTool);}},
                    {name: "Speech", icon: "icons/32x32/Hints.png",
		     execute: function() {self.setTool(textBalloonTool);}},
                    {name: "Polygon", icon: "icons/32x32/Hexagon.png",
		     execute: function() {self.setTool(polygon);}},
                    {name: "3d Obj.", icon: "icons/32x32/Transparency.png",
		     execute: function() {}}
		     ];

    // Creative Commons Share-alike 3.0 from www.aha-soft.com
    // or so says http://www.bestesoft.com/direct-software/62172-32x32-free-design-icons.html
    // Useful icons: icons/32x32/Brush   Dropper   Ellipse, Eraser
    // CMYK for color   Comment (or Hints)  Curve points  Fill   Fine brush
    // Grid, Line, Objects, Pen, Pencil, Restangle, Rounded rectangle,
    // Selection, Square, Transparency, Undo, Redo, Wizard

    // Upload image, 

    // For selection menu: Constrast, Copy, Cut, Erase, Flip horizontally,
    // Flip vertically, Move, Revert, Rotate CW, Rotate, CCW, 
    // Rotation


    var toolMenu = new GridMenu( this.toolCanvas, itemList, 64 );
    // Allow tool menu and pinch gesture to coexist:
    // Send events primarily to GestureInterpreter, do the pie
    // menu in response to the one finger thing.  (If a second
    // finger goes down, cancel the pie menu)

    // Make color menus
    var bottom = this.toolCanvas.height - 60;
    var penColorMenu = new ColorMenu(this.penCtx, 10, bottom, 50, 50,
				      Colors.black);
    var paintColorMenu = new ColorMenu(this.penCtx, 70, bottom, 50, 50,
					Colors.red);
    this.colorMenus = [penColorMenu, paintColorMenu];

    this.library = {
	oneFinger: {
	    pieMenu: toolMenu,
	    locationMenus: [penColorMenu, paintColorMenu],
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

    registerTouchXBrowser(this.toolCanvas, touchapi,
			  this.interpreter);
    
    this.redrawMenus();
}
ToolAreaInterface.prototype = {
    setTool: function(newTool) {
	this.selectedTool = newTool;
	this.selectedTool.generateOptionHtml();
	this.updateToolImage();
    },

    updateToolImage: function() {
	this.penCtx.clearRect(0, 0, this.toolCanvas.width,
			      this.toolCanvas.height);
	this.selectedTool.display(this.penCtx, 60, 60);
	this.redrawMenus();
    },
    
    redrawMenus: function() {
	for (var i = 0; i < this.colorMenus.length; i++) {
	    this.colorMenus[i].redraw(this.penCtx);
	}
    },
    
    getPenColor: function() {
	return this.colorMenus[0].color;
    },
    getPaintColor: function() {
	return this.colorMenus[1].color;
    },
    getEraseColor: function() {
	return Colors.white;
    },
    setPaintColor: function(color) {
	this.colorMenus[1].color = color;
	this.colorMenus[1].redraw(this.penCtx);
    }
};

function DrawAreaInterface(touchapi) {
    var cursorCanvas = $("#the-canvas").get(0);
    this.width = cursorCanvas.width;
    this.height = cursorCanvas.height;

    this.layers = [];
    this.activeLayer = null;

    this.cursorCtx = cursorCanvas.getContext("2d");
    this.offsetX = cursorCanvas.offsetLeft;
    this.offsetY = cursorCanvas.offsetTop;

    this.pageWidth = 750; // TODO need an interface for setting these...!
    this.pageHeight = 1200;

    this.mouseIsDown = false;
    this._lastTimeDown = 0;
    this._lastTimeUp = 0;

    var self = this;    
    $("#the-canvas").bind("mousedown", function(evt) { 
	    self.mouseDownHandler(evt); });
    $(window).bind("mouseup", function(evt) {
	    self.mouseUpHandler(evt); });
    $("#the-canvas").bind("mousemove", function(evt) {
	    self.mouseMoveHandler(evt); });

    var library = {
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

    // Multitouches on the canvas:  Decide whether they're in a selection
    // or not.  If inside a selection, they'll be resize/rotate commands
    // dispatch to selection manager.  If not, they'll be page zoom/pan
    // commands; process them.
    var ptInSelection = function(x, y) {
	if (!g_selection.selectionPresent) {
	    return
	};
	var x = x - self.offsetX;
	var y = y - self.offsetY;
	return g_selection.isScreenPtInsideSelection(x, y);
    }
    registerTouchXBrowser(cursorCanvas, touchapi, {
	    touchDown: function(id, x, y) {
		if (ptInSelection(x, y)) {
		    g_selection.interpreter.touchDown(id, x, y);
		} else {
		    self.interpreter.touchDown(id, x, y); 
		}
	    },
	    touchMove: function(id, x, y) {
		if (ptInSelection(x, y)) {
		    g_selection.interpreter.touchMove(id, x, y);
		} else {
		    self.interpreter.touchMove(id, x, y); 
		}
	    },
            touchUp: function(id, x, y) {
                self.interpreter.touchUp(id, x, y);
                g_selection.interpreter.touchUp(id, x, y);
	    }
	    });
    
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
	for (var i = 0; i < this.layers.length; i++) {
	    if (this.layers[i].getIndex() == index) {
		this.activeLayer = this.layers[i];
		break;
	    }
	}
    },
    getActiveLayer: function() {
	return this.activeLayer;
    },
    getNumLayers: function() {
	return this.layers.length;
    },
    newLayer: function() {
	// New layer needs to have scale, translate set to
	// same as existing layers
	var options = null;
	if (this.activeLayer) {
	    var currentZoom = this.activeLayer.getZoomLevel();
	    var currentTranslate = this.activeLayer.getTranslation();
	    options = {scale: currentZoom,
			   translate: currentTranslate};
	}
	// create at bottom, for now
	var lowestLayer = 0;
	for (var i = 0; i < this.layers.length; i++) {
	    if (this.layers[i].getIndex() < lowestLayer) {
		lowestLayer = this.layers[i].getIndex();
	    }
	}
	var newLayer = new Layer(lowestLayer - 1, options);
	this.layers.push( newLayer );
	if (this.activeLayer == null) {
	    this.activeLayer = newLayer;
	}
    },

    mouseUpHandler: function(evt) {
	if (this.interpreter.touchPointCount > 0) return;
	if (!this.mouseIsDown) return;

	var x = evt.pageX - this.offsetX;
	var y = evt.pageY - this.offsetY;
	var tool = this.getSelectedTool();
        this.getSelectedTool().up(this.getDrawCtx(), x, y);
	this.mouseIsDown = false;

	// Record action to undo history
	var action = tool.getRecordedAction();
	if (action) {
            g_history.pushAction(action);
            tool.resetRecordedAction();
             // refresh the layer the action was in:
	    action.layer.updateDisplay();
	}
	// refresh my cursor layer:
	this.cursorCtx.clearRect(0, 0, this.width, this.height);

	this._lastTimeUp = Date.now();
    },

    mouseDownHandler: function(evt) {
	if (this.interpreter.touchPointCount > 0) return;
	//this.getSelectedTool().resetRecordedAction();

	var x = evt.pageX - this.offsetX;
	var y = evt.pageY - this.offsetY;
	this.mouseIsDown = true;
	var isDblClick = false;
	if (Date.now() - this._lastTimeUp < DBL_CLICK_SPEED &&
	    this._lastTimeUp - this._lastTimeDown < DBL_CLICK_SPEED) {
	    isDblClick = true;
	}
	this.getSelectedTool().down(this.getDrawCtx(), x, y, isDblClick);

	this._lastTimeDown = Date.now();
    },

    mouseMoveHandler: function(evt) {
	if (this.interpreter.touchPointCount > 0) return;

	this.cursorCtx.clearRect(0, 0, this.width, this.height);
	var x = evt.pageX - this.offsetX;
	var y = evt.pageY - this.offsetY;

	this.getSelectedTool().drawCursor(this.cursorCtx, x, y);
	if (this.mouseIsDown) {
	    this.getSelectedTool().drag(this.getDrawCtx(), x, y);
	}
    },

    zoom: function(factor) {
	for (var i = 0; i < this.layers.length; i++) {
	    if (this.layers[i].scale) {
		this.layers[i].scale(factor);
	    } else {
		$("#debug").html("This.layers[i] is " + this.layers[i]);
	    }
	}
    },
    pan: function(xFactor, yFactor) {
	for (var i = 0; i < this.layers.length; i++) {
	    this.layers[i].pan(xFactor, yFactor);
	}
    },
    clearAllLayers: function(){
	for (var i = 0; i < this.layers.length; i++) {
	    this.layers[i].clearLayer();
	}
    },
    updateAllLayerDisplays: function() {
	for (var i = 0; i < this.layers.length; i++) {
	    this.layers[i].updateDisplay();
	}
    },
    exportAllLayers: function(exportCtx) {
	// TODO deprecated - now using main.js export2() instead
	// Sort layers - draw them from lowest to highest
	var layers = this.layers.slice();
	layers.sort(function(layerA, layerB) {
		return layerA.getIndex() - layerB.getIndex();
	    });
	for (var i = 0; i < layers.length; i++) {
	    g_history.replayActionsForLayer(layers[i], exportCtx);
	    layers[i].onRedraw(exportCtx);
	}
    },

    getLayerByName: function(name) {
	for (var i = 0; i < this.layers.length; i++) {
	    if (this.layers[i].name == name) {
		return this.layers[i];
	    }
	}
	return null;
    },

    serializeLayers: function() {
	var layerObj = {};
	var layerList = [];
	var activeLayerIndex = 0;
	var layer;
	for (var i = 0; i < this.layers.length; i++) {
	    layer = this.layers[i];
	    if (this.activeLayer == this.layers[i]) {
		activeLayerIndex = i;
	    }
	    layerList.push({index: layer.getIndex(),
			opacity: layer.getOpacity(),
			name: layer.getName()
			});
	}
	layerObj.layerList = layerList;
	layerObj.activeLayerIndex = activeLayerIndex;
	return JSON.stringify(layerObj);
    },
    
    recreateLayers: function(layerString) {
	var layerObj = JSON.parse(layerString);
	var layerList = layerObj.layerList;
	var newLayer;
	for (var i = 0; i < layerList.length; i++) {
	    /* Ignore instructions to recreate any layer with a
	     * name we already have (e.g. special layers - 
	     * dialogue layer, panel layer, etc.) */
	    if (this.getLayerByName(layerList[i].name) == null) {
		newLayer = new Layer(layerList[i].index);
		if (layerList[i].opacity != undefined) {
		    newLayer.setOpacity(layerList[i].opacity);
		}
		if (layerList[i].name != undefined) {
		    newLayer.setName(layerList[i].name);
		}
		this.layers.push(newLayer);
	    }
	}
	this.activeLayer = this.layers[layerObj.activeLayerIndex];
    },

    getZoomLevel: function() {
	return this.activeLayer.getZoomLevel();
    },

    resetDimensions: function(newX, newY, newWidth, newHeight) {
	this.offsetX = newX;
	this.offsetY = newY;
	this.width = newWidth;
	this.height = newHeight;
	for (var i = 0; i < this.layers.length; i++) {
	    this.layers[i].resetDimensions(newX, newY,
					   newWidth, newHeight);
	}
    }
};