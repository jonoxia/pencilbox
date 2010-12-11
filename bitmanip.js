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
	let self = this;
	return {r: self.r,
		g: self.g,
		b: self.b,
		a: self.a};
    },
    fromJSON: function(jsonObj) {
	this.r = jsonObj.r;
	this.g = jsonObj.g;
	this.b = jsonObj.b;
	this.a = jsonObj.a;
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

function move(pt, dir) {
    switch (dir) {
    case "up":
	return {x: pt.x, y: pt.y - 1};
    case "down":
	return {x: pt.x, y: pt.y + 1};
    case "left":
	return {x: pt.x - 1, y: pt.y};
    case "right":
	return {x: pt.x + 1, y: pt.y};
    default:
	$("#debug").html("Invalid dir: " + dir);
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

function BitManipulator(context, width, height) {
    this.context = context;
    this.width = width;
    this.height = height;
    this.dataBlob = this.context.getImageData(0, 0, width, height);
}
BitManipulator.prototype = {
    getColorAt: function(x, y) {
	let i = 4 * (y * this.width + x);
	let r = this.dataBlob.data[i];
	let g = this.dataBlob.data[i + 1];
	let b = this.dataBlob.data[i + 2];
	let a = this.dataBlob.data[i + 3];
	return new Color(r, g, b, a);
    },

    getColorAtPt: function(pt) {
	return this.getColorAt(pt.x, pt.y);
    },

    setColorAt: function(x, y, color) {
	let i = 4 * (y * this.width + x);
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
    let str = "";
    for (let x in obj) {
	str += "obj." + x + " = " + obj[x] + ";";
    }
    $("#debug").html(str);
}

function edgeFindingAlgorithm(data, x, y) {
    // TODO this algorthm needs to treat edges of canvas as color
    // boundaries too.
    let megaList = [];
    let dir = "up";
    let pt = {x: x, y: y};
    let seedColor = data.getColorAt(x, y);
    // Go up until we hit a color boundary:
    while (seedColor.equals(data.getColorAt(pt.x, pt.y))) {
	pt = move(pt, dir);
	if (pt.y < 0) {
	    break;
	}
    }
    // Remember the point just before we hit -- we'll be trying to get
    // back here.
    pt = move(pt, "down");
    let keyPt = {x: pt.x, y: pt.y};
    // TODO this algorithm is going to have a problem with islands.
    // Now hug edges clockwise until we get back to this point.
    let dir = clockwise(dir);
    let i = 0;
    megaList.push({x: pt.x + 0.5, y: pt.y + 0.5});
    // the +0.5 is because canvas coords are actually between pixels - without
    // it we miss a row of pixels on the right and bottom
    while(i < 5000) {
	i++;
	// Throw out a feeler counterclockwise to see if there's more
	// seedColored space that way -- this ensures that we expand
	// outward as much as possible.
	let exploreDir = counterclockwise(dir);
	let centrifugal = exploreDir;
	let explorePt = move(pt, exploreDir);
	// Figure out which way we need to move to hug the edge of
	// the line.
	let z = 0;
	let debugStr = "";
	while (!seedColor.equals(data.getColorAtPt(explorePt))) {
	    debugStr += explorePt.x + ", " + explorePt.y + ": "
		+ data.getColorAtPt(explorePt).toStr();
	    exploreDir = clockwise(exploreDir);
	    explorePt = move(pt, exploreDir);
	    z++;
	    if (z > 4) {
		$("#debug").html("Infinite inner loop: " + debugStr);
		break;
	    }
	}
	pt = move(pt, exploreDir);
	// Only record points when the direction changes
	if (dir != exploreDir) {
	    // TODO what if we adjust one pixel outwards?
	    //let adjustedPt = move(pt, dir);   // exploreDir?
	    let adjustedPt = move(pt, centrifugal);
	    //megaList.push({x: pt.x + 0.5, y: pt.y + 0.5});
	    megaList.push({x: adjustedPt.x + 0.5, y: adjustedPt.y + 0.5});
	    /*let opposite = counterclockwise(counterclockwise(exploreDir));
	    let last = megaList.length -1;
	    megaList[last] = move( megaList[last], opposite);*/
	    dir = exploreDir;
	}
	if (pt.x == keyPt.x && pt.y == keyPt.y) {
	    break;
	}
    }
    return megaList;
}
