var g_drawInterface = null;
var g_toolInterface = null;
var g_history = null;
var g_dialogue = null;

// Speech bubble improvements:

// 4. Make a better way to switch to speech bubble tool
// Why isn't speech bubble cursor icon appearing?
// 6. Implement styles inside of speech bubbles (<code>, <em>, <whisper>)
// 7. Conjoined bubbles (where tail of one merges into another?)

// Initial stroke doesn't have scaled thickness (although it looks
// correct after scaling)

// Improvements to export:
// - Export all layers together (i.e. replay them all to a single canvas)
//     Calling history.replayActionsForLayer for each layer (with a context override)
//     will work, /except/ in the case of the dialuge layer, because the dialogue
//     editing events are't in the undo history.  What we really want is a writeLayerTo
//     Output method on each layer, and have it work differently on the text layer than
//     on the others.
// - Scale to 100% before exporting
// - Make canvas big enough to include everything up to boundaries
// (Note: that means we need boundaries!!)

// After that: Adjustable transparency!

function saveHandler() {
    // There's a securtiy exception that can happen if you try to
    // save a canvas that thinks it contains an image loaded from
    // a different server...

    // To save images:
    // 1. Composite all layers onto a single canvas, big enough to hold whole comic
    // (scald to 100%)
    let canvas = g_drawInterface.getActiveLayer().displayCanvas;
    // 2. Turn canvas into data URL like this:
    let dataUrl = canvas.toDataURL("image/png");
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
}


$(function() {
        document.multitouchData = true;

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

});