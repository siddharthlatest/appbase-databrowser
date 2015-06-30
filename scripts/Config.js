(function(){
angular.module('AppbaseDashboard', ['ngAppbase',
                                    'ngRoute',
                                    'ng-breadcrumbs',
                                    'ngAnimate',
                                    'ngDialog',
                                    'highcharts-ng',
                                    'ngClipboard'])
  .run(Authenticate);

function Authenticate($rootScope, session, $appbase, $timeout, $location, Apps, $routeParams) {

  if(!localStorage.getItem('devProfile') || localStorage.getItem('devProfile') === 'null'){
    Apps.clear();
    session.setProfile(null);
    $rootScope.logged = false;
    $location.path('/login');
  } else $rootScope.logged = true;

  auth();

  $rootScope.$watch('logged', function(logged){
    if(logged) auth();
  });

  document.addEventListener('logout', logout);
  document.addEventListener('postLogin', login);

  function auth(){
    $rootScope.devProfile = session.getProfile();
    if($rootScope.devProfile) {
      Apps.refresh();
    }
  }

  function logout(){
    $timeout(function(){
      $rootScope.logged = false;
      $appbase.unauth();
      Apps.clear();
      session.setProfile(null);
      $location.path('/login');
    });
  }

  function login(){
    $timeout(function(){
      $rootScope.logged = true;
      $location.path('/');
    });
  }

  $rootScope.where = function(here) {
    var path = $location.path().split('/');
    if( ($routeParams.app || path[1] === 'apps') && here === 'apps') return true;
    return here ? (path[1] === here) : path[1];
  }

}

})();


