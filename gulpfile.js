const gulp = require('gulp')
const browserify = require('gulp-browserify')
const uglify = require('gulp-uglify')
const rename = require("gulp-rename")

gulp.task('default', function () {
  return gulp.src('./src/rsa-form-encryptor.js')
    .pipe(browserify())
    .pipe(uglify())
    .pipe(rename(function (path) {
      path.basename += ".min"
      path.extname = ".js"
    }))
    .pipe(gulp.dest('./dist'))
})