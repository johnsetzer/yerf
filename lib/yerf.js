/*!
 * Yerf v0.1.1
 * https://github.com/johnsetzer/yerf
 *
 * Copyright 2013 John Setzer
 *
 * License: Apache Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0.html
*/

/*
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
  var _modernBoot;
  if (_hasNow) {
    _modernBoot = performance.now();
  }
  var _oldBoot = new Date().getTime();
  
  var _allSamples = {};
  var _rendererLoaded = false;
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

  , oldBoot: _oldBoot

  , modernBoot: _modernBoot

  , getTime: function () {
      if (this.hasNow) {
        return performance.now();
      } else {
        return new Date().getTime() - this.oldBoot;
      }
    }

  , normTime: function (unixTime) {
      var time = 0;
      if (this.hasNow) {
        time = unixTime - this.oldBoot + this.modernBoot;
      } else {
        time = unixTime - this.oldBoot;
      }

      // millisecond 0 is at navigationStart or oldBoot
      // Things cannot happen before then.
      if (time < 0) {
        time = 0;
      }
      return time;
    }

  , getEntries: function () {
      var entries = [];
      if (this.hasEntries) {
        entries = performance.getEntries();
      }

      return entries;
    }

  , clear: function () {
      _allSamples = {};
      _eventsByKey = {};
    }

  , render: function () {
      if (!_rendererLoaded) {
        _rendererLoaded = true;
        
        var $ = kivi.getConfig('$');
        var viewer = yerf().config.waterfallViewer;
        var cssPath;
        var jsPath;

        if (viewer && viewer.cssPath) {
          cssPath = viewer.cssPath;
        } else {
          throw new Error('You need to set yerf().config.waterfallViewer.cssPath');
        }

        if (viewer && viewer.jsPath) {
          jsPath = viewer.jsPath;
        } else {
          throw new Error('You need to set yerf().config.waterfallViewer.jsPath');
        }

        $('body').append('<link href="' + cssPath + '" rel="stylesheet">');
        $.getScript(jsPath, function () {
          yerf().render();
        });
      }
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

  /* 
   * Backfill a new Sample with the given 'key' onto the current Sample.
   * If the new 'startedAt' or 'stoppedAt' exceed the bounds of the current
   * sample, recursively expand the current sample and its ancestors.
   * 'parentKey' is an option sample key to put between the current sample
   * and the new sample with key 'key' in case you want to backfill many
   * things into a category on the current Sample.
   */
   Sample.prototype.backfill = function (parentKey, key, startedAt, stoppedAt) {
    if (typeof key !== 'string') { throw new Error('You must specify a key for this Sample.'); }
    if (typeof startedAt !== 'number') { throw new Error('You must specify a startedAt for this Sample[' + key + '].'); }
    if (typeof stoppedAt !== 'number') { throw new Error('You must specify a stoppedAt for this Sample[' + key + '].'); }
    if (this.state !== 'stopped') { publicYerf.onError(new Error('Sample[' + this.key + '] must be stopped to backfill with key[' + key + '].')); return this; }
    if (this.children && this.find(key)) { publicYerf.onError(new Error('Sample[' + this.fullChildKey(key) + '] already exists.')); return this; }

    var parent;

    this.children = this.children || {};
    
    if (parentKey) {
      if (this.find(parentKey)) {
        parent = this.find(parentKey);
      } else {
        parent = new Sample(this.fullChildKey(parentKey));
        parent.startedAt = startedAt;
        parent.stoppedAt = stoppedAt;
        parent.delta = stoppedAt - startedAt;
        parent.state = 'stopped';
        parent.offset = startedAt - this.startedAt;
        parent.children = {};
        parent.parent = this;
        this.children[parentKey] = parent;
      }
    } else {
      parent = this;
    }

    var backfill = new Sample(parent.fullChildKey(key));
    backfill.startedAt = startedAt;
    backfill.stoppedAt = stoppedAt;
    backfill.delta = stoppedAt - startedAt;
    backfill.state = 'stopped';
    backfill.offset = startedAt - parent.startedAt;
    if (backfill.offset < 0) {
      backfill.offset = 0;
    }

    backfill.parent = parent;
    parent.children[key] = backfill;

    parent.updateBounds(startedAt, stoppedAt);

    return this;
  };

  /*
   * backfill a new sample from window.performance.getEntries() for
   * each entry that matches the given regex, 'urlPattern'.
   * 'parentKey' and 'key' are the same as they are for 'backfill()'.
   * If 'key' is ommited, use the inner most match from the regex,
   * 'urlPattern', for the 'key'.
   */
  Sample.prototype.backfillRequest = function (parentKey, key, urlPattern) {
    if (!urlPattern) { throw new Error('You must specify a urlPattern for this Sample.'); }

    if (publicYerf.hasEntries) {
      kivi._.each(publicYerf.getEntries(), function (entry) {
        var entryKey = key;
        var matches = entry.name.match(urlPattern);
        if (matches) {
          if (typeof entryKey !== 'string') {
            entryKey = matches[matches.length - 1];
          }
          this.backfill(parentKey, entryKey, entry.startTime, entry.startTime + entry.duration);
        }
      }, this);
    }

    return this;
  };

  /*
   * Same as backfill except with unix times instead of yerf times
   */
  Sample.prototype.normalizedBackfill = function(parentKey, key, unixStartedAt, unixStoppedAt) {
    if (typeof unixStartedAt !== 'number') { throw new Error('You must specify a startedAt for this Sample[' + key + '].'); }
    if (typeof unixStoppedAt !== 'number') { throw new Error('You must specify a stoppedAt for this Sample[' + key + '].'); }

    return this.backfill(parentKey, key, publicYerf.normTime(unixStartedAt), publicYerf.normTime(unixStoppedAt));
  };

  /*
   * Recursively expand the bounds of the current Sample
   * and all of its ancestors.
   */
  Sample.prototype.updateBounds = function (startedAt, stoppedAt) {
    var parentStart = this.startedAt - this.offset;
    var checkParent = false;

    if (startedAt < this.startedAt) {
      this.startedAt = startedAt;
      this.delta = this.stoppedAt - this.startedAt;
      
      // Update this nodes offset
      this.offset = startedAt - parentStart;
      if (this.offset < 0 ) {
        this.offset = 0;
      }
      
      // Update this nodes children
      kivi._.each(this.children, function (c) {
        c.offset = c.startedAt - startedAt;
      });

      checkParent = true;
    }

    if (stoppedAt > this.stoppedAt) {
      this.stoppedAt = stoppedAt;
      this.delta = this.stoppedAt - this.startedAt;
      checkParent = true;
    }

    if (checkParent === true && this.parent) {
      this.parent.updateBounds(startedAt, stoppedAt);
    }

    return this;
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