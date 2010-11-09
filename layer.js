
function Layer(index) {
  // Create canvas tag for this layer by copying size of
  // original canvas tag
  let can = $("#the-canvas").get(0);
  this.width = can.width;
  this.height = can.height;
  this.tag = $("<canvas></canvas>");
  this.tag.appendTo('body');
  this.tag.attr("width", this.width);
  this.tag.attr("height", this.height);
  this.tag.css("position", "absolute");
  this.tag.css("z-index", "" + index);
  this.tag.css("left", $("#the-canvas").offset().left);
  this.tag.css("top", $("#the-canvas").offset().top);
  this.displayCanvas = this.tag.get(0);
  this.displayContext = this.displayCanvas.getContext("2d");


  // Set up layer drawing properties
  this.index = index;
  this.visible = true;
  this._scale = 1.0;
  this._xTranslate = 0;
  this._yTranslate = 0;
  this._center = {x: this.width/2,
		  y: this.height/2};
  this.name = "Layer " + index;


  // Create row in the layers tablefor this layer
  this.tableRow = $("<tr></tr>");
  let cell = $("<td></td>");
  this.radioBtn = $("<input type=\"radio\" name=\"layers-radioset\"></input>");
  this.radioBtn.attr("value", this.index);
  this.radioBtn.change(
   function() {
     let sel = $("input[name='layers-radioset']:checked").val();
     g_drawInterface.setActiveLayer(sel);
   });
  cell.append(this.radioBtn);
  this.tableRow.append(cell);
  this.titleCell = $("<td></td>");
  this.titleCell.html(this.name);
  this.tableRow.append(this.titleCell);
  cell = $("<td></td>");
  let checkBox = $("<input type=\"checkbox\" checked=\"true\"></input>");
  let self = this;
  checkBox.bind("click", function() {
	  self.setVisible(checkBox.attr("checked"));
      });
  cell.append(checkBox);
  this.tableRow.append(cell);
  this.tableRow.appendTo("#layers-table");
}
Layer.prototype = {
    setIndex: function(newIndex) {
	this.index = newIndex;
	this.tag.css("z-index", "" + newIndex);
	this.radioBtn.attr("value", newIndex);
    },
    getIndex: function() {
	return this.index;
    },
    setName: function(newName) {
	if (g_drawInterface.getLayerByName(newName) != null) {
	    /* Don't allow name to be set to the same name as
	     * any other layer -- layer names are used as keys for
	     * history serialization! */
	    return;
	}
	this.name = newName;
	this.titleCell.html(newName);
    },
    getName: function() {
	return this.name;
    },
    getContext: function() {
	return this.displayContext;
    },
    setVisible: function(newVal) {
	this.visible = newVal;	
	this.tag.css("display", newVal?"block":"none");
    },
    _everythingBrown: function() {
	this.displayContext.fillStyle = Colors.brown.toStyle();
	this.displayContext.fillRect(0, 0, this.width, 
				      this.height);
    },
    _clearPageArea: function() {
	let dim = g_drawInterface.getPageDimensions();
	this.displayContext.clearRect(0, 0, dim.width, dim.height);
    },
    _setTransformMatrix: function() {
	this.displayContext.translate(
	  this._xTranslate + this._center.x * (1-this._scale),		
	  this._yTranslate + this._center.y * (1-this._scale));
	this.displayContext.scale(this._scale, this._scale);
    },
    screenToWorld: function(x, y) {
	// Inverse transform, turns screen coordinates into world
	// coordinates.
	let xTrans = this._xTranslate;
	let yTrans = this._yTranslate;
	let xCen = this._center.x;
	let yCen = this._center.y;
	let scale = this._scale;
	return {x: (x - xTrans - xCen* ( 1-scale))/ scale,
		y: (y - yTrans - yCen * (1-scale))/scale };
    },
    clearLayer: function() {
	this._everythingBrown();
	this.displayContext.save();
	this._setTransformMatrix();
	this._clearPageArea();
	this.displayContext.restore();
    },
    onRedraw: function(ctx) {
	// If the layer needs to do anything special besides
	// replaying history actions in order to redraw, override
	// this function.
    },
    updateDisplay: function() {
	this._everythingBrown();
	this.displayContext.save();
	this._setTransformMatrix();
	this._clearPageArea();
	g_history.replayActionsForLayer(this);
	this.onRedraw(this.displayContext);
	this.displayContext.restore();
    },
    scale: function(factor) {
	let oldScale = this._scale;
	this._scale = this._scale * factor;
	// Uncomment this line to scale by discrete steps:
	//this._scale = Math.floor(this._scale * 5) / 5.0;
	// Pin it between minimum and maximum values:
	if (this._scale < 0.2) {
	    this._scale = 0.2;
	}
	if (this._scale > 5.0) {
	    this._scale = 5.0;
	}
	this.updateDisplay();
    },
    pan: function(xFactor, yFactor) {
	this._xTranslate += xFactor;
	this._yTranslate += yFactor;
	this.updateDisplay();
    },
    doActionNow: function(action) {
	this.displayContext.save();
	this._setTransformMatrix();
	action.replay(this.displayContext);
	this.displayContext.restore();
    },
    pngSnapshot: function(parentLayer, clipRect, clipPath) {
	// the clipRect is just the convex bounding rectangle
	// of the clipPath.

	// Return a dataURL png of the part of the layer contents
	// inside the clipPath.

	// shrink canvas to just size of boundary rectangle
	// for the .png conversion:
	let oldWidth = this.displayCanvas.width;
	let oldHeight = this.displayCanvas.height;
	let width = clipRect.right - clipRect.left;
	let height = clipRect.bottom - clipRect.top;
	this.displayCanvas.width = width;
	this.displayCanvas.height = height;

	this.displayContext.save();
	this.displayContext.translate( -1 * clipRect.left,
	-1 * clipRect.top);

	// Set clipping path:
	this.displayContext.beginPath();
	this.displayContext.moveTo(clipPath[0].x,
				  clipPath[0].y);
	for (let i = 1; i < clipPath.length; i++) {
	    this.displayContext.lineTo(clipPath[i].x,
				      clipPath[i].y);
	}
	this.displayContext.clip();

	// Replay all the history now, with that transform applied
	g_history.replayActionsForLayer(parentLayer,
					this.displayContext);
	let dataUrl = this.displayCanvas.toDataURL("image/png");

	// Return canvas to original size:
	this.displayContext.restore();
	this.displayCanvas.width = oldWidth;
	this.displayCanvas.height = oldHeight;
	return dataUrl;
	/* TODO this is fuzzier than expected when doing it to
	 * a zoomed-in layer, because it's grabbing the pixels
	 * from 100% zoom and then blowing up the bitmap; instead,
	 * should turn vector to bitmap at current zoom if
	 * possible.  */
    }
};
