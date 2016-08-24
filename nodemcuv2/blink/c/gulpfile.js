var gulp = require('gulp');
var shell = require('gulp-shell');

var prefix = 'start c:\\windows\\sysnative\\bash.exe -c "';
var postfix = '"';

gulp.task('default', function() {
  // place code for your default task here
});

gulp.task('get-tools', function () {
    console.log(
      shell([
          "echo DUPA",
          "echo KUTAFON"
      ], {})
    );
});

gulp.task('build', shell.task([
    'echo hello',
    'echo world'
]))

gulp.task('deploy', shell.task([
    prefix + 'echo hello' + postfix,
    prefix + 'echo world' + postfix
]))