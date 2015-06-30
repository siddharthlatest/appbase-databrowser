(function(){
angular
.module('AppbaseDashboard')
.factory('Apps', AppsFactory);

function AppsFactory(session, data, $q, $timeout, $rootScope, $routeParams, utils, $location){
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
          else {
            deferred.reject();
            $location.path('/apps');
          }
        }, function(){
          deferred.reject();
          $location.path('/apps');
        });
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

    appObj.$version = function(){
      var deferred;
      var v3date = 1427147200000; //4/1/2015

      if(!appObj.version){
        deferred = $q.defer();
        appObj.$secret(true).then(function(){
          appObj.version = appObj.createdAt > v3date ? 3 : 2;
          deferred.resolve();
        }, deferred.reject);
      } else return emptyPromise;

      return deferred.promise;
    };

    appObj.$secret = function(created){
      if(!appObj.secret || created){
        return data.getAppsSecret(appObj.name).then(function(data){
          appObj.createdAt = data.created_at || 1388534400; // 1/1/2014
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

})();