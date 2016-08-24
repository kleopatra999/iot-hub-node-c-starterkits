var wpi = require('wiring-pi');

// GPIO pin of the LED
var configPin = 7;
// Blinking interval in msec
var TIMEOUT = 2000;

wpi.setup('wpi');
wpi.pinMode(configPin, wpi.OUTPUT);

var isLedOn = false;

setInterval(function () {
  isLedOn = !isLedOn;
  wpi.digitalWrite(configPin, isLedOn ? 1 : 0);
}, TIMEOUT);
