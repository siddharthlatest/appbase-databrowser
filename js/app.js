'use strict';


// Declare app level module which depends on filters, and services
angular.module('tutorial', [
  'ngRoute',
  'ngCookies',
  'tutorial.controllers',
  'ui.codemirror'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {templateUrl: 'partials/start.html', controller: 'Starter'});
  $routeProvider.when('/:stepNo', {templateUrl: 'partials/steps.html', controller: 'Stepper'});
  $routeProvider.otherwise({redirectTo: '/'});
}]);
