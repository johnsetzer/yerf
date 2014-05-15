/*!
 * Yerf v0.2.0
 * https://github.com/johnsetzer/yerf
 *
 * Copyright 2013 John Setzer
 *
 * License: Apache Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0.html
*/

/*
 * This file contains the parts of Yerf that should be loaded
 * as soon as the page loads before any other JS.
 *
 * File layout:
 * 1. Do some initialization.
 * 2. Define publicYerf object to return.
 * 3. Copy initialized values and methods onto publicYerf.
 * 4. Define a Sample oject on publicYerf.
 * 5. Return find() method which finds Sample objects when it
 *    has arguments or returns publicYerf when it does not have arguments.
 */
yerf = (function () {
  var _hasNow = false
  , _hasTiming = false
  , _hasEntries = false;
  
  // Safari Safari/536.29.13 throws "ReferenceError: Can't find variable: performance"
  // if you call "performance" instead of "window.performance"
  if (window.performance) {
    if (typeof performance.now === 'function') {
      _hasNow = true;
    }
    if (performance.timing) {
      _hasTiming = true;
    }
    if (typeof performance.getEntries === 'function') {
      _hasEntries = true;
    }
  }

  // Record when yerf starts before doing anything else.
  var _yerfEpoch = 0; // Millis between navigationStart and yerfStart
  if (_hasNow) {
    _yerfEpoch = performance.now();
  }
  // Millis between 1970 and yerfStart
  var _unixEpoch = new Date().getTime();
  
  var _allSamples = {};
  var _eventsByKey = {};

  /************************************************************
   * The Public object returned to the user for use.
   ************************************************************/
  var publicYerf = {
    config: {}

  , find: function (fullKey) { return _allSamples[fullKey]; }

  , all: function () { return _allSamples; }

  , create: function (fullKey) { return new (this.Sample)(fullKey); }

  , start: function (fullKey) { return this.create(fullKey).start(); }

  , on: function (fullKey, event, subscriber) {
      if (typeof fullKey !== 'string') { throw new Error('You must specify a fullKey for yerf().on().'); }
      if (typeof event !== 'string') { throw new Error('You must specify an event for yerf().on().'); }
      if (typeof subscriber !== 'function') { throw new Error('You must specify a subscriber function for yerf().on().'); }

      var sampleEvents = _eventsByKey[fullKey];
      
      if (!sampleEvents) {
        sampleEvents = {};
        _eventsByKey[fullKey] = sampleEvents;
      }

      var subscribers = sampleEvents[event];
      if (!subscribers) {
        subscribers = [];
        sampleEvents[event] = subscribers;
      }

      subscribers.push(subscriber);
    }

  , trigger: function (fullKey, event, obj) {
      if (typeof fullKey !== 'string') { throw new Error('You must specify a fullKey for yerf().trigger().'); }
      if (typeof event !== 'string') { throw new Error('You must specify an event for yerf().trigger().'); }

      var sampleEvents = _eventsByKey[fullKey];
      
      if (sampleEvents) {
        var subscribers = sampleEvents[event];
        
        kivi._.each(subscribers, function(subscriber){
          subscriber(obj);
        });
      }
    }

  , hasNow: _hasNow

  , hasTiming: _hasTiming

  , hasEntries: _hasEntries

  , unixEpoch: _unixEpoch

  , yerfEpoch: _yerfEpoch

  /*
   * Return Yerf Time in milliseconds.
   * This is either the number of milliseconds since navigationStart 
   * on new browsers OR the number of milliseconds since yerf
   * started on old browsers.
   */
  , getTime: function () {
      if (this.hasNow) {
        return performance.now();
      } else {
        return new Date().getTime() - this.unixEpoch;
      }
    }

  /*
   * Converts unixTime(millis since 1970) into Yerf Time.
   */
  , unixToYerf: function (unixTime) {
      var time = 0;
      if (this.hasNow) {
        time = unixTime - this.unixEpoch + this.yerfEpoch;
      } else {
        time = unixTime - this.unixEpoch;
      }

      // millisecond 0 is at navigationStart or unixEpoch
      // Things cannot happen before then.
      if (time < 0) {
        time = 0;
      }
      return time;
    }

  /*
   * Converts unixTime(millis since 1970) into Yerf Time.
   */
  , getEntries: function () {
      var entries = [];
      if (this.hasEntries) {
        entries = performance.getEntries();
      }

      return entries;
    }

  /*
   * Reset yerf as if no samples have ever been collected.
   * Note this does not clear any sample that might have been
   * reported to kivi.
   */
  , clear: function () {
      _allSamples = {};
      _eventsByKey = {};
    }

  , onError: function (error) {
      kivi.log(error.message);
    }

  }; // End publicYerf

  /************************************************************
   * Samples record how long an event being measured took.
   ************************************************************/
  var Sample = function (key) {
    if (typeof key !== 'string') { throw new Error('You must specify a key for this Sample.'); }
    if (_allSamples[key]) {
      publicYerf.onError(new Error('Sample[' + key + '] already exists.'));
      return _allSamples[key];
    }
    this.key = key;               // The sample's key
    this.delta = undefined;       // The time it took the sample to run
    this.offset = undefined;      // The time between its parent's start time and it's start time
                                  // If its a root node, the time from boot
    this.startedAt = undefined;   // When the sample started
    this.stoppedAt = undefined;   // When the sample stopped
    this.parent = undefined;      // The sample's parent sample.  Undefined means root node.
    this.children = undefined;    // Samples that are part of this sample. Undefined means not children.
    this.waitingFor = undefined;  // Keeps track of which dependencies have been met. Undefined means not dependencies.
    this.state = 'created';       // created -> started -> stopped
    _allSamples[key] = this;
  };

  Sample.prototype.fullChildKey = function (childKey) {
    if (!childKey) { throw new Error('You must specify a childKey.'); }
    return this.key + '.' + childKey;
  };

  Sample.prototype.find = function (childKey) {
    return publicYerf.find(this.fullChildKey(childKey));
  };

  Sample.prototype.on = function (event, subscriber) {
    if (!event) { throw new Error('You must specify an event for Sample.on().'); }
    publicYerf.on(this.key, event, subscriber);
    return this;
  };

  Sample.prototype.trigger = function (event) {
    if (!event) { throw new Error('You must specify an event for Sample.trigger().'); }
    publicYerf.trigger(this.key, event, this);
    return this;
  };

  /*
   * No Arugments = start the current Sample
   * Arguments = create(if necessary) and start child Samples with the given relative keys
   */
  Sample.prototype.start = function () {
    if (arguments.length === 0) {
      if (this.state === 'created') {
        this.startedAt = publicYerf.getTime();
        this.state = 'started';

        // Root Samples have an offset relative to pageStart
        // Child Samples will overwrite this.offset later
        this.offset = this.startedAt;

        this.trigger('start');
      } else {
        publicYerf.onError(new Error('Sample[' + this.key + '] has already started.'));
        return this;
      }

    } else {
      kivi._.each(arguments, function (key) {
        if (!this.waitingFor || !this.waitingFor[key]) {
          this.waterfall(key);
        }

        var child = this.children[key];
        if (!child) {
          child = new Sample(this.fullChildKey(key));
        }
        child.start();
      }, this);
    }

    return this;
  };

  /*
   * No Arugments = stop the current Sample
   * Arguments = stop child Samples with the given relative keys
   */
  Sample.prototype.stop = function () { 
    if (arguments.length === 0) {
      if (this.state === 'created') {
        publicYerf.onError(new Error('Sample[' + this.key + '] has not been started.'));
      } else if (this.state === 'started') {

        // You can't manually stop a waterfalling sample
        if (this.waitingFor) {
          publicYerf.onError(new Error('Sample[' + this.key + '] is a waterfall and cannot be manually stopped.'));
          return this;
        }

        this._doStop();
        
      } else {
        publicYerf.onError(new Error('Sample[' + this.key + '] has already stopped.'));
      }
    } else {
      kivi._.each(arguments, function (key) {

        var child = this.children[key];
        if (!child) {
          publicYerf.onError(new Error('Cannot stop a child[' + key + '] that is not attached.'));
          return this;
        }
        child.stop();
      }, this);
    }

    return this;
  };

  Sample.prototype._doStop = function (stoppedAt) {
    this.stoppedAt = stoppedAt || publicYerf.getTime();
    this.delta = this.stoppedAt - this.startedAt;
    this.state = 'stopped';

    if (typeof this.beforeReport === 'function') {
      this.beforeReport();
    }
    
    // Only report to kivi if this is a root node
    if (!this.parent) {
      this._reportToKivi();
    }

    this.trigger('stop');
  };

  Sample.prototype._reportToKivi = function () {
    kivi.set('yerf.delta.' + this.key, Math.round(this.delta));
    kivi.set('yerf.offset.' + this.key, Math.round(this.offset));

    kivi._.each(this.children, function (child) {
      child._reportToKivi();
    });
  };

  /*
   * Start the current Sample.
   * Automatically stop the current sample when all of the
   * dependencies are stopped.
   */
  Sample.prototype.waterfall = function (/* relative sample keys */) {
    var that = this;
    if (this.state === 'created') {
      this.start();
    } else if (this.state !== 'started') {
      publicYerf.onError(new Error('Sample[' + this.key + '] has already stopped.'));
      return this;
    }
    
    if (arguments.length > 0) {
      this.waitingFor = this.waitingFor || {};
      this.children = this.children || {};

      // Loop through all previously unseen waterfall keys:
      // * mark them to be waited for,
      // * register a callback to link the child event to this event
      // * register a callback to check waterfall completion on each key
      kivi._.each(arguments, function (key) {

        if (typeof this.waitingFor[key] !== 'boolean') {
          this.waitingFor[key] = true;

          var fullChildKey = this.fullChildKey(key);
          var child = yerf(fullChildKey);
          if (child && child.state !== 'created') {
            publicYerf.onError(new Error('Child[' + fullChildKey + '] has already started.'));
            return this;
          }
          
          publicYerf.on(fullChildKey, 'start', function (sample) {
            sample.parent = that;
            sample.offset =  sample.startedAt - that.startedAt;
            that.children[key] = sample;
          });

          publicYerf.on(this.fullChildKey(key), 'stop', function (sample) {
            that._checkStop(key, sample.stoppedAt);
          });
        }
      }, this);
    }

    return this;
  };

  /*
   * Are all of the dependencie of the currently "wateralling"
   * Sample met.  If so, stop it.
   */
  Sample.prototype._checkStop = function (key, stoppedAt) {
    if (!this.waitingFor) { return this; }

    this.waitingFor[key] = false;
    
    var dependenciesMet = true;
    kivi._.each(this.waitingFor, function (isWaiting) {
      if (isWaiting === true) {
        dependenciesMet = false;
      }
    });
    
    if (dependenciesMet){
      this._doStop(stoppedAt);
    }
  };

  // Attach Sample to publicYerf.
  publicYerf.Sample = Sample;

  /************************************************************
   * Finds the sample specified by the fullKey.
   * If fullKey is NOT passed in, returns the publicYerf object.
   ************************************************************/
  var find = function (fullKey) {
    if (fullKey) {
      return publicYerf.find(fullKey);
    } else {
      return publicYerf;
    }
  };

  return find;

})(); // End yerf