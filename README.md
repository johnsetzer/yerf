#About
yerf is a Javascript client side library designed to measure the runtime of programmer defined events and report them back to the server.  It features a jQuery-like syntax as well as a waterfall view for analyzing data.

#Design Rational
- Light implementation that can be inlined at the beginning of a document's head with little performance overhead.
- jQuery like syntax for ease of use
- Namespaced events
- Every sample is a key/value pair that can easily be injected into any tool.
- A Sample with a given key can only be recorded once to ease logistics and to keep one client from skewing results by reporting an event many times.
- Total missuses of the yerf, such as forgetting a required parameter, will throw an exception; but subtle runtime errors, like stopping a sample twice, will call the onError() callback, which defaults to doing nothing unless debug mode is enabled. In which case, it logs to console.

#Samples
Samples consist of a key, a delta, a start time, an end time, and a state.  Most sample methods return themselves so they can be chained together.
    
    var sample = yerf().new('key');
    sample.start();
    sample.stop();

or use chaining
    
    var sample = yerf().new('key').start().stop();

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

Samples are event emitters

    sample.on('start', function (sample) {});
    sample.on('stop', function (sample) {});
    sample.on('arbitrary_event', function (sample) {});
    sample.trigger('arbitrary_event');

#Yerf Selector
Create a sample.

    yerf().new('key');

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

Configure yerf so you can post data to a remote server.

    yerf().config.$ = jquery;
    yerf().config.postUrl = 'http://localhost:4000';

Manually post data to a server.

    yerf().post();

Automatically, post data to a server after 100ms, 200ms, and every 300ms thereafter.

    yerf().enablePost([100, 200], 300);

Automatically, post data to a server after 100ms, 200ms.

    yerf().enablePost([100, 200]);

Automatically, post data to a server every 300ms.

    yerf().enablePost(null, 300);

Disable automatic posting.

    yerf().disablePost();

See the data yerf will post on the next call to `post()`.

    yerf().postData();

See all data yerf has posted and all data it will post.

    yerf().postData(true);

Render a waterfall view of all completed samples in the browser.  yerf.js does not include the render() logic.  When render() is called, yerf will inject the needed code on demand.

    yerf().render()

#Setup

    git clone git@github.com:johnsetzer/yerf.git
    cd yerf
    npm install

#Run example

    node file_server.js
    Open http://localhost:3000/perfed_site/perfed_site.html
    Open your browser console and run 'yerf().render();'

#Run tests

    node file_server.js
    http://localhost:3000/tests/test_suite.html

#Run tests with testem

    testem

#Debugging

Samples will throw  an `Error` if you forget a required parameter. If you cause a runtime error, such as trying to start or stop a sample twice or stopping a sample that hasn't started, yerf will call onError().  The following is the default behavior, but you could copy and modify this statement to override the default behavior.  

    yerf().Sample.prototype.onError = function(error) {
      console.log(error.message);
    };