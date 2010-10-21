
function Layer(index) {
  let can = $("#the-canvas").get(0);
  this.width = can.width;
  this.height = can.height;
  this.index = index;

  this.name = "Layer " + index;

  this.tag = $("<canvas></canvas>");
  this.tag.appendTo('body');
  this.tag.attr("width", this.width);
  this.tag.attr("height", this.height);
  this.tag.css("position", "absolute");
  this.tag.css("z-index", "" + index);
  this.tag.css("left", $("#the-canvas").offset().left);
  this.tag.css("top", $("#the-canvas").offset().top);

  // for debug:
  let self = this;
  this.tag.bind("mousedown", function(evt) { 
	  $("#debug").html("Mousedowned on " + self.name + " index " + self.index);});

  this.displayCanvas = this.tag.get(0);
  this.displayContext = this.displayCanvas.getContext("2d");

  this.visible = true;

  this._scale = 1.0;
  this._xTranslate = 0;
  this._yTranslate = 0;
  this._center = {x: this.width/2,
		  y: this.height/2};

  this.tableRow = $("<tr></tr>");
  // <tr><td>Layer 0</td><td><input type="checkbox"></input></td>
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
  cell = $("<td></td>");
  let checkBox = $("<input type=\"checkbox\" checked=\"true\"></input>");
  let self = this;
  checkBox.bind("click", function() {
	  self.setVisible(checkBox.attr("checked"));
      });
  cell.append(checkBox);
  this.tableRow.append(cell);
  this.tableRow.appendTo("#layers-table");
}
Layer.prototype = {
    setIndex: function(newIndex) {
	this.index = newIndex;
	this.tag.css("z-index", "" + newIndex);
	this.radioBtn.attr("value", newIndex);
    },
    getIndex: function() {
	return this.index;
    },
    setName: function(newName) {
	this.name = newName;
	this.titleCell.html(newName);
    },
    getName: function() {
	return this.name;
    },
    getContext: function() {
	return this.displayContext;
    },
    setVisible: function(newVal) {
	this.visible = newVal;	
	this.tag.css("display", newVal?"block":"none");
    },
    clearLayer: function() {
	this.displayContext.clearRect(0, 0, this.width, 
				      this.height);
    },
    updateDisplay: function() {
	this.displayContext.clearRect(0, 0, this.width, this.height);
	this.displayContext.save();
	this.displayContext.translate(
	  this._xTranslate + this._center.x * (1-this._scale),		
	  this._yTranslate + this._center.y * (1-this._scale));
	this.displayContext.scale(this._scale, this._scale);
	/*this.displayContext.translate(this._xTranslate,
	  this._yTranslate);*/
	// replay everything in this layer
	g_history.replayActionsForLayer(this);
	this.displayContext.restore();
    },
    scale: function(factor) {
	let oldScale = this._scale;
	this._scale = this._scale * factor;
	// don't allow just any crazy scale - snap to a whole multiple
	// of 0.2.
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
	// Use scale factor because e.g. if you pan 100 screen pixels when zoomed in to 2x,
	// we only need to move 50 real pixels to get an effect matching your gesture.
	this._xTranslate += xFactor; ///this._scale;
	this._yTranslate += yFactor; ///this._scale;
	this.updateDisplay();
    }
};
