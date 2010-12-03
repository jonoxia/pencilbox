/* Unit test suite*/
var g_drawInterface = null;
var g_toolInterface = null;
var g_history = null;
var g_dialogue = null;
var g_panels = null;
var g_selection = null;

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
