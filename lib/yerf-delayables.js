/*!
 * Yerf-Delayables v0.1.1
 * https://github.com/johnsetzer/yerf
 *
 * Copyright 2013 John Setzer
 *
 * License: Apache Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0.html
*/

/*
 * This file contains the parts of Yerf that aren't strictly necessary
 * to collect Samples and can be loaded right before they are needed.
 */

// Create a functional scope
(function () {
  var publicYerf = yerf();
  var _rendererLoaded = false;
  var Sample = publicYerf.Sample;

  /* 
   * Load the waterfall rendering code on the page if it hasn't
   * been loaded already.  Then render the waterfall diagram.
   */
  publicYerf.render = function () {
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
  Sample.prototype.unixBackfill = function(parentKey, key, unixStartedAt, unixStoppedAt) {
    if (typeof unixStartedAt !== 'number') { throw new Error('You must specify a startedAt for this Sample[' + key + '].'); }
    if (typeof unixStoppedAt !== 'number') { throw new Error('You must specify a stoppedAt for this Sample[' + key + '].'); }

    return this.backfill(parentKey, key, publicYerf.unixToYerf(unixStartedAt), publicYerf.unixToYerf(unixStoppedAt));
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
})();