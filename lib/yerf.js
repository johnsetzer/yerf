/**
 * Measures the time it takes the UI to complete tasks and reports the times taken to an API endpoint.
 */

yerf = (function (){

  // ****** Minimal Underscore Implementation ******
  var ArrayProto = Array.prototype;
  var nativeForEach = ArrayProto.forEach;
  var nativeEvery = ArrayProto.every;
  var breaker = {};

  var each = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  var all = function(obj, iterator, context) {
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return result;
  };
  // ****** End Minimal Underscore Implementation ******

  /************************************************************
   * Closure to hold all yerf private variables
   ************************************************************/
  var yerfScope = (function (){
    var _allSamples = {};
    var _rendererLoaded = false;
    var _eventsByKey = {};
    
    var _timer, _startingIntervalSeries,  _recurringInterval, _setTimeout;

    /************************************************************
     * Samples record how long an event being measured took.
     ************************************************************/
    var Sample = function (key) {
      if (!key) { throw new Error('You must specify a key for this Sample.'); }
      if (_allSamples[key]) {
        this.onError(new Error('Sample[' + key + '] already exists.')); 
        return _allSamples[key];
      }
      this.key = key;               // The sample's key
      this.delta = undefined;       // The time it took the sample to run
      this.offset = undefined;      // If the sample is measuring offsets, the time between its parent's start time and it's start time
      this.startedAt = undefined;   // When the sample started
      this.stoppedAt = undefined;   // When the sample stopped
      this.parent = undefined;      // The sample's parent sample
      this.children = undefined;    // Samples that are part of this sample
      this.waitingFor = undefined;  // Keeps track of which dependencies have been met
      this.state = 'created';       // created -> started -> stopped -> reportable -> reported
      _allSamples[key] = this;
    };

    Sample.prototype.fullChildKey = function(childKey) {
      if (!childKey) { throw new Error('You must specify a childKey.'); }
      return this.key + '.' + childKey;
    }

    Sample.prototype.on = function (event, subscriber) {
      if (!event) { throw new Error('You must specify an event for Sample.on().'); }
      yerf().on(this.key, event, subscriber);
      return this;
    }

    Sample.prototype.trigger = function (event) {
      if (!event) { throw new Error('You must specify an event for Sample.trigger().'); }
      yerf().trigger(this.key, event, this);
      return this;
    }

    Sample.prototype.isWaterfalling = function () {
      return typeof this.offset === 'number';
    }

    Sample.prototype.start = function () {
      if (arguments.length === 0) {
        if (this.state === 'created') {
          this.startedAt = new Date();
          this.state = 'started';

          if (this.parent) {
            this.offset = this.startedAt - this.parent.startedAt;
          }

          this.trigger('start');
        } else {
          this.onError(new Error('Sample[' + this.key + '] has already started.'));
          return this;
        }

       } else {
        each(arguments, function (key) {
          if (!this.waitingFor || !this.waitingFor[key]) {
            this.onError(new Error('Cannot start a child[' + key + '] you are not waiting for.'));
            return this;
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

    Sample.prototype.stop = function () { 
      if (arguments.length === 0) {
        if (this.waintingFor) {
          this.onError(new Error('Cannot stop a sample[' + this.key + '] that is waiting on another sample.'));
          return this;
        }

        if (this.state === 'created') {
          this.onError(new Error('Sample[' + this.key + '] has not been started.'));
          return this;
        } else if (this.state === 'started') {

          // You can't manually stop a waterfalling sample
          if (this.waitingFor) { 
            this.onError(new Error('Sample[' + this.key + '] is a waterfall and cannot be manually stopped.'));
            return this;
          }

          this._doStop();
          
        } else {
          this.onError(new Error('Sample[' + this.key + '] has already stopped.'));
          return this;
        }
      } else {
        each(arguments, function (key) {

          var child = this.children[key];
          if (!child) {
            this.onError(new Error('Cannot stop a child[' + key + '] that is not attached.'));
            return this;
          }
          child.stop();
        }, this);
      }

      return this;
    };

    Sample.prototype._doStop = function (sample) {
      this.stoppedAt = new Date();
      this.delta = this.stoppedAt - this.startedAt;
      this.state = 'stopped'
      
      // Only move to completed list if this is a root node
      if (!this.parent) {
        this._makeReportable(this);
      }

      this.trigger('stop');
    }

    Sample.prototype._makeReportable = function (sample) {
      sample.state = 'reportable';
      each(sample.children, function (child) {
        Sample.prototype._makeReportable(child); 
      });
    }

    Sample.prototype.waterfall = function(){
      var that = this;
      if (this.state === 'created') {
        this.start();
      } else if(this.state !== 'started') {
        this.onError(new Error('Sample[' + this.key + '] has already stopped.'));
        return this;
      }

      this.offset = this.offset || 0;
      
      if (arguments.length > 0) {
        this.waitingFor = this.waitingFor || {};
        var key, waitingFor;
        this.children = this.children || {};

        // Loop through all previously unseen waterfall keys:
        // * mark them to be waited for,
        // * register a callback to link the child event to this event
        // * register a callback to check waterfall completion on each key
        each(arguments, function (key) {

          waitingFor = this.waitingFor[key];

          if (typeof waitingFor !== 'boolean') {
            this.waitingFor[key] = true;

            var fullChildKey = this.fullChildKey(key);
            var child = yerf(fullChildKey);
            if (child && child.state != 'created') {
              this.onError(new Error('Child[' + fullChildKey + '] is already started.'));
              return this;
            }
            
            yerf().on(fullChildKey, 'start', function (sample) {
              sample.parent = that;
              sample.offset =  sample.startedAt - that.startedAt;
              that.children[key] = sample;
              
            });

            yerf().on(this.fullChildKey(key), 'stop', function (sample) {
              that._checkStop(key);
            });
          }
        }, this);
      }

      return this;
    };

    Sample.prototype._checkStop = function(key){
      if (!key) { throw new Error('You must pass a key to _checkStop'); }
      if (!this.waitingFor) { return this; }

      this.waitingFor[key] = false;
      var dependenciesMet = all(this.waitingFor, function(value, key){ return value === false; });
      if (dependenciesMet){
        this._doStop();
      }

      return this;
    };

    Sample.prototype.onError = function(error) {
      console.log(error.message);
    };

    /************************************************************
     * Private functions
     ************************************************************/

    var _setTimer = function() {
      var interval = _startingIntervalSeries.shift() || _recurringInterval;

      if (interval) {
        _timer = setTimeout(function(){
          publicYerf.post();
          _setTimer();
        }, interval);
      }
    }

    /************************************************************
     * The Public object returned to the user for use.
     ************************************************************/
    var publicYerf = {
      config: {}

    , getConfig: function (key) {
      if (this.config[key]) {
        return this.config[key];
      } else {
        throw new Error('You need to set yerf().config.' + key);
      }
    }

    , Sample: Sample 

    , find: function(fullKey) { return _allSamples[fullKey]; }

    , all: function () { return _allSamples; }

    , new: function(fullKey) { return new (this.Sample)(fullKey); } 

    , start: function(fullKey) { return this.new(fullKey).start(); }

    // TODO is it better if invalid parameters fail silently instead of throwing exceptions?
    , on: function (fullKey, event, subscriber) {
      if (!fullKey) { throw new Error('You must specify a fullKey for yerf().on().'); }
      if (!event) { throw new Error('You must specify an event for yerf().on().'); }
      if (!subscriber) { throw new Error('You must specify a subscriber for yerf().on().'); }
      if (!(typeof subscriber === 'function')) { throw new Error('Subscriber must be a function.'); }

      var sampleEvents = _eventsByKey[fullKey];
      
      if (!sampleEvents) {
        sampleEvents = {};
        _eventsByKey[fullKey] = sampleEvents;
      }

      var subscribers = sampleEvents[event];
      if(!subscribers) {
        subscribers = [];
        sampleEvents[event] = subscribers;
      }

      subscribers.push(subscriber);
    }

    , trigger: function (fullKey, event, obj) {
      if (!fullKey) { throw new Error('You must specify a fullKey for yerf().trigger().'); }
      if (!event) { throw new Error('You must specify an event for yerf().trigger().'); }

      var sampleEvents = _eventsByKey[fullKey];
      
      if (sampleEvents) {
        var subscribers = sampleEvents[event];
        
        if (subscribers) {
          each(subscribers, function(subscriber){
            subscriber(obj);
          });
        }
      }
    }

    , clear: function() {
        _allSamples = {};
        _eventsByKey = {};
      }

    , postData: function(includeReported) {
        var completedSamples = [];
        each(_allSamples, function(s) {
          if(s.state === 'reportable' || (includeReported && s.state === 'reported')) {
            var shortSample = {key: s.key, val: s.delta };
            completedSamples.push(shortSample);
            if (s.isWaterfalling()){
              var offsetSample = {key: 'offset.' + s.key, val: s.offset };
              completedSamples.push(offsetSample);
            }
          }
        });
        return completedSamples;
      }

    , post: function(){
      var that = this;
        var $ = this.getConfig('$');
        var url = this.getConfig('postUrl');
        if ($ && url) {
          var data = this.postData();
        
          if (data.length > 0) {
            $.ajax({
              url: url
            , type: "POST"
            , data: data
            , dataType: "application/json"
            , success: function () { that._postSuccess(data); }
            , error: function(jqXHR, textStatus, errorThrown){
                console.log('Error posting stats: '+textStatus+' '+errorThrown);
              }
            });
          }
        }
      }

    // Exposed so we can mock in tests
    , _postSuccess: function(data) {

        // Mark each Sample reported
        each(data, function (d) {
          var sample = yerf(d.key);
          if (sample) { sample.state = 'reported'; }
        });
      }

    , enablePost: function(startingIntervalSeries, recurringInterval){
        _startingIntervalSeries = startingIntervalSeries || [];
        _recurringInterval = recurringInterval || null;

        _setTimer();
      }

    , disablePost: function(){
        _startingIntervalSeries = null;
        _recurringInterval = null;
        clearTimeout(_timer);
      }

    , render: function(){
        if (!_rendererLoaded) {
          _rendererLoaded = true;
          var $ = this.getConfig('$');
          var viewerCssPath = this.getConfig('viewerCssPath');
          var viewerJsPath = this.getConfig('viewerJsPath');
          $('body').append('<link href="' + viewerCssPath + '" rel="stylesheet">');
          $('body').append('<script type="text/javascript" src="' + viewerJsPath + '"></script>');
        }
      }
    }; // End publicYerf

    /************************************************************
     * Finds the sample specified by the fullKey.
     * If not fullKey is passed in, returns the publicYerf object.
     ************************************************************/
    var find = function (fullKey) {
      if (fullKey) {
        return publicYerf.find(fullKey);
      } else {
        return publicYerf;
      }
    }

    return find;
  })(); // End yerfScope

  return yerfScope;

})(); // End yerf