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
	  let layerStr = g_drawInterface.serializeLayers();
	  
	  this.tearDown();
	  this.setUp();

	  g_drawInterface.recreateLayers(layerStr, TestsAhoy);
	  TestsAhoy.assertEqual(g_drawInterface.getNumLayers(), 4,
				"Should have 4 layers!");
      },

      testHistoryRestored: function() {
	  // Serialize layers and history to strings, restore
	  // from strings, assert that they're the same as what
	  // we started with.

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


	  let historyStr = g_history.serialize();
	  TestsAhoy.output(historyStr);
	  this.tearDown();
	  this.setUp();
	  g_history.recreate(historyStr, TestsAhoy);
	  TestsAhoy.assertEqual(g_history.currPtr, 3,
				"CurrPtr should be 3");
	  TestsAhoy.assertEqual(g_history.actionList.length, 3,
				"Should have 3 actions in history");
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