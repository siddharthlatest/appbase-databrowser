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
        message: " <ul><li>Create an app from the dashboard.</li><li>Paste the tutorial code from step 4 (link to step 4) into your favorite editor. Make sure to use the app credentials from step 1.<li>That's it. You now have a chat app completely working on the client side. You can add this chat app on your server, on github pages, anywhere.</li><li>Make sure to make an API call.</li></ul>",
        cssClass: 'confirm-del',
        title: "Let's get kicking"
      });
    }

    $scope.examplesModal = function() {
      BootstrapDialog.show({
        message: "<ul><li>Twitter: A realtime twitter clone written in ~400 lines of JS (app link, blog post link, github link)</li><li>Hooli: Slack meets Trello - A minimalistic realtime collaboration tool to keep your team in sync (app link)</li><li>Jam with friends - Play live piano with your friends (app link, blog link, github link)</li><li>Jam with friends on NodeJS - Doing analytics on NodeJS (blog link, github link)</li></ul>",
        cssClass: 'confirm-del',
        title: "Example Recipes"
      });
    }

    $scope.docsModal = function() {
      BootstrapDialog.show({
        message: '<ul><li><a href="http://docs.appbase.io/docs/datamodel.html">Data model</a></li><li><a href="http://docs.appbase.io/docs/rest.html">REST API</a></li><li><a href="http://docs.appbase.io/docs/js.html">JS API</a></li><li><a href="http://docs.appbase.io/docs/angular.html">AngularJS binding</a></li><li> <a href="http://docs.appbase.io/docs/authentications.html">Authentications</a></li></ul>',
        cssClass: 'confirm-del',
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