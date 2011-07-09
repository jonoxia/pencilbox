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

function Layer(index, options) {
  // Create canvas tag for this layer by copying size of
  // original canvas tag
  let can = $("#the-canvas").get(0);
  this.width = can.width;
  this.height = can.height;
  this.tag = $("<canvas></canvas>");
  this.tag.appendTo('body');
  this.tag.addClass("layer-canvas");
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
  this.opacity = 1.0;
  if (options && options.scale) {
      this._scale = options.scale;
  } else {
      this._scale = 1.0;
  }
  if (options && options.translate) {
      this._xTranslate = options.translate.x;
      this._yTranslate = options.translate.y;
  } else {
      this._xTranslate = 0;
      this._yTranslate = 0;
  }
  this._center = {x: this.width/2,
		  y: this.height/2};
  this.name = "Layer " + index;

  this._hidden = false;
  if (options && options.hidden) {
      this._hidden = options.hidden;
  }

  if (!this._hidden) {
      this.createLayerTableInterface();
  }

}
Layer.prototype = {
    isHiddenLayer: function() {
	return this._hidden;
    },
    createLayerTableInterface: function() {
	// Create row in the layers table for this layer
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
	
	let self = this;
	cell = $("<td></td>");
	let selector = $("<select><option value='1.0'>100%</option>" +
			 "<option value='0.75'>75%</option>" +
			 "<option value='0.50'>50%</option>" +
			 "<option value='0.25'>25%</option>" +
			 "<option value='0'>Hide</option></select>");
	selector.change(function(){
		let selected = selector.children("option:selected").first();
		self.setOpacity(parseFloat(selected.val()));
	    });
	cell.append(selector);
	this.tableRow.append(cell);
	this.tableRow.appendTo("#layers-table");
    },
    
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
	if (this.titleCell) {
	    this.titleCell.html(newName);
	}
    },
    getName: function() {
	return this.name;
    },
    setOpacity: function(opacity) {
	this.opacity = opacity;
	this.updateDisplay();
    },
    getOpacity: function() {
	return this.opacity;
    },
    getContext: function() {
	return this.displayContext;
    },
    getZoomLevel: function() {
	return this._scale;
    },
    getTranslation: function() {
	let self = this;
	return {x: self._xTranslate,
		y: self._yTranslate};
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
    screenToWorld: function(x, y, sizeIsOdd) {
	// Inverse transform, turns screen coordinates into world
	// coordinates.
	let xTrans = this._xTranslate;
	let yTrans = this._yTranslate;
	let xCen = this._center.x;
	let yCen = this._center.y;
	let scale = this._scale;
	let worldX = (x - xTrans - xCen* ( 1-scale))/scale;
	let worldY = (y - yTrans - yCen * (1-scale))/scale;
	worldX = Math.floor(worldX);
	worldY = Math.floor(worldY);
	if (sizeIsOdd) {
	    worldX += 0.5;
	    worldY += 0.5;
	}
	return {x: worldX, y: worldY };
    },
    screenToWorldMulti: function(pointList, sizeIsOdd) {
	let pts = [];
	for each (let pt in pointList) {
          pts.push( this.screenToWorld(pt.x, pt.y, sizeIsOdd) );
	}
	return pts;
    },
    worldToScreen: function(x, y) {
	let xTrans = this._xTranslate;
	let yTrans = this._yTranslate;
	let xCen = this._center.x;
	let yCen = this._center.y;
	let scale = this._scale;
	return { x: scale * x + xTrans + xCen * (1 - scale),
		y: scale * y + yTrans + yCen * (1 - scale)};
    },
    clearLayer: function() {
	if (!this._hidden) {
	    this._everythingBrown();
	}
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
	if (!this._hidden) {
	    this._everythingBrown();
	}
	this.displayContext.save();
	this._setTransformMatrix();
	this._clearPageArea();
	this.displayContext.globalAlpha = this.opacity;
	g_history.replayActionsForLayer(this);
	this.onRedraw(this.displayContext);
	this.displayContext.restore();
    },
    updateWithoutReplay: function() {
	this.displayContext.save();
	this._setTransformMatrix();
	this._clearPageArea();
	this.displayContext.globalAlpha = this.opacity;
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
	// clipPath is optional: if not provided, will grab
	// everything inside clipRect instead.

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
	if (clipPath) {
	    this.displayContext.beginPath();
	    this.displayContext.moveTo(clipPath[0].x,
				       clipPath[0].y);
	    for (let i = 1; i < clipPath.length; i++) {
		this.displayContext.lineTo(clipPath[i].x,
					   clipPath[i].y);
	    }
	    this.displayContext.clip();
	}

	// Replay all the history now, with that transform applied
	g_history.replayActionsForLayer(parentLayer,
					this.displayContext);
	// TODO any reason not to call onRedraw?
	parentLayer.onRedraw(this.displayContext);
	// TODO this produces a Security Error if picture contains
	// an imported picture
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
    },

    resetDimensions: function(newX, newY, newWidth, newHeight) {
	this.width = newWidth;
	this.height = newHeight;
	this.tag.css("left", newX);
	this.tag.css("top", newY);
	this.tag.attr("width", newWidth);
	this.tag.attr("height", newHeight);
    }
};
