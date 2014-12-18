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
    var fetchApps = function(done) {
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
          if(done) done();
          $scope.fetching = false;

          $scope.apps = apps;
          session.setApps(apps);
        })
      });
      $rootScope.db_loading = false;
    }

    $scope.createApp = function (app) {
      $scope.creating = true;
      data.createApp(app, function(error) {
        if(error) {
          $scope.creating = false;
          alert('Name taken. Try another name.');
        } else {
          fetchApps(function(){
            $scope.creating = false;
          });
        } 
      })
    }

    $scope.deleteApp = function(app) {
      var a = new BootstrapDialog({
          title: 'Delete app',
          message: 'Are you sure you want to delete ' + app + '?',
          closable: false,
          cssClass: 'modal-custom',
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
                $scope.deleting = app;
                data.deleteApp(app, function(error) {
                  if(error){
                    $scope.deleting = '';
                    throw error;
                  }
                  else fetchApps(function(){
                    $scope.deleting = '';
                  });
                });
                dialog.close();
              }
          }]
      }).open();
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