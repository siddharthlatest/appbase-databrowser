(function(){
angular
.module('AppbaseDashboard')
.controller('topnav', TopNavCtrl);

function TopNavCtrl($scope, $routeParams, Apps, $timeout, data, $location, Loader, $rootScope) {
  var appName, secret;

  $scope.routeParams = $routeParams;
  $scope.where = $location.path().split('/')[2];

  Apps.appFromName($scope.routeParams.app).then(function(app){
    app.$version().then(function(){
      $timeout(function(){
        $rootScope.version = app.version;
      });
    });

    app.$secret().then(function(){
      $timeout(function(){        
        $scope.secret = secret = app.secret;
      });
    });
  });

  $scope.deleteApp = function(app){
    Loader(10);
    Apps.appFromName(app).then(function(appObj){
      appObj.$secret().then(function(){
        data.deleteApp(app, appObj.secret).then(function(){
          $timeout(function(){
            $location.path('/apps');
          });
        }).catch(function(error){
          sentry(error);
        });
      });
    });
  }

}

})();