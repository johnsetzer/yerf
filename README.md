#About
yerf is a Javascript client side library designed to measure the runtime of programmer defined events and report them back to the server.  It features a jQuery-like syntax as well as a waterfall view for analyzing data.

#Design Rational
- Light implementation that does not have any dependencies and can start recording samples before any other JS on the page loads.
- jQuery like syntax for ease of use
- Namespaced events
- Every sample is a key/value pair that can easily be injected into any tool.
- A Sample with a given key can only be recorded once to ease logistics and to keep one client from skewing results by reporting an event many times.
- Total missuses of the yerf, such as forgetting a required parameter, will throw an exception; but subtle runtime errors, like stopping a sample twice, will call the onError() callback, which defaults to logging to the browser console.
- Uses `performance.now()` if available. Otherwise, it gracefully falls back on `new Date()`.
- Allows backfilling of previous events so yerf loading doesn't have to block CSS and other assets in your document head.

#Samples
Samples consist of a key, a delta, a start time, an end time, and a state.  Most sample methods return themselves so they can be chained together.
    
    var sample = yerf().create('key');
    sample.start();
    sample.stop();

or use chaining
    
    var sample = yerf().create('key').start().stop();

Accessing attributes

    sample.key       // "key"
    sample.delta     // 6072
    sample.startedAt // Tue Feb 26 2013 01:54:39 GMT-0800 (PST)
    sample.stoppedAt // Tue Feb 26 2013 01:54:45 GMT-0800 (PST)
    sample.state     // "started"

The keys of samples are namespaced with periods.
"parent.child" is assumed to be a component of "parent".

Start events relative to a sample

    sample.start('child', 'child.childOfChild');

Stop events relative to a sample

    sample.stop('child', 'child.childOfChild');

Find events child events relative to their parent

    yerf('parent').find('child1').start();

Automatically, stop parent when all of its dependencies(child1 and child2) are stopped. Also record offset times of child1 and child2 relative to the start of parent.  Notice that when child starting is chained from the parent the paths are relative to the parent, but when the child is selected from the page as a whole, the paths are absolute:

    yerf().start('parent').waterfall('child1', 'child2').start('child1');
    yerf('parent.child1').stop();
    yerf('parent.child2').start();
    yerf('parent.child2').stop();   // parent is automatically stopped

`waterfall()` just means "Automatically stop this sample when its children are done."  `start()` will automatically call `waterfall()`.  Assuming you wanted to start the children at the same time the parent starts, you could rewrite the above example as:

    yerf().start('parent').start('child1', 'child2');
    yerf('parent.child1').stop();
    yerf('parent.child2').stop();   // parent is automatically stopped

yerf automatically links parents and children into a tree

    yerf().start('parent').start('child1');
    yerf('parent').children.child1  // Same as yerf('parent.child1')
    yerf('parent.child1').parent    // Same as yerf('parent')

Samples are event emitters

    sample.on('start', function (sample) {});
    sample.on('stop', function (sample) {});
    sample.on('arbitrary_event', function (sample) {});
    sample.trigger('arbitrary_event');

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

    yerf().on('parent.child', 'start', function (sample) {});
    yerf().trigger('parent.child', 'start', yerf('parent.child'));

Get time relative to the yerf epoch. Yerf will use `performance.now()` if available, in which case the epoch is `navigationStart`.  If yerf has to use `new Date()` to get time, the epoch is relative to when yerf first loads.

    yerf().getTime();

Convert unix time into yerf time.

    yerf().normTime(new Date());

Check the capabilities of your current browser

    yerf().hasNow // performance.now() works
    yerf().hasTiming // performance.timing works
    yerf().hasEntries // performance.getEntries or performance.webkitGetEntires is available

You can backfill events that happen before yerf loads or edit values before they are reported with `beforeReport()`, which is called right between the time when an event's state is changed to `stopped` and when the event is reported to `kivi`.  This is useful for measuring page asset download times without blocking them by loading yerf.  Note that `backfill(parentKey, key, startedAt, stoppedAt)` can only be called inside of `beforeReport()`.  `backfillRequest(parentKey, optionalKey, urlRegex)` will go through `performance.getEntries()` and do a backfill with any entries that match the regex you supplied.  The event key is optional.  If you omit it `backfillRequest()` will use the inner most matching group as your key.  There is also a `normalizedBackfill()` method that is the exact same as `backfill()` except that it takes unix times instead of times relative to page load.

    var parent = yerf().start('parent').start('child');
    var yerfStart = yerf().normTime(yerf().oldBoot);
    parent.beforeReport = function () {
      parent.backfill(undefined, 'yerfStartToEnd', yerfStart, parent.stoppedAt);

      if (yerf().hasTiming && yerf().hasNow) {
        var navStart = window.performance.timing.navigationStart;

        parent.backfill(undefined, 'navigationStartToYerfStart'
          , yerf().normTime(navStart), yerfStart);

        parent.backfill(undefined, 'pageRequestEndToYerfStart'
          , yerf().normTime(window.performance.timing.responseEnd), yerfStart);    

        parent.normalizedBackfill(undefined, 'pageRequest'
          , window.performance.timing.requestStart
          , window.performance.timing.responseEnd);
      }

      parent.backfillRequest('js', undefined, /.*\/javascripts\/([\w\/]*).js/);
      parent.backfillRequest('css', undefined, /.*\/stylesheets\/([\w\/]*).css/);

      // Provide a key instead of relying on regex match for key
      parent.backfillRequest('js', 'jquery', /js\/(jquery.*).js/);

    };
    yerf('parent.child').stop();

