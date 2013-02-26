var express = require('express');
var path = require('path');
var app = express();

function serveDir(dir){
  app.get(dir + ':file', function(req, res){
    var file = req.params.file;
    var filePath = path.normalize(__dirname + dir + file);
    console.log('Sending file: '+ filePath);
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

app.listen(3000);