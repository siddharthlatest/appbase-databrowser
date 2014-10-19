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

    OAuth.popup('google')
      .done(function(result) {
        result.me()
          .done(function(profile) {
            var userID = profile.raw.id;
            $.post('http://162.243.5.104:8080', {code: $scope.codeInput, user: userID}).done(function(data){
              if(data == "true"){
                profile.raw["code"] = true;
                console.log('here')
                session.setProfile(profile.raw);
                $.post('http://162.243.5.104:8080/u', {user: userID}).done(function(data){
                  console.log(data)
                  $rootScope.hide = false;
                  if(data == "true"){
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
        })
        .fail(console.log.bind(console))
    })
    .fail(console.log.bind(console))
    
  }
}

})();