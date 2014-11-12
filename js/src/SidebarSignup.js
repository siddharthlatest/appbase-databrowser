(function(){
angular
.module("abDataBrowser")
.controller('signup', ['$rootScope', '$scope', 'session', '$route', '$location', SignupCtrl])
.controller('sidebar', SidebarCtrl);

function SidebarCtrl($scope, $rootScope){
  $scope.hide = false;
  $scope.code = false;
  $scope.logged = false;
  $scope.$on('$routeChangeSuccess', function(event, current, prev) {
    $scope.currentScope = current? current.controller: undefined
  });

  $rootScope.$watch('hide', function(data){
    if(typeof data !== 'undefined') $scope.hide = data;
  });

  $rootScope.$watch('code', function(data){
    $scope.code = data ? '$50' : '$0';
  })
  
  $rootScope.$watch('logged', function(data){
    $scope.logged = data;
  })
}

function SignupCtrl($rootScope, $scope, session, $route, $location){
  $rootScope.hide = true;
  $scope.promoCode = function(){
    var proceed = function(profile) {
      var userID = profile.uid;
      $.post('http://162.243.5.104:8080', {code: $scope.codeInput, user: userID}).done(function(data){
        if(data == "true") {
          profile["code"] = true;
          console.log('here')
          session.setProfile(profile);
          $.post('http://162.243.5.104:8080/u', {user: userID}).done(function(data) {
            console.log(data)
            $rootScope.hide = false;
            if(data == "true") {
              $rootScope.code = true;
              $rootScope.goToApps();
              $rootScope.$apply();
            } else {
              $rootScope.goToApps();
              $rootScope.$apply();
            }
          })
        } else {
          console.log(data);
          alert('Sorry, unable to verify your code.');
          $route.reload();
        }
      })
    }

    Appbase.credentials('aphrodite');
    Appbase.authPopup('google', { authorize: { scope: ['openid email'] } }, function(error, result, req) {
      if(error) {
        throw error;
      }
      proceed(result);
    })
  }
  
    
}

})();