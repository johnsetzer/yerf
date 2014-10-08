#About
yerf is a Javascript client side library designed to measure the runtime of programmer defined events and report them back to the server.  It features a jQuery-like syntax as well as a waterfall view for analyzing data.

#Design Rational
- Light implementation that does not have any dependencies and can start recording samples before any other JS on the page loads.
- jQuery like syntax for ease of use
- Namespaced events
- Every sample is a key/value pair that can easily be injected into any tool.
- Total missuses of the yerf, such as forgetting a required parameter, will throw an exception; but subtle runtime errors, like stopping a sample twice, will call the `onError()` callback, which defaults to logging to the browser console.
- If yerf loads in an old browser that does not support all of yerfs's `performance.*` dependencies, calls to yerf will result in noops that will not cause errors but will also not result in any data collection.
- Allows backfilling of previous events so yerf loading doesn't have to block CSS and other assets in your document head.

#Version History
The last commit for version 0.2.0 was eaae0a1a9e0d97a06391ebad89b9d17a4a39d40f
All versions after this dropped the complicated support for old browsers. Old browsers now result in `noops`

#Samples
Samples consist of a key, a delta, a start time, an end time, and a state.  Most sample methods return themselves so they can be chained together.
    
    var sample = yerf().create('key');
    sample.start();
    sample.stop();

or use chaining
    
    var sample = yerf().create('key').start().stop();

Accessing attributes

    sample.key       // "key"
    sample.delta     // 0.007999995432328433
    sample.startedAt // 7107.685000002675
    sample.stoppedAt // 7107.692999998108
    sample.state     // "stopped"

The keys of samples are namespaced with periods.
"parent.child" is assumed to be a component of "parent".

Start events relative to the current sample.

    var sample = yerf().create('parent');
    sample.start('child1', 'child2');

Stop event's relative to the current sample.

    sample.stop('child1', 'child2');

Find child samples relative to the current sample.

    yerf('parent').find('child1');

Automatically, stop parent when all of its dependencies(child1 and child2) are stopped. Also record offset times of child1 and child2 relative to the start of parent.  Notice that when child starting is chained from the parent the paths are relative to the parent, but when the child is selected from the page as a whole, the paths are absolute:

    yerf().start('parent').waterfall('child1', 'child2').start('child1');
    yerf('parent.child1').stop();
    yerf('parent').start('child2');
    yerf('parent.child2').stop();   // parent is automatically stopped

`waterfall()` just means "Automatically stop this sample when its children are done."  `start()` will automatically call `waterfall()`.  Assuming you wanted to start the children at the same time the parent starts, you could rewrite the above example as:

    yerf().create('parent').start('child1', 'child2');
    yerf('parent.child1').stop();
    yerf('parent.child2').stop();   // parent is automatically stopped

yerf automatically links parents and children into a tree.

    yerf().start('parent').start('child');
    yerf('parent').children.child  // Same as yerf('parent.child')
    yerf('parent.child').parent    // Same as yerf('parent')

Samples are event emitters. `start` and `stop` are fired automatically.

    var sample = yerf().create('key');
    sample.on('start', function (sample) { console.log('STARTED at ' + sample.startedAt); });
    sample.on('stop', function (sample) { console.log('STOPPED at ' + sample.stoppedAt); });
    sample.on('arbitrary_event', function (sample) { console.log('State at ARBITRARY_EVENT: ' + sample.state); });
    sample.trigger('arbitrary_event').start().stop();

#Yerf Selector
Create a sample.

    yerf().create('key');

Create and start a sample.

    yerf().start('key');

Query any existing sample.

    yerf('key');

Query any existing sample and stop it.

    yerf('key').stop();

Get all samples.

    yerf().all();

Clear all the data yerf has collected.

    yerf().clear();

Subscribe to and trigger events globally.

    yerf().on('parent.child', 'MY_EVENT', function (eventObj) { console.log('parent.child ' + eventObj.status); });
    yerf().trigger('parent.child', 'MY_EVENT', { status: 'All Clear' });

##Timing
Return milliseoncds since the page first loaded according to yerf, in other words `performance.now()`.

    yerf().getTime();

Convert unix time into yerf time.

    yerf().unixToYerf(new Date());
    
Get milliseconds between `navigationStart` and yerf start.

    yerf().yerfEpoch
    
Get milliseconds between unix epoch(1970) and yerf start.

    yerf().unixEpoch

##Backfilling
You can backfill events that happen before yerf loads or edit values before they are reported with `beforeReport()`, which is called right between the time when an event's state is changed to `stopped` and when the event is reported with `yerf.report(sample)`.  This is useful for measuring page asset download times without blocking them by loading yerf.  Note that `backfill(parentKey, key, startedAt, stoppedAt)` can only be called inside of `beforeReport()`.  `backfillRequest(parentKey, optionalKey, urlRegex)` will go through `performance.getEntries()` and do a backfill with any entries that match the regex you supplied.  The event key is optional.  If you omit the eventKey `backfillRequest()` will use the Regex's inner most matching group as your key.  There is also a `unixBackfill()` method that is the exact same as `backfill()` except that it takes unix times instead of times relative to page load.

    var parent = yerf().start('parent').start('child');
    var yerfStart = yerf().unixToYerf(yerf().unixEpoch);
    parent.beforeReport = function () {
      parent.backfill(undefined, 'yerfStartToEnd', yerfStart, parent.stoppedAt);

      var navStart = window.performance.timing.navigationStart;

      parent.backfill(undefined, 'navigationStartToYerfStart'
        , yerf().unixToYerf(navStart), yerfStart);

      parent.backfill(undefined, 'pageRequestEndToYerfStart'
        , yerf().unixToYerf(window.performance.timing.responseEnd), yerfStart);

      parent.unixBackfill(undefined, 'pageRequest'
        , window.performance.timing.requestStart
        , window.performance.timing.responseEnd);

      parent.backfillRequest('js', undefined, /.*\/javascripts\/([\w\/]*).js/);
      parent.backfillRequest('css', undefined, /.*\/stylesheets\/([\w\/]*).css/);

      // Provide a key instead of relying on regex match for key
      parent.backfillRequest('js', 'jquery', /js\/(jquery.*).js/);

    };
    yerf('parent.child').stop();

