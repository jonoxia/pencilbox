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

function GridMenu( canvas, itemList, squareSize, options) {
    // Each item in stringList has .name, .icon, and .execute
    this._left = 0;
    this._top = 0;
    this._timeDelay = 250; //ms -- if mouse released before this time elapsed, stay open and wait for a 
    //second click.
    this._squareSize = squareSize;
    //this._optionsList = optionsList;
    this._visible = false;
    this._ctx =canvas.getContext("2d");

    // Options can have x-y offsets of region where grid menu
    // is to appear.  If not provided, will use left and top of canvas.
    if (options) {
	if (options.x != undefined) this._offsetX = options.x;
	if (options.y != undefined) this._offsetY = options.y;
    } else {
	this._offsetX = canvas.offsetLeft;
	this._offsetY = canvas.offsetTop;
    }
    this._maxWidth = canvas.width;
    this._maxHeight = canvas.height;

    // Pass in alwaysRedraw: True as part of options to have it
    // always redraw
    if (options) {
	this._alwaysRedraw = options.alwaysRedraw;
    }

    this._oldCell = null;
    this._invokeTime = 0;

    if (itemList.length > 16 ) {
	this._commands = itemList.slice(0, 15);
    } else {
	this._commands = itemList;
    }

    // Preload images:
    for (var i = 0; i < this._commands.length; i++) {
	(function(commandObj) {
          var img = new Image();
          img.onload = function(){ commandObj.img = img  };
          img.src = commandObj.icon;	    
	})(this._commands[i]);
    }
}
GridMenu.prototype = {
    get visible() {
	return this._visible;
    },
    onMouseDown: function(x, y) {
	this._ctx.clearRect(0, 0, this._maxWidth, this._maxHeight);
	var rel_x = x - this._offsetX;
	var rel_y = y - this._offsetY;
	if (this._visible) {
	    return;
	}
	this._invokeTime = new Date().getTime();
	this._left = rel_x - this._squareSize * 1.5;
	this._top = rel_y - this._squareSize * 1.5;
	this._draw();
	this._visible = true;
    },
    onMouseUp: function(x, y) {
	x -= this._offsetX;
	y -= this._offsetY;
	var now, index;
	if (this._visible) {
	    now = new Date().getTime();
	    if ( now - this._invokeTime > this._timeDelay ) {
		//erase:
		this._ctx.clearRect(0, 0, this._maxWidth, this._maxHeight);
		index = this._getCellNumFromPoint( x, y );
		// Execute!
		if (index != null && index < this._commands.length) {
		    this._commands[index].execute();
		}
		this._visible = false;
	    }
	}
    },
    onMouseMove: function(x, y) {
	x -= this._offsetX;
	y -= this._offsetY;
	if (!this._visible) {
	    return;
	}
	var cellNum = this._getCellNumFromPoint(x, y);
	if (this._alwaysRedraw) {
	    this._draw();
	    this._fillSquare(cellNum, "red");
	} else {
	    if (cellNum != this._oldCell) {
		if (this._oldCell != null)
		    this._fillSquare(this._oldCell, "white");
		if (cellNum != null)
		    this._fillSquare(cellNum, "red");
		this._oldCell = cellNum;
	    }
	}
    },

    _getCellNumFromPoint: function( x, y ) {
	var col = Math.floor( ( x - this._left ) / this._squareSize );
	var row = Math.floor( ( y - this._top ) / this._squareSize );

	/* Constrain row and column to the menu so that even if you
	 * mouse outside of it, you're still treated as touching the
	 * nearest box.  This makes it much easier to use by making the
	 * effective target size much larger. */
	var lots = (this._commands.length > 8);
	if (col < 0) {
	    if (lots && (row == 0 || row == 2))
		col = -1;
	    else
		col = 0;
	}
	if (col > 2) {
	    if (lots && (row == 0 || row == 2))
		col = 3;
	    else
		col = 2;
	}
	if (row < 0) {
	    if (lots && (col == 0 || col == 2))
		row = -1;
	    else
		row = 0;
	}
	if (row > 2) {
	    if (lots && (col == 0 || col == 2))
		row = 3;
	    else
		row = 2;
	}
	return this._colRowToCellNum(col, row);
    },


    _draw: function() {
	for (var i = 0; i < this._commands.length; i++) {
	    this._renderTextInSquare(this._commands[i], i);
	}
    },

    get _rowColumnTable() {
	if (this._commands.length > 8) {
	return [         [0, -1],        [2, -1],
		[-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
                         [0, 1],         [2, 1],
                [-1, 2], [0, 2], [1, 2], [2, 2], [3, 2],
			 [0, 3],          [2, 3]
               	];
	} else {
	    return [[0, 0], [1, 0], [2, 0],
                    [0, 1],         [2, 1],
                    [0, 2], [1, 2], [2, 2]];
	}
    },

    _cellNumToColRow: function(cellNum) {
	return this._rowColumnTable[cellNum];
    },

    _colRowToCellNum: function(col, row) {
	var table = this._rowColumnTable;
	for ( var i = 0; i < table.length; i++ ) {
	    if (table[i][0] == col && table[i][1] == row)
		return i;
	}
	return null;
    },

    _renderTextInSquare: function(commandObj, cellNum) {
	var colRow = this._cellNumToColRow(cellNum);
	var col = colRow[0];
	var row = colRow[1];
	var margin = 5; // five pixels

	this._ctx.mozTextStyle = "12pt sans serif";
	this._ctx.fillStyle = "black";
	this._ctx.strokeStyle = "black";
	this._ctx.lineWidth = 1.0;
	this._ctx.strokeRect(this._left + this._squareSize * col,
			    this._top + this._squareSize * row,
			    this._squareSize, this._squareSize);
	this._ctx.save();
	this._ctx.translate(this._left + this._squareSize * col + margin, this._top + this._squareSize * (row + 1) - margin );
	this._ctx.fillText(commandObj.name, 0, 0);
	this._ctx.restore();

	if (commandObj.img) {
	    var x = this._left + this._squareSize * col + margin;
	    var y = this._top + this._squareSize * row + margin;
	    try {
	    this._ctx.drawImage(commandObj.img, x, y);
	    } catch(e) {
		debug("col=" + col +" left=" + this._left + " size=" + this._squareSize + " margin=" + margin);
	    }
	}
    },

    _fillSquare: function( cellNum, color ) {
	this._ctx.fillStyle = color;
	var colRow = this._cellNumToColRow(cellNum);
	if (!colRow) {
	    return;
	}
	var col = colRow[0];
	var row = colRow[1];
	this._ctx.beginPath();
	this._ctx.moveTo(this._left + this._squareSize * col, this._top + this._squareSize * row );
	this._ctx.lineTo(this._left + this._squareSize * col, this._top + this._squareSize * (row + 1) );
	this._ctx.lineTo(this._left + this._squareSize * (col + 1), this._top + this._squareSize * (row + 1) );
	this._ctx.lineTo(this._left + this._squareSize * (col + 1), this._top + this._squareSize * row );
	this._ctx.lineTo(this._left + this._squareSize * col, this._top + this._squareSize * row );
	this._ctx.fill();
	this._ctx.fillStyle = "black";
	this._ctx.stroke();
	if (cellNum < this._commands.length )
	    this._renderTextInSquare(this._commands[cellNum], cellNum);
    },

    cancel: function() {
	if (this._visible) {
	    this._ctx.clearRect(0, 0, this._maxWidth, this._maxHeight);
	}
	this._visible = false;
    }
};
