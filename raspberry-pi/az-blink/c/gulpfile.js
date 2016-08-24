var config = require('./config.json');
var gulp = require('gulp');
var uploadFiles = require('az-iot-helper-test');
var simssh = require('simple-ssh');
var request = require('request');
var source = require('vinyl-source-stream');
var unzip = require('gulp-unzip');


var fs = require('fs');
var config = null;

readConfig();

gulp.task('tools-install', function () {
  
  // clone repo with azure stuff
  // this currently contains prebuilt libraries for raspbian jessie + set of header files
  deleteFolderRecursive("az-iot-sdk-prebuilt")
  runCmd('git clone https://github.com/zikalino/az-iot-sdk-prebuilt.git');

  if (process.platform == 'win32') {

    // [TODO] I am doing it here, assuming that downloading & unpacking zip won't fail, but I have to find better way to handle this.
    updateToolchain('arm-linux-gnueabihf');
    
    return request('https://releases.linaro.org/14.09/components/toolchain/binaries/gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_win32.zip')
      .pipe(source('gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_win32.zip'))
      .pipe(unzip())
      .pipe(gulp.dest('/'))
  } else if (process.platform == 'linux') {
    // [TODO] I am doing it here, assuming that downloading & unpacking zip won't fail, but I have to find better way to handle this.
    
    runCmd('cd ~; wget https://releases.linaro.org/14.09/components/toolchain/binaries/gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_linux.tar.xz; tar xf gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_linux.tar.xz; rm gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_linux.tar.xz');
    runCmd('sudo dpkg --add-architecture i386');
    runCmd('sudo apt-get -y update');
    runCmd('sudo apt-get -y install libc6:i386 libncurses5:i386 libstdc++6:i386');
    runCmd('sudo apt-get -y install lib32z1');
        
    updateToolchain('arm-linux-gnueabihf');
  } else {
    console.log('We dont have tools for your operating system at this time');
  }
});

gulp.task('build', function() {
  var toolchain = '';

  // check if toolchain is installed
  try { toolchain = config.toolchain; } catch(e) {}

  if (process.platform == 'win32') {

    // remove old files
    runCmd('rmdir /S /Q out');
    runCmd('mkdir out');

    if (toolchain == 'arm-linux-gnueabihf') {

      // in first step just compile sample file
      var cmd = '/gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_win32/bin/arm-linux-gnueabihf-gcc.exe -Iaz-iot-sdk-prebuilt/raspbian-jessie-sysroot/usr/include -Iaz-iot-sdk-prebuilt/inc/serializer -Iaz-iot-sdk-prebuilt/inc/azure-c-shared-utility -Iaz-iot-sdk-prebuilt/inc/platform_specific -Iaz-iot-sdk-prebuilt/inc -Iaz-iot-sdk-prebuilt/inc/iothub_client -Iaz-iot-sdk-prebuilt/inc/azure-uamqp-c -o out/az-blink-happiest.o -c az-blink-happiest.c';
      runCmd(cmd);

      // second step -- link with prebuild libraries
      cmd = '/gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_win32/bin/arm-linux-gnueabihf-gcc.exe out/az-blink-happiest.o -o out/az-blink-happiest -rdynamic az-iot-sdk-prebuilt/raspbian-jessie/libserializer.a az-iot-sdk-prebuilt/raspbian-jessie/libiothub_client.a az-iot-sdk-prebuilt/raspbian-jessie/libiothub_client_amqp_transport.a az-iot-sdk-prebuilt/raspbian-jessie/libaziotplatform.a -lwiringPi az-iot-sdk-prebuilt/raspbian-jessie/libaziotsharedutil.a az-iot-sdk-prebuilt/raspbian-jessie/libuamqp.a az-iot-sdk-prebuilt/raspbian-jessie/libaziotsharedutil.a -lssl -lcrypto -lcurl -lpthread -lm -lssl -lcrypto --sysroot=az-iot-sdk-prebuilt/raspbian-jessie-sysroot -Wl,--verbose';
      runCmd(cmd);
    } else {
      console.log("NO TOOLCHAIN CONFIGURED!");
    }
  } else if (process.platform == 'linux') {
    // remove old files
    //runCmd('rmdir /S /Q out');
    runCmd('mkdir out');

    if (toolchain == 'arm-linux-gnueabihf') {

      // in first step just compile sample file
      var cmd = '~/gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_linux/bin/arm-linux-gnueabihf-gcc -Iaz-iot-sdk-prebuilt/raspbian-jessie-sysroot/usr/include -Iaz-iot-sdk-prebuilt/inc/serializer -Iaz-iot-sdk-prebuilt/inc/azure-c-shared-utility -Iaz-iot-sdk-prebuilt/inc/platform_specific -Iaz-iot-sdk-prebuilt/inc -Iaz-iot-sdk-prebuilt/inc/iothub_client -Iaz-iot-sdk-prebuilt/inc/azure-uamqp-c -o out/az-blink-happiest.o -c az-blink-happiest.c';
      runCmd(cmd);

      // second step -- link with prebuild libraries
      cmd = '~/gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_linux/bin/arm-linux-gnueabihf-gcc out/az-blink-happiest.o -o out/az-blink-happiest -rdynamic az-iot-sdk-prebuilt/raspbian-jessie/libserializer.a az-iot-sdk-prebuilt/raspbian-jessie/libiothub_client.a az-iot-sdk-prebuilt/raspbian-jessie/libiothub_client_amqp_transport.a az-iot-sdk-prebuilt/raspbian-jessie/libaziotplatform.a -lwiringPi az-iot-sdk-prebuilt/raspbian-jessie/libaziotsharedutil.a az-iot-sdk-prebuilt/raspbian-jessie/libuamqp.a az-iot-sdk-prebuilt/raspbian-jessie/libaziotsharedutil.a -lssl -lcrypto -lcurl -lpthread -lm -lssl -lcrypto --sysroot=az-iot-sdk-prebuilt/raspbian-jessie-sysroot -Wl,--verbose';
      runCmd(cmd);
    } else {
      console.log("NO TOOLCHAIN CONFIGURED!");
    }
  }
});

gulp.task('deploy', function(){
  uploadFiles(config, ["./out/az-blink-happiest", "./az-iot-sdk-prebuilt/raspbian-jessie-sysroot/usr/lib/libwiringPi.so"], ["./az-blink-happiest", "./libwiringPi.so"], function(callback){
    callback();
  });
});

var ssh = new simssh({
      host: config.device_ip_address,
      user: config.device_user_name,
      pass: config.device_password
    });

gulp.task('run', function () {
  ssh.exec('chmod +x ./az-blink-happiest & ./az-blink-happiest', {
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


// TODO: add this function to az-iot-helper.
var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};
