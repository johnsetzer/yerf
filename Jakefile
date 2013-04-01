var compressor = require('node-minify');

desc('Builds minified yerf.js file.');
task('build', {async: true}, function (params) {
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

desc('Start example server.');
task('server', ['build'], function (params) {
  var cmds = [
    'node ./server.js'
  ];
  jake.exec(cmds, function () {
    complete();
  }, {printStdout: true});
});
