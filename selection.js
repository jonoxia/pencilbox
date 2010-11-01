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
  * Skew (free trasnformation)
  * Return to original (and deselect)
  * Drop here (and deselect)

  */

// ctx.clip();  is our new best friend.


// Have to figure out how these Actions can work
// during export-replay as well as undo/redo replay.

/* 1. Don't export the selection layer!
 * 2. We don't want to actually recalculate the clipping contents
 *     as part of the action!!!  That's because if we recaculate when
 *     replaying into the export context, we'll grab stuff we don't
 *     want (e.g. contents of lower layers).
 * 3.  Instead, we can make the dropSelectionAction belong to the
 *     target layer, and have the action itself store the bitmap data,
 *     and so when the target layer replays that it gets exactly what
 *     you expect to be pasted in.
 * 4.  The moveSelectionAction meanwhile can *belong* to the
 *     selection layer.  Since we don't replay the selection layer
 *     or draw anything from it when rendering to export context,
 *     these will be ignored.  But they will still get undone when
 *     you use the undo command right after.  Perfect!
 * 5.  The create selection action, therfore, just has to *remove*
 *     the expected stuff from the target layer, so that it won't
 *     be there when we replay it.  (it should belong to the target
 *     layer as well).  It can also add the selection to the
 *     selection layer (to implement undo/redo replay)
 *     Actually this also presents a problem with export replay
 *     because the removal would remove everything from the underlying
 *     layers that had already been rendered.
 *     The only solution I can think of is that when doing export
 *     replay we lay down each layer before beginning to render the
 *     next layer, meaning turn each layer to a bitmap and then plop
 *     the bitmaps one on top another.  Ugh!  Worry about this later.
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
	if (manager._selectionImg) {
            ctx.drawImage(manager._selectionImg,
	                  manager._clipRect.left,
                          manager._clipRect.top);
	}
    };
    g_drawInterface.layers.push(this.selectionLayer);
    this._selectionCtx = this.selectionLayer.getContext();
}
SelectionManager.prototype = {
    get selectionPresent() {
	return this._selectionPresent;
    },

    isWorldPtInsideSelection: function(x, y) {
	// TODO  // Nontrivial if selection region has a complex
	// shape!
	
	// But basically the interface can call this to know whether
	// it should be doing a moveSelection or what...

    },
    isScreenPtInsideSelection: function(x, y) {
	// TODO
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

	//$("#debug").html("<img src=\"" + imgDataUrl + "\"/>");
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
	    self.selectionLayer.getContext().drawImage(
					     self._selectionImg,
					     clipRect.left,
					     clipRect.top);
	}
	this._selectionImg.src = imgDataUrl;
    },

    moveSelection: function(dx, dy) {
	this._clipRect.left += dx;
	this._clipRect.right += dx;
	this._clipRect.top += dy;
	this._clipRect.bottom += dy;
	this.selectionLayer.updateDisplay();
	// todo
	// updateDisplay, which calls replayActionsForLayer,
	// which we may or may not want, as well as
	// everythingBrown, which we may not want.
	// (it also calls onRedraw, which calls drawSelection(),
	// so we don't need to call anything else here.
    },

    cancelSelection: function() {
	// TODO 
	// Clear the selection,
	// and tell the parent layer to stop hiding whatever was
	// inside the clipping path.

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
	self._selectionPresent = false;
	self._clippingPath = null;
	self._parentLayer = null;
	self._clipRect = null;
	self._selectionImg = null;
    },

    drawSelection: function() {
	    // Don't need to do anything special?
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
    this.startX = x;
    this.startY = y;
    this.lastX = x;
    this.lastY = y;
    this.inProgress = true;
};
selectionMovingTool.up = function(ctx, x, y) {
    if (this.inProgress) {
	this.endX = x;
	this.endY = y;
	this.inProgress = false;
	if (g_selection.selectionPresent) {
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
