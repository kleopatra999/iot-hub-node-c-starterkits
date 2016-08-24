var config = require('./config.json');
var gulp = require('gulp');
var rsync = require('gulp-rsync');
var simssh = require('simple-ssh');
var fs = require('fs');
var config = null;

readConfig();

gulp.task('tools-detect', function () {
    
    if (process.platform == 'win32')
    {
      var exec = require('child_process').exec('where arm-linux-gnueabihf-g++.exe', undefined, function (error, stdout, stderr) {
        if (null == error) {
          updateToolchain('arm-linux-gnueabihf');
        }
      });
    };
});

gulp.task('tools-install', function () {
  // clone repo with azure stuff
  // this currently contains prebuilt libraries for raspbian jessie + set of header files
  runCmd('git clone https://github.com/zikalino/az-iot-sdk-prebuilt.git');

  if (process.platform == 'win32') {
    // [ZIM] at the moment let's just start downloading the toolchain
    //       in the future, we shall actually retrieve & install the toolchain
    //       and also detect is bash and/or docker are available
    runCmd('start http://sysprogs.com/files/gnutoolchains/raspberry/raspberry-gcc4.9.2-r2.exe');
  } else {
    console.log('We dont have tools for your operating system at this time');
  }
});

gulp.task('build', function() {
  var toolchain = '';

console.log('building....');
  try { toolchain = config.toolchain; } catch(e) {}
console.log('got toolchain....');

    runCmd('rmdir /S /Q out');
    runCmd('mkdir out');

  if (process.platform == 'win32') {

    if (toolchain == 'arm-linux-gnueabihf') {
      var lib_dir = 'c:\\SysGCC\\Raspberry\\arm-linux-gnueabihf\\sysroot\\usr\\lib\\arm-linux-gnueabihf\\';

      runCmd('arm-linux-gnueabihf-gcc.exe -Iinc -Iaz-iot-sdk-prebuilt/inc/serializer -Iaz-iot-sdk-prebuilt/inc/azure-c-shared-utility -Iaz-iot-sdk-prebuilt/inc/platform_specific -Iaz-iot-sdk-prebuilt/inc -Iaz-iot-sdk-prebuilt/inc/iothub_client -Iaz-iot-sdk-prebuilt/inc/azure-uamqp-c -o out/az-blink-happiest.o -c az-blink-happiest.c');

      var cmd = 'arm-linux-gnueabihf-gcc.exe out/az-blink-happiest.o -o out/az-blink-happiest -rdynamic az-iot-sdk-prebuilt/raspbian-jessie/libserializer.a az-iot-sdk-prebuilt/raspbian-jessie/libiothub_client.a az-iot-sdk-prebuilt/raspbian-jessie/libiothub_client_amqp_transport.a az-iot-sdk-prebuilt/raspbian-jessie/libaziotplatform.a -lwiringPi az-iot-sdk-prebuilt/raspbian-jessie/libaziotsharedutil.a az-iot-sdk-prebuilt/raspbian-jessie/libuamqp.a az-iot-sdk-prebuilt/raspbian-jessie/libaziotsharedutil.a ' + lib_dir + 'libssl.so.1.0.0 ' + lib_dir + 'libcrypto.so.1.0.0 ' + lib_dir + 'libcurl.so.4.3.0 -lpthread -lm ' + lib_dir + 'libssl.so.1.0.0 ' + lib_dir + 'libcrypto.so.1.0.0';

      runCmd(cmd);
    } else {
      console.log("NO TOOLCHAIN CONFIGURED!");
    }
  }
});

gulp.task('deploy', function () {
  return gulp.src(['out/az-blink-happiest'])
    .pipe(rsync({
      root: '',
      hostname: config.device_user_name + '@' + config.device_ip_address,
      destination: ''
    }));
});

var ssh = new simssh({
      host: config.device_ip_address,
      user: config.device_user_name,
      pass: config.device_password
    });

gulp.task('run', function () {
  ssh.exec('sudo ./out/az-blink-happiest', {
    pty: true,
    out: console.log.bind(console)
  }).start();
});

function updateToolchain(toolchain) {
  if (null != config) {
    config.toolchain = toolchain;
    writeConfig(config);
  }
}

function readConfig() {
  config =  JSON.parse(fs.readFileSync('config.json', 'utf8'));
}

function writeConfig() {
  if (config != null) {
    fs.writeFile('config.json', JSON.stringify(config));
  }
}

function runCmd(cmd) {
    try {
       return require('child_process').execSync(cmd);
    } catch (e) {
        return e;
    }
}
