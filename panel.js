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
 *   don't know what that is yet.  (Dbltap panel to bring up context
 *   menu, 'remove' is one option.)
 *
 *   TODO 2. Make moving a panel move its contents (hard)
          2a. A panel drawn around some drawing becomes owner of
              the surrounded content.
          2b. A new drawing started inside a panel is owned by that
	  `   panel.
 *   TODO 3. What happens when one panel overlaps another?
 *   TODO 4. Non-rectangular panels (we have the makings of an
 *           arbitrary polygon type; should also support round ones)
 */

// Drawing border of panels will snap to multiples of 10 pixels to
// make them easier to line up.
const SNAP_GRID_PIXELS = 10;

const BORDER_WIDTH = 2.0;

const GRAB_MARGIN = 15;

function RectanglePanel(left, top, width, height) {
    this._left = left;
    this._top = top;
    this._width = width;
    this._height = height;
}
RectanglePanel.prototype = {
    moveCorner: function(whichCorner, dx, dy) {
	switch (whichCorner) {
	case "nw":
	this._left += dx;
	this._width -= dx; 
	this._top += dy;
	this._height -= dy;
	break;
	case "sw":
	this._left += dx;
	this._width -= dx; 
	this._height += dy;
	break;
	case "ne":
	this._width += dx;
	this._top += dy;
	this._height -= dy;
	break;
	case "se":
	this._width += dx;
	this._height += dy;
	break;
	}
	if (this._height < SNAP_GRID_PIXELS) {
	    this._height = SNAP_GRID_PIXELS;
	}
	if (this._width < SNAP_GRID_PIXELS) {
	    this._width = SNAP_GRID_PIXELS;
	}
    },
    move: function(dx, dy) {
	this._left += dx;
	this._top += dy;
	// TODO move everything inside the panel too
    },
    getGrabPt: function(x, y) {
	if (Math.abs( x - this._left) < GRAB_MARGIN) {
	    if (Math.abs( y - this._top ) < GRAB_MARGIN) {
		return "nw";
	    }
	    if (Math.abs(y - (this._top + this._height)) < GRAB_MARGIN) {
		return "sw";
	    }
	}
	if (Math.abs( x -(this._left + this._width)) < GRAB_MARGIN) {
	    if (Math.abs( y - this._top ) < GRAB_MARGIN) {
		return "ne";
	    }
	    if (Math.abs(y - (this._top + this._height)) < GRAB_MARGIN) {
		return "se";
	    }
	}
	if (x >= this._left && x <= this._left + this._width &&
	    y >= this._top && y <= this._top + this._height) {
	    return "main";
	}
    },
    draw: function(ctx) {
	ctx.save();
	ctx.globalCompositeOperation = 'destination-out';
	ctx.fillRect(this._left, this._top, this._width, this._height);
	ctx.restore();
	ctx.strokeWidth = BORDER_WIDTH;
	ctx.strokeStyle = Colors.black.style;
	ctx.strokeRect(this._left, this._top, this._width, this._height);
    }
};

function PolygonPanel(path) {
    this.borderPath = path;
}
PolygonPanel.prototype = {
    moveCorner: function(whichCorner, dx, dy) {
	this.borderPath[whichCorner].x += dx;
	this.borderPath[whichCorner].y += dy;
    },
    move: function(dx, dy) {
	for (let i = 1; i < this.borderPath.length; i++) {
	    this.borderPath[i].x += dx;
	    this.borderPath[i].y += dy;
	}
	// TODO IMPL move everything inside the panel too!
    },
    getGrabPt: function(x, y) {
	for (let i = 0; i < this.borderPath.length; i++) {
	    if ( Math.abs( x - this.borderPath[i].x ) < GRAB_MARGIN &&
		 Math.abs( y - this.borderPath[i].y ) < GRAB_MARGIN) {
		return i;
	    }
	}
	return null;
    },
    draw: function(ctx) {
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(this.borderPath[0].x, this.borderPath[0].y);
	for (let i = 1; i < this.borderPath.length; i++) {
	    ctx.lineTo(this.borderPath[i].x, this.borderPath[i].y);
	}
	// Make sure inside of path is transparent:
	ctx.globalCompositeOperation = 'destination-out';
	ctx.fill();
	ctx.restore();
	ctx.strokeWidth = BORDER_WIDTH;
	ctx.strokeStyle = Colors.black.style;
	ctx.stroke();
    }
};

function PanelManager() {
    this.panels = [];
    // Color to fill in the space between panels:
    this.gutterColor = Colors.grey2;
    this.panelLayer = new Layer(-3);
    this.panelLayer.setName("Panels");
    let manager = this;
    this.panelLayer.onRedraw = function(ctx) {
	manager.drawEverything(ctx);
    };
    g_drawInterface.layers.push(this.panelLayer);
}
PanelManager.prototype = {
    getGrabPt: function(x, y) {
	for (let i = 0; i < this.panels.length; i++) {
	    let panel = this.panels[i];
	    let hit = panel.getGrabPt(x, y);
	    if (hit != null) {
		return {panel: panel,
			controlPoint: hit};
	    }
	}
	return null;
    },
    createPolygonPanel: function( borderPath ) {
	let borderPath = this.panelLayer.screenToWorldMulti(borderPath);
	this.panels.push(new PolygonPanel(borderPath));
    },
    createRectanglePanel: function(startPt, endPt) {
	let pointList = [];
	let layer = this.panelLayer;
	let startPt = layer.screenToWorld(startPt.x, startPt.y);
	let endPt = layer.screenToWorld(endPt.x, endPt.y);
	let left = startPt.x < endPt.x? startPt.x : endPt.x;
	let top = startPt.y < endPt.y ? startPt.y : endPt.y;
	let right = startPt.x > endPt.x? startPt.x : endPt.x;
	let bottom = startPt.y > endPt.y ? startPt.y : endPt.y;
	this.panels.push(new RectanglePanel(left, top,
					    right-left, bottom-top));
	this.panelLayer.updateDisplay();
    },
    drawEverything: function( context ) {
	// fill in gutter:
	context.fillStyle = this.gutterColor.style;
	let dim = g_drawInterface.getPageDimensions();
	context.fillRect(0, 0, dim.width, dim.height);
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
panelTool.snapToGrid = function(screenX, screenY) {
    let layer = g_panels.panelLayer;
    let worldPt = layer.screenToWorld(screenX, screenY);
    let worldX = Math.floor(worldPt.x / SNAP_GRID_PIXELS);
    let worldY = Math.floor(worldPt.y / SNAP_GRID_PIXELS);
    let worldPt = {x: worldX * SNAP_GRID_PIXELS,
		   y: worldY * SNAP_GRID_PIXELS};
    let screenPt = layer.worldToScreen(worldPt.x, worldPt.y);
    return {screenPt: screenPt, worldPt: worldPt};
};
panelTool.down = function(ctx, x, y) {
    let pts = this.snapToGrid(x, y);
    let worldPt = pts.worldPt;
    let screenPt = pts.screenPt;
    
    let grabbitation = g_panels.getGrabPt(worldPt.x, worldPt.y);
    if (grabbitation) {
	this.panel = grabbitation.panel;
	this.controlPoint = grabbitation.controlPoint;
	this.mode = "manipulate";
	this.manipStartPt = {x: worldPt.x, y: worldPt.y};
    } else {
	this.panel = null;
	this.controlPoint = null;
	this.mode = "draw";
	this.drawStartPt = {x: screenPt.x, y: screenPt.y};
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
    let pts = this.snapToGrid(x, y);
    let worldPt = pts.worldPt;
    let screenPt = pts.screenPt;
    let layer = g_panels.panelLayer;

    if (this.mode == "manipulate") {
	let dx = worldPt.x - this.manipStartPt.x;
	let dy = worldPt.y - this.manipStartPt.y;
	switch (this.controlPoint) {
	case "main":
	    // TODO IMPL calc dx, dy
            this.panel.move(dx, dy);
	    break;
	default:
	    this.panel.moveCorner(this.controlPoint, dx, dy);
	    break;
	}
	layer.updateDisplay();
	this.manipStartPt = {x: worldPt.x, y: worldPt.y};
    } else if (this.mode == "draw") {
	this.drawEndPt = {x: screenPt.x, y: screenPt.y};
    }
};
panelTool.display = function(penCtx, x, y) {
    let img = new Image();  
    img.onload = function(){  
	penCtx.drawImage(img, 60, 60);  
    }  
    img.src = "icons/ruler-crop.png";
};
panelTool.drawCursor = function(ctx, x, y) {
    $("#the-canvas").css("cursor", "crosshair");
    if (this.mode == "draw" && this.drawEndPt) {
      ctx.strokeStyle=this.getStrokeStyle().style;
      ctx.lineWidth = this.size;
      ctx.beginPath();
      ctx.moveTo(this.drawStartPt.x, this.drawStartPt.y);
      ctx.lineTo(this.drawStartPt.x, this.drawEndPt.y);
      ctx.lineTo(this.drawEndPt.x, this.drawEndPt.y);
      ctx.lineTo(this.drawEndPt.x, this.drawStartPt.y);
      ctx.lineTo(this.drawStartPt.x, this.drawStartPt.y);
      ctx.stroke();
    }
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