The example above demonstrates a few important principles.
- Old browsers don't support `performance.*`.  This means that on new browsers the backfill operations will record the pageRequest time and expand the length of parent to include the pageRequest time.  Old browsers will skip this backfill and not include the pageRequest time.  So, on some browsers you can only record things that happen durring yerfStartToEnd.  You will want to avoid recording things that span the "yerfStart" boundary because that will make it hard to compare results of old browsers to new ones.
- In IE9 `yerf().hasTiming` is true, but `yerf().hasNow` is false.  Its important to check for both of these because navigationStart would happen at a negative time in IE9 since it doesn't support performance.now().  `yerf` does not allow negative time and rounds the start time up to zero.  So, you can't measure performance.timing events in IE9 unless you want to distort your data.

Render a waterfall view of all completed samples in the browser.  yerf.js does not include the render() logic.  When render() is called, yerf will download and execute the needed code on demand. `render()` requires that the Underscore object, `_`, be present on the page.

    yerf().render()

#Setup

    git clone git@github.com:johnsetzer/yerf.git
    cd yerf
    npm install

#Run example

    node server.js
    Open http://localhost:3000/perfed_site/perfed_site.html
    Open your browser console and run 'yerf().render();'

#Run tests

    node server.js
    http://localhost:3002/tests/test_suite.html

#Run tests with testem

    testem

# Installing yerf in your app

1. yerf outsources posting data to a remote server to the [kivi](https://github.com/johnsetzer/kivi) library.  You need to include both the `kivi.min.js` followed the `yerf.min.js` source in your HTML page or, better yet, put them in a linked Javascript file.
1. Start and stop at least one sample

        yerf().start('sample').stop();
1. Configure these `kivi` properties.  This step and every step after it can be deferred until your entire page is loaded.

        kivi.config.postUrl = 'http://localhost:3000/postUrl';
        kivi.config.$ = jQuery;
1. Automatically, post data to a server after 1000ms, 2000ms after that, and 4000ms after that.

        kivi.enablePost([1000, 2000, 4000]);
1. Older browsers, IE7, don't support `JSON.stringify()`. If you want your site to work in these browsers see the [kivi.getToJSON() documentation](https://github.com/johnsetzer/kivi#browser-compatibility).
1. To get the waterfall viewer to work you need to host the waterfall_viewer.css and waterfall_viewer.js files somewhere and tell yerf where to find them.

        yerf().config.waterfallViewer = {
          cssPath: 'http://cdn.yoursite.com/stylesheets/waterfall_viewer.css'
        , jsPath: 'http://cdn.yoursite.com/javascripts/waterfall_viewer.js'
        };

#Debugging

List all samples and their current state

    kivi._.each(yerf().all(), function(d) { console.log(d.key, d.delta, d.state); });

Frequently, you will find that your data is not getting reported because a dependency is not yet satisfied.  Checking the waiting for property is very useful.

    yerf().start('parent').start('child1', 'child2');
    yerf('parent.child1').stop();
    yerf('parent').waitingFor.child1 // false
    yerf('parent').waitingFor.child2 // true

Samples will throw  an `Error` if you forget a required parameter. If you cause a runtime error, such as trying to start or stop a sample twice or stopping a sample that hasn't started, yerf will call onError().  By default, yerf logs the error to console, but you could copy and modify this statement to override the default behavior.  

    yerf().Sample.prototype.onError = function(error) {
      console.log(error.message);
    };

Some of your measurements might be inside code that gets executed more than once or in different places under different circumstances.  yerf will simply ignore the second start or stop of a sample with a given key.  If you want to measure the same code running in different places because you think it will take a different amount of time, you will need to figure out how to pass a different key to `start()` and `stop()` depending on the circumstances.

Yerf won't send data about a sample or any of that samples children to `kivi` until the entire sample completes. Each yerf sample results in a `delta` and an `offset` being sent to `kivi`

    yerf().start('key').stop();
    kivi._store['yerf.delta.key]; // 0
    kivi._store['yerf.offset.key]; // 10

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
yerf is tested in IE 7-10, latest Chrome, latest Firefox, and latests Safari

#License
Yerf is licensed under the Apache Version 2.0 License.

http://www.apache.org/licenses/LICENSE-2.0.html