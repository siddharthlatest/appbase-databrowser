/**
 * Created by Sagar on 30/8/14.
 */
(function(){
angular.module("AppbaseDashboard", ['ngAppbase',
                                    'ngRoute',
                                    'ng-breadcrumbs',
                                    'easypiechart',
                                    'ngAnimate',
                                    'ngDialog'])
  .run(FirstRun)
  .config(Routes);

function FirstRun($rootScope, $location, stringManipulation, session, $route){
  if(!localStorage.getItem('devProfile') || localStorage.getItem('devProfile') === 'null'){
    session.setApps(null);
    session.setProfile(null);
    $rootScope.logged = false;
  } else {
    $rootScope.logged = true;
  }
  $rootScope.currentApp = sessionStorage.getItem('URL')?stringManipulation.urlToAppname(sessionStorage.getItem('URL')):'';
  $rootScope.$watch('currentApp', function(app){
    sessionStorage.setItem('URL', stringManipulation.appToURL(app));
    if(app){
      var local = localStorage.getItem('appStack');
      if(local) {
        local = JSON.parse(local);
        local.splice(local.indexOf(app), 1);
        local.unshift(app);
        localStorage.setItem('appStack', JSON.stringify(local));
      }
    }
  });
  $rootScope.goToInvite = function() {
    $location.path('/invite');
  }

  $rootScope.goToBilling = function() {
    $location.path('/billing');
  }

  $rootScope.goToApps = function() {
    $location.path('/');
  }
  $rootScope.goToBrowser = function(path) {
    session.setBrowserURL(path);
    $rootScope.currentApp = stringManipulation.urlToAppname(path);
    $location.path('/' + $rootScope.currentApp + '/browser/');
  }
  $rootScope.goToStats = function(path){
    if(path) $rootScope.currentApp = path;
    else path = $rootScope.currentApp;
    $location.path('/' + path + '/stats/');
  }
  $rootScope.goToOauth = function(path){
    if(path) $rootScope.currentApp = path;
    else path = $rootScope.currentApp;
    $location.path('/' + path + '/oauth/');
  }
  $rootScope.where = function(here){
    if($location.path() === '/') return 'apps';
    if($location.path() === '/invite') return 'invite';
    if($location.path() === '/billing') return 'billing';
    return $location.path().split('/')[2];
  }
  document.addEventListener('postLogin', function() {
    $rootScope.logged = true;
    $route.reload();
  });
  document.addEventListener('logout', function(){
    $rootScope.$apply(function(){
      $rootScope.logged = false;
    });
  });
} 

function Routes($routeProvider){
  var browser = {
    controller: 'browser',
    templateUrl: '/developer/html/browser.html'
  }, stats = {
    controller: 'stats',
    templateUrl: '/developer/html/stats.html'
  }, apps = {
    controller: 'apps',
    templateUrl: '/developer/html/apps.html'
  }, signup = {
    controller: 'signup',
    templateUrl: '/developer/html/signup.html'
  }, oauth = {
    controller: 'oauthd',
    templateUrl: '/developer/html/oauth.html'
  }, invite = {
    controller: 'invite',
    templateUrl: '/developer/html/invite.html'
  }, billing = {
    controller: 'billing',
    templateUrl: '/developer/html/billing.html'
  };

  $routeProvider
    .when('/', apps)
    .when('/invite', invite)
    .when('/billing', billing)
    .when('/signup', signup)
    .when('/:path/browser', browser)
    .when('/:path/stats', stats)
    .when('/:path/oauth', oauth)
    .otherwise({ redirectTo: '/' });
}
})();