# Installing yerf in your app

1. yerf outsources posting data to a remote server to the [kivi](https://github.com/johnsetzer/kivi) library.  You need to include both the `kivi.min.js` followed the `yerf.min.js` source in your HTML page or, better yet, put them in a linked Javascript file.  kivi and yerf should be before any Javascript actions you want to measure OR you need to record some timestamps and use the `backfill()` method. `yerf.min.js` contains all of the core functionality required to start Samples, stop Samples, and report them to kivi. `yerf-delayables.min.js` is an optional file that contains things that don't need to be loaded before other Javascript.  Currently it contains all of the `backfillX()` methods and `render()`.
1. Start and stop at least one sample.

        yerf().start('sample').stop();
1. Configure these `kivi` properties.  This step and every step after it can be deferred until your entire page is loaded.

        kivi.config.postUrl = 'http://localhost:3000/postUrl';
        kivi.config.$ = jQuery;
1. Automatically, post data to a server after 1000ms, 2000ms after that, and 4000ms after that.

        kivi.enablePost([1000, 2000, 4000]);
1. To get the waterfall viewer to work you need to host the `waterfall_viewer.css` and `waterfall_viewer.js` files somewhere and tell yerf where to find them.

        yerf().config.waterfallViewer = {
          cssPath: 'http://cdn.yoursite.com/stylesheets/waterfall_viewer.css'
        , jsPath: 'http://cdn.yoursite.com/javascripts/waterfall_viewer.js'
        };

##Rendering Waterfall Diagrams In The Browser
Render a waterfall view of all completed samples in the browser.  `yerf-delayables.js` does not include the `render()` logic.  When `render()` is called, yerf will download and execute the needed code on demand.

    yerf().render()

#Debugging

List all samples and their current state

    yerf().all().forEach(function(d) { console.log(d.key, d.delta, d.state); });

Frequently, you will find that your data is not getting reported because a dependency is not yet satisfied.  Checking the waiting for property is very useful.

    yerf().start('parent').start('child1', 'child2');
    yerf('parent.child1').stop();
    yerf('parent').waitingFor.child1 // false
    yerf('parent').waitingFor.child2 // true

Samples will throw  an `Error` if you forget a required parameter. If you cause a runtime error, such as trying to start or stop a sample twice or stopping a sample that hasn't started, yerf will call `onError()`.  By default, yerf logs the error to console, but you could copy and modify this statement to override the default behavior.  

    yerf().onError = function(error) {
      kivi.log(error.message);
    };

Some of your measurements might be inside code that gets executed more than once or in different places under different circumstances.  yerf will simply ignore the second start or stop of a sample with a given key.  If you want to measure the same code running in different places because you think it will take a different amount of time, you will need to figure out how to pass a different key to `start()` and `stop()` depending on the circumstances.

Yerf won't send data about a sample or any of that samples children to `kivi` until the entire sample completes. Each yerf sample results in a `delta` and an `offset` being sent to `kivi`

    yerf().start('key').stop();
    kivi._store['yerf.delta.key']; // 0
    kivi._store['yerf.offset.key']; // 10

# Configuring the Waterfall View
You can change the output of yerf().render() by specifying some `rules`.  Yerf applies the first rule that matches a sample's key and will ignore the rest of the list of rules.

- pattern => the regex to compare to the samples key
- color => (optional) an RGB series of colors to render the key's background color
- colorStep => (optional) The value added each RGB value as you the renderer goes a level deeper in the inheritance tree.
- collapsed => (optional) Samples with children default expanded.  Render collapsed instead.


        yerf().config.waterfallViewer = {
            cssPath: 'http://cdn.yoursite.com/stylesheets/waterfall_viewer.css'
          , jsPath: 'http://cdn.yoursite.com/javascripts/waterfall_viewer.js'
          , rules: [
            {
              pattern: /api/
            , color: '35,90,220'
            , colorStep: 20
            , collapsed: true
            }
          ]
        };


#Browser Compatibility
yerf works on any browser that supports `performance.now()`, `performance.timing.*`, `performance.getEntries()`, and `Array.prototype.forEach()`. This is effectively IE >= 10 and semi-recent Chrome and Firefox.

Check if your current browser has all the capabilities need to run yerf without a noop.

    yerf().enabled

#Development Setup

    git clone git@github.com:johnsetzer/yerf.git
    cd yerf
    npm install
    npm install jake -g

#Run example

    jake server
    Open http://localhost:3000/perfed_site/perfed_site.html
    Open your browser console and run 'yerf().render();'

#Run tests

    jake server
    http://localhost:3002/tests/test_suite.html

#Run tests with testem

    npm install testem -g
    testem

#License
Yerf is licensed under the Apache Version 2.0 License.

http://www.apache.org/licenses/LICENSE-2.0.html
