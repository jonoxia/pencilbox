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
 * The Original Code is Tests Ahoy.
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

var TestsAhoy = {
  testsRun: 0,
  testsPassed: 0,

  allTests: [],
  asyncChecks: [],

  output: function(str) {
    $("#output").append( str + "<br/>");
  },

  pass: function() {
    this.output(".");
    this.testsPassed += 1;
  },

  assertEqual: function(a, b, errorMsg) {
    this.testsRun += 1;
    if (a == b) {
      this.pass();
    } else {
      if (errorMsg) {
        throw(errorMsg + " : " + a + " does not equal " + b);
      } else {
        throw(a + " does not equal " + b);
      }
    }
  },

  assertEqualArrays: function (a, b, errorMsg) {
    this.testsRun += 1;
    let equal = true;
    if (a.length != b.length) {
      equal = false;
    } else {
      for (let i = 0; i < a.length; i++) {
        if (a[i] != b[i]) {
          equal = false;
        }
      }
    }
    if (equal) {
      this.pass();
    } else {
      if (errorMsg) {
        throw(errorMsg + " : " + a + " does not equal " + b);
      } else {
        throw( a + " does not equal " + b);
      }
    }
  },

  assertInRange: function(lowerBound, value, upperBound, errorMsg) {
    this.testsRun += 1;
    if (lowerBound <= value && value <= upperBound) {
      this.pass();
    } else {
      if (errorMsg) {
        throw(errorMsg + " : " + value + " is outside the range of " +
              lowerBound + " to " + upperBound);
      } else {
        throw(value + " is outside the range of " +lowerBound + " to " +
              upperBound);
      }
    }
  },

  assertFail: function(errorMsg) {
    this.testsRun += 1;
    throw(errorMsg);
  },

  assertTrue: function(value, errorMsg) {
    this.testsRun += 1;
    if (value) {
      this.pass();
    } else {
      if (errorMsg) {
        throw(errorMsg + " : value is " + value);
      } else {
        throw("Value is " + value);
      }
    }
  },

  assertFalse: function(value, errorMsg) {
    this.testsRun += 1;
    if (!value) {
      this.pass();
    } else {
      if (errorMsg) {
        throw(errorMsg + " : value is " + value);
      } else {
        throw("Value is " + value);
      }
    }
  },

  assertDefined: function(value, errorMsg) {
    this.testsRun += 1;
    if (value != undefined) {
      this.pass();
    } else {
      if (errorMsg) {
        throw(errorMsg + " : value is undefined");
      } else {
        throw("Value is undefined");
      }
    }
  },

  register: function(testObj) {
    // register an object with one or more methods that start with the
    // word "test"; we will run each of those.
    this.allTests.push(testObj);
  },

  runAllTests: function() {
    let toRun = [];
    for (let i = 0; i < this.allTests.length; i++) {
      let testObj = this.allTests[i];
      for (let prop in testObj) {
        if (prop.indexOf("test") == 0) {
          toRun.push({obj: testObj, prop: prop});
        }
      }
    }

    this.numTestsToRun = toRun.length;
    let self = this;
    for each (let test in toRun) {
      this._runOneTest(test.obj, test.prop, function() {
                         self.numTestsToRun--;
                         if (self.numTestsToRun == 0) {
                           self.onAllTestsFinished();
                         }
                       });
    }
  },

  _runOneTest: function(testObj, prop, onDone) {
    // Set up before each test function, tear down afterward.
    this.asyncChecks = [];
    if (testObj.setUp) {
      testObj.setUp();
    }
    this.output("Running " + prop + "...");
    try {
      testObj[prop].call(testObj);
    } catch(e) {
      this.output("Test Failed: " + e);
    }

    if (this.asyncChecks.length > 0) {
      // If the test function added any async checks, call each one now.
      // Don't tear down and finish until we have called all of the async
      // checks.
      this.runAsyncChecks(function() {
                            if (testObj.tearDown) {
                              testObj.tearDown();
                            }
                            onDone();
                          });
    } else {
      // Synchronous test finished: Tear down and callback - we're done
      if (testObj.tearDown) {
        testObj.tearDown();
      }
      onDone();
    }
  },

  runAsyncChecks: function(onDone) {
    // For predictability, try to run async checks one at a time and in
    // the order they were registered.
    // Also do the right thing if an exception is thrown in any of the
    // async checks.
    this.numAsyncChecks = this.asyncChecks.length;
    this.onAllAsyncChecksFinished = onDone;
    this.proceed();
  },

  addAsyncCheck: function(callback, timeout) {
    // What arguments do you provide when adding an async check??
    // Async check has two parts, right?  On the test side it looks like
    // doXHR(function() { assert(1 = 1);});

    if (timeout == undefined) {
      timeout = 20000; // default 20 seconds
    }
    this.asyncChecks.push({fn: callback, time: timeout});
  },

  proceed: function() {
    let firstCheck = this.asyncChecks[0];
    this.asyncChecks = this.asyncChecks.slice(1);
    // TODO start a timer that lasts for timeout; if called it needs
    // to cancel the callback and call asyncTestFinished(false);.
    // Ideally the timeout would also cancel the fn() (so it doesn't
    // return later and confuse us)  but I'm not sure how to do that.
    let time = firstCheck.time;

    try {
      let fn = firstCheck.fn;
      fn();
    } catch(e) {
      this.asyncCheckFinished(false);
    }
  },

  // Your callback test must call this once it's passed everything.
  asyncCheckFinished: function(success) {
    this.numAsyncChecks --;
    // TODO do something with success or failure?
    if (this.numAsyncChecks == 0) {
      this.onAllAsyncChecksFinished();
    } else {
      this.proceed();
    }
  },

  onAllTestsFinished: function() {
    $("#stats").html("TESTING COMPLETE.  " + this.testsPassed + " out of "
      + this.testsRun + " checks passed.");
  }

};
