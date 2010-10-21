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
    }
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

