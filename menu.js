
function GridMenu( canvas, itemList, squareSize, offsets) {
    // Each item in stringList has .name, .icon, and .execute
    this._left = 0;
    this._top = 0;
    this._timeDelay = 250; //ms -- if mouse released before this time elapsed, stay open and wait for a 
    //second click.
    this._squareSize = squareSize;
    //this._optionsList = optionsList;
    this._visible = false;
    this._ctx =canvas.getContext("2d");

    // Offsets is optional x-y offsets of region where grid menu
    // is to appear.  If not provided, will use left and top of canvas.
    if (offsets) {
	this._offsetX = offsets.x;
	this._offsetY = offsets.y;
    } else {
	this._offsetX = canvas.offsetLeft;
	this._offsetY = canvas.offsetTop;
    }
    this._maxWidth = canvas.width;
    this._maxHeight = canvas.height;

    this._oldCell = null;
    this._invokeTime = 0;

    if (itemList.length > 16 ) {
	this._commands = itemList.slice(0, 15);
    } else {
	this._commands = itemList;
    }

    // Preload images:
    for (let i = 0; i < this._commands.length; i++) {
	let commandObj = this._commands[i];
	let img = new Image();
	img.onload = function(){ commandObj.img = img  };
	img.src = commandObj.icon;
    }
}
GridMenu.prototype = {
    get visible() {
	return this._visible;
    },
    onMouseDown: function(evt) {
	this._ctx.clearRect(0, 0, this._maxWidth, this._maxHeight);
	let x = evt.pageX - this._offsetX;
	let y = evt.pageY - this._offsetY;
	if (this._visible) {
	    return;
	}
	this._invokeTime = new Date().getTime();
	this._left = x - this._squareSize * 1.5;
	this._top = y - this._squareSize * 1.5;
	this._draw();
	this._visible = true;
    },
    onMouseUp: function(evt) {
	let x = evt.pageX - this._offsetX;
	let y = evt.pageY - this._offsetY;
	if (this._visible) {
	    var now = new Date().getTime();
	    if ( now - this._invokeTime > this._timeDelay ) {
		//erase:
		this._ctx.clearRect(0, 0, this._maxWidth, this._maxHeight);
		let index = this._getCellNumFromPoint( x, y );
		// Execute!
		if (index != null && index < this._commands.length) {
		    this._commands[index].execute();
		}
		this._visible = false;
	    }
	}
    },
    onMouseMove: function(evt) {
	let x = evt.pageX - this._offsetX;
	let y = evt.pageY - this._offsetY;
	if (!this._visible) {
	    return;
	}
	var cellNum = this._getCellNumFromPoint(x, y);
	if (cellNum != this._oldCell) {
	    if (this._oldCell != null)
		this._fillSquare(this._oldCell, "white");
	    if (cellNum != null)
		this._fillSquare(cellNum, "red");
	    this._oldCell = cellNum;
	}
    },

    _getCellNumFromPoint: function( x, y ) {
	var col = Math.floor( ( x - this._left ) / this._squareSize );
	var row = Math.floor( ( y - this._top ) / this._squareSize );

	/* Constrain row and column to the menu so that even if you
	 * mouse outside of it, you're still treated as touching the
	 * nearest box.  This makes it much easier to use by making the
	 * effective target size much larger. */
	let lots = (this._commands.length > 8);
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
	let table = this._rowColumnTable;
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
	this._ctx.mozDrawText(commandObj.name);
	this._ctx.restore();

	if (commandObj.img) {
	    var x = this._left + this._squareSize * col + margin;
	    var y = this._top + this._squareSize * row + margin;
	    this._ctx.drawImage(commandObj.img, x, y);
	}
    },

    _fillSquare: function( cellNum, color ) {
	this._ctx.fillStyle = color;
	var colRow = this._cellNumToColRow(cellNum);
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
