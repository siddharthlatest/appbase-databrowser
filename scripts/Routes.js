(function(){

angular
.module('AppbaseDashboard')
.config(['$routeProvider', '$locationProvider', Routes])
.controller('start', Start)
.factory('Loader', Loader);

function Loader($rootScope, $timeout) {
  return function(progress){
    $timeout(function(){
      $rootScope.loadLine = progress;
    });
  }
}

function Start(session, $location, Apps) {
  var user = session.getProfile();
  var lastApps = Apps.get();

  if(lastApps.length) {
    var lastApp = lastApps[0].name;
    $location.path(lastApp + '/dash');
  } else {
    $location.path('/apps');
  }

  // http://bootstraptour.com/api/#step-options
  // var tour = new Tour({
  //   steps: [
  //   {
  //     element: "#my-element",
  //     title: "Title of my step",
  //     content: "Content of my step",
  //     onNext: func
  //   },
  //   {
  //     element: "#my-other-element",
  //     title: "Title of my step",
  //     content: "Content of my step"
  //   }
  // ]});

  // tour.init();
  // tour.start();

  // if(!user || !apps.length) {
  // } else console.log(apps)
}

function Routes($routeProvider, $locationProvider){

  var controllers = [
    {
      name: 'start',
      path: '/'
    }, {
      name: 'apps',
      path: '/apps'
    }, {
      name: 'browser',
      path: '/:app/browser'
    }, {
      name: 'dash',
      path: '/:app/dash',
      resolve: {
        build: function(DashboardBuild, $route) {
          return DashboardBuild.build($route.current.params.app);
        }
      }
    }, {
      name: 'oauth',
      path: '/:app/oauth',
      resolve: {
        build: function(OauthBuild, $route) {
          return OauthBuild.build($route.current.params.app);
        }
      }
    }, {
      name: 'invite',
      path: '/invite'
    }, {
      name: 'billing',
      path: '/billing'
    }
  ];

  var baseUrl = '/developer/html/';
  controllers.forEach(function(controller){
    var routeObj = {
      controller: controller.name,
      templateUrl: baseUrl + controller.name + '.html'
    };
    if(controller.resolve) routeObj.resolve = controller.resolve;
    $routeProvider.when(controller.path, routeObj);
  });

  $routeProvider.when('/login', { templateUrl: baseUrl + 'login.html'});


  $routeProvider.otherwise( { redirectTo: '/' } );

  if(!window.localEnv) $locationProvider.html5Mode(true).hashPrefix('!');

}

})();