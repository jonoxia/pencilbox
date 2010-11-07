// Panels!

/* What is a panel, anyway, or at any rate what can you do to one?
 *  - Create panel
 *  - Resize panel (by dragging corners?)
 *  - Somehow we have to assign chunks of the drawing to the
 *     panels (that's why manga studio makes each panel a folder
 *     of layers)
 *  - Or do we? The point of a panel is 1. to look panely, 2.
 *     to clip, and 3. to let you move the whole inside of the
 *     panel.
 *  - So if we want a cheap version, we can do clipping by just
 *     making the gutters opaque - the rest of the drawing is
 *    just hidden behind them.  And we can do moving by creating
 *    a temp rectangular selection of the inside contents
 *    (has to be a multilayer selection) and moving that wherever
 *    you move the panel.  (Drawback here is that any part of the
 *    picture that was under the gutter gets left behind, so if
 *    you move panel and then make panel bigger you lose data.
 *    I think that might be acceptable.
 *    
 *  - So!  There's a Panel tool, and when you mousedown, it
 *    decides whether you're 1. near a panel corner (resize) 
 *    or 2. inside a panel (drag) or 3. not in a panel (draw new
 *    panel)

 *  There will also need to be a way to remove a panel, but I
 *   don't know what that is yet.

 */

// Drawing border of panels will snap to multiples of 10 pixels to
// make them easier to line up.
const SNAP_GRID_PIXELS = 10;

function Panel(path) {
    this.borderWidth = 2.0;
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
}
Panel.protoype = {
    setCorner: function(whichCorner, newPoint) {
	switch(whichCorner) {
	case "nw":
	this.left = newPoint.x;
	this.top = newPoint.y;
	break;
	case "ne":
	this.right = newPoint.x;
	this.top = newPoint.y;
	break;
	case "sw":
	this.left = newPoint.x;
	this.bottom = newPoint.y;
	break;
	case "se":
	this.right = newPoint.x;
	this.bottom = newPoint.y;
	break;
	}
    },
    move: function(dx, dy) {
	this.left += dx;
	this.right += dx;
	this.top += dy;
	this.bottom += dy;
	// TODO IMPL move everything inside the panel too!
    },
    draw: function(context) {
	context.save();
	context.beginPath();
	context.strokeWidth = this.borderWidth;
	context.moveTo(this.left, this.top);
	context.lineTo(this.right, this.top);
	context.lineTo(this.right, this.bottom);
	context.lineTo(this.left, this.bottom);
	context.lineTo(this.left, this.top);
	// Make sure inside of path is transparent:
	context.globalCompositeOperation = 'destination-out';
	context.fill();
	context.restore();
	context.stroke();
    }
};

function PanelManager() {
    this.panels = [];
    // Color to fill in the space between panels:
    this.gutterColor = Colors.grey;
    this.panelLayer = new Layer(-1); // TODO must go under dialogue
    this.panelLayer.setName("Panels");
    let manager = this;
    this.panelLayer.onRedraw = function(ctx) {
	manager.drawEverything(ctx);
    };
}
PanelManager.prototype = {
    getGrabPt: function(x, y) {
	// TODO IMPLEMENT return reference to the grabbed panel and
	// one of "nw", "ne", "sw", "se", or "main".
	return {panel: null,
		controlPoint: ""};
    },
    createPanel: function( borderPath ) {
	this.panels.push( new Panel(borderPath) );
    },
    drawEverything: function( context ) {
	// fill in gutter:
	context.fillStyle = this.gutterColor;
	context.fillRect(0, 0, this.panelLayer.width,
			 this.panelLayer.height);
	for (let i = 0; i < this.panels.length; i++) {
	    this.panels[i].draw(context);
	}
    }
};

var panelTool = new Tool(2.0);
panelTool.mode = null; // one of "draw" or "manipulate"
panelTool.getStrokeStyle = function() {
    return Colors.black;
};
panelTool.down = function(ctx, x, y) {
    let worldPt = layer.screenToWorld(x, y);
    let grabbitation = g_panels.getGrabPt(worldPt.x, worldPt.y);
    if (grabbitation) {
	this.panel = grabbitation.panel;
	this.controlPoint = grabbitation.controlPoint;
	this.mode = "manipulate";
    } else {
	this.panel = null;
	this.controlPoint = null;
	this.mode = "draw";
	this.drawStartPoint = {x: x, y: y};
    }
};
panelTool.up = function(ctx, x, y) {
    if (this.mode == "draw") {
	g_panels.createRectanglePanel( this.drawStartPt,
				       this.drawEndPt );
    }
    this.mode = null;
    this.panel = null;
    this.controlPoint = null;
};
panelTool.drag = function(ctx, x, y) {
    let layer = g_panels.panelLayer;
    let worldPt = layer.screenToWorld(x, y);
    if (this.mode == "manipulate") {
	switch (this.controlPoint) {
	case "nw": case "sw": case "ne": case "se":
	    this.panel.setCorner(this.controlPoint, worldPt);
            layer.updateDisplay();
	    break;
	case "main":
	    // TODO IMPL calc dx, dy
            this.panel.move(dx, dy);
            layer.updateDisplay();
	    break;
	}
    } else if (this.mode == "draw") {
	this.drawEndPoint = worldPt;
	
	// TODO IMPL draw the thing
    }
};
panelTool.display = function(penCtx, x, y) {
    let img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = "icons/ruler-crop.png";
};
panelTool.drawCursor = function(penCtx, x, y) {
    $("#the-canvas").css("cursor", "crosshair");
};
panelTool.changeSize = function(delta) {
    // Let's not have interface for changing panel line weight-
    // want that to stay consistent.
};
panelTool.getRecordedAction = function() {
    // TODO (for undo history)
    return null;
};
panelTool.resetRecordedAction = function() {
    // TODO
};
