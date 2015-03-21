(function(){

angular
.module("AppbaseDashboard")
.config(['$routeProvider', '$locationProvider', Routes]);

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
      path: '/:app/browser',
      dependencies: ['secret']
    }, {
      name: 'dash',
      path: '/:app/dash',
      dependencies: ['metrics', 'stats']
    }, {
      name: 'oauth',
      path: '/:app/oauth',
      dependencies: ['secret']
    }, {
      name: 'signup',
      path: '/signup'
    }, {
      name: 'invite',
      path: '/invite'
    }, {
      name: 'billing',
      path: '/billing'
    },
  ];

  var baseUrl = '/developer/html/';
  controllers.forEach(function(controller){
    var routeObj = {
      controller: controller.name,
      templateUrl: baseUrl + controller.name + '.html'
    };
    if(controller.dependencies) {
      routeObj.resolve = function(Apps, $q){
        return buildResolve(Apps, $q, controller.dependencies);
      };
    }
    $routeProvider.when(controller.path, routeObj);
  });


  $routeProvider.otherwise( { redirectTo: '/' } );

  function buildResolve(Apps, $q, dependencies){
    var deferred = $q.defer();
    var apps = Apps.get();

    if(!Apps.updated()){
      var promises = [];
      dependencies.forEach(function(dependency){
        var depName = '$' + dependency;
        var promise = angular.isFunction(apps[depName]) ? apps[depName]() : apps[depName];
        promises.push(promise);
      });

      $q.all(promises).then(deferred.resolve);
    } else deferred.resolve();

    return deferred.promise;
  }

  //$locationProvider.html5Mode(true).hashPrefix('!');

}

})();