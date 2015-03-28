(function(){
angular
.module('AppbaseDashboard')
.factory('Apps', AppsFactory)
.controller('topnav', TopNavCtrl)
.run(Authenticate);

function AppsFactory(session, data, $q, $timeout, $rootScope, $routeParams, utils){
  var apps = getFromSession();
  var refreshing = false;
  var callsCalc = false;
  var updated = false;
  var calls = {};
  var appNamesToObj = utils.appNamesToObj;
  var appObjToNames = utils.appObjToNames;

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
    write: write,
    appFromName: appFromName
  };

  function appFromName(name){
    var deferred = $q.defer();

    if (apps && apps.length) {
      var app = getApp(name);
      if(app) deferred.resolve(app);
      else
        refresh().then(function(){
          var app = getApp(name);
          if(app) deferred.resolve(app);
          else deferred.reject();
        }, deferred.reject);
    }

    return deferred.promise;

    function getApp(name){
      var filter = apps.filter(function(each){
        return each.name === name;
      });
      return filter.length ? filter[0] : false;
    }
  }

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
      deferred.notify();
      updated = true;
      refreshing = false;

      var appsObj = appNamesToObj(_apps);
      appsObj.forEach(function(app){
        var index;
        apps.every(function(oldApp, _index){
          if(oldApp.name === app.name) {
            index = _index;
            return false;
          }
          return true;
        });
        if(index) {
          Object.getOwnPropertyNames(apps[index]).forEach(function(prop){
            if(!prop.lastIndexOf('$', 0)) return;
            app[prop] = apps[index][prop];
          });
        }
      });
      $timeout(function(){
        apps = attachAllPromises(appsObj);

        session.setApps(apps);
        var profile = session.getProfile();
        if(profile && profile.uid) {
          localStorage.setItem(profile.uid + 'order', JSON.stringify(_apps));
          if(!apps.length) {
            $rootScope.$broadcast('intercomStats', { calls: 0, apps: 0 });
          }
        }
        
        deferred.resolve(apps);
      });
    }).catch(function(err){
      refreshing = false;
      deferred.reject(err);
    });

    return deferred.promise;
  }

  function attachAllPromises(_apps){
    var appsArr = [];
    _apps.forEach(function(app){
      appsArr.push(attachPromises(app));
    });

    return appsArr;
  }

  function attachPromises(appObj){
    if(angular.isString(appObj)) appObj = { name: appObj };

    var deferred = $q.defer();
    deferred.resolve();
    var emptyPromise = deferred.promise;
    
    appObj.$metrics = function(){
      if(!appObj.metrics){
        return data.accountsAPI.app.get(appObj.name, 'metrics').then(function(data){
          appObj.stats = computeMetrics(data);
          appObj.metrics = data;

          calls[appObj.name] = appObj.stats.calls;
          updateCalls();
        });
      }
      return emptyPromise;
    };

    appObj.$secret = function(){
      if(!appObj.secret){
        return data.getAppsSecret(appObj.name).then(function(data){
          appObj.secret = data.secret;
          write();
        });
      }
      return emptyPromise;
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

function TopNavCtrl($scope, $routeParams, Apps, $timeout, data, $location, session, Loader) {
  var appName, secret;
  $scope.routeParams = $routeParams;

  $scope.$on('$routeChangeSuccess', function(next, current){
    if(!session.getProfile()) return;
    Apps.appFromName(current.params.app).then(function(app){
      app.$secret().then(function(){
        $timeout(function(){
          $scope.secret = secret = app.secret;
        });
      });
    });
  });

  $scope.deleteApp = function(app){
    BootstrapDialog.show({
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
                dialog.close();
                Loader(10);
                Apps.appFromName(app).then(function(appObj){
                  appObj.$secret().then(function(){
                    data.deleteApp(app, appObj.secret).then(function(){
                      $timeout(function(){
                        $location.path('/apps');
                      });
                    }).catch(function(error){
                      sentry(error);
                    });
                  });
                });
              } else {
                input.addClass('has-error');
              }
            }
        }]
    });
  }

  $scope.shareApp = function(app){
    $scope.sharing = true;
    $('#share-modal').modal('show');
  }
}

function Authenticate($rootScope, session, $appbase, $timeout, $location, Apps) {

  auth();

  document.addEventListener('logout', function() {
    $timeout(function(){
      $rootScope.logged = false;
      $appbase.unauth();
      Apps.clear();
      session.setProfile(null);
      $location.path('/login');
    });
  });

  $rootScope.$watch('logged', function(logged){
    if(logged) auth();
  });

  function auth(){
    $rootScope.devProfile = session.getProfile();
    if($rootScope.devProfile) {
      Apps.refresh();
    }
  }

}

})();