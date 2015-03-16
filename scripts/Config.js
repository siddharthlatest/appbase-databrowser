function sentry(error) {
  if(Raven) {
    Raven.captureException(error);
  } else {
    throw new Error(error);
  }
}

(function(){
angular.module("AppbaseDashboard", ['ngAppbase',
                                    'ngRoute',
                                    'ng-breadcrumbs',
                                    'easypiechart',
                                    'ngAnimate',
                                    'ngDialog',
                                    'highcharts-ng'])
  .run(FirstRun)
  .config(Routes);

function FirstRun($rootScope, $location, stringManipulation, session, $route, $timeout){
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
    externalLibs();
  }

  var url = sessionStorage.getItem('URL');
  $rootScope.currentApp = url ? stringManipulation.urlToAppname(url) : '';

  var apps = session.getApps();

  if(apps.length) {
    var profile = session.getProfile();
    if(profile){
      var order = localStorage.getItem(profile.uid + 'order');
      if(order) {
        order = JSON.parse(order);
        $rootScope.currentApp = order[0];
      } else {
        $rootScope.currentApp = apps[0];
      }
    }
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

  $rootScope.confirm = function(title, message, callback, field){
    var a = new BootstrapDialog({
        title: title,
        message: message
        + (field ? '<div class="form-group"><input type="text" class="form-control" /></div>':''),
        cssClass: 'modal-custom',
        closable: false,
        buttons: [{
            label: 'Cancel',
            cssClass: 'btn-no',
            action: function(dialog) {
                dialog.close();
            }
        }, {
            label: 'Yes',
            cssClass: 'btn-yes',
            action: function(dialog) {
              var input = dialog.getModalBody().find('.form-group');
              var value = input.find('input').val();
              if(!field) {callback();dialog.close();}
              else if(value) callback(value);  
            }
        }]
    }).open();
  }

  $rootScope.shareApp = function(app){
    $rootScope.sharing = true;
    $('#share-modal').modal('show');
  }

  function getSecret(apps, app){
    if(angular.isObject(app)) {
      return app.secret;
    }

    return apps.filter(function(each){
      return each.name === app;
    })[0].secret;
  }

  $rootScope.getAppFromName = getAppFromName;

  function getAppFromName(name){
    var apps = session.getApps();
    if (apps && apps.length) {
      var filter = apps.filter(function(each){
        return each.name === name;
      });

      return filter.length ? filter[0] : null;
    } else return null;
  }

  $rootScope.goToInvite = function() {
    $location.path('/invite');
  }

  $rootScope.goToBilling = function() {
    $location.path('/billing');
  }
  $rootScope.goToDash = function(app) {
    if(app) {
      $rootScope.currentApp = app;
      $location.path('/' + app + '/dash');
    }
  }
  $rootScope.goToApps = function() {
    $timeout(function(){
      $location.path('/apps');
    });
  }
  $rootScope.goToBrowser = function(path) {
    session.setBrowserURL(path);
    $rootScope.currentApp = stringManipulation.urlToAppname(path);
    $location.path('/' + $rootScope.currentApp + '/browser/');
  }
  $rootScope.goToStats = function(path){
    if(path) $rootScope.currentApp = path;
    else path = $rootScope.currentApp;
    $location.path('/' + path + '/dash/');
  }
  $rootScope.goToOauth = function(path){
    if(path) $rootScope.currentApp = path;
    else path = $rootScope.currentApp;
    $location.path('/' + path + '/oauth/');
  }
  $rootScope.where = function(here){
    if($location.path() === '/' || $location.path() === '/apps') return 'apps';
    if($location.path() === '/invite') return 'invite';
    if($location.path() === '/billing') return 'billing';
    return $location.path().split('/')[2];
  }
  document.addEventListener('postLogin', function() {
    $rootScope.logged = true;
    externalLibs();
    $route.reload();
  });
  document.addEventListener('logout', function(){
    $rootScope.$apply(function(){
      $rootScope.logged = false;
    });
  });

  $rootScope.$on('$routeChangeSuccess', function(){
    window.Intercom('update');
  });

  window.Raven.config('https://08f51a5b99d24ba786e28143316dfe5d@app.getsentry.com/39142').install();

  function externalLibs(){

    var obj = {
      name: 'unknown',
      email: 'unknown',
      uid: 'unknown'
    };

    var user = session.getProfile() || obj;

    window.Raven.setUser({
        email: user.email,
        id: user.uid
    });
    
    window.Intercom('boot', {
      app_id: "jnzcgdd7",
      name: user.name,
      email: user.email
    });

  }
} 

function Routes($routeProvider, $locationProvider){
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
  }, start = {
    controller: 'start',
    templateUrl: '/developer/html/start.html'
  };

  //$locationProvider.html5Mode(true).hashPrefix('!');

  $routeProvider
    .when('/', start)
    .when('/invite', invite)
    .when('/billing', billing)
    .when('/signup', signup)
    .when('/:path/browser', browser)
    .when('/:path/dash', stats)
    .when('/:path/oauth', oauth)
    .when('/apps', apps)
    .otherwise({ redirectTo: '/' });
}
})();


