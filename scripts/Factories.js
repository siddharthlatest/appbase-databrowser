(function(){
angular
.module("AppbaseDashboard")
.factory('stringManipulation', StringManipulationFactory)
.factory('data',
  ['$timeout', '$location', '$appbase', 'stringManipulation', '$rootScope', '$q', 'oauthFactory',DataFactory]);

function StringManipulationFactory(){
  var stringManipulation = {};
  var baseUrl;

  stringManipulation.setBaseUrl = function(bUrl){
    baseUrl = bUrl;
  };

  stringManipulation.getBaseUrl = function(bUrl){
    return baseUrl;
  };

  stringManipulation.urlToAppname = function(url) {
    return stringManipulation.parseURL(url).appName;
  };

  stringManipulation.urlToPath = function(url) {
    return stringManipulation.parseURL(url).path;
  };

  stringManipulation.pathToUrl = function(path) {
    return baseUrl + path;
  };
  
  stringManipulation.parsePath = function(path) {
    return stringManipulation.parseURL(stringManipulation.pathToUrl(path));
  };

  stringManipulation.parseURL = function(url) {
    if(!url) return {}; //return empty object for undefined
    var intermediate, appname, version, path, namespace, key, obj_path, v;
    intermediate = url.split(/\/\/(.+)?/)[1].split(/\.(.+)?/);
    intermediate = intermediate[1].split(/\/(.+)?/)[1].split(/\/(.+)?/);
    appname = intermediate[0];
    intermediate = intermediate[1].split(/\/(.+)?/);
    version = intermediate[0];
    path = intermediate[1];
    if(path) {
      intermediate = path.split(/\/(.+)?/);
      namespace = intermediate[0];
      v = intermediate[1];
      key;
      obj_path;
      if(v) {
        intermediate = v.split(/\/(.+)?/);
        key = intermediate[0];
        obj_path = intermediate[1];
      }
    }
    var retObj = {
      appName: appname,
      ns: namespace,
      key: key,
      obj_path: obj_path,
      path: path,
      v: v
    }
    return retObj;
  }

  stringManipulation.cutLeadingTrailingSlashes = function(input) {
    if(typeof input !== 'string')
      return
    while(input.charAt(input.length - 1) === '/') {
      input = input.slice(0,-1);
    }
    while(input.charAt(0) === '/') {
      input = input.slice(1);
    }
    return input;
  };

  stringManipulation.parentUrl = function(url) {
    return stringManipulation.pathToUrl(stringManipulation.parentPath(stringManipulation.urlToPath(url)))
  };

  stringManipulation.parentPath = function(path) {
    var slashI;
    return path === undefined? '': path.slice(0, (slashI = path.lastIndexOf('/')) === -1? 0: slashI);
  };

  stringManipulation.appToURL = function(app) {
    return "https://api.appbase.io/"+ app +"/v2_1/";
  };

  return stringManipulation;
}

function DataFactory($timeout, $location, $appbase, stringManipulation, $rootScope, $q, oauthFactory) {
  var data = {};
  var appName;
  var secret;
  var server = "Ly9hY2NvdW50cy5hcHBiYXNlLmlvLw==";

  var accountsAPI = data.accountsAPI = (function(){
    var points = ['user', 'app'];
    var methods = ['get', 'post', 'patch', 'put', 'delete'];
    var retObj = {};

    function req(method, point, subject, endpoint, body){
      if(angular.isObject(endpoint)) {
        body = endpoint;
        endpoint = '';
      }
      if(!endpoint) endpoint = '';
      if(!body) body = '';

      return request(method, point, subject, body, endpoint);
    }

    points.forEach(function(point){
      methods.forEach(function(method){
        retObj[point] = retObj[point] || {};
        retObj[point][method] = function(subject, endpoint, body){
          return req(method, point, subject, endpoint, body);
        };
      });
    });

    return retObj;
  })();

  function getEmail(){
    var profile = JSON.parse(localStorage.getItem('devProfile'));
    return profile? profile.email : undefined;
  }

  function getUID(){
    var profile = JSON.parse(localStorage.getItem('devProfile'));
    return profile? profile.uid : undefined;
  }

  data.setAppCredentials = function(app, s) {
    $appbase.credentials(app, s);
    appName = app;
    secret = s;
    stringManipulation.setBaseUrl(stringManipulation.appToURL(appName));
  }

  data.getAppname = function() {
    return appName;
  }

  data.getNamespaces = function(done) {
    accountsAPI.app.get(appName, 'namespaces').then(function(result){
      var namespaces = [];
      result.namespaces = result.namespaces || [];
      result.namespaces.forEach(function(namespace) {
        namespace.name = namespace.name.slice(namespace.name.indexOf('.') + 1);
        if(namespace.name !== 'system.indexes' && namespace.name !== 'indexes') {
          namespaces.push(namespace);
        }
        if(done) {
          done(namespaces);
        }
      });
    });
  };

  data.deleteNamespace = function(namespace, done) {
    var body = {namespace: namespace, secret: secret};
    accountsAPI.app.delete(appName, 'namespaces', body).then(done);
  }

  data.createApp = function(app, done) {
    var deferred = $q.defer();

    accountsAPI.app.put(app).then(function(response){
      if(typeof response === "string") {
        deferred.reject();
      } else if(angular.isObject(response)) {
        $q.all(
          accountsAPI.user.put(getEmail(), {appname: app}),
          accountsAPI.app.put(app, 'owners', {owner: getEmail()})
        ).then(deferred.resolve).catch(deferred.reject);
      } else {
        if(angular.isObject(response) || angular.isArray(response)){
          response = JSON.stringify(response);
        }
        sentry(new Error('App creation unexpected return ' + response));
        deferred.reject();
      }
    });

    return deferred.promise;
  } 

  data.putUser = function(app, user) {
    return accountsAPI.app.put(app, 'users', {user: user});
  };

  data.deleteUser = function(app, user) {
    return $q.all(
      accountsAPI.user.delete(user, {appname: app}),
      accountsAPI.app.delete(app, 'users', {user: user})
    );
  };

  data.putApp = function(user, app) {
    return accountsAPI.user.put(user, {appname: app});
  };

  data.deleteApp = function(app, done) {
    $q.all(
      accountsAPI.app.delete(app, {kill: true, secret: secret}),
      accountsAPI.user.delete(getEmail(), {appname: app})
    ).then(done);
  }
  
  // checks if the user has any apps with registered with uid, pushes them with emailid
  data.uidToEmail = function(done) {
    accountsAPI.user.get(getUID()).error(sentry).then(function(apps) {
        if(!apps.length) return done();
        var appsRemaining = apps.length;
        var checkForDone = function() {
          appsRemaining -= 1;
          if(appsRemaining === 0) {
            done();
          }
        }
        apps.forEach(function(app) {
          //add into email
          $q.all(
            accountsAPI.user.put(getEmail(), {appname: app}),
            accountsAPI.user.delete(getUID(), {appname: app})
          ).then(checkForDone);
        });
      });
  };
  
  data.getDevsAppsWithEmail = function(done) {
    accountsAPI.user.get(getEmail()).then(function(apps){
      if(!apps.length){
        done([]);
        $timeout(function(){
          $rootScope.noApps = true;
          $rootScope.noCalls = $rootScope.noCalls || true;
        });
        
      } else {
        $timeout(function(){
          $rootScope.noCalls = $rootScope.noCalls || false;
        });
      }
      done(apps);

    });
  }

  data.getDevsApps = function(done) {
    data.uidToEmail(data.getDevsAppsWithEmail.bind(null, done));
  }
  
  data.getAppsSecret = function(app, done) {
    return accountsAPI.app.get(app);
  }

  function request(req_type, app, subject, body, endpoint) {
    var deferred = $q.defer();
    var url = atob(server) + app + '/' + subject + '/' + endpoint;
    if(!body) body = {};
    var promise = atomic[req_type](url, body);

    promise.success(deferred.resolve);

    promise.error(function(data, error){
      if(error.response === ""){
        console.log(url + ' generated empty response. Trying again.');
        request(req_type, app, subject, body, endpoint);
      } else deferred.reject(error);
    });

    //deferred.promise.catch(sentry);
    deferred.promise['error'] = deferred.promise['catch'];
    deferred.promise['success'] = deferred.promise['then'];
    return deferred.promise;
  }

  return data;
}

})();
