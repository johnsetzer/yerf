#About
yerf is a Javascript client side library designed to measure the runtime of programmer defined events and report them back to the server.  It features a jQuery-like syntax as well as a waterfall view for analyzing data.

#Design Rational
- Light implementation that can be inlined at the end of a document's head with little performance overhead.
- jQuery like syntax for ease of use
- Namespaced events
- Every sample is a key/value pair that can easily be injected into any tool.
- A Sample with a given key can only be recorded once to ease logistics and to keep one client from skewing results by reporting an event many times.
- Total missuses of the yerf, such as forgetting a required parameter, will throw an exception; but subtle runtime errors, like stopping a sample twice, will call the onError() callback, which defaults to doing nothing unless debug mode is enabled. In which case, it logs to console.
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
"parent.child" is assumed to be a component of "parent".  "offset.parent.child" is special value representing the time between when "parent" starts and when "parent.child" starts.

Automatically, stop parent when all of its dependencies(child1 and child2) are stopped. Also record offset times of child1 and child2 relative to the start of parent.  Notice that when child starting is chained from the parent the paths are relative to the parent, but when the child is selected from the page as a whole, the paths are absolute:

    yerf().start('parent').waterfall('child1', 'child2').start('child1');
    yerf('parent.child1').stop();
    yerf('parent.child2').start();
    yerf('parent.child2').stop();   // parent is automatically stopped

Start events relative to a sample

    sample.start('child', 'child.childOfChild');

Stop events relative to a sample

    sample.stop('child', 'child.childOfChild');

Find events child events relative to their parent

    yerf('parent').find('child1').start();

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

    yerf().getTime()

Check if yerf is using `performance.now(`) and other timing goodies.

    yerf().usesModernPerf

You can backfill events that happen before yerf loads or edit values before they are reported with `beforeReport()`, which is called right between the time when an event's state is changed to `stopped` and when the event is reported to `kivi`.  This is useful for measuring page asset download times without blocking them by loading yerf.  Note that `backfill(key, startedAt, stoppedAt)` can only be called inside of `beforeReport()`.  `backfillRequest(urlRegex, optionalKey)` will go through `performance.getEntries()` and do a backfill with any entries that match the regex you supplied.  The event key is optional.  If you omit it `backfillrequest()` will use the inner most matching group as your key.

    var eventStart = yerf().getTime();
    var parent = yerf().start('parent').waterfall('child1', 'child2').start('child1');
    parent.beforeReport = function () {
        var eventStop = yerf().getTime();
        parent.backfill('event', eventStart, eventStop);
        if (yerf().usesModernPerf) {
          parent.backfill('navigationStart', 0, parent.startedAt);
        }
        parent.backfillRequest(/.*\/(\w*).js/);
        parent.backfillRequest(/.*\/(\w*).css/);
        parent.backfillRequest(/js\/(jquery.*).js/, 'jquery');
      }
    yerf('parent.child1').stop();


yerf outsources posting data to a remote server to the [kivi](https://github.com/johnsetzer/kivi) library.  You need to include both the `kivi` and the `yerf` source in your HTML page and then configure these `kivi` properties.

    kivi.config.postUrl = 'http://localhost:3000/postUrl';
    kivi.config.$ = jQuery;

Manually post data to a server.

    kivi.post();

Automatically, post data to a server after 1000ms, 2000ms after that, and 4000ms after that.

    kivi.enablePost([1000, 2000, 4000]);

Disable automatic posting.

    kivi.disablePost();

Render a waterfall view of all completed samples in the browser.  yerf.js does not include the render() logic.  When render() is called, yerf will download and execute the needed code on demand.

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
    http://localhost:3000/tests/test_suite.html

#Run tests with testem

    testem

#Debugging

Samples will throw  an `Error` if you forget a required parameter. If you cause a runtime error, such as trying to start or stop a sample twice or stopping a sample that hasn't started, yerf will call onError().  The following is the default behavior, but you could copy and modify this statement to override the default behavior.  

    yerf().Sample.prototype.onError = function(error) {
      console.log(error.message);
    };

#Browser Compatibility
yerf is tested in IE 7-10, latest Chrome, latest Firefox, and latests Safari

#License
Yerf is licensed under the Apache Version 2.0 License.

http://www.apache.org/licenses/LICENSE-2.0.html