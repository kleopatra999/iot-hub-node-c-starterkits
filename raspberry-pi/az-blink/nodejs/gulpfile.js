var config = require('./config.json');
var gulp = require('gulp');
var simssh = require('simple-ssh');
var uploadFiles = require('az-iot-helper').uploadFiles;

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
  uploadFiles(config, ['az-blink.js', 'package.json', 'config.json'], ['az-blink.js', 'package.json', 'config.json'], function(){
    ssh.exec('npm install', {
      pty: true,
      out: console.log.bind(console)
    }).start();
  });
});


gulp.task('run', function () {
  ssh.exec('sudo nodejs ./az-blink.js', {
    pty: true,
    out: console.log.bind(console)
  }).start();
});
