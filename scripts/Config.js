(function(){
angular.module('AppbaseDashboard', ['ngAppbase',
                                    'ngRoute',
                                    'ng-breadcrumbs',
                                    'easypiechart',
                                    'ngAnimate',
                                    'ngDialog',
                                    'highcharts-ng',
                                    'ngClipboard'])
  .run(FirstRun);

function FirstRun($rootScope, $location, session, $route, $timeout, Apps, $routeParams){
  // changed the way sessions are stored, so to prevent errors:
  var oldSession = sessionStorage.getItem('apps');
  if(oldSession){
    try {
      oldSession = JSON.parse(oldSession);
      if(!angular.isArray(oldSession)) clearSession();
    } catch(e){
      Apps.clear();
    }
  } else Apps.clear();
  // end session fixing 
  
  if(!localStorage.getItem('devProfile') || localStorage.getItem('devProfile') === 'null'){
    Apps.clear();
    session.setProfile(null);
    $rootScope.logged = false;
    $location.path('/login');
  } else $rootScope.logged = true;

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

  function getSecret(apps, app){
    if(angular.isObject(app)) {
      return app.secret;
    }

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
  $rootScope.goToDash = function(app) {
    if(app) {
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
    $route.reload();
  }
  $rootScope.goToStats = function(path){
    $location.path('/' + path + '/dash/');
  }
  $rootScope.goToOauth = function(path){
    $location.path('/' + path + '/oauth/');
  }
  $rootScope.where = function(here){
    if($location.path() === '/' || $location.path() === '/apps') return 'apps';
    if($location.path() === '/invite') return 'invite';
    if($location.path() === '/billing') return 'billing';
    return $location.path().split('/')[2];
  }
  document.addEventListener('postLogin', function() {
    $timeout(function(){
      $rootScope.logged = true;
      $location.path('/');
    });
  });

} 

})();


