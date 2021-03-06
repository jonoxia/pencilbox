/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License
 * at http://www.mozilla.org/MPL/
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
 *    deleted.  (Now Solved)
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
    this._scaleFactor = 1.0;

    this.selectionLayer = new Layer(-2, {hidden: true});
    this.selectionLayer.setName("Selection");
    var manager = this;
    this.selectionLayer.onRedraw = function(ctx) {
	manager.drawSelection(ctx);
    };
    g_drawInterface.layers.push(this.selectionLayer);
    this._selectionCtx = this.selectionLayer.getContext();

    // Selection Menu:
    var self = this;
    var selectionMenuItemList = [
                    {name: "Clear", icon: "icons/32x32/Erase.png",
		     execute: function() {self.clearSelectionCmd();}},
		    {name: "Rotate", icon: "icons/32x32/Rotation.png",
		     execute: function() {$("#debug").html("Rotate");}},
		    {name: "Resize", icon: "icons/32x32/Sizes.png",
		     execute: function() {$("#debug").html("Resize");}},
		    {name: "Duplicate", icon: "icons/32x32/Copy.png",
		     execute: function() {self.dupeSelectionCmd();}},
		    {name: "Flip H.", icon: "icons/32x32/Flip_horiz.png",
		     execute: function() {self.mirrorSelection(false);}},
		    {name: "Flip V.", icon: "icons/32x32/Flip_vert.png",
		     execute: function() {self.mirrorSelection(true);}},
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
    var library = {
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
	var pt = this.selectionLayer.screenToWorld(x, y);
	return this.isWorldPtInsideSelection(pt.x, pt.y);
    },

    _getBoundingRectForPath: function(clippingPath) {
	var clipRect = {left:  clippingPath[0].x,
			right: clippingPath[0].x,
			top: clippingPath[0].y,
			bottom: clippingPath[0].y};

	for (var i = 1; i < clippingPath.length; i++) {
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
	var newPath = [];
	for (var i = 0; i < path.length; i++) {
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

	// new selections need to start at 100%
	var currentZoom = g_drawInterface.activeLayer.getZoomLevel();
	this.selectionLayer._scale = currentZoom; // breaks encapsulation

	// For now assume clippingPath is a rectangle.
	// what we actually get passed is a list of points.
	this._clippingPath = clippingPath;
	var clipRect = this._getBoundingRectForPath(clippingPath);
	this._clipRect = clipRect;
	this._parentLayer = parentLayer;

	// Replay all of the parent layer's history (minus the
	// clearing of the region, of course!) into the selection
	// context with the clip region set, then snapshot that
	// as a PNG:
	var imgDataUrl = this.selectionLayer.pngSnapshot(parentLayer,
							 clipRect,
							 clippingPath);

	// Clear clipping path on parent layer!
	var clearPath = this.deepCopyPath(clippingPath);
	var clear = new ClearRegionAction(parentLayer, clearPath);
	g_history.pushAction(clear);
	parentLayer.doActionNow(clear);
	
	// Draw image in selection layer:
	this._selectionImg = new Image();
	var self = this;
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
        for (var i= 0; i < this._clippingPath.length; i++) {
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
	// selection picture contents into the target layer, with the
	// transforms applied!
	var wpt = this.selectionLayer.screenToWorld( this._clipRect.left,
                                                     this._clipRect.top);
	var action = new PlopBitmapAction(targetLayer,
		                          this._selectionImg,
                                          wpt.x, wpt.y,
					  this._scaleFactor);
        g_history.pushAction(action);
        targetLayer.doActionNow(action);

	// Reset all selection-related state.
	this._selectionPresent = false;
	this._clippingPath = null;
	this._parentLayer = null;
	this._clipRect = null;
	this._selectionImg = null;
	this._scaleFactor = 1;
    },

    drawSelection: function(ctx) {
	if (!this._selectionPresent || !this._selectionImg) {
	    return;
	}
	var clipRect = this._clipRect;
	ctx.drawImage(this._selectionImg, clipRect.left, clipRect.top);
	// Draw translucent black square around selection
	ctx.fillStyle = Colors.translucentYellow.style;
	ctx.beginPath();
	ctx.moveTo(this._clippingPath[0].x, this._clippingPath[0].y);
        for (var i= 1; i < this._clippingPath.length; i++) {
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
	var action = new PlopBitmapAction(this._parentLayer,
					  this._selectionImg,
					  this._clipRect.left,
					  this._clipRect.top,
                                          1);
	g_history.pushAction(action);
	this._parentLayer.doActionNow(action);
	// But don't clear out the selection.
    },

    resizeSelection: function(ratio) {
	
	// I think we don't actually want to change the scale of the
	// whole layer - because that effects screen-to-world which affects
	// the user interface and stuff -- instead we want to add an extra
	// transformation factor?
	// No, we do want to change scale of whole layer, because
	// that makes isScreenPtInsideSelection work correctly.
	this._scaleFactor *= ratio;
	this.selectionLayer.scale(ratio);
	//this.selectionLayer.updateWithoutReplay();
	// TODO:
	// 1. suppress selection drag when resizing selection
	// 2. Reset scale factor of selection layer to be 100% when
        //     creating new selection
        // 3. don't draw The Brown outside the selection layer - does
	//     weird things when resizing!
	// 4. Apply scale factor to the ImportImageAction 
	//    (requires re-snapshotting?

	// Redo this stuff here??:
	/*let imgDataUrl = this.selectionLayer.pngSnapshot(this._parentLayer,
							 this._clipRect,
							 this._clippingPath);
	// Draw image in selection layer:
	this._selectionImg = new Image();
	let self = this;
	this._selectionImg.onload = function() {
	    self.selectionLayer.updateDisplay();
	}
	this._selectionImg.src = imgDataUrl;*/
	// TODO this doesn't actually persist yet bc there is no
	// ImportImageAction (should be called SetBitmapAction) added
    },

    rotateSelection: function(dTheta) {
    },

    mirrorSelection: function(isVertical) {
	if (isVertical) {
	    this._yScale *= -1;
	} else {
	    this._xScale *= -1;
	}
    }
};

/* When user mousedowns within the selection and drags, then
 call the selectionMovingTool instead of the real tool.

When the user doubletaps within the selection, bring up the selection
context menu.
*/

selectionMovingTool = new Tool(0);
selectionMovingTool.mode = null;
selectionMovingTool.display = function(penCtx, x, y) {
};
selectionMovingTool.down = function(ctx, x, y, isDblClick) {
    //$("#debug").html("Selection mousedown dblclick? " + isDblClick);
    if (isDblClick) {
	this.mode = "menu";
	g_selection.selectionMenu.onMouseDown(x, y);
    } else {
	if (g_selection.selectionPresent) {
	    this.startX = x;
	    this.startY = y;
	    this.lastX = x;
	    this.lastY = y;
	    this.mode = "drag";
	}
    }
};
selectionMovingTool.up = function(ctx, x, y) {
    if (this.mode == "drag") {
	if (g_selection.selectionPresent) {
	    this.endX = x;
	    this.endY = y;
	    this.mode = null;
	}
    } else if (this.mode == "menu") {
	g_selection.selectionMenu.onMouseUp(x, y);
    }
};
selectionMovingTool.drag = function(ctx, x, y) {
    if (this.mode == "drag") {
	if (g_selection.selectionPresent) {
	    // convert screen to world so the drag distance
	    // is correct even if zoomed
	    var layer = g_selection.selectionLayer;
	    var oldPt = layer.screenToWorld(this.lastX, this.lastY);
	    var newPt = layer.screenToWorld(x, y);
	    g_selection.moveSelection(newPt.x - oldPt.x,
				      newPt.y - oldPt.y);
	    this.lastX = x;
	    this.lastY = y;
	}
    } else if (this.mode == "menu") {
	g_selection.selectionMenu.onMouseMove(x, y);
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
    var img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = 'icons/border.png'; 
};
rectSelect.down = function(ctx, x, y, isDblClick) {
    if (g_selection.isScreenPtInsideSelection(x, y)) {
	this._moveMode = true;
	selectionMovingTool.down(ctx, x, y, isDblClick);
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

	var pointList = [];
	var layer = g_selection.selectionLayer;
	pointList.push(layer.screenToWorld(this.startX, this.startY));
	pointList.push(layer.screenToWorld(this.startX, this.endY));
	pointList.push(layer.screenToWorld(this.endX, this.endY));
	pointList.push(layer.screenToWorld(this.endX, this.startY));
	pointList.push(layer.screenToWorld(this.startX, this.startY));
	
	if (g_selection) {
	    var activeLayer = g_drawInterface.getActiveLayer();
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
    var img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = 'icons/wand.png'; 
};
lasso.down = function(ctx, x, y, isDblClick) {
    if (g_selection.isScreenPtInsideSelection(x, y)) {
	this._moveMode = true;
	selectionMovingTool.down(ctx, x, y, isDblClick);
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
	var layer = g_selection.selectionLayer;
	this.points.push({x: x, y: y});

	var worldPts = [];
        for (var i= 0; i < this.points.length; i++) {
	    worldPts.push(layer.screenToWorld(this.points[i].x,
					      this.points[i].y));
	}	
	if (g_selection) {
	    var activeLayer = g_drawInterface.getActiveLayer();
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
	var lastPt = this.points[this.points.length - 1];
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


// TODO The three selection tools duplicate some code -- make a common
// base class??
// TODO magic wand seems to be missing exactly one pixel all the way
// around the edge.  This is probably fault of the edgeFinder algorithm.
magicWand = new Tool(1.0, [{name: "tolerance",
			   type: "scale", defawlt: 0}]);
magicWand._moveMode = false;
magicWand.display = function(penCtx, x, y) {
    var img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = "icons/wand.png";
};
magicWand.down = function(ctx, x, y, isDblClick) {
    if (g_selection.isScreenPtInsideSelection(x, y)) {
	this._moveMode = true;
	selectionMovingTool.down(ctx, x, y, isDblClick);
    }
};
magicWand.up = function(ctx, x, y) {
    if (this._moveMode) {
	selectionMovingTool.up(ctx, x, y);
    } else {
	$("#debug").html("Magic wand up (select mode)");
	// do it here: Find borders of region of same color, turn it
	// into a selection.
	var layer = g_drawInterface.getActiveLayer();
	var ctx = layer.getContext();
	var bm = new BitManipulator(ctx, layer.width, layer.height);
	var tolerance = this.options.getValue("tolerance");
	var megaPoints = edgeFindingAlgorithm(bm, x, y, tolerance);

	var worldPts = [];
        for (var i= 0; i < megaPoints.length; i++) {
	    worldPts.push(layer.screenToWorld(megaPoints[i].x,
					      megaPoints[i].y));
	}	
	if (g_selection) {
	    g_selection.createSelection(worldPts, layer);
	}
    }
    this._moveMode = false;
};
magicWand.drag = function(ctx, x, y) {
    if (this._moveMode) {
	selectionMovingTool.drag(ctx, x, y);
    }
};
magicWand.drawCursor = function(ctx, x, y) {
    $("#the-canvas").css("cursor", "crosshair");
};
magicWand.getRecordedAction = function() {
    return null;
};
magicWand.resetRecordedAction = function() {
    // Nothing to do
};