/* jshint node: true */

var amqp = require('amqplib/callback_api');

// if the connection is closed or fails to be established at all, we will reconnect
var amqpConn = null;
var pubChannel = null;
var offlinePubQueue = [];

var defaultExchangeNmae = "";
var defaultRoutingKey = "jobs";

function start() {
  amqp.connect('amqp://user:pass@YOURRABBITHOST:5672/{vhost}?heartbeat=60"', function(err, conn) {
    if (err) {
      console.error("[AMQP]", err.message);
      return setTimeout(start, 1000);
    }
    conn.on("error", function(err) {
      if (err.message !== "Connection closing") {
        console.error("[AMQP] connection error: ", err.message);
      }
    });
    conn.on("close", function() {
      console.error("[AMQP] connection closed and reconnecting");
      return setTimeout(start, 1000);
    });

    console.log("[AMQP] RabbitMQ connected");
    amqpConn = conn;

    whenConnected();
  });
}

function whenConnected() {
  startPublisher();
  startReceiver();
}

function startPublisher() {
  amqpConn.createConfirmChannel(function(err, ch) {
    if (closeOnErr(err)) return;
    ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });

    pubChannel = ch;
    while (true) {
      var m = offlinePubQueue.shift();
      if (!m) break;
      publish(m[0], m[1], m[2]);
    }
  });
}

// method to publish a message, will queue messages internally if the connection is down and resend later
function publish(exchange, routingKey, content) {
  try {
    pubChannel.publish(exchange, routingKey, content, {
        persistent: true
      },
      function(err, ok) {
        if (err) {
          console.error("[AMQP] publish", err);
          offlinePubQueue.push([exchange, routingKey, content]);
          pubChannel.connection.close();
        }
        console.log("[AMQP] publish msg ", content.toString());
      });
  } catch (e) {
    console.error("[AMQP] publish error", e.message);
    offlinePubQueue.push([exchange, routingKey, content]);
  }
}

// A Receiver that acks messages only if processed succesfully
function startReceiver() {
 amqpConn.createChannel(function(err, ch) {
   if (closeOnErr(err)) return;
   ch.on("error", function(err) {
     console.error("[AMQP] channel error", err.message);
   });
   ch.on("close", function() {
     console.log("[AMQP] channel closed");
   });
   ch.prefetch(2);
   ch.assertQueue(defaultRoutingKey, { durable: true }, function(err, _ok) {
     if (closeOnErr(err)) return;
     ch.consume(defaultRoutingKey, processMsg, { noAck: false });
     console.log("[AMQP] Receiver is started");
   });

   function processMsg(msg) {
     receive(msg, function(ok) {
       try {
         if (ok)
           ch.ack(msg);
         else
           ch.reject(msg, true);
       } catch (e) {
         closeOnErr(e);
       }
     });
   }
 });
}

function receive(msg, cb) {
 console.log("[AMQP] received msg", msg.content.toString());
 cb(true);
}

function closeOnErr(err) {
  if (!err) return false;
  console.error("[AMQP] error", err);
  amqpConn.close();
  return true;
}


//Exported functions
exports.rabbitStart = function rabbitStart() {
  start();
};
exports.rabbitPublish = function rabbitPublish(content) {
  publish(defaultExchangeNmae, defaultRoutingKey, content);
};

exports.isPubChannelNull = function isPubChannelNull() {
  if (pubChannel === null) {
    return true;
  } else {
    return false;
  }
};
