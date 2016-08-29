var config = require('./config.json');
var gulp = require('gulp');
var simssh = require('simple-ssh');
var uploadFiles = require('az-iot-helper').uploadFiles;
var Q = require('q');

var ssh = new simssh({
  host: config.device_ip_address,
  user: config.device_user_name,
  pass: config.device_password
});

gulp.task('install-tools', function () {
  var input = 'Y\r';
  ssh.exec('sudo apt-get update && sudo apt-get install npm', {
    pty: true,
    in: input,
    out: console.log.bind(console)
  }).start();
});

gulp.task('deploy', function(){
  var deferred = Q.defer();
      
  uploadFiles(config, ["./blink.js", "./device-package.json"], ["./blink.js", "./package.json"], function(){
    console.log("- Installing npm packages on device");
    
    ssh.exec('npm install', {
      pty: true,
      exit: function() { deferred.resolve(); }
    }).start();
  });
  
  return deferred.promise;
});

gulp.task('run', function () {
  ssh.exec('sudo nodejs ./blink.js && exit', {
    pty: true,
    out: console.log.bind(console)
  }).start();
});
