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
  if($scope.devProfile = session.getProfile()) {
    console.log($scope.devProfile)
    $.post('http://162.243.5.104:8080/u', {user: $scope.devProfile.uid}).done(function(data){
      $rootScope.code = (data == "true");
      $rootScope.$apply();
      if($rootScope.code) console.log('User has $50 coupon.');
    });
    $rootScope.affiliate = false; 
    $.ajax({url:'http://162.243.5.104:8088/e', type:"POST",
      data: JSON.stringify({email: $scope.devProfile.email}), contentType:"application/json; charset=utf-8",
      dataType:"json",
      success: function(data){
        console.log($scope.devProfile.email, ': ', data)
        $timeout(function(){
           if(data) $rootScope.affiliate = true;
        });
      }
    });
    
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
      data.deleteApp(app, function(error) {
        if(error) throw error;
        else fetchApps();
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