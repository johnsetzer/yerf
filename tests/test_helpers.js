// Mocks yerf().getTime()
var getTimeSpy;
var mockGetTime = function (/* nextTimes */) {
  var nextTimes = Array.prototype.slice.call(arguments);
  getTimeSpy = spyOn(yerf(), 'getTime').andCallFake(function () {
    if (nextTimes.length > 0) {
      var time = nextTimes.shift();
      return time;
    } else {
      return -1111; // Error Code
    }
  });
};

// Mocks window.performance.now()
var nowSpy;
var mockNow = function (/* nextTimes */) {
  
  // Make a fake performance object if testing on an old browser
  if(!window.performance) {
    window.performance = {
      timing: {}
    , now: function () {}
    , webkitGetEntries: function () {}
    };
  }

  var nextTimes = Array.prototype.slice.call(arguments);
  nowSpy = spyOn(window.performance, 'now').andCallFake(function () {
    if (nextTimes.length > 0) {
      var time = nextTimes.shift();
      return time;
    } else {
      return -1111; // Error Code
    }
  });
};

// Mocks yerf().getTime()
var dateSpy;
var mockDate = function (/* nextTimes */) {
  var nextTimes = Array.prototype.slice.call(arguments);
  dateSpy = spyOn(window, 'Date').andCallFake(function () {
    if (nextTimes.length > 0) {
      var time = nextTimes.shift();
      return { getTime: function () { return time; }};
    } else {
      return { getTime: function () { return -1111; }}; // Error Code
    }
  });
};

var expectSample = function (sample, key, startedAt, stoppedAt, delta) {
  expect(sample.key).toBe(key);
  expect(sample.startedAt).toBe(startedAt);
  expect(sample.stoppedAt).toBe(stoppedAt);
  expect(sample.delta).toBe(delta);
};

var expectOnError = function (expectedErrorMsg) {
  var onErrorSpy = spyOn(yerf(), 'onError').andCallFake(function (error) {
    expect(error.message).toBe(expectedErrorMsg);
  });
  return onErrorSpy;
};

jasmine.Spy.prototype.restore = function() {
  this.baseObj[this.methodName] = this.originalValue;
};