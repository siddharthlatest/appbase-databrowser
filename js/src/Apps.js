(function(){
angular
.module("abDataBrowser")
.controller("apps", ['$scope', 'session', '$route', 'data', '$timeout', 'stringManipulation', '$rootScope', 'oauthFactory', AppsCtrl]);

function AppsCtrl($scope, session, $route, data, $timeout, stringManipulation, $rootScope, oauthFactory){
  $scope.api = true;
  Prism.highlightAll();
  if($scope.devProfile = session.getProfile()) {
    $rootScope.logged = true;
    $.post('http://162.243.5.104:8080/u', {user: $scope.devProfile.id}).done(function(data){
      $rootScope.code = (data == "true");
      $rootScope.$apply();
      if($rootScope.code) console.log('User has $50 coupon.');
    });
    $rootScope.affiliate = false; 
    $scope.devProfile.emails.forEach(function(email){
      $.ajax({url:'http://162.243.5.104:8088/e', type:"POST",
        data: JSON.stringify({email: email.value}), contentType:"application/json; charset=utf-8",
        dataType:"json",
        success: function(data){
          console.log(email.value, ': ', data)
          $timeout(function(){
             if(data) $rootScope.affiliate = true;
          });
        } 
      });
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

    $scope.logout = function() {
      $timeout(function(){
        $rootScope.logged = false;
        session.setApps(null);
        session.setProfile(null);
        $route.reload();
      });
    }

    $scope.appToURL = stringManipulation.appToURL;
    fetchApps()
  } else {
    $scope.loginPopup = function() {
      OAuth.popup('google')
        .done(function(result) {
          result.me()
            .done(function(profile) {
              session.setProfile(profile.raw);
              $route.reload();
            })
            .fail(console.log.bind(console))
        })
        .fail(console.log.bind(console))
    }
  }
  $rootScope.$watch('fetching', function(data){
    $scope.fetching = data;
  });
}
})();