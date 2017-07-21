const gulp = require('gulp')
const browserify = require('browserify')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const uglify = require('gulp-uglify')

gulp.task('default', function () {
  return browserify('./src/rsa-form-encryptor.js')
    .bundle()
    .pipe(source('rsa-form-encryptor.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('./dist'))
})