'use strict';

var config = require('./config.json');
var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;
var wpi = require('wiring-pi');

var connectionString = 'HostName=' + config.iot_hub_host_name + ';DeviceId=' + config.iot_hub_device_id + ';SharedAccessKey=' + config.iot_hub_shared_access_key;
var client = clientFromConnectionString(connectionString);

// GPIO pin of the LED
var CONFIG_PIN = 7;

wpi.setup('wpi');
wpi.pinMode(CONFIG_PIN, wpi.OUTPUT);
var isLedOn = false;

function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

var connectCallback = function (err) {
  if (err) {
    console.log('Could not connect: ' + err);
  } else {
    console.log('Client connected');
    client.on('message', function (msg) {
      console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
      client.complete(msg, printResultFor('completed'));
      isLedOn = !isLedOn;
      wpi.digitalWrite(CONFIG_PIN, isLedOn ? 1 : 0);
    });
  }
};

client.open(connectCallback);
