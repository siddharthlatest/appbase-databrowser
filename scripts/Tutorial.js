(function(){
angular
.module("AppbaseDashboard")
.controller('start', Start)
.run(Authenticate);

function Authenticate($rootScope, session, oauthFactory, $appbase, $route, $timeout, data, $location) {
  $rootScope.devProfile = session.getProfile();
  $rootScope.db_loading = false;
  if($rootScope.devProfile) {
    loadApps();
  }

  document.addEventListener('logout', function() {
    $timeout(function(){
      $rootScope.logged = false;
      $appbase.unauth();
      session.setApps([]);
      session.setProfile(null);
      $route.reload();
    });
  });

  document.addEventListener('login', loadApps);

  $rootScope.loadApps = loadApps;

  function loadApps(callback){
    console.time('load')
    session.fetchApps(function(){
      $timeout(function(){
        console.timeEnd('load')
        $rootScope.$broadcast('appsLoaded');
        $rootScope.apps = session.getApps();
        $rootScope.db_loading = false;
        if(angular.isFunction(callback)) callback($rootScope.apps);
      });
      oauthFactory.updateApps();
    });
  }

  $rootScope.deleteApp = function(app) {
    var a = new BootstrapDialog({
        title: 'Delete app',
        message: 'Are you sure you want to delete <span class="bold">' + app +
        '</span>?<br>Enter the app name to confirm.<br><br>'
        + '<div class="form-group"><input type="text" class="form-control" /></div>'
        ,
        closable: false,
        cssClass: 'modal-custom',
        buttons: [{
            label: 'Cancel',
            cssClass: 'btn-no',
            action: function(dialog) {
                dialog.close();
            }
        }, {
            label: 'Yes',
            cssClass: 'btn-yes',
            action: function(dialog) {
              var input = dialog.getModalBody().find('.form-group');
              var value = input.find('input').val();
              if(value === app){
                $rootScope.deleting = app;
                data.deleteApp(app, function(error) {
                  if(error){
                    $rootScope.deleting = '';
                    throw error;
                  }
                  else {
                    $rootScope.$apply(function(){
                      $location.path('/apps');
                    });
                  }
                });
                dialog.close();
              } else {
                input.addClass('has-error');
              }
            }
        }]
    }).open();
  }
}

function Start($rootScope, session, $location, $scope, $timeout) {
  var user = session.getProfile();
  var apps = session.getApps();
  var currentApp = $rootScope.currentApp;

  if(currentApp) {
  	$location.path(currentApp + '/dash');
  } else {
    $rootScope.loadApps(function(apps){
      if(!apps.length) {
        $timeout(function(){
          tutorial();
        });
      } else {
        $location.path('/apps');
      }
    });
  }

  function tutorial(){
    // To do: tutorial
    $location.path('/apps');
    //$scope.tutorialMode = true;

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
  // 	$rootScope.$on('appsLoaded', function(){
  // 		console.log('loaded')
  // 	})
  // } else console.log(apps)
}

})();