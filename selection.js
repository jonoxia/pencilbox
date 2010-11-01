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

function SelectionManager() {
    this._selectionPresent = false;

    this._clippingPath = null;
    this._parentLayer = null; // the layer the selection came from
    this._selectionContentsSnapshot = null;

    // TODO this layer should be hidden - it shouldn't be shown in
    // the layers table.  (Maybe an argument to Layer constructor
    // telling it whether or not to add itself to the table?)

    this.selectionLayer = new Layer(-1);
    this.selectionLayer.setName("Selection");
    let manager = this;
    this.selectionLayer.onRedraw = function() {
	if (manager.selectionPresent()) {
	    manager.drawSelection();
	}
    }
    g_drawInterface.layers.push(this.selectionLayer);
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

    createSelection: function(clippingPath, parentLayer) {
	if (this._selectionPresent) {
	    // There was already a selection; drop that one
	    // so we can pick up the new one.
	    this.dropSelection();
	}
	this._selectionPresent = true;
	// TODO
	/* This does two things:
	 * Delete inside the clipping path in the parent layer
         * (Do this in a reversible way! - if we cancelSelection
	 * parent layer needs to undelete it)

	 * And then the second thing: rerun all of the parent layer's
	 * history till now, into the selectionLayer, with the clip
	 * path set so we only see the part inside the clipping path.

	 * At some point we'll need to snapshot the contents inside
	 * the clipping path so that we can redraw those contents
	 * without replaying EVERYTHING from the parent layer.
	 * (Might as well snapshot it now?) */
    },

    moveSelection: function(dx, dy) {
	// TODO  this will change the transform on the selectionLayer
	// and redraw
    },

    cancelSelection: function() {
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

	// TODO  Take the selection layer's image, and
	// create an event in the target layer's history importing
	// that image.
	// Then clear the selection.
	this._selectionPresent = false;
	this._clippingPath = null;
	this._parentLayer = null; 
	this._selectionContentsSnapshot = null;

    },

    drawSelection: function() {
	// TODO
	// This will execute the parent layer's drawing in the
	// selectionLayer, with the clip path set so that only the
	// part inside the path gets drawn, and with the selection
	// layer's transform applied.  (Applied to the clip path too
	// I guess?)
    }
};