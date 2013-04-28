var express = require('express');
var path = require('path');
var consolidate = require('consolidate');
var path = require('path');
var fs = require('fs');
var app = express();
app.engine('handlebars', consolidate.handlebars);
app.set('views', __dirname + '/perfed_site');
app.use(express.bodyParser());

var PORT = 3002;

app.get('/perfed_site/perfed_site.html', function(req, res){

  var kiviSrcMin = fs.readFileSync('node_modules/kivi/kivi.min.js', 'utf-8');
  var yerfSrcMin = fs.readFileSync('yerf.min.js', 'utf-8');

  var templateData = {
    kivi: kiviSrcMin
  , yerf: yerfSrcMin
  }

  app.render('perfed_site.html.handlebars', templateData, function(err, html){
    if (err) {
      console.log(err);
      res.send(500, { error: err });
    } else {
      res.set('Content-Type', 'text/html');
      res.set('Cache-Control', 'no-cache');
      res.send(html);
    }
  });
});

// Just returns 200 for the example
app.post('/postUrl', function(req, res){
  console.log(req.body);
  res.setHeader('Content-Type', 'application/json');
  res.end();
});

function serveDir(dir){
  app.get(dir + ':file', function(req, res){
    var file = req.params.file;
    var filePath = path.normalize(__dirname + dir + file);
    console.log('Sending file: '+ filePath);
    res.set('Cache-Control', 'no-cache');
    res.sendfile(filePath);
  });  
}

serveDir('/');
serveDir('/dependencies/jasmine/');
serveDir('/dependencies/js/');
serveDir('/fake_site/');
serveDir('/fake_site/css/');
serveDir('/fake_site/js/');
serveDir('/perfed_site/');
serveDir('/perfed_site/css/');
serveDir('/perfed_site/js/');
serveDir('/lib/');
serveDir('/examples/');
serveDir('/tests/');
serveDir('/node_modules/kivi/');

app.listen(PORT);

console.log('URL:');
console.log('http://localhost:' + PORT + '/perfed_site/perfed_site.html');
console.log('http://localhost:' + PORT + '/fake_site/fake_site.html');
console.log('http://localhost:' + PORT + '/tests/test_suite.html');
console.log('http://localhost:' + PORT + '/examples/simple_example.html');