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
                     '$appbase', 
                     AppsCtrl ]
);

function AppsCtrl($scope, session, $route, data, $timeout, stringManipulation, $rootScope, oauthFactory, $appbase) {
  $scope.api = false;
  $scope.devProfile = $rootScope.devProfile = session.getProfile();
  $scope.apps = session.getApps() || [];

  $rootScope.db_loading = !$scope.apps;
  $scope.fetching = true;

  $rootScope.loadApps(function(){
    $timeout(function(){
      $scope.apps = session.getApps();
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
        $rootScope.loadApps(function(){
          $timeout(function(){
            $scope.apps = session.getApps();
            $scope.creating = false;
            $scope.fetching = false;
            $rootScope.goToDash(app);
          });
        });
      } 
    })
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