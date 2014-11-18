'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

gulp.task('default', function () {
    gulp.start('watch');
});

gulp.task('watch', ['styles', 'scripts'] ,function () {
  gulp.watch('styles/**/*.scss', ['styles']);
  gulp.watch('scripts/**/*.js', ['scripts']);
  gulp.watch('vendor/**/*.js', ['vendor']);
});

gulp.task('styles',  function () {
  return gulp.src('styles/**/*.scss')
    .pipe($.sass({style: 'compressed'}))
    .on('error', handleError)
    .pipe($.autoprefixer('last 1 version'))
    .pipe($.addSrc('styles/**/*.css'))
    .pipe($.concat('main.css'))
    .pipe(gulp.dest('dist'))
    .pipe($.size());
});

gulp.task('scripts', function () {
  gulp.src(['scripts/Config.js', 'scripts/**/*.js'])
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.concat('main.js'))
    .pipe(gulp.dest('dist'))
    .pipe($.size());
});

gulp.task('compact', ['vendor'], function() {
	return gulp.src('scripts/**/*.js')
		.pipe($.concat('main.min.js'))
		.pipe($.uglify())
		.pipe(gulp.dest('dist'))
    .pipe($.size());
});

gulp.task('vendor', function() {
  return gulp.src(['vendor/jquery.min.js',
                   'vendor/angular.min.js',
                   'vendor/angular-route.min.js',
                   'vendor/angular-animate.min.js',
                   'vendor/ng-breadcrumbs.js',
                   'vendor/angular.easypiechart.min.js',
                   'vendor/**/*.js'])
    .pipe($.concat('vendor.min.js'))
    .pipe(gulp.dest('dist'))
    .pipe($.size());
});

gulp.task('old', function(){
  return gulp.src('css/**/*.css')
    .pipe($.concat('old-style.css'))
    .pipe(gulp.dest('dist'))
    .pipe($.size());
});

function handleError(err, a){
	throw err;
}