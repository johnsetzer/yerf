var compressor = require('node-minify');

desc('Builds minified yerf.js file.');
task('build-yerf', {async: true}, function (params) {
  new compressor.minify({
    type: 'gcc'
  , fileIn: ['lib/yerf.js']
  , fileOut: 'yerf.min.js'
  , callback: function(err){
      if (err) { console.log(err); }
      complete();
    }
  });
});

desc('Builds minified yerf-delayables.js file.');
task('build-yerf-delayables', {async: true}, function (params) {
  new compressor.minify({
    type: 'gcc'
  , fileIn: ['lib/yerf-delayables.js']
  , fileOut: 'yerf-delayables.min.js'
  , callback: function(err){
      if (err) { console.log(err); }
      complete();
    }
  });
});

desc('Builds all minified files');
task('build', ['build-yerf', 'build-yerf-delayables']);

desc('Start example server.');
task('server', ['build'], function (params) {
  var cmds = [
    'node ./server.js'
  ];
  jake.exec(cmds, function () {
    complete();
  }, {printStdout: true});
});
