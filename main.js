var g_drawInterface = null;
var g_toolInterface = null;
var g_history = null;
var g_dialogue = null;

function saveHandler() {
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
    g_drawInterface.exportAllLayers(ctx);

    // 2. Turn canvas into data URL like this:
    let dataUrl = exportCanvas.toDataURL("image/png");
    let postArgs = {data: dataUrl.split(",")[1],
		filename: "mypic"};

    // 3. AJAX post the data url to "www.evilbrainjono.net/multicanvas/export.py" with
    //     args data = data filename = filename.
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
    
    // 4. Python script converts to .png and saves image, generates name, sends you back a link.

    // 5. Remove the special canvas we created for export
    $(exportCanvas).remove();
}


$(function() {
        document.multitouchData = true;

	// Set widths and heights dynamically to make optimal
	// use of screen dimensions.
	let screenWidth = window.innerWidth;
	let screenHeight = window.innerHeight;
	$("#the-canvas").attr("width", screenWidth * 0.6);
	$("#the-canvas").attr("height", screenHeight);
	$("#pen-size-canvas").attr("width", screenWidth * 0.2);
	$("#pen-size-canvas").attr("height", screenHeight * 0.7);

	g_history = new History();
	g_toolInterface = new ToolAreaInterface();
	g_drawInterface = new DrawAreaInterface();
	g_dialogue = new DialogueManager();

	let loadHandler = function() {
	    // TODO interface for picking a local image to upload
	    var img = new Image();   // Create new Image object  
	    img.onload = function(){  
		g_drawInterface.getDrawCtx().drawImage(img, 0, 0);
		g_history.pushAction(
	          new ImportImageAction(
                    g_drawInterface.getActiveLayer(), img, 0, 0
		  )
                );
	    }  
	    img.src = 'myImage.png';
	};
	$("#save-btn").bind("click", saveHandler);
	$("#load-btn").bind("click", loadHandler);
	$("#new-layer-btn").bind("click", function() { g_drawInterface.newLayer(); } );

	$("#dialogue-edit-area").bind("keyup", function() {
	  g_dialogue.makeBubblesFromText($("#dialogue-edit-area").val());
	  g_toolInterface.setTool(textBalloonTool);
	    });

	g_drawInterface.clearAllLayers();
});