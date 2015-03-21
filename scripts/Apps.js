(function(){
angular
.module("AppbaseDashboard")
.controller("apps",[ '$scope',
                     'session',
                     '$route', 
                     'data', 
                     '$timeout', 
                     'stringManipulation', 
                     '$rootScope', 
                     'oauthFactory', 
                     'Apps', 
                     AppsCtrl ]
);

function AppsCtrl($scope, session, $route, data, $timeout, stringManipulation, $rootScope, oauthFactory, Apps) {
  $scope.api = false;
  $scope.devProfile = $rootScope.devProfile = session.getProfile();
  $scope.apps = Apps.get();
  
  $rootScope.db_loading = !$scope.apps;
  $scope.fetching = true;

  Apps.refresh().then(function(apps){
    $timeout(function(){
      $scope.apps = apps;
      apps.forEach(function(app){
        var promises = ['metrics', 'secret'];
        promises.forEach(function(prop){
          if(!app[prop]) app['$' + prop]();
        });
      });
      $scope.fetching = false;
      $rootScope.db_loading = false;
    });
  });

  $scope.createApp = function (app) {
    $scope.creating = true;
    $scope.fetching = true;
    data.createApp(app, function(error) {
      if(error) {
        $scope.creating = false;
        $scope.fetching = false;
        alert('Name taken. Try another name.');
      } else {
        $rootScope.loadApps(function(apps){
          $timeout(function(){
            $scope.apps = apps;
            $scope.creating = false;
            $scope.fetching = false;
            $rootScope.goToDash(app);
          });
        });
      } 
    });
  };

  $scope.copy = function(app) {
    $timeout(function(){
      app.copied = true;
    });

    $timeout(function(){
      app.copied = false;
    }, 2000);
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

  $scope.appToURL = stringManipulation.appToURL;
}
})();