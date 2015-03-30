(function(){
angular
.module('AppbaseDashboard')
.controller('topnav', TopNavCtrl);

function TopNavCtrl($scope, $routeParams, Apps, $timeout, data, $location, Loader) {
  var appName, secret;

  $scope.routeParams = $routeParams;

  Apps.appFromName($scope.routeParams.app).then(function(app){
    app.$secret().then(function(){
      $timeout(function(){
        $scope.secret = secret = app.secret;
      });
    });
  });

  $scope.where = $location.path().split('/')[2];

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

  $scope.shareApp = function(app){
    $scope.sharing = true;
    $('#share-modal').modal('show');
  }
}

})();