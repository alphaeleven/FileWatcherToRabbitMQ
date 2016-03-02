/* jshint node: true */

var rabbitmq = require('./rabbitCon.js');
var fileWatcher = require('./fileWatcher.js');


var Service = new (function() {

  //Initialize RabbitMQ
  this.startRabbitMQ = function() {
    rabbitmq.rabbitStart();
    return this;
  };

  // Initialize watcher.
  this.startFileWatching = function() {

    //Wait until RabbitMQ is initialized
    if (rabbitmq.isPubChannelNull()) {
      return setTimeout(this.startFileWatching, 1000);
    }

    fileWatcher.startFileWatcher();
    return this;
  };
})();

Service.startRabbitMQ().startFileWatching();
