var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

var cache = {};


/**
 * utils
 */
function send404(res) {
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.write('Error 404: resource not found.');
  res.end();
}

function sendFile(res, filePath, fileContent) {
  res.writeHead(
    200,
    {'content-type': mime.lookup(path.basename(filePath))}
  );
  res.end(fileContent);
}

/**
 * @param res
 * @param cache
 * @param path
 * 
 * return cache[path] or read from path
 */

function getFile(res, cache, path) {
  if(cache[path]) {
    sendFile(res, path, cache[path]);
  } else {
    fs.stat(path, function(err, stats) {
      if(err) {
        send404(res);
      } else if(stats.isFile()) {
        fs.readFile(path, 'utf-8', function(err, data) {
          if(err) {
            send404(res);
          }
          console.log(data)
          sendFile(res, path, cache[path] = data)
        })
      } else {
        send404(res);
      }
    })
  }
}


/**
 * create server
 */

var server = http.createServer(function(req, res){
  var filePath = false;

  if(req.url == '/') {
    filePath = 'public/index.html';
  } else {
    filePath = 'public/' + req.url;
  }

  var absPath = './' + filePath;
  getFile(res, cache, absPath); 
})

var port = 3000;
server.listen(port, function() {
  console.log('server listening on port', port);
})


/**
 * websocket server
 */

var chat_server = require('./lib/chat_server');
chat_server.listen(server);
