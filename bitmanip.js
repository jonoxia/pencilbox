/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License
 * at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and
 * limitations under the License.
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

function Color(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
}
Color.prototype = {
    equals: function(color2) {
	return this.r == color2.r &&
	this.g == color2.g &&
	this.b == color2.b &&
	this.a == color2.a;
    },
    diff: function(color2) {
	return Math.sqrt( (this.r - color2.r) * (this.r - color2.r) +
			  (this.g - color2.g) * (this.g - color2.g) +
			  (this.b - color2.b) * (this.b - color2.b) +
			  (this.a - color2.a) * (this.a - color2.a));
    },
    toStr: function() {
	return "(" + this.r + "," + this.g + "," + this.b + "," + this.a + ")";
    },
    toStyle: function() {
	return "rgba(" + this.r + "," + this.g + "," + this.b + "," +
	this.a + ")";
    },
    copy: function() {
        return new Color(this.r, this.g, this.b, this.a);
    },
    get style() {
	return this.toStyle();
    },
    toJSON: function() {
	var self = this;
	return [self.r, self.g, self.b, self.a];
    },
    fromJSON: function(jsonObj) {
	this.r = jsonObj[0];
	this.g = jsonObj[1];
	this.b = jsonObj[2];
	this.a = jsonObj[3];
    }
};

var Colors = {
    white: new Color(255, 255, 255, 1),
    grey1: new Color(224, 224, 224, 1),
    grey2: new Color(192, 192, 192, 1),
    grey3: new Color(160, 160, 160, 1),
    grey4: new Color(128, 128, 128, 1),
    grey5: new Color(96, 96, 96, 1),
    grey6: new Color(64, 64, 64, 1),
    grey7: new Color(32, 32, 32, 1),
    black: new Color(0, 0, 0, 1),
    brown: new Color(150, 100, 50, 1),
    red: new Color(255, 0, 0, 1),
    blue: new Color(0, 0, 255, 1),
    green: new Color(0, 255, 0, 1),
    yellow: new Color(255, 255, 0, 1),
    cyan: new Color(0, 255, 255, 1),
    magenta: new Color(255, 0, 255, 1),
    transparent: new Color(0, 0, 0, 0),
    translucentBlack: new Color(0, 0, 0, 0.2),
    translucentYellow: new Color(255, 255, 0, 0.5),
    ecru: new Color(230, 230, 180, 1),
    bleachedBone: new Color(250, 250, 190, 1),
    tallarnFlesh: new Color(230, 200, 150, 1),
    rouge: new Color(255, 240, 180, 1),
    lichePurple: new Color(180, 0, 220, 1),
    darkAngelsGreen: new Color(0, 120, 40, 1),
    iceBlue: new Color(180, 255, 255, 1),
    hawkTurquoise: new Color(0, 200, 200, 1),
    blazingOrange: new Color(255, 180, 0, 1),
    catachanGreen: new Color(110, 180, 80, 1),
    goblinGreen: new Color(0, 200, 0, 1),
    shiningGold: new Color(255, 210, 70, 1),
    ultramarinesBlue: new Color(0, 0, 150, 1),
    scabRed: new Color(200, 0, 0, 1),
    bestialBrown: new Color(200, 140, 50, 1),
    scorchedBrown: new Color(100, 65, 25, 1),
    tentaclePink: new Color(255, 180, 180, 1),
    indigo: new Color(100, 0, 255, 1),
    yellowGreen: new Color(180, 255, 0, 1),
    mediumBlue: new Color(0, 100, 180, 1),
    jungleGreen: new Color(0, 180, 100, 1)
};

function move(pt, dir, distance) {
    if (!distance) {
	distance = 1;
    }
    switch (dir) {
    case "up":
	return {x: pt.x, y: pt.y - distance};
    case "down":
	return {x: pt.x, y: pt.y + distance};
    case "left":
	return {x: pt.x - distance, y: pt.y};
    case "right":
	return {x: pt.x + distance, y: pt.y};
    default:
	debug("Invalid dir: " + dir);
    }
}
function clockwise(dir) {
    switch(dir) {
    case "up":
	return "right";
    case "right":
	return "down";
    case "down":
	return "left";
    case "left":
	return "up";
    }
}
function counterclockwise(dir) {
    switch(dir) {
    case "up":
	return "left";
    case "left":
	return "down";
    case "down":
	return "right";
    case "right":
	return "up";
    }
}
function opposite(dir) {
    switch(dir) {
    case "up":
	return "down";
    case "left":
	return "right";
    case "down":
	return "up";
    case "right":
	return "left";
    }
}

/* BitManipulator currently converts to bitmap at the current
 * zoom level, which makes flood fill behavior highly dependent on the
 * view (in fact the paint won't stop at lines that aren't onscreen!)
 * TODO getImageData at a fixed scale (one where the whole canvas
 * contents fit onscreen). The more we zoom in, the more accurate our
 * flood fills will be.  Is there any way to tell it to not use anti-
 * aliasing? Because the grey anti-alias pixels on diagonal lines really
 * screw up flood fills.
 */
function BitManipulator(context, width, height) {
    this.context = context;
    this.width = width;
    this.height = height;
    this.dataBlob = this.context.getImageData(0, 0, width, height);
}
BitManipulator.prototype = {
    getColorAt: function(x, y) {
	x = Math.floor( x - 0.5);
	y = Math.floor( y - 0.5);
	var i = 4 * (y * this.width + x);
	var r = this.dataBlob.data[i];
	var g = this.dataBlob.data[i + 1];
	var b = this.dataBlob.data[i + 2];
	var a = this.dataBlob.data[i + 3];
	return new Color(r, g, b, a);
    },

    getColorAtPt: function(pt) {
	return this.getColorAt(pt.x, pt.y);
    },

    setColorAt: function(x, y, color) {
	x = Math.floor( x - 0.5);
	y = Math.floor( x - 0.5);
	var i = 4 * (y * this.width + x);
	this.dataBlob.data[i] = color.r;
	this.dataBlob.data[i + 1] = color.g;
	this.dataBlob.data[i + 2] = color.b;
	this.dataBlob.data[i + 3] = color.a;
    },

    save: function() {
	this.context.putImageData(this.dataBlob, 0, 0);
    }    
};

function debugObj(obj) {
    var str = "";
    for (var x in obj) {
	str += "obj." + x + " = " + obj[x] + ";";
    }
    debug(str);
}

function edgeFindingAlgorithm(data, x, y, tolerance) {
    /* Key to getting this algorithm right: we're drawing a line
     * BETWEEN two adjacent pixels, not a line on one pixel or the other.
     * e.g. a line at y = 15 is a line between the pixel at y = 14.5 and
     * the pixel at 15.5. */
    var megaList = [];
    var dir = "up";
    var pt = {x: x, y: y};
    debug("Original point: " + pt.x + ", " + pt.y );
    var seedColor = data.getColorAt(x, y);
    debug("Seed color is " + seedColor.toStr());

    // treat edges of canvas, as well as points with different color
    // from seed color, as boundary points:
    var isBoundary = function(point) {
	if (point.x < 0.5 || point.y < 0.5) {
	    return true;
	}
	if (point.x > data.width + 0.5 || point.y > data.width + 0.5) {
	    return true;
	}
	var color = data.getColorAtPt(point);
	if (!seedColor.equals(color)) {
	    debug("Boundary because color is " + color.toStr());
	    debug("Diff is " + seedColor.diff(color));
	}
	// Tolerance here:
	return (seedColor.diff(color) > tolerance);
    }

    // Go up until we hit a boundary:
    while (!isBoundary({x: pt.x - 0.5, y: pt.y - 0.5})) {
	pt = move(pt, dir);
    }
    debug("Point of contact: " + pt.x + ", " + pt.y );
    // Remember the point just before we hit -- we'll be trying to get
    // back here.
    var keyPt = {x: pt.x, y: pt.y};
    // TODO this algorithm is going to have a problem with islands.
    // Now hug edges clockwise until we get back to this point.
    var dir = clockwise(dir);
    var i = 0;
    var frontOuter, frontInner, newDir;
    megaList.push({x: pt.x, y: pt.y});
    while(i < 5000) { // ensures that loop will end
	i++;
	/* Examine points ahead of us to the outside and the inside.
	 * It looks like one of these cases (where X is a different
	 * colored pixel, O is same color pixel, and -> is direction of
         * movement):
	 *
         *  X O      X X     X X     X O   X X
	 *  ->      -->     -->     -->   -->
	 *  O O      O O     0 X     O X   X X
         *
	 * go this way:
	 *  left  straight  right   right  can't happen
	 */
	debug("travel direction is " + dir);
	newDir = dir;
	frontOuter = move( move(pt, dir, 0.5),
			       counterclockwise(dir), 0.5);
	/*let frontOuterColor = data.getColorAtPt(frontOuter);
	debug("frontOuter is " + frontOuter.x + ", " + frontOuter.y
	+ " -> " + frontOuterColor.toStr());*/

	frontInner = move( move(pt, dir, 0.5), clockwise(dir), 0.5);
	/*let frontInnerColor = data.getColorAtPt(frontInner);
	debug("frontInner is " + frontInner.x + ", " + frontInner.y
	+ " -> " + frontInnerColor.toStr());*/
	// By looking at the front inner and front outer points, we can
	// decide whether we need to turn clockwise, counterclockwise,
	// or keep going straight:
	if (isBoundary(frontInner)) {
	    newDir = clockwise(dir);
	} else if (isBoundary(frontOuter)) {
	    newDir = dir;
	} else {
	    newDir = counterclockwise(dir);
	}
	// Only record points when the direction changes; record the
	// point before moving it in the new direction.
	if (newDir != dir) {
	    debug("Changed direction - time to record pt.");
	    debug("Recorded point: " + pt.x + ", " + pt.y);
	    megaList.push({x: pt.x, y: pt.y});
	}
	pt = move(pt, newDir);
	debug("Out of inner loop. Moved point to " + pt.x + ", " + pt.y);
	dir = newDir;

	// Exit when we arrive back at original point.
	if (pt.x == keyPt.x && pt.y == keyPt.y) {
	    break;
	}
    }
    return megaList;
}




function Feeler(x, y, direction, seedColor, data, fillMap, tolerance) {
    this.startX = x;
    this.startY = y;
    this.direction = direction;
    this.seedColor = seedColor;
    this.data = data;
    this.fillMap = fillMap;
    this.tolerance = tolerance;
};
Feeler.prototype = {
    _isBoundary: function(pt) {
	// Treat edges of canvas as boundary
	// TODO: Treat edges of PANEL as boundary
	if (pt.x < 0 || pt.y < 0) {
	    return true;
	}
	if (pt.x >= this.data.width || pt.y >= this.data.height) {
	    return true;
	}
	// treat as bondary if we've already filled it:
	if (this.fillMap.getBoolAt(pt.x, pt.y)) {
	    return true;
	}
	var color = this.data.getColorAtPt(pt);
	// Tolerance here:
	return (this.seedColor.diff(color) > this.tolerance);
    },

    findEndPoint: function(ctx) {
	var pt = {x: this.startX, y: this.startY};
	var nextPt = move(pt, this.direction);
	while(!this._isBoundary(nextPt)) {
	    this.fillMap.setBoolAt(pt.x, pt.y, true);
	    pt.x = nextPt.x;
	    pt.y = nextPt.y;
	    nextPt = move(pt, this.direction);
	}
	this.endX = pt.x;
	this.endY = pt.y;
	// Fill in as we go:
	ctx.beginPath();
	/* Subtracting 0.5 solves the half-pixels-at-edges problem.
	 * without this there is an ugly gap on northwest borders. */
	ctx.moveTo(this.startX - 0.5, this.startY - 0.5);
	ctx.lineTo(this.endX - 0.5, this.endY - 0.5);
	ctx.stroke();
    },

    get len() {
	// only one of x or y will be different
	return (Math.abs(this.endX - this.startX) +
		Math.abs(this.endY - this.startY));
    },

    launchSubFeelers: function(ctx) {
	// shift to remove oldest sub feeler
	// push to add newewst sub feeler to other end
	// return list of any subfeelers that are live

	var right = clockwise(this.direction);
	var left = counterclockwise(this.direction);
	var liveChildren = [];
        var children, pt, subFeeler;
	var dirs = [right, left];
	var dir;
	for (var d in dirs) {
	    dir = dirs[d];
            children = [];
            pt = {x: this.startX, y: this.startY};
            for (var i = 0; i < this.len; i++) {
	        // TODO move before or after sending out subfeeler?
                pt = move(pt, this.direction);
                subFeeler = new Feeler(pt.x, pt.y, dir,
                                       this.seedColor,
                                       this.data,
                                       this.fillMap,
                                       this.tolerance);

                subFeeler.findEndPoint(ctx);
                children.push(subFeeler);

                // first and last subfeelers always are live:
                if (i == 0 || i == this.len - 1) {
                    liveChildren.push(subFeeler);
                }
                if (i >= 2) {
                    // otherwise, you are live if you're longer than
                    // at least one of your neighbors:
                    if (children[i].len < children[i - 1].len ||
                        children[i - 2].len < children[i - 1].len) {
                           liveChildren.push(children[i - 1]);
                    }
                }
	    /* Future optimizations:
	       1 - we only need to store the last 2 subfeelers, not all
	       2 - if we remember the length of subfeeler's neighbors,
	          then we can tell it to start making its sub-sub-feelers
		  from that point along its length istead of from 0.
	    */
	    }
	}
	return liveChildren;
    }
};

function BoolMap(width, height) {
    var row;
    this._data = [];
    for (var y = 0; y < height; y++) {
        row = [];
	for (var x = 0; x < width; x++) {
	    row.push(false);
	}
	this._data.push(row);
    }
}
BoolMap.prototype = {
    setBoolAt: function(x, y, val) {
	this._data[y][x] = val;
    },
    getBoolAt: function(x, y) {
	return this._data[y][x];
    }
};

function betterEdgeFinder(ctx, data, x, y, tolerance) {
    var liveFeelers = [];
    var feeler, childFeelers;
    var fillMap = new BoolMap(data.width, data.height);
    var seedColor = data.getColorAt(x, y);
    
    liveFeelers.push(new Feeler(x, y, "up", seedColor, 
				data, fillMap, tolerance));
    liveFeelers.push(new Feeler(x, y, "down", seedColor,
				data, fillMap, tolerance));
    liveFeelers[0].findEndPoint(ctx);
    liveFeelers[1].findEndPoint(ctx);
    while(liveFeelers.length > 0) {
	feeler = liveFeelers.pop();
	if (feeler.len > 0) {
            childFeelers = feeler.launchSubFeelers(ctx);
            for (var i = 0; i < childFeelers.length; i++) {
               liveFeelers.push(childFeelers[i]);
            }
	}
    }
    return fillMap;
}

// this will have to result in a PlopBitmap action, so we'll have to
// make PlopBitmapActions work right before it can be tested.