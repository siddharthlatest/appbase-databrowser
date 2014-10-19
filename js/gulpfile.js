var gulp = require('gulp'),
	livereload = require('gulp-livereload'),
	concat = require('gulp-concat'),
	notify = require('gulp-notify');

gulp.task('scripts', function() {
	return gulp.src(['./src/Config.js', './src/*.js'])
		   .pipe(concat('main.js'))
		   .pipe(gulp.dest('./dist'))
		   .pipe(notify({ message: 'Scripts task complete' }));
});

gulp.task('watch', function() {

  // Watch .scss files
  // gulp.watch('src/styles/**/*.scss', ['styles']);
  // Watch image files
  // gulp.watch('src/images/**/*', ['images']);

  // Watch .js files
  gulp.watch('./src/*.js', ['scripts']);

  // Create LiveReload server
  livereload.listen();

  // Watch any files in dist/, reload on change
  gulp.watch(['./dist/*.js']).on('change', livereload.changed);
});

gulp.task('default', function() {
    gulp.start('scripts');
});