(function(){
angular
.module("AppbaseDashboard")
.controller('navbar', NavbarCtrl);


function NavbarCtrl($rootScope, $scope, session){
  if($scope.devProfile = session.getProfile()) {
    Appbase.credentials("appbase_inviteafriend", "0055eb35f4217c3b4b288250e3dee753");
    var userProfile = JSON.parse(localStorage.getItem('devProfile'));
    var email = userProfile.email.replace('@','').replace('.','');
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