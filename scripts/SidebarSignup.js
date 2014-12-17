(function(){
angular
.module("AppbaseDashboard")
.controller('signup', ['$rootScope', '$scope', 'session', '$route', '$location', SignupCtrl])
.controller('sidebar', SidebarCtrl)
.controller('navbar', NavbarCtrl);

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
  }
    
  $appbase.authPopup('google', { authorize: { scope: ['openid email'] } }, function(error, result, req) {
    if(error) {
      throw error;
    }
    proceed(result);
  })   
}

function NavbarCtrl($rootScope, $scope, session){
  if($scope.devProfile = session.getProfile()) {
    Appbase.credentials("appbase_inviteafriend", "0055eb35f4217c3b4b288250e3dee753");
    var userProfile = JSON.parse(localStorage.getItem('devProfile'));
    var email = userProfile.email.replace('@','');
    var usersNS = Appbase.ns("users");
    var inviteNS = Appbase.ns("sentinvites");
    var userV = usersNS.v(email);

    userV.on('properties', function (err,ref,userSnap) {
      if(userSnap && userSnap.properties() && userSnap.properties().invites){
        $('#user-balance').html([userSnap.properties().invites,'.1M'].join(''));
        $rootScope.balance = (userSnap.properties().invites * 1000000) + 100000 ;
      }
      else{
        $('#user-balance').html('100K');
        $rootScope.balance = 100000;
      }
      $rootScope.$apply();
    });
  }
}

})();