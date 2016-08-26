var config = require('./config.json');
var gulp = require('gulp');
var uploadFiles = require('az-iot-helper').uploadFiles;
var simssh = require('simple-ssh');
var request = require('request');
var source = require('vinyl-source-stream');
var unzip = require('gulp-unzip');
var fs = require('fs');

var config = null;
var SAMPLE_NAME = 'az-blink-happiest';
var TOOLS_FOLDER = (process.platform === 'linux' ? process.env['HOME'] : '') + '/vsc-iot-tools';
var PREBUILT_FOLDER = TOOLS_FOLDER + '/prebuilt-libs';
var PREBUILT_SDK_REPO = 'https://github.com/zikalino/az-iot-sdk-prebuilt.git';
var COMPILER_NAME = (process.platform == 'win32' ?
                                        'gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_win32' :
                                        'gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_linux');
var COMPILER_FOLDER = TOOLS_FOLDER + '/' + COMPILER_NAME + '/bin';

readConfig();

gulp.task('install-tools', function () {

  // make sure tools folder exists
  if (!folderExists(TOOLS_FOLDER))
    fs.mkdirSync(TOOLS_FOLDER);
  
  // clone helper repository to tools folder -- if it doesn't exists
  if (!folderExists(PREBUILT_FOLDER + '/.git')) {
    runCmd('git clone ' + PREBUILT_SDK_REPO + ' ' + PREBUILT_FOLDER);
  }

  if (process.platform == 'win32') {

    return request('https://releases.linaro.org/14.09/components/toolchain/binaries/gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_win32.zip')
      .pipe(source('gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_win32.zip'))
      .pipe(unzip())
      .pipe(gulp.dest(TOOLS_FOLDER))
      .on('end', function() {
        // update toolchain in config if everything completed successfully
        updateToolchain('arm-linux-gnueabihf');
      });

  } else if (process.platform == 'linux') {

    // just use wget and tar commands sequentially
    // trying to find reliable gulp tools may be very time consuming
    runCmd('cd ' + TOOLS_FOLDER + '; wget https://releases.linaro.org/14.09/components/toolchain/binaries/gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_linux.tar.xz; tar xf gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_linux.tar.xz; rm gcc-linaro-arm-linux-gnueabihf-4.9-2014.09_linux.tar.xz');

    // below are compiler's dependencies on 64-bit platform
    if (process.arch == 'x64') {
      runCmd('sudo dpkg --add-architecture i386');
      runCmd('sudo apt-get -y update');
      runCmd('sudo apt-get -y install libc6:i386 libncurses5:i386 libstdc++6:i386');
      runCmd('sudo apt-get -y install lib32z1');
    }
        
    // update toolchain in config if everything completed successfully
    updateToolchain('arm-linux-gnueabihf');
  } else {
    console.log('We dont have tools for your operating system at this time');
  }
});

gulp.task('build', function() {
  var toolchain = '';

  // check if toolchain is installed
  try { toolchain = config.toolchain; } catch(e) {}

  // remove old out directory and create empty one
  deleteFolderRecursive('out');
  fs.mkdirSync('out');

  // make sure we have proper toolchain name
  if (toolchain == 'arm-linux-gnueabihf') {

    // in first step just compile sample file
    var cmd = COMPILER_FOLDER + '/arm-linux-gnueabihf-gcc ' + 
              '-I' + PREBUILT_FOLDER + '/raspbian-jessie-sysroot/usr/include ' +
              '-I' + PREBUILT_FOLDER + '/inc/serializer ' +
              '-I' + PREBUILT_FOLDER + '/inc/azure-c-shared-utility ' +
              '-I' + PREBUILT_FOLDER + '/inc/platform_specific ' +
              '-I' + PREBUILT_FOLDER + '/inc ' +
              '-I' + PREBUILT_FOLDER + '/inc/iothub_client ' +
              '-I' + PREBUILT_FOLDER + '/inc/azure-uamqp-c ' +
              '-o out/' + SAMPLE_NAME + '.o ' +
              '-c ' + SAMPLE_NAME + '.c';

    runCmd(cmd);

    // second step -- link with prebuild libraries
    cmd = COMPILER_FOLDER + '/arm-linux-gnueabihf-gcc ' +
              'out/' + SAMPLE_NAME + '.o ' + 
              '-o out/' + SAMPLE_NAME +
              ' -rdynamic ' + 
              PREBUILT_FOLDER + '/raspbian-jessie/libserializer.a ' +
              PREBUILT_FOLDER + '/raspbian-jessie/libiothub_client.a ' +
              PREBUILT_FOLDER + '/raspbian-jessie/libiothub_client_amqp_transport.a ' +
              PREBUILT_FOLDER + '/raspbian-jessie/libaziotplatform.a ' +
              '-lwiringPi ' + 
              PREBUILT_FOLDER + '/raspbian-jessie/libaziotsharedutil.a ' +
              PREBUILT_FOLDER + '/raspbian-jessie/libuamqp.a ' +
              PREBUILT_FOLDER + '/raspbian-jessie/libaziotsharedutil.a ' +
              '-lssl ' +
              '-lcrypto ' +
              '-lcurl ' +
              '-lpthread ' +
              '-lm ' +
              '-lssl ' +
              '-lcrypto ' +
              '--sysroot=' + PREBUILT_FOLDER + '/raspbian-jessie-sysroot';

    runCmd(cmd);
  } else {
    console.log("NO TOOLCHAIN CONFIGURED!");
  }
});

gulp.task('deploy', function(){
  uploadFiles(config, ['out/' + SAMPLE_NAME], ['./' + SAMPLE_NAME]);
});

var ssh = new simssh({
      host: config.device_ip_address,
      user: config.device_user_name,
      pass: config.device_password
    });

gulp.task('run', function () {
  ssh.exec('sudo chmod +x ./'+ SAMPLE_NAME + ' & sudo ./' + SAMPLE_NAME, {
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

function folderExists(path) {
  try {
    fs.statSync(path);
    return true;
  } catch (e) {
    return false;
  }
}
