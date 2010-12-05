var g_drawInterface = null;
var g_toolInterface = null;
var g_history = null;
var g_dialogue = null;
var g_panels = null;
var g_selection = null;

function export2() {
    // Export each layer as a separate .png, composite them on the
    // server using PIL (Python Image Library)
    let dim = g_drawInterface.getPageDimensions();
    let dataUrls = [];
    // Sort layers by z-index:
    let layers = g_drawInterface.layers.slice();
    layers.sort(function(layerA, layerB) {
	    return layerA.getIndex() - layerB.getIndex();
	});
    for (let i = 0; i < layers.length; i++) {
	let layer = layers[i];
	if (layer.isHiddenLayer()) {
	    // Skip hidden layers, like the selection layer
	    continue;
	}
	let dataUrl = layer.pngSnapshot(layer, {left: 0,
						top: 0,
						right: dim.width,
						bottom: dim.height});
	// everything before comma is metadata: slice off
	dataUrls.push( dataUrl.split(",")[1] );
	
    }
    let postArgs = {data: dataUrls.join(","),
		    filename: "ExportedPic"};

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
}

function changeLocation(newPage) {
    // Save history before changing location, so we don't lose everything.
    g_history.saveToLocalStorage();
    window.location.href = newPage;
}

function adjustToScreen() {
    // Set widths and heights dynamically to make optimal
    // use of screen dimensions.
    let screenWidth = window.innerWidth;
    let screenHeight = window.innerHeight;

    let pageName = window.location.href; //.split("/")[-1];
    let portraitModeFileName = "touchscreen-portraitmode.html";
    let landscapeModeFileName = "touchscreen.html";

    let mainCanvasWidth, mainCanvasHeight;
    if (screenHeight > screenWidth) {
	// Portrait mode screen  - touchscreen-portraitmode.html
	if (pageName.indexOf(portraitModeFileName) == -1) {
	    changeLocation( portraitModeFileName );
	    return;
	}
	mainCanvasWidth = screenWidth;
	mainCanvasHeight = screenHeight * 0.65;
	$("#pen-size-canvas").attr("width", screenWidth * 0.4);
	$("#pen-size-canvas").attr("height", screenHeight * 0.25);
    } else {
	// Landscape mode screen - touchscreen.html
	if (pageName.indexOf(landscapeModeFileName) == -1) {
	    changeLocation( landscapeModeFileName );
	    return;
	}
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

function clearEverything() {
    deleteThatHistory();
    g_history.wipe();
    g_drawInterface.clearAllLayers();
}

function onScriptChanged() {
    let newScript = $("#dialogue-edit-area").val();
    let action = new ChangeScriptAction(newScript);
    g_toolInterface.setTool(textBalloonTool);
    g_history.pushAction(action);
    g_dialogue.dialogueLayer.updateDisplay();
}

$(function() {
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
		    export2();
		    break;
		case "save-item":
		    g_history.saveToLocalStorage();
		    break;
		case "new-layer-item":
		    g_drawInterface.newLayer(); 
		    break;
		case "clear-item":
		    clearEverything();
		    break;
		case "adjust-item":
		    adjustToScreen();
		    break;
		}
		$(this).val("none");
	    });
	/* Update text balloons when you edit the script -- but
	* not with every keystroke, that's too much work. Wait until
	* user stops typing for a second.*/
	let textUpdateTimer = null;
	$("#dialogue-edit-area").bind("keyup", function() {
		if (textUpdateTimer) {
		    clearTimeout(textUpdateTimer);
		}
		textUpdateTimer = setTimeout(onScriptChanged, 1000);
	    });

	// Call adjustToScreen if screen size changes
	let resizeTimer = null;
	$(window).resize(function() {
		if (resizeTimer) {
		    clearTimeout(resizeTimer);
		}
		resizeTimer = setTimeout(adjustToScreen, 1000);
	    });
});