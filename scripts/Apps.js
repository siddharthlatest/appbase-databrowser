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
  $rootScope.db_loading = true;
  $scope.api = false;
  Prism.highlightAll();
  $scope.devProfile = session.getProfile();
  if($scope.devProfile) {
    var fetchApps = function() {
      $scope.fetching = true;
      data.getDevsApps(function(apps) {
        $timeout(function(){
          for(var app in apps){
            oauthFactory.getApp(app, apps[app].secret)
            .then(function(data){
              apps[app].oauth = data;
            }, function(data){
              throw data;
            });
          }
          $scope.fetching = false;

          $scope.apps = apps;
          session.setApps(apps);
        })
      });
      $rootScope.db_loading = false;
    }

    $scope.createApp = function (app) {
      data.createApp(app, function(error) {
        if(error) {
          alert('Name taken. Try another name.');
        } else {
          fetchApps();
        } 
      })
    }

    $scope.deleteApp = function(app) {

      var a = new BootstrapDialog({
          title: 'Delete app',
          message: 'Are you sure you want to delete ' + app + '?',
          closable: false,
          cssClass: 'confirm-del',
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
                data.deleteApp(app, function(error) {
                  if(error) throw error;
                  else fetchApps();
                });
                dialog.close();
              }
          }]
      }).open();
    }

    document.addEventListener('logout', function() {
      $timeout(function(){
        $rootScope.logged = false;
        $appbase.unauth();
        session.setApps(null);
        session.setProfile(null);
        $route.reload();
      });
    });

    $scope.appToURL = stringManipulation.appToURL;
    fetchApps()
  } else {
    $rootScope.db_loading = false;
  }
}
})();