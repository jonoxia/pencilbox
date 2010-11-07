// TODO menu isn't getting erased properly and is leaving cruft all the heck over the place.
// Sometimes there's a partial menu drawn 

function GridMenu( canvas, itemList, squareSize, isSubMenu ) {
    // Each item in stringList has .name, .icon, and .execute
    this._left = 0;
    this._top = 0;
    this._timeDelay = 250; //ms -- if mouse released before this time elapsed, stay open and wait for a 
    //second click.
    this._squareSize = squareSize;
    //this._optionsList = optionsList;
    this._visible = false;
    this._ctx =canvas.getContext("2d");
    this._offsetX = canvas.offsetLeft;
    this._offsetY = canvas.offsetTop;
    this._maxWidth = canvas.width;
    this._maxHeight = canvas.height;

    this._oldCell = null;
    this._invokeTime = 0;

    if (isSubMenu) {
	this._isSubMenu = true;
    } else {
	this._isSubMenu = false;
    }

    if (itemList.length > 8 ) {
	this._commands = itemList.slice(0, 7);
	let subMenu = new GridMenu( canvas, squareSize, itemList.slice( 7 ), true );
	this._commands.push( {name: "More...",
		    icon: null, 
		    execute: null,
		    subMenu: subMenu} );
    } else {
	this._commands = itemList;
	this._subMenu = null;
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
	if (this._left < 0) {
	    this._left = 0;
	}
	if (this._top < 0) {
	    this._top = 0;
	}
	if (this._left > this._maxWidth - this._squareSize * 3 ) {
	    this._left = this._maxWidth - this._squareSize * 3;
	    if (this._isSubMenu) {
		this._top += this._squareSize;
	    }
	}
	if (this._top > this._maxHeight - this._squareSize * 3 ) {
	    this._top = this._maxHeight - this._squareSize * 3;
	    if (this._isSubMenu) {
		this._left += this._squareSize;
	    }
	}
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
	if (cellNum >= 8 ) {
	    return this._subMenu.onMouseMove(x, y);
	}

	if (this._subMenu) {
	    if (cellNum == 7 && !this._subMenu._visible) {
		this._subMenu.onMouseDown(this._left + 3.5 * this._squareSize, this._top + 3.5 * this._squareSize);
	    } else if (cellNum < 7 && this._subMenu._visible) {
		this._subMenu.onMouseUp(this._left + 3.5 * this._squareSize, this._top + 3.5 * this._squareSize);
		this._draw();
	    }
	}
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
	if ( this._subMenu && this._subMenu._visible && (col > 2 || row > 2) ) {
	    return (this._subMenu._getCellNumFromPoint(x, y) + 8 );
	}
	if (col < 0) col = 0;
	if (col > 2) col = 2;
	if (row < 0) row = 0;
	if (row > 2) row = 2;
	return this._colRowToCellNum(col, row);
    },


    _draw: function() {
	this._ctx.moveTo( this._left, this._top );
	this._ctx.lineTo( this._left + 3 * this._squareSize, this._top );
	this._ctx.lineTo( this._left + 3 * this._squareSize, this._top + 3 * this._squareSize );
	this._ctx.lineTo( this._left, this._top + 3 * this._squareSize );
	this._ctx.lineTo( this._left, this._top );
	this._ctx.stroke();

	this._ctx.moveTo( this._left + this._squareSize, this._top );
	this._ctx.lineTo( this._left + this._squareSize, this._top + 3 * this._squareSize );
	this._ctx.stroke();

	this._ctx.moveTo( this._left + this._squareSize * 2, this._top );
	this._ctx.lineTo( this._left + this._squareSize * 2, this._top + 3 * this._squareSize );
	this._ctx.stroke();

	this._ctx.moveTo( this._left, this._top + this._squareSize);
	this._ctx.lineTo( this._left + this._squareSize * 3, this._top +  this._squareSize );
	this._ctx.stroke();

	this._ctx.moveTo( this._left, this._top + this._squareSize * 2);
	this._ctx.lineTo( this._left + this._squareSize * 3, this._top +  this._squareSize * 2);
	this._ctx.stroke();

	for (var i = 0; i < 8; i++) {
	    if ( i < this._commands.length )
		this._renderTextInSquare(this._commands[i], i);
	}
    },

    _cellNumToColRow: function(cellNum) {
	var table;
	if (this._isSubMenu) {
	    table = [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
	} else {
	    table = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
	} 
	return table[cellNum];
    },

    _colRowToCellNum: function(col, row) {
	var table;
	if (this._isSubMenu) {
	    table = [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
	} else {
	    table = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
	} 
	for ( var i = 0; i < 8; i++ ) {
	    if (table[i][0] == col && table[i][1] == row)
		return i;
	}
	return null;
    },

    _renderTextInSquare: function(commandObj, cellNum) {
	this._ctx.mozTextStyle = "12pt sans serif";
	this._ctx.fillStyle = "black";
	this._ctx.save();
	var colRow = this._cellNumToColRow(cellNum);
	var col = colRow[0];
	var row = colRow[1];
	var margin = 5; // five pixels
	this._ctx.translate(this._left + this._squareSize * col + margin, this._top + this._squareSize * (row + 1) - margin );
	this._ctx.mozDrawText(commandObj.name);
	this._ctx.restore();

	if (commandObj.icon) {
	    var img = new Image();
	    var ctx= this._ctx;
	    var x = this._left + this._squareSize * col + margin;
	    var y = this._top + this._squareSize * row + margin;
	    img.onload = function(){ ctx.drawImage(img, x, y);  };
	    img.src = commandObj.icon;
	    /*this._ctx.save();
      this._ctx.translate(this._left + this._squareSize * col + margin, this._top + this._squareSize * (row) + 12 + margin );
      this._ctx.mozDrawText(commandObj.icon);
      this._ctx.restore();*/
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
