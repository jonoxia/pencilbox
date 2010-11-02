/* Things to decide about how selections work.

 is *creating* the selection  an undoable action?  (In which case
  unselecting is probably undoable as well?)

 Or is it a no-op as far as history is concerned and only 
  things you apply to the selection (e.g. moving it) are undoable?

  I could see either way.


  Where do we draw the selection while it's a selection?  In its
  own layer perhaps?  If not, then where -- in the parent layer?
  In the pen canvas?

  I think we should give it its own layer.  That way we can move,
  scale, and rotate the selection by calling those methods on the
  layer containing it. (Ew, but then how do we know the clipping
  path to use for putting it back in to the layer it's dropped to?)


  Is there a separate "Do things with selections" tool?

  Or do all selection tools act as a "do things with this
  selection" as soon as they get mouseDowned inside an
  existing selection?  (In which case if you want to make a new
  selection including part of a current selection, you have to
  click outside first?  Acceptable, I guess.)

  How do we bring up the menu for advanced selection actions?
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


// Have to figure out how these Actions can work
// during export-replay as well as undo/redo replay.

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

// BIG TODO:  Non-rectangular selection areas (requires
// a function to clear arbitrary area, and a function to determine
// if point is within arbitrary area.)

// BUG:  If you make selection while zoomed in:
//    1. when selection is drawn upon creation, it is too small
//          (like it was not zoomed)
//    2. The area that's cleared is double-too-small.
//            (like it was double not zoomed)
//    3. When you start dragging the selection around, it appears
//           right size (but moves double-fast)
//    4. when you drop it, it again appears too-small.

//   note: clearRectAction does screenToWorld transform.
//    importImageAction does screenToWorld for x, y points but
//     does nothing about size.

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
}
SelectionManager.prototype = {
    get selectionPresent() {
	return this._selectionPresent;
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
	let clear = new ClearRectAction(parentLayer, clipRect);
	g_history.pushAction(clear);
	clear.replay(); // to execute it immediately
	
	// TODO need a ClearRegionAction which can
	// clear any shape region, not just a rectangle.

	// Draw image in selection layer:
	this._selectionImg = new Image();
	let self = this;
	this._selectionImg.onload = function() {
	    let ctx = self.selectionLayer.getContext();
	    self.drawSelection(ctx);
	}
	this._selectionImg.src = imgDataUrl;
    },

    moveSelection: function(dx, dy) {
	this._clipRect.left += dx;
	this._clipRect.right += dx;
	this._clipRect.top += dy;
	this._clipRect.bottom += dy;
	this.selectionLayer.updateDisplay();
    },

    cancelSelection: function() {
	// TODO 
	// Does this need to be implemented or can we accomplish
	// the same thing by undoing the selection?
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

	targetLayer.getContext().drawImage(this._selectionImg,
					   this._clipRect.left,
					   this._clipRect.top);

	// Reset all selection-related state.
	this._selectionPresent = false;
	this._clippingPath = null;
	this._parentLayer = null;
	this._clipRect = null;
	this._selectionImg = null;
    },

    drawSelection: function(ctx) {
	    // Don't need to do anything special?
	if (!this._selectionPresent || !this._selectionImg) {
	    return;
	}
	let clipRect = this._clipRect;
	ctx.drawImage(this._selectionImg, clipRect.left, clipRect.top);
	// Draw translucent black square around selection
	ctx.fillStyle = Colors.translucentBlack.style;
	ctx.beginPath();
	ctx.moveTo(clipRect.left, clipRect.top);
	ctx.lineTo(clipRect.right, clipRect.top);
	ctx.lineTo(clipRect.right, clipRect.bottom);
	ctx.lineTo(clipRect.left, clipRect.bottom);
	ctx.lineTo(clipRect.left, clipRect.top);
	ctx.fill();
    }
};

/* When user mousedowns within the selection and drags, then
 call the selectionMovingTool instead of the real tool.

 (At least, for now.  There should be a way to draw within the
 selection, using the selection as a clipping region, so that means
 there eventually needs to be a way of using other tools inside
 the selection region...  still some stuff to figure out here.)

 Oh, what if a click with any selection tool inside an existing
 selection turns into the selectionMovingTool?  But clicks with other
 drawing tools draw normally using the selection as a clipping region?
 That sounds workable.
*/

selectionMovingTool = new Tool(0);
selectionMovingTool.display = function(penCtx, x, y) {
};
selectionMovingTool.down = function(ctx, x, y) {
    if (g_selection.selectionPresent) {
	this.startX = x;
	this.startY = y;
	this.lastX = x;
	this.lastY = y;
	this.inProgress = true;
    }
};
selectionMovingTool.up = function(ctx, x, y) {
    if (this.inProgress) {
	if (g_selection.selectionPresent) {
	    this.endX = x;
	    this.endY = y;
	    this.inProgress = false;
	    g_selection.dropSelection(); 
	}
    }
};
selectionMovingTool.drag = function(ctx, x, y) {
    if (this.inProgress) {
	if (g_selection.selectionPresent) {
	    g_selection.moveSelection(x - this.lastX,
				      y - this.lastY);
	    this.lastX = x;
	    this.lastY = y;
	}
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
	let transform = g_selection.selectionLayer.screenToWorld;
	//let transform = function(x, y) { return {x: x, y: y}; };
	pointList.push(transform(this.startX, this.startY));
	pointList.push(transform(this.startX, this.endY));
	pointList.push(transform(this.endX, this.endY));
	pointList.push(transform(this.endX, this.startY));
	pointList.push(transform(this.startX, this.startY));
	
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
	ctx.fillStyle = Colors.translucentBlack.style;
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
