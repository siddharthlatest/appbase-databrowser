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
  $rootScope.db_loading = true;
  // changed the way sessions are stored, so to prevent errors:
  var oldSession = sessionStorage.getItem('apps');
  if(oldSession){
    try {
      oldSession = JSON.parse(oldSession);
      if(!angular.isArray(oldSession)) clearSession();
    } catch(e){
      clearSession();
    }
  } else clearSession();
  function clearSession(){
    sessionStorage.setItem('apps', '[]');
  }
  // end session fixing 
  
  if(!angular.isArray())
  if(!localStorage.getItem('devProfile') || localStorage.getItem('devProfile') === 'null'){
    session.setApps(null);
    session.setProfile(null);
    $rootScope.logged = false;
  } else {
    $rootScope.logged = true;
  }

  var url = sessionStorage.getItem('URL');
  $rootScope.currentApp = url ? stringManipulation.urlToAppname(url) : '';

  var apps = session.getApps();

  if(apps && $rootScope.currentApp) {
    $rootScope.currentSecret = getSecret(apps, $rootScope.currentApp);
  }
  
  $rootScope.$watch('currentApp', function(app){
    sessionStorage.setItem('URL', stringManipulation.appToURL(app));
    var apps = session.getApps();

    if(app && apps.length){
      $rootScope.currentSecret = getSecret(apps, app);

      var appRef = apps.filter(function(b){
        return b.name === app;
      })[0];

      apps.splice(apps.indexOf(appRef), 1);
      apps.unshift(appRef); //moved app to top of array
      session.setApps(apps);
      
      var order = [];
      apps.forEach(function(app){
        order.push(app.name);
      });
      
      localStorage.setItem(session.getProfile().uid + 'order', JSON.stringify(order));
    }
  });

  function getSecret(apps, app){
    return apps.filter(function(each){
      return each.name === app;
    })[0].secret;
  }
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


