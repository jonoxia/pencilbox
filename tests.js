/* Unit test suite*/
var g_drawInterface = null;
var g_toolInterface = null;
var g_history = null;
var g_dialogue = null;
var g_panels = null;
var g_selection = null;

function debug( str ) {
    TestsAhoy.output( str );
}

// History Save / Reload Tester
TestsAhoy.register(
  {
      setUp: function() {
	  // Instantiating these requires html elements #pen-size-canvas, 
	  // #the-canvas, and #debug.
	  TestsAhoy.output("Settingup");
	  window.localStorage.setItem("history", "");
	  window.localStorage.setItem("layers", "");
	g_toolInterface = new ToolAreaInterface();
	g_drawInterface = new DrawAreaInterface();
	g_drawInterface.clearAllLayers();
	g_dialogue = new DialogueManager();
	g_selection = new SelectionManager();
	g_panels = new PanelManager();
	// History must get started last b/c it will try to
	// restore everything else from localstorage.
	g_history = new History();
      },

      testLayersRestored: function() {
	  TestsAhoy.assertEqual(g_drawInterface.getNumLayers(), 3,
				"Should have 3 layers!");
	  g_drawInterface.newLayer();
	  TestsAhoy.assertEqual(g_drawInterface.getNumLayers(), 4,
				"Should have 4 layers!");
	  g_drawInterface.setActiveLayer(-4);
	  TestsAhoy.assertEqual(g_drawInterface.activeLayer,
				g_drawInterface.layers[3]);
	  let layerStr = g_drawInterface.serializeLayers();
	  TestsAhoy.output(layerStr);
	  this.tearDown();
	  this.setUp();

	  g_drawInterface.recreateLayers(layerStr, TestsAhoy);
	  TestsAhoy.assertEqual(g_drawInterface.getNumLayers(), 4,
				"Should have 4 layers!");
	  TestsAhoy.assertEqual(g_drawInterface.activeLayer,
				g_drawInterface.layers[3],
				"Last layer should be active!");
	  
      },

      testHistoryRestored: function() {
	  // Serialize layers and history to strings, restore
	  // from strings, assert that they're the same as what
	  // we started with.

	  // Push some actions!
	  let p = g_panels.createRectanglePanel({x:10, y:10},
						{x:500, y:400});
	  let panelAction = new RectanglePanelAction(p.getId(),
						     10, 10, 500, 400);
	  g_history.pushAction(panelAction);
	  let script = "Hello, World!";
	  let scriptAction = new ChangeScriptAction(script);
	  g_dialogue.setScript(script);
	  g_dialogue.makeBubblesFromText();
	  g_history.pushAction(scriptAction);
	  let balloonAction = new MoveBalloonAction(0,
						   "main",
						   {x:300, y:250});
	  g_history.pushAction(balloonAction);
	  g_drawInterface.newLayer();
	  let eraseAction = new EraserStrokeAction(g_drawInterface.activeLayer,
						   [{x: 100, y: 50},
                                                    {x: 102, y: 48},
	                                            {x: 104, y: 46} ],
						   20);
	  g_history.pushAction(eraseAction);

	  // Serialize!
	  let historyStr = g_history.serialize();
	  TestsAhoy.output(historyStr);
	  this.tearDown();
	  this.setUp();
	  // Recreate!
	  g_history.recreate(historyStr, TestsAhoy);

	  // Now test that all the actions were restored!
	  TestsAhoy.assertEqual(g_history.currPtr, 4,
				"CurrPtr should be 4");
	  TestsAhoy.assertEqual(g_history.actionList.length, 4,
				"Should have 4 actions in history");
	  let action = g_history.actionList[0];
	  TestsAhoy.assertEqual(action._left, 10, "Left");
	  TestsAhoy.assertEqual(action._top, 10, "Top");
	  TestsAhoy.assertEqual(action._width, 500, "Width");
	  TestsAhoy.assertEqual(action._height, 400, "Height");
	  action = g_history.actionList[1];
	  TestsAhoy.assertEqual(action.newScript, script, "Script match");
	  action = g_history.actionList[2];
	  TestsAhoy.assertEqual(action.balloonIndex, 0);
	  TestsAhoy.assertEqual(action.controlPoint, "main");
	  TestsAhoy.assertEqual(action.point.x, 300);
	  TestsAhoy.assertEqual(action.point.y, 250);
	  action = g_history.actionList[3];
	  TestsAhoy.assertEqual(action.size, 20);
	  TestsAhoy.assertEqual(action.points[0].x, 100);
	  TestsAhoy.assertEqual(action.points[0].y, 50);
	  // TODO restore a DrawAction, test that its colors are right!
      },

      tearDown: function() {
	  g_drawInterface = null;
	  g_toolInterface = null;
	  g_history = null;
	  g_dialogue = null;
	  g_panels = null;
	  g_selection = null;
      }
  }
);


