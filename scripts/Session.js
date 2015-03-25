(function(){
angular
.module("AppbaseDashboard")
.factory('session', ['utils', '$rootScope', 'data', '$q', SessionFactory]);

function SessionFactory(utils, $rootScope, data, $q){
  var session = {};

  var writing = false;

  session.setApps = function(apps){
    if(writing) $rootScope.$on('doneWriting', function(){
      session.setApps(apps);
    });
    else {
      writing = true;
      setApps(apps);
    }
  }

  function setApps(apps) {
    apps = angular.isArray(apps) ? apps : [];

    var newArray = [];
    apps.forEach(function(app){
      var obj = { name: app.name };
      if(app.secret) obj.secret = app.secret;
      newArray.push(obj);
    });
    
    sessionStorage.setItem('apps', JSON.stringify(newArray));

    writing = false;
    $rootScope.$broadcast('doneWriting');
  };

  session.getApps = function() {
    if(session.getProfile()){
      var apps = sessionStorage.getItem('apps');
      return apps? JSON.parse(apps) : [];
    } else return [];
  };

  session.appFromName = function(appName, apps) {
    return apps ? apps.filter(function(app){
      return app.name === appName;
    })[0] : undefined;
  };

  session.fetchApps = function() {
    var deferred = $q.defer();

    data.getDevsApps(function(apps){
      var order = [];
      var existing = session.getApps();
      var first = !existing.length;
      
      if(first){
        var profile = session.getProfile();
        if(profile) {
          var localOrder = localStorage.getItem(profile.uid + 'order');
          if(localOrder) order = JSON.parse(localOrder);
          else first = false;
        }
      } else {
        existing.forEach(function(app){
          order.push(app.name);
        });
      }

      //persists order after logout
      if(first){
        apps.sort(function(a,b){
          //if a is greater, a should go after
          //if a is new, a should go first
          if(!a || !b) return 0;
          var a_index = order.indexOf(a.name);
          if(a_index === -1) return -1000000;
          var b_index = order.indexOf(b.name);
          if(b_index === -1) return 1000000;
          return a_index - b_index;
        });
  		}

      var ordered = [];
      ordered.push.apply(ordered, order.filter(function(app) {
        return apps.some(function(received) {
          return received === app;
        });
      }));
      ordered.unshift.apply(ordered, apps.filter(function(newApp) {
        return ordered.every(function(orderApp) {
          return newApp !== orderApp;
        });
      }));

      //console.time('total')
      var obj = {
        email: 'unknown',
        name: 'unknown'
      };

      var user = session.getProfile() || obj;

      deferred.resolve(ordered);
    });
    return deferred.promise;
  }

  function filterFirst(array, desired){
  	var index = 0;
  	array.some(function(existing){
  		index++;
  		return existing === desired;
  	});
  	return index === array.length ? -1 : index-1;
  }

  session.setProfile = function(profile) {
    localStorage.setItem('devProfile', JSON.stringify(profile));
  };

  session.setBrowserURL = function(url) {
    sessionStorage.setItem('URL', url);
  };

  session.getBrowserURL = function(apps) {
    var URL;

    URL = sessionStorage.getItem('URL');
    if(URL === null){
      URL = apps ? utils.appToURL(apps[0].name) : undefined;

    }
    return URL;
  };

  session.getProfile = function() {
    return JSON.parse(localStorage.getItem('devProfile'));
  };

  return session;
}


})();