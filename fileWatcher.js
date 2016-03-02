/* jshint node: true */

var chokidar = require('chokidar');
var rabbitmq = require('./rabbitCon.js');

function start(){

  var watcher = chokidar.watch('Z:/Completion', {
    ignored: /[\/\\]\./,
    persistent: true,
    usePolling: true
  });

  // Something to use when events are received.
  var log = console.log.bind(console);

  // Add event listeners.
  watcher
    .on('add', function(path) {
      log('[FW] File', path, 'has been added');
      rabbitmq.rabbitPublish(new Buffer(path));
    })
    .on('addDir', function(path) {
      log('[FW] Directory', path, 'has been added');
    })
    .on('change', function(path) {
      log('[FW] File', path, 'has been changed');
    })
    .on('unlink', function(path) {
      log('[FW] File', path, 'has been removed');
    })
    .on('unlinkDir', function(path) {
      log('[FW] Directory', path, 'has been removed');
    })
    .on('error', function(error) {
      log('[FW] Error happened', error);
    })
    .on('ready', function() {
      log('[FW] Initial scan complete. Ready for changes.');
    });

}

//Exported functions
exports.startFileWatcher = function startFileWatcher() {
  start();
};
