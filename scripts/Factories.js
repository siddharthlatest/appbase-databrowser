(function(){
angular
.module('AppbaseDashboard')
.factory('utils', utilsFactory)
.factory('data',
  ['$timeout', '$location', '$appbase', 'utils', '$q', '$http', DataFactory]);

function utilsFactory(){
  var utils = {};
  var baseUrl;

  utils.appNamesToObj = function(_apps){
    var retArr = [];
    _apps.forEach(function(app){
      retArr.push({name: app});
    });
    return retArr;
  };

  utils.appObjToNames = function(_apps){
    var retArr = [];
    _apps.forEach(function(app){
      retArr.push(app.name);
    });
    return retArr;
  };

  utils.setBaseUrl = function(bUrl){
    baseUrl = bUrl;
  };

  utils.getBaseUrl = function(bUrl){
    return baseUrl;
  };

  utils.urlToAppname = function(url) {
    return utils.parseURL(url).appName;
  };

  utils.urlToPath = function(url) {
    return utils.parseURL(url).path;
  };

  utils.pathToUrl = function(path) {
    return baseUrl + path;
  };
  
  utils.parsePath = function(path) {
    return utils.parseURL(utils.pathToUrl(path));
  };

  utils.parseURL = function(url) {
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

  utils.cutLeadingTrailingSlashes = function(input) {
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

  utils.parentUrl = function(url) {
    var parentPath = utils.parentPath(utils.urlToPath(url));
    return utils.pathToUrl(parentPath);
  };

  utils.parentPath = function(path) {
    var slashI;
    return path === undefined? '': path.slice(0, (slashI = path.lastIndexOf('/')) === -1? 0: slashI);
  };

  utils.appToURL = function(app) {
    return "https://api.appbase.io/"+ app +"/v2_1/";
  };

  return utils;
}

function DataFactory($timeout, $location, $appbase, utils, $q, $http) {
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
    utils.setBaseUrl(utils.appToURL(appName));
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

  data.deleteApp = function(app, secret) {
    return $q.all(
      accountsAPI.app.delete(app, {kill: true, secret: secret}),
      accountsAPI.user.delete(getEmail(), {appname: app})
    );
  }
  
  // checks if the user has any apps with registered with uid, pushes them with emailid
  data.uidToEmail = function(done) {
    var UID = getUID();
    if(UID) {
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
    } else done();
  };
  
  data.getDevsAppsWithEmail = function(done) {
    var email = getEmail();
    if(email) {
       accountsAPI.user.get(getEmail()).then(done);
    } else done([]);
  }

  data.getDevsApps = function(done) {
    data.uidToEmail(data.getDevsAppsWithEmail.bind(null, done));
  }
  
  data.getAppsSecret = function(app, done) {
    return accountsAPI.app.get(app);
  }

  function request(req_type, app, subject, body, endpoint, try_num) {
    var deferred = $q.defer();
    var url = atob(server) + app + '/' + subject + '/' + endpoint;
    //console.log(req_type, ': ', url, ', body: ', body)
    var promise = $http({
      method: req_type,
      url: url,
      data: body || {},
      headers: {
        'Content-Type': 'application/json'
      }
    });

    promise.success(deferred.resolve);
    promise.error(function(data, error){
      if(error.response === ""){
        console.log(url + ' generated empty response.');
        if(try_num && try_num <= 5) request(req_type, app, subject, body, endpoint, try_num+1);
        else request(req_type, app, subject, body, endpoint, 1);
      } else deferred.reject(error);
    });

    deferred.promise.catch(sentry);
    deferred.promise['error'] = deferred.promise['catch'];
    deferred.promise['success'] = deferred.promise['then'];
    return deferred.promise;
  }

  return data;
}

})();
