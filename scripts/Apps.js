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
      session.fetchApps(function(){
        $scope.fetching = false;
        oauthFactory.updateApps();
        $scope.apps = session.getApps();
        $scope.$apply();
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
          message: 'Are you sure you want to delete <span class="bold">' + app +
          '</span>?<br>Enter the app name to confirm.<br><br>'
          + '<div class="form-group"><input type="text" class="form-control" /></div>'
          ,
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
                var input = dialog.getModalBody().find('.form-group');
                var value = input.find('input').val();
                console.log(value, app)
                if(value === app){
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
                } else {
                  input.addClass('has-error');
                }
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

    $scope.share = function() {
      BootstrapDialog.show({
        message: 'Coming soon.',
        cssClass: 'modal-custom modal-examples',
        title: "Sharing"
      });
    }

    document.addEventListener('logout', function(evnt) {
      $timeout(function(){
        $rootScope.logged = false;
        $appbase.unauth();
        session.setApps([]);
        session.setProfile(null);
        $route.reload();
      });
    });

    $scope.appToURL = stringManipulation.appToURL;
    $scope.apps = session.getApps() || [];
    fetchApps();
  } else {
    $rootScope.db_loading = false;
  }
}
})();