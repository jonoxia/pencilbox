
/*  How do we bring up the menu for advanced selection actions?
   (e.g. everything except moving the selection)
    
  * Send to different layer (including possibility of new layer)
  * Duplicate
  * Clear
  * Filter (invert, blur, etc)
  * Rotate
  * Resize
  * Mirror
  * Skew (free trasnformation)
  * Return to original (and deselect)
  * Drop here (and deselect)

  */

/* A select-move-drop sequence currently gets recorded to history
 * as two actions:  A clearRect action that removes it from original
 * location, and an importImage action that inserts it to the new
 * location.

 *  There are two things potentially wrong with this.
 *  1. When replaying all actions for export,the clearRect will
 *    delete chunks of underlying layers that we don't want
 *    deleted.
 *  2. If you drag, drop, and then undo, it undoes the drop, but
 *    it does not undo the clear in the original location; it also
 *    doesn't recreate the selection state, so the content will
 *    appear to be gone (you can undo again to restore to the original
 *    state).  One undo should undo both actions OR it should
 *    undo the drop but put the selection back into play.
 */


/* Known problem: For non-rectangular selections, a click anywhere
 * in the bounding rectangle is currently treated as "inside" the
 * selection b/c we don't have a function for "is point in arbitrary
 * polygon?" 

 * Moved image chunks turn fuzzy (because they're scaled bitmaps).
 * It's because regardless of zoom, layer.pngSnapshot takes the
 * snapshot at 100% scale. Maybe take the snapshot at a higher
 * scale (or at the current zoom scale) to preserve more resolution?*/


/* Awesome gesture idea:
 * Grasp with all (4 or 5) fingers to make a selectoin -- draw selection path between those 4 or 5 points. (Hard part: How do we know order to
  connect the points in?  

  * Sadly it seems that this particular hardware doesn't support
  * more than 2 touchpoints
 */

function SelectionManager() {
    this._selectionPresent = false;
    this._selectionImg = null;
    this._clippingPath = null;
    // For now let's just do rectangluar selections since they're
    // way, way easier.
    this._clipRect = {left: null, top: null, right: null,
			  bottom: null};

    this._parentLayer = null; // the layer the selection came from
    this._selectionContentsSnapshot = null;

    // TODO this layer should be hidden - it shouldn't be shown in
    // the layers table.  (Maybe an argument to Layer constructor
    // telling it whether or not to add itself to the table?)

    this.selectionLayer = new Layer(-1);
    this.selectionLayer.setName("Selection");
    let manager = this;
    this.selectionLayer.onRedraw = function(ctx) {
	manager.drawSelection(ctx);
    };
    g_drawInterface.layers.push(this.selectionLayer);
    this._selectionCtx = this.selectionLayer.getContext();

    // Selection Menu:
    let self = this;
    let selectionMenuItemList = [
                    {name: "Clear", icon: "icons/32x32/Erase.png",
		     execute: function() {self.clearSelectionCmd();}},
		    {name: "Rotate", icon: "icons/32x32/Rotation.png",
		     execute: function() {$("#debug").html("Rotate");}},
		    {name: "Resize", icon: "icons/32x32/Sizes.png",
		     execute: function() {$("#debug").html("Resize");}},
		    {name: "Duplicate", icon: "icons/32x32/Copy.png",
		     execute: function() {self.dupeSelectionCmd();}},
		    {name: "Flip H.", icon: "icons/32x32/Flip_horiz.png",
		     execute: function() {$("#debug").html("Flip H");}},
		    {name: "Flip V.", icon: "icons/32x32/Flip_vert.png",
		     execute: function() {$("#debug").html("Flip V");}},
		    {name: "To Layer", icon: "icons/32x32/Layers.png",
		     execute: function() {$("#debug").html("2Layer");}},
		    {name: "Invert", icon: "icons/32x32/Contrast.png",
		     execute: function() {$("#debug").html("Invert");}},
			     ];

    this._selectionMenu = new GridMenu( $("#the-canvas").get(0),
					selectionMenuItemList,
					64, {x: 0, y: 0,
					     alwaysRedraw: true} );
    /* Future selection menu options:
     *   - Select More (e.g. enter "Selection Union" mode)
     *   - Select Less (e.g. enter "Selection Intersection" mode)
     *   - Color Negative  (not to be confused with Invert Selection
     *   - Gradient Fill (lots more design needed)
     *   - Probably don't even need menu items for rotate and resize:
     *      they can be done with two-finger gestures on selection.
     *   - Blur?  (Is blur something I would use?) Other filter types?
     */

    // Two-finger gestures on selection:
    let library = {
	oneFinger: [],
	twoFingers: {
	    pinch: function(ratio) {
		self.resizeSelection(ratio);
	    },
	    rotate: function(dTheta) {
		self.rotateSelection(dTheta);
	    }
	}
    };
    this._transformInterpreter = new GestureInterpreter(library,
					       g_drawInterface.offsetX,
					       g_drawInterface.offsetY);
}
SelectionManager.prototype = {
    get selectionMenu() {
	return this._selectionMenu;
    },

    get selectionPresent() {
	return this._selectionPresent;
    },

    get interpreter() {
	return this._transformInterpreter;
    },

    isWorldPtInsideSelection: function(x, y) {
	if (!this._selectionPresent) {
	    return false;
	} else if (this._clipRect) {
	    // TODO  // Nontrivial if selection region has a complex
	    // shape!
	    return (x >= this._clipRect.left &&
		    x <= this._clipRect.right &&
		    y >= this._clipRect.top &&
		    y <= this._clipRect.bottom);
	}
    },
    isScreenPtInsideSelection: function(x, y) {
	let pt = this.selectionLayer.screenToWorld(x, y);
	return this.isWorldPtInsideSelection(pt.x, pt.y);
    },

    _getBoundingRectForPath: function(clippingPath) {
	let clipRect = {left:  clippingPath[0].x,
			right: clippingPath[0].x,
			top: clippingPath[0].y,
			bottom: clippingPath[0].y};

	for (let i = 1; i < clippingPath.length; i++) {
	    if (clipRect.left > clippingPath[i].x) 
		clipRect.left = clippingPath[i].x;
	    if (clipRect.right < clippingPath[i].x) 
		clipRect.right = clippingPath[i].x;
	    if (clipRect.top > clippingPath[i].y) 
		clipRect.top = clippingPath[i].y;
	    if (clipRect.bottom < clippingPath[i].y) 
		clipRect.bottom = clippingPath[i].y;
	}
	return clipRect;
    },

    deepCopyPath: function(path) {
	let newPath = [];
	for (let i = 0; i < path.length; i++) {
	    newPath.push({x: path[i].x, y: path[i].y});
	}
	return newPath;
    },

    createSelection: function(clippingPath, parentLayer) {
	if (this._selectionPresent) {
	    // There was already a selection; drop that one
	    // so we can pick up the new one.
	    this.dropSelection();
	}
	this._selectionPresent = true;

	// For now assume clippingPath is a rectangle.
	// what we actually get passed is a list of points.
	this._clippingPath = clippingPath;
	let clipRect = this._getBoundingRectForPath(clippingPath);
	this._clipRect = clipRect;
	this._parentLayer = parentLayer;

	// Replay all of the parent layer's history (minus the
	// clearing of the region, of course!) into the selection
	// context with the clip region set, then snapshot that
	// as a PNG:
	let imgDataUrl = this.selectionLayer.pngSnapshot(parentLayer,
							 clipRect,
							 clippingPath);

	// Clear clipping path on parent layer!
	let clearPath = this.deepCopyPath(clippingPath);
	let clear = new ClearRegionAction(parentLayer, clearPath);
	g_history.pushAction(clear);
	parentLayer.doActionNow(clear);
	
	// Draw image in selection layer:
	this._selectionImg = new Image();
	let self = this;
	this._selectionImg.onload = function() {
	    self.selectionLayer.updateDisplay();
	}
	this._selectionImg.src = imgDataUrl;
    },

    moveSelection: function(dx, dy) {
	this._clipRect.left += dx;
	this._clipRect.right += dx;
	this._clipRect.top += dy;
	this._clipRect.bottom += dy;
        for (let i= 0; i < this._clippingPath.length; i++) {
	    this._clippingPath[i].x += dx;
	    this._clippingPath[i].y += dy;
	}
	this.selectionLayer.updateDisplay();
    },

    dropSelection: function(toLayer) {
	// Defaults to the parent layer (i.e. the layer the selection
	// originally came from) if not specified.
	targetLayer = toLayer ? toLayer : this._parentLayer

	this.selectionLayer.clearLayer();

	// Create a new action in history importing the dropped
	// selection picture contents into the target layer.
	let action = new ImportImageAction(targetLayer,
					   this._selectionImg,
					   this._clipRect.left,
					   this._clipRect.top);
	g_history.pushAction(action);
	targetLayer.doActionNow(action);

	// Reset all selection-related state.
	this._selectionPresent = false;
	this._clippingPath = null;
	this._parentLayer = null;
	this._clipRect = null;
	this._selectionImg = null;
    },

    drawSelection: function(ctx) {
	if (!this._selectionPresent || !this._selectionImg) {
	    return;
	}
	let clipRect = this._clipRect;
	ctx.drawImage(this._selectionImg, clipRect.left, clipRect.top);
	// Draw translucent black square around selection
	ctx.fillStyle = Colors.translucentYellow.style;
	ctx.beginPath();
	ctx.moveTo(this._clippingPath[0].x, this._clippingPath[0].y);
        for (let i= 1; i < this._clippingPath.length; i++) {
	    ctx.lineTo(this._clippingPath[i].x, this._clippingPath[i].y);
	}
	ctx.fill();
    },

    clearSelectionCmd: function() {
	// Selection just goes away.
	// TODO this should push something onto history so it can be
	// undoable.
	this.selectionLayer.clearLayer();
	this._selectionPresent = false;
	this._clippingPath = null;
	this._parentLayer = null;
	this._clipRect = null;
	this._selectionImg = null;
    },
    
    dupeSelectionCmd: function() {
	// Create a new action in history importing the dropped
	// selection picture contents into the target layer.
	let action = new ImportImageAction(this._parentLayer,
					   this._selectionImg,
					   this._clipRect.left,
					   this._clipRect.top);
	g_history.pushAction(action);
	this._parentLayer.doActionNow(action);
	// But don't clear out the selection.
    },

    resizeSelection: function(ratio) {
	this.selectionLayer.scale(ratio);
	// TODO:
	// 1. suppress selection drag when resizing selection
	// 2. Reset scale factor of selection layer to be 100% when
        //     creating new selection
        // 3. don't draw The Brown outside the selection layer - does
	//     weird things when resizing!
	// 4. Apply scale factor to the ImportImageAction 
	//    (requires re-snapshotting?
    },

    rotateSelection: function(dTheta) {
    },

    mirrorSelection: function(isVertical) {
    }
};

/* When user mousedowns within the selection and drags, then
 call the selectionMovingTool instead of the real tool.

When the user doubletaps within the selection, bring up the selection
context menu.
*/

const DBL_CLICK_SPEED = 750;  //maximum milliseconds

selectionMovingTool = new Tool(0);
selectionMovingTool._lastTimeDown = 0;
selectionMovingTool._lastTimeUp = 0;
selectionMovingTool.mode = null;
selectionMovingTool.display = function(penCtx, x, y) {
};
selectionMovingTool.down = function(ctx, x, y) {
    let now = Date.now();
    if (now - this._lastTimeUp < DBL_CLICK_SPEED && 
	this._lastTimeUp - this._lastTimeDown < DBL_CLICK_SPEED) {
	this.mode = "menu";
	g_selection.selectionMenu.onMouseDown({pageX: x, pageY: y});
    } else {
	if (g_selection.selectionPresent) {
	    this.startX = x;
	    this.startY = y;
	    this.lastX = x;
	    this.lastY = y;
	    this.mode = "drag";
	}
    }
    this._lastTimeDown = now;
};
selectionMovingTool.up = function(ctx, x, y) {
    if (this.mode == "drag") {
	if (g_selection.selectionPresent) {
	    this.endX = x;
	    this.endY = y;
	    this.mode = null;
	}
    } else if (this.mode == "menu") {
	g_selection.selectionMenu.onMouseUp({pageX: x, pageY: y});
    }
    this._lastTimeUp = Date.now();
};
selectionMovingTool.drag = function(ctx, x, y) {
    if (this.mode == "drag") {
	if (g_selection.selectionPresent) {
	    // convert screen to world so the drag distance
	    // is correct even if zoomed
	    let layer = g_selection.selectionLayer;
	    let oldPt = layer.screenToWorld(this.lastX, this.lastY);
	    let newPt = layer.screenToWorld(x, y);
	    g_selection.moveSelection(newPt.x - oldPt.x,
				      newPt.y - oldPt.y);
	    this.lastX = x;
	    this.lastY = y;
	}
    } else if (this.mode == "menu") {
	g_selection.selectionMenu.onMouseMove({pageX: x, pageY: y});
    } 
};
selectionMovingTool.drawCursor = function(ctx, x, y) {
};
selectionMovingTool.getRecordedAction = function() {
    // Nothing to do here?
    return null; 
};
selectionMovingTool.resetRecordedAction = function() {
};


rectSelect = new Tool(0);
rectSelect._moveMode = false;
rectSelect.display = function(penCtx, x, y) {
    let img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = 'icons/border.png'; 
};
rectSelect.down = function(ctx, x, y) {
    if (g_selection.isScreenPtInsideSelection(x, y)) {
	this._moveMode = true;
	selectionMovingTool.down(ctx, x, y);
    } else {
	this.startX = x;
	this.startY = y;
	this.inProgress = true;
    }
};
rectSelect.up = function(ctx, x, y) {
    if (this._moveMode) {
	selectionMovingTool.up(ctx, x, y);
    } else if (this.inProgress) {
	this.endX = x;
	this.endY = y;

	let pointList = [];
	let layer = g_selection.selectionLayer;
	pointList.push(layer.screenToWorld(this.startX, this.startY));
	pointList.push(layer.screenToWorld(this.startX, this.endY));
	pointList.push(layer.screenToWorld(this.endX, this.endY));
	pointList.push(layer.screenToWorld(this.endX, this.startY));
	pointList.push(layer.screenToWorld(this.startX, this.startY));
	
	if (g_selection) {
	    let activeLayer = g_drawInterface.getActiveLayer();
	    g_selection.createSelection(pointList,
					activeLayer);
	}
    }
    this.inProgress = false;
    this._moveMode = false;
};
rectSelect.drag = function(ctx, x, y) {
    if (this._moveMode) {
	selectionMovingTool.drag(ctx, x, y);
    }
};
rectSelect.drawCursor = function(ctx, x, y) {
    // Not a fan of the marching ants thing -
    // let's show a translucent black rectangle over what you
    // have selected.
    $("#the-canvas").css("cursor", "crosshair");
    if (this.inProgress) {
	ctx.fillStyle = Colors.translucentYellow.style;
	ctx.beginPath();
	ctx.moveTo(this.startX, this.startY);
	ctx.lineTo(this.startX, y);
	ctx.lineTo(x, y);
	ctx.lineTo(x, this.startY);
	ctx.lineTo(this.startX, this.startY);
	ctx.fill();
    }
};
rectSelect.getRecordedAction = function() {
    return null;
};
rectSelect.resetRecordedAction = function() {
    // Nothing to do
};

lasso = new Tool(0);
lasso._moveMode = false;
lasso.display = function(penCtx, x, y) {
    let img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = 'icons/wand.png'; 
};
lasso.down = function(ctx, x, y) {
    if (g_selection.isScreenPtInsideSelection(x, y)) {
	this._moveMode = true;
	selectionMovingTool.down(ctx, x, y);
    } else {
	this.points = [];
	this.points.push({x: x, y: y});
	this.inProgress = true;
    }
};
lasso.up = function(ctx, x, y) {
    if (this._moveMode) {
	selectionMovingTool.up(ctx, x, y);
    } else if (this.inProgress) {
	let layer = g_selection.selectionLayer;
	this.points.push({x: x, y: y});

	let worldPts = [];
        for (let i= 0; i < this.points.length; i++) {
	    worldPts.push(layer.screenToWorld(this.points[i].x,
					      this.points[i].y));
	}	
	if (g_selection) {
	    let activeLayer = g_drawInterface.getActiveLayer();
	    g_selection.createSelection(worldPts, activeLayer);
	}
    }
    this.inProgress = false;
    this._moveMode = false;
};
lasso.drag = function(ctx, x, y) {
    if (this._moveMode) {
	selectionMovingTool.drag(ctx, x, y);
    } else {
	// TODO this is drawing on draw context, should draw on
	// pen/cursor context.
	ctx.beginPath();
	ctx.strokeStyle = Colors.yellow.style;
	ctx.lineWidth = 1.0;
	let lastPt = this.points[this.points.length - 1];
	ctx.moveTo(lastPt.x, lastPt.y);
	ctx.lineTo(x, y);
	ctx.stroke();
	this.points.push({x: x, y: y});
    }
};
lasso.drawCursor = function(ctx, x, y) {
    // Not a fan of the marching ants thing -
    // let's show a translucent black rectangle over what you
    // have selected.
    $("#the-canvas").css("cursor", "crosshair");
};
lasso.getRecordedAction = function() {
    return null;
};
lasso.resetRecordedAction = function() {
    // Nothing to do
};
