(function(){
angular
.module("AppbaseDashboard")
.factory('Apps', AppsFactory)
.controller('topnav', TopNavCtrl)
.run(Authenticate);

function TopNavCtrl($scope, $routeParams, Apps, $timeout) {
  $scope.routeParams = $routeParams;

  $scope.$on('$routeChangeSuccess', function(next, current){
    var appName = current.params.app;
    if(appName){
      var app = Apps.get().filter(function(app){
        return app.name === appName;
      })[0];
      app.$secret().then(function(){
        $timeout(function(){
          $scope.secret = app.secret;
        });
      })
    } 
  });
}

function AppsFactory(session, data, $q, $timeout, $rootScope, oauthFactory, $routeParams){
  var apps = getFromSession();
  var refreshing = false;
  var callsCalc = false;
  var updated = false;
  var calls = {};

  $rootScope.$on('$routeChangeSuccess', updateOrder);

  var retObj = {
    get: function(){
      return apps;
    },
    set: function(_apps){
      apps = _apps;
      session.setApps(apps);
    },
    clear: function(){
      apps = [];
      session.setApps([]);
    },
    updated: function(){
      return updated;
    },
    refresh: refresh,
    write: write
  };

  function updateOrder(next, current){
    var app = current && current.params && current.params.app;
    var profile = session.getProfile();

    if(app && profile && profile.uid) {
      var appObj = apps.filter(function(_app){
        return _app.name === app;
      })[0];

      var order = localStorage.getItem(profile.uid + 'order') || appObjToNames(apps);
      order = angular.isArray(order) ? order : JSON.parse(order);

      var indexOrder = order.indexOf(app);
      if(indexOrder !== -1) order.splice(indexOrder, 1);
      order.unshift(app);
      
      var indexSession = apps.indexOf(appObj);
      if(indexSession !== -1) apps.splice(indexSession, 1);
      apps.unshift(appObj);
      write();
      
      localStorage.setItem(profile.uid + 'order', JSON.stringify(order));
    }
  }

  function updateCalls(){
    if(callsCalc) return;

    var props = Object.getOwnPropertyNames(calls);
    if(props.length < apps.length) return;

    var total = 0;
    props.forEach(function(prop){
      total += calls[prop];
    });

    callsCalc = true;
    var stats = { calls: total, apps: apps.length };
    $rootScope.$broadcast('intercomStats', stats);
  }

  function write(){
    session.setApps(apps);
  }

  function getFromSession(){
    return attachAllPromises(session.getApps());
  }

  function refresh(){
    if(angular.isObject(refreshing)){
      return refreshing;
    }
    var deferred = $q.defer();
    refreshing = deferred.promise;

    session.fetchApps().then(function(_apps){
      updated = true;
      refreshing = false;

      session.setApps(apps);

      $timeout(function(){
        apps = attachAllPromises(_apps);
        $rootScope.db_loading = false;
        deferred.resolve(apps);
      });
    }).catch(function(err){
      refreshing = false;
      deferred.reject(err);
    });

    return deferred.promise;
  }

  function appNamesToObj(_apps){
    var retArr = [];
    _apps.forEach(function(app){
      retArr.push({name: app});
    });
    return retArr;
  }

  function appObjToNames(_apps){
    var retArr = [];
    _apps.forEach(function(app){
      retArr.push(app.name);
    });
    return retArr;
  }

  function attachAllPromises(_apps){
    var appsArr = [];
    _apps.forEach(function(app){
      appsArr.push(attachPromises(app));
    });

    return appsArr;
  }

  function attachPromises(app){
    var appObj = {};
    
    appObj.name = angular.isObject(app) ? app.name : app;

    appObj.$metrics = function(){
      return data.accountsAPI.app.get(appObj.name, 'metrics').then(function(data){
        appObj.stats = computeMetrics(data);
        appObj.metrics = data;

        calls[app] = appObj.stats.calls;
        updateCalls();
      });
    };

    appObj.$secret = function(){
      return data.getAppsSecret(appObj.name).then(function(data){
        appObj.secret = data.secret;
      });
    };

    appObj.$oauth = function(){
      var promise = oauthFactory.getApp(appObj.name);
      promise.then(function(data){
        appObj.oauth = data;
      });
      return promise;
    };

    return appObj;
  }

  function computeMetrics(metrics){
    var totalRecords = 0;
    var totalCalls = 0;
    totalRecords += parseInt(metrics.edgesAndVertices.Vertices) || 0;
    totalRecords += parseInt(metrics.edgesAndVertices.Edges) || 0;

    var calls = metrics.calls && Object.keys(metrics.calls);
    if(calls && calls.length) {
      calls.forEach(function(call){
        totalCalls += call.indexOf('APICalls') !== -1 ? metrics.calls[call] : 0;
      });
    }

    return { records: totalRecords, calls: totalCalls };
  }

  return retObj;
}

function Authenticate($rootScope, session, $appbase, $route, $timeout, data, $location, Apps) {
  $rootScope.devProfile = session.getProfile();
  $rootScope.db_loading = false;
  if($rootScope.devProfile) {
    Apps.refresh();
  }

  document.addEventListener('logout', function() {
    $timeout(function(){
      $rootScope.logged = false;
      $appbase.unauth();
      Apps.clear();
      session.setProfile(null);
      $route.reload();
    });
  });

  document.addEventListener('login', Apps.refresh);

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

})();