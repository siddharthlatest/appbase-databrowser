(function(){
angular
.module("AppbaseDashboard")
.controller('sharingCtrl', SharingCtrl);

function SharingCtrl($scope, $rootScope, data, $timeout, session){
  var app;

  $scope.addUser = function(){
    var email = session.getProfile().email;
    var adding = $scope.input;
    app = app || $rootScope.currentApp;
    $scope.refreshing = true;

    data.getGeneric(app, 'owners').catch(sentry).then(function(owners){
      if(owners.indexOf(email) !== -1) {
        var user = data.putUser(app, adding).catch(sentry);
        var application = data.putApp(adding, app).catch(sentry);

        user.then(function(){
          application.then(function(){
            getUsers(owners);
          });
        });
      } else {
        $timeout(function(){
          $scope.refreshing = false;
        });
      }
    });
  };

  $rootScope.share = function(_app){
    $scope.loading = true;
    app = _app;
    var email = session.getProfile().email;

    $rootScope.sharing = true;
    $scope.owner = false;
    $scope.email = email;

    getUsers();
  }

  $scope.delete = function(user){
    app = app || $rootScope.currentApp;
    $scope.refreshing = true;
    data.deleteUser(app, user).catch(sentry).then(function(){
      getUsers();
    });
  }

  function getUsers(owners){
    var users = data.getGeneric(app, 'users').catch(sentry);

    if(!owners) data.getGeneric(app, 'owners').catch(sentry).then(process);
    else process(owners);

    function process(owners) {
      var email = session.getProfile().email;
      if(owners.indexOf(email) !== -1) {
        $scope.owner = true;
        $scope.placeholder = 'Add new user email';
      } else {
        $scope.placeholder = 'You need to own the app to add users';
      }
      users.then(function(users){
        owners.forEach(function(owner){
          if(users.indexOf(owner) === -1) {
            users.unshift(owner);
          }
        });
        $timeout(function(){
          $scope.users = users;
          $scope.refreshing = false;
          $scope.loading = false;
          $scope.input = '';
        });
      });
    }
  }
}

})();
