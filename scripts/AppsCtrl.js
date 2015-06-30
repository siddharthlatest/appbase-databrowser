(function(){
angular
.module('AppbaseDashboard')
.controller('apps',
  [
    '$route',
    '$location',
    '$rootScope',
    '$scope',
    '$timeout',
    'Apps',
    'Loader',
    'session',
    'data',
    'utils',
    AppsCtrl
  ]
);

function AppsCtrl($route, $location, $rootScope, $scope, $timeout, Apps, Loader, session, data, utils){
  $scope.apps = Apps.get();
  $scope.fetching = true;
  $scope.api = false;
  $scope.devProfile = $rootScope.devProfile = session.getProfile();
  
  Loader(25);

  refresh();

  function refresh(done){
    Apps.refresh().then(function(apps){
      Loader(80);
      $timeout(function(){
        if(!apps.length) tutorial();
        $scope.apps = apps;
        apps.forEach(function(app){
          var promises = ['metrics', 'secret'];
          promises.forEach(function(prop){
            app['$' + prop]();
          });
        });
        Loader(100);
        $scope.fetching = false;
        if(done) done();
      });
    }, sentry, function(){
      Loader(70);
    });
  }

  function tutorial(){
    if(!session.getProfile()) return;
  }

  $scope.goToDash = function(app) {
    $location.path('/' + app + '/dash');
  }

  $scope.createApp = function (app) {
    $scope.creating = true;
    $scope.fetching = true;
    Loader(20);
    data.createApp(app).then(function(){
      $timeout(function(){
        $scope.goToDash(app);
      });
    }).catch(function(){
      $scope.creating = false;
      $scope.fetching = false;  
      alert('Name taken. Try another name.');
    });
  };

  $scope.copy = function(app) {
    $timeout(function(){
      app.copied = true;
    });

    $timeout(function(){
      app.copied = false;
    }, 1500);
  }
}
})();