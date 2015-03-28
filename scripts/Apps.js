(function(){
angular
.module('AppbaseDashboard')
.controller("apps",[ '$scope',
                     'session',
                     '$route', 
                     'data', 
                     '$timeout', 
                     'utils', 
                     '$rootScope', 
                     'Apps',
                     'Loader',
                     AppsCtrl ]
);

function AppsCtrl($scope, session, $route, data, $timeout, utils, $rootScope, Apps, Loader){
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

  $scope.createApp = function (app) {
    $scope.creating = true;
    $scope.fetching = true;
    Loader(20);
    data.createApp(app).then(function(){
      $rootScope.goToDash(app);
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

  $scope.firstAPICall = function() {
    BootstrapDialog.show({
      message: $('<div></div>').load('/include/modal-api.html'),
      cssClass: 'modal-custom modal-examples',
      title: "Let's get kicking"
    });
  }

  $scope.examplesModal = function() {
    BootstrapDialog.show({
      message: $('<div></div>').load('/include/modal-examples.html'),
      cssClass: 'modal-custom modal-examples',
      title: "Example Recipes"
    });
  }

  $scope.docsModal = function() {
    BootstrapDialog.show({
      message: $('<div></div>').load('/include/modal-docs.html'),
      cssClass: 'modal-custom modal-examples',
      title: "Docs"
    });
  }

  $scope.share = function() {
    BootstrapDialog.show({
      message: 'Coming soon.',
      cssClass: 'modal-custom modal-examples',
      title: "Sharing"
    });
  }

  $scope.appToURL = utils.appToURL;
}
})();