TestsAhoy.register(
{
    name: "Flood Fill Tests",

    setUp: function() {
	// Instantiating these requires html elements #pen-size-canvas, 
	// #the-canvas, and #debug.
	TestsAhoy.output("Settingup");
	window.localStorage.setItem("history", "");
	window.localStorage.setItem("layers", "");
	g_toolInterface = new ToolAreaInterface();
	g_drawInterface = new DrawAreaInterface();
	g_drawInterface.clearAllLayers();
	g_dialogue = new DialogueManager();
	g_selection = new SelectionManager();
	g_panels = new PanelManager();
	g_history = new History();
    },

    tearDown: function() {
	g_drawInterface = null;
	g_toolInterface = null;
	g_history = null;
	g_dialogue = null;
	g_panels = null;
	g_selection = null;
    },

    testRectangleFilledCorrectly: function() {
	/* 1. Make a rectangle in the canvas.
	 * 2. Click inside the rectangle with the paintbucket tool.
	 * 3. Get the list of points back from the paintbucket tool and
	 *    assert they are as we expected.
	 * 4. use the failure of this test to figure out what, exactly,
	 *    is wrong with our floodfill algorithm.
	 * 5. Make some weirder shapes than a rectangle and see what we
	 *    can learn from floodfilling those guys. */
	g_drawInterface.newLayer();
	g_drawInterface.setActiveLayer(-4);
	let ctx = g_drawInterface.getActiveLayer().getContext();
	ctx.strokeRect( 5.5, 5.5, 10, 10);

	// todo also try ctx.strokeRect( 5.5, 5.5, 10, 10);
	// and (5, 5, 10.5, 10.5); shouldn't matter if we're on the whole
	// pixel or not.
	
	bucket.up(ctx, 10, 10);
	let actualPtList = bucket.actionPoints;
	debugPtList(actualPtList);
	expectedPtList = [{x: 10, y: 6},
			  {x: 15, y: 6},
			  {x: 15, y: 15},
			  {x: 6, y: 15},
			  {x: 6, y: 6}];
	for (let i = 0; i < expectedPtList.length; i++) {
	    TestsAhoy.assertEqual(actualPtList[i].x,
				  expectedPtList[i].x,
				  "pt " + i + " has wrong X");
	    TestsAhoy.assertEqual(actualPtList[i].y,
				  expectedPtList[i].y,
				  "pt " + i + " has wrong Y");
	}
    },

    testFillGoesUpToEdge: function() {
	// make a partial shape that abuts edge of canvas: verify
	// that filled region goes up to edge of canvas and stops
	g_drawInterface.newLayer();
	g_drawInterface.setActiveLayer(-4);
	let ctx = g_drawInterface.getActiveLayer().getContext();
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo( 0.5, 10.5);
	ctx.lineTo( 10.5, 10.5);
	ctx.lineTo( 10.5, 0.5);
	ctx.stroke();

	bucket.up(ctx, 5, 5);
	let actualPtList = bucket.actionPoints;
	debugPtList(actualPtList);
	expectedPtList = [{x: 5, y: 0},
			  {x: 10, y: 0},
			  {x: 10, y: 10},
			  {x: 0, y: 10},
			  {x: 0, y: 0}];
	for (let i = 0; i < expectedPtList.length; i++) {
	    TestsAhoy.assertEqual(actualPtList[i].x,
				  expectedPtList[i].x,
				  "pt " + i + " has wrong X");
	    TestsAhoy.assertEqual(actualPtList[i].y,
				  expectedPtList[i].y,
				  "pt " + i + " has wrong Y");
	}
    },

    testTriangleFilledCorrectly: function() {
	g_drawInterface.newLayer();
	g_drawInterface.setActiveLayer(-4);
	let ctx = g_drawInterface.getActiveLayer().getContext();
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo( 10.5, 10.5);
	ctx.lineTo( 20.5, 20.5);
	ctx.lineTo( 10.5, 20.5);
	ctx.lineTo( 10.5, 10.5);
	ctx.stroke();

	bucket.up(ctx, 12, 15);
	let actualPtList = bucket.actionPoints;
	debugPtList(actualPtList);
	// TODO the actual test part

	// test that algorithm deals with diagonal lines
	// (At the moment it doesn't -- diagonal lines have anti-
	// aliasing around them maybe?)
    },

    testFillIgnoresZoom: function() {
	// set zoom to 50%, set it to 200%, make sure they produce
	// same result
	
    },

    testFillStopsAtIsland: function() {
	// TODO
	// make a shape with another shape inside; verify that
	// algorithm doesn't fill inner shape
    },

    testCircleFilledCorrectly: function() {
	// TODO
	// make a (small) circle, fill it, verify
	// that algorithm deals with curved lines
    }
});

function debugPtList(ptList) {
    let str = "Point list: ";
    for (let i in ptList) {
	str += "{x:" + ptList[i].x + ", " + ptList[i].y + "}, ";
    }
    TestsAhoy.output(str);
}