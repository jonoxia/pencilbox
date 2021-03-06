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

var g_drawInterface = null;
var g_toolInterface = null;
var g_history = null;
var g_dialogue = null;
var g_panels = null;
var g_selection = null;

function gup( name )
{
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null )
	return "";
    else
	return results[1];
}

function debug( str ) {
    var old = $("#debug").html();
    $("#debug").html( old + "<br/>" + str );
}

function ProgressBar(elemId, max) {
    this.init(elemId, max); //borrow a mob's layer
}
ProgressBar.prototype = {
    init: function(elemId, max) {
	this._div = $("#" + elemId);
	this._innerDiv = this._div.children();
	this._max = max;
	this._outerWidth = this._div.attr("width");
	this.update(0);
	this.show();
    },

    hide: function() {
	this._div.css("display", "none");
    },

    show: function() {
	this._div.css("display", "block");
    },

    update: function(progress) {
	var innerWidth = this._outerWidth * progress / this._max;
	this._innerDiv.css("width", innerWidth + "px");
    }
};
		    

function export2() {
    $("#export-image-controls").slideDown();
    // Export each layer as a separate .png, composite them on the
    // server using PIL (Python Image Library)
    var dim = g_drawInterface.getPageDimensions();
    var layer, dataUrl;
    var dataUrls = [];
    // Sort layers by z-index:
    var layers = g_drawInterface.layers.slice();
    var progressBar = new ProgressBar( "export-prog-bar", layers.length * 2);
    layers.sort(function(layerA, layerB) {
	    return layerA.getIndex() - layerB.getIndex();
	});
    for (var i = 0; i < layers.length; i++) {
        layer = layers[i];
	if (layer.isHiddenLayer()) {
	    // Skip hidden layers, like the selection layer
	    continue;
	}
	dataUrl = layer.pngSnapshot(layer,
                                    {left: 0,
		                     top: 0,
				     right: dim.width,
				     bbottom: dim.height});
	// everything before comma is metadata: slice off
	dataUrls.push( dataUrl.split(",")[1] );
	progressBar.update(i);
    }
    var postArgs = {data: dataUrls.join(","),
		    filename: $("#page-title").html()};

    jQuery.ajax({url:"export.py",
		data: postArgs,
		type: "POST",
		success: function(data, textStatus) {
                  progressBar.hide();
                  $("#export-msg").html("Done! Copy the URL below, or " +
				      "right-click the preview and Save As.");
		  $("#export-link").html("http://evilbrainjono.net" + data);
                  $("#export-img-preview").attr("src", data);
		  // redraw main canvas
		  g_drawInterface.updateAllLayerDisplays();
	        },
		error: function(req, textStatus, error) {
		  $("#export-msg").html("error " + textStatus + "; " + error);
	        },
		dataType: "html"});
}

var g_screenOrientation = "landscape";


function adjustToScreen() {
    // Set widths and heights dynamically to make optimal
    // use of screen dimensions.
    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;

    var drawCanvasWidth = screenWidth * 0.75;
    var drawCanvasHeight = screenHeight;

    var toolCanvasWidth = screenWidth * 0.2;
    var toolCanvasHeight = screenHeight * 0.85;

    $("#pen-size-canvas").attr("width", toolCanvasWidth);
    $("#pen-size-canvas").attr("height", toolCanvasHeight);
    $("#the-canvas").attr("width", drawCanvasWidth);
    $("#the-canvas").attr("height", drawCanvasHeight);
    $("#the-canvas").css("left", toolCanvasWidth + 4);
    $("#the-canvas").css("top", 0);

    if (g_drawInterface) {
	// left is at right edge of tool canvas (plus border width);
	// top is always at 0.
	g_drawInterface.resetDimensions(toolCanvasWidth + 4,
                                        0,
					drawCanvasWidth,
					drawCanvasHeight);
	g_drawInterface.updateAllLayerDisplays();
	// TODO do we need to adjust the toolInterface here??
    }
}

function importImage(imgUrl) {
    /* TODO also need a way of moving imported image
     * where we want it!!  Maybe treat it as a selection? */

    var img = new Image();   // Create new Image object  
    img.onload = function(){  
	var layer = g_drawInterface.getActiveLayer();
	var action = new PlopBitmapAction(layer, img, 0, 0, 1);
	g_history.pushAction(action);
	layer.doActionNow(action);
    }  
    img.src = imgUrl;
}

function doImportFromUrl() {
    /* Send a message up to upload.py telling it to sideload
     * the image from the url to the tmp dir */
    // with src_type = "url" and url = whatever
    $.ajax({url:"upload.py",
            data: {src_type: "url",
                   url: $("#import-image-url").val()},
            type: "POST",
            success: function(data, textStatus) {
                $("#debug").html(data);
		importImage(data);
                $("#import-image-controls").slideUp();
            },
            error: function(req, textStatus, error) {
                $("#debug").html("error " + textStatus + "; " + error);
            },
            dataType: "html"});
}

function doImportFromFile() {
    // Not going to user jQuery here because I don't know how to
    // upload files with jQuery (it may require jQuery plugin
    // This XMLHttpRequest may not be cross-browser though. bluh.
    $("#debug").html("doImportFromFile");
    var data = new FormData($("#img-upload-form")[0]);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "upload.py", true);
    xhr.onload = function(e) {
        if (xhr.status == 200) {
            $("#debug").html(xhr.responseText);
	    importImage(xhr.responseText);
            $("#import-image-controls").slideUp();
	} else {
	    output.innerHTML += "Error " + xhr.status + " occurred uploading your file.<br />";
        }
    };
    xhr.send(data); 
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
    var newScript = $("#dialogue-edit-area").val();
    var action = new ChangeScriptAction(newScript);
    g_toolInterface.setTool(textBalloonTool);
    g_history.pushAction(action);
    g_dialogue.dialogueLayer.updateDisplay();
}

function doNewLayer() {
    g_drawInterface.newLayer(); 
}

function changeTitle() {
    $("#page-title").html( $("#new-title").val() );
    $("#edit-title-div").slideUp();
}

$(function() {
    var touchapi;
    if ("ontouchstart" in document.documentElement) {
	touchapi = "webkit";
    } else {
	touchapi = "gecko";
	document.multitouchData = true;
    }
    adjustToScreen();

    g_toolInterface = new ToolAreaInterface(touchapi);
    g_drawInterface = new DrawAreaInterface(touchapi);
    g_drawInterface.clearAllLayers();
    g_dialogue = new DialogueManager();
    g_selection = new SelectionManager();
    g_panels = new PanelManager();
    g_history = new History();

    var title = gup("title");
    var artist = gup("artist");
    if (artist) {
	$("#artist").html(artist);
    } else {
	$("#artist").html("Anonymous");
    }
    if (title) {
	$("#page-title").html(title);
        g_history.loadFromServer(title, function() {
            if (g_drawInterface.layers.length < 4) {
                g_drawInterface.newLayer();
            }
            g_drawInterface.updateAllLayerDisplays();
        });
    } else {
	$("#page-title").html("Untitled");
        // Create first drawing layer: 
        // (skip this if there are already drawing layers due to 
        // recreated history)
        if (g_drawInterface.layers.length < 4) {
            g_drawInterface.newLayer();
        }
        g_drawInterface.updateAllLayerDisplays();
    }

    /* Update text balloons when you edit the script -- but
     * not with every keystroke, that's too much work. Wait until
     * user stops typing for a second.*/
    var textUpdateTimer = null;
    $("#dialogue-edit-area").bind("keyup", function() {
        if (textUpdateTimer) {
            clearTimeout(textUpdateTimer);
        }
        textUpdateTimer = setTimeout(onScriptChanged, 1000);
    });

    // Call adjustToScreen if screen size changes
    var resizeTimer = null;
    $(window).resize(function() {
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(adjustToScreen, 1000);
    });
});

