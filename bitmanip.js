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
    translucentBlack: new Color(0, 0, 0, 0.2)
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
    // TODO paint bucket stopped working at all -- this now gest
    // invalid or illegal string error every time.
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

