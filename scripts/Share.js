(function(){
angular
.module('AppbaseDashboard')
.controller('sharingCtrl', SharingCtrl);

function SharingCtrl($scope, $rootScope, data, $timeout, session, $routeParams){
  var app;

  $scope.addUser = function(){
    var email = session.getProfile().email;
    var adding = $scope.input;
    app = app || $routeParams.app;
    $scope.refreshing = true;

    data.accountsAPI.app.get(app, 'owners').then(function(owners){
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
    app = app || $routeParams.app;
    $scope.refreshing = true;
    data.deleteUser(app, user).catch(sentry).then(function(){
      getUsers();
    });
  }

  function getUsers(owners){
    var users = data.accountsAPI.app.get(app, 'users');

    if(!owners) data.accountsAPI.app.get(app, 'owners').then(process);
    else process(owners);

    function process(owners) {
      var email = session.getProfile().email;
      if(owners.indexOf(email) !== -1) {
        $scope.owner = true;
        $scope.placeholder = 'Add new user email';
      } else {
        $scope.placeholder = 'You must own the app to add users';
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
