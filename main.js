var g_drawInterface = null;
var g_toolInterface = null;
var g_history = null;
var g_dialogue = null;
var g_panels = null;
var g_selection = null;

function export() {
    // There's a securtiy exception that can happen if you try to
    // save a canvas that thinks it contains an image loaded from
    // a different server...

    // To save images:
    // 1. Composite all layers onto a single canvas, big enough to hold whole comic
    // (scald to 100%)
    let exportCanvas = $("<canvas>").appendTo($("body")).get(0);
    let dim = g_drawInterface.getPageDimensions();
    exportCanvas.width = dim.width;
    exportCanvas.height = dim.height;
    let ctx = exportCanvas.getContext("2d");
    ctx.jonoName = "ExportCanvas";

    // 2. Turn canvas into data URL like this:
    let dataUrl = exportCanvas.toDataURL("image/png");
    let postArgs = {data: dataUrl.split(",")[1],
		filename: "mypic"};

    /* 3. AJAX post the data url to
     * "www.evilbrainjono.net/multicanvas/export.py"
     * with args data = data filename = filename. */
    jQuery.ajax({url:"export.py",
		data: postArgs,
		type: "POST",
		success: function(data, textStatus) {
		  $("#debug").html(data);
	        },
		error: function(req, textStatus, error) {
		  $("#debug").html("error " + textStatus + "; " + error);
	        },
		dataType: "html"});
    /* 4. Python script converts to .png and saves image,
     * generates name, sends you back a link. */

    // 5. Remove the special canvas we created for export
    $(exportCanvas).remove();
}

function adjustToScreen() {
    // Set widths and heights dynamically to make optimal
    // use of screen dimensions.
    let screenWidth = window.innerWidth;
    let screenHeight = window.innerHeight;

    let mainCanvasWidth, mainCanvasHeight;
    if (screenHeight > screenWidth) {
	// Portrait mode screen
	mainCanvasWidth = screenWidth;
	mainCanvasHeight = screenHeight * 0.65;
	$("#pen-size-canvas").attr("width", screenWidth * 0.4);
	$("#pen-size-canvas").attr("height", screenHeight * 0.25);
    } else {
	// Landscape mode screen
	mainCanvasWidth = screenWidth * 0.6;
	mainCanvasHeight = screenHeight;
	$("#pen-size-canvas").attr("width", screenWidth * 0.2);
	$("#pen-size-canvas").attr("height", screenHeight * 0.7);
    }
    $("#the-canvas").attr("width", mainCanvasWidth);
    $("#the-canvas").attr("height", mainCanvasHeight);

    if (g_drawInterface) {
	g_drawInterface.resetDimensions($("#the-canvas").offset().left,
					$("#the-canvas").offset().top,
					mainCanvasWidth,
					mainCanvasHeight);
	g_drawInterface.updateAllLayerDisplays();
    }
}

function importImage() {
    // TODO interface for picking a local image to upload
    /* TODO also need a way of moving imported image
     * where we want it!!  Maybe treat it as a selection? */

    // TODO trying to select this gives me a security error!!!
    var img = new Image();   // Create new Image object  
    img.onload = function(){  
	let layer = g_drawInterface.getActiveLayer();
	let action = new ImportImageAction(layer, img, 0, 0);
	g_history.pushAction(action);
	layer.doActionNow(action);
    }  
    img.src = 'myImage.png';
}

function deleteThatHistory() {
    window.localStorage.setItem("history", "");
    window.localStorage.setItem("layers", "");
}

$(function() {
        deleteThatHistory();
        document.multitouchData = true;
	adjustToScreen();

	g_toolInterface = new ToolAreaInterface();
	g_drawInterface = new DrawAreaInterface();
	g_drawInterface.clearAllLayers();
	g_dialogue = new DialogueManager();
	g_selection = new SelectionManager();
	g_panels = new PanelManager();
	// History must get started last b/c it will try to
	// restore everything else from localstorage.
	g_history = new History();

	// Create first drawing layer: 
	// (skip this if there are already drawing layers due to 
	// recreated history)
	if (g_drawInterface.layers.length < 4) {
	    $("#debug").html("Only " + g_drawInterface.layers.length + " layers");
	    g_drawInterface.newLayer();
	}
	g_drawInterface.updateAllLayerDisplays();

	// Set up the main menu:
	$("#main-menu").change(function() {
		switch($(this).val()) {
		case "import-item":
		    importImage();
		    break;
		case "export-item":
		    export();
		    break;
		case "save-item":
		    g_history.saveToLocalStorage();
		    break;
		case "new-layer-item":
		    g_drawInterface.newLayer(); 
		    break;
		case "clear-item":
		    // TODO implement a "clear-everything" function
		    break;
		case "adjust-item":
		    adjustToScreen();
		    break;
		}
		$(this).val("none");
	    });
	/* Update balloons with each keystroke, but don't
	 * push an action to history until onchange event
	 * (i.e. dialogue edit area loses focus) */
	$("#dialogue-edit-area").bind("keyup", function() {
		let newScript = $("#dialogue-edit-area").val();
		g_dialogue.setScript(newScript);
		g_dialogue.makeBubblesFromText();
		g_dialogue.renderAllBubbles();
		g_toolInterface.setTool(textBalloonTool);
	    });
	$("#dialogue-edit-area").bind("change", function() {
		let newScript = $("#dialogue-edit-area").val();
		let action = new ChangeScriptAction(newScript);
		g_history.pushAction(action);
		g_dialogue.dialogueLayer.updateDisplay();
	    });
});