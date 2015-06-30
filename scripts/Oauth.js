(function(){
angular
.module('AppbaseDashboard')
.controller('oauth', OauthCtrl)
.factory('oauthFactory', OauthFactory)
.factory('OauthBuild', OauthBuild);

function OauthBuild(oauthFactory, utils, Apps, $q, Loader) {
  var scope = {};

  var retObj = {
    build: function(appName) {
      Loader(25);
      var deferred = $q.defer();
      Apps.appFromName(appName).then(function(app){
        oauthFactory.getProviders().then(function(data){
          var arr = [];
          data.forEach(function(provider){
            var url = oauthFactory.getOauthdConfig().url;
            provider.data.logo =  url + 'providers/' + provider.data.provider + '/logo';
            arr.push(provider.data);
          });
          scope.providers = arr;
        }, sentry);

        scope.app = appName;
        scope.domains = [];
        scope.userProviders = {};
        
        app.$secret().then(function(){
          oauthFactory.getApp(app.name, app.secret).then(function(data){
            app.oauth = data.data;
            Loader(75);
            processOauth(app.oauth, deferred);
          }, deferred.reject);
        });

      });
      
      return deferred.promise;
    },
    get: function(){
      return scope;
    }
  }
  
  function processOauth(oauth, deferred){
    if(oauth.status) oauth = oauth.data;

    oauth.domains = oauth.domains || [];
    scope.domains = oauth.domains;

    if(scope.domains.indexOf('127.0.0.1')===-1) scope.domains.push('127.0.0.1');
    if(scope.domains.indexOf('localhost')===-1) scope.domains.push('localhost');
    scope.expiryTime = oauth.tokenExpiry || 1000*60*60*24*30;

    oauthFactory.getKeySets(scope.app, oauth.keysets || [])
    .then(function(data){
      scope.userProviders = data;
      deferred.resolve();
    });

  }

  return retObj;
}

function OauthCtrl($scope, OauthBuild, $filter, oauthFactory, $timeout, Loader){
  Loader(100);
  var obj = OauthBuild.get();

  Object.getOwnPropertyNames(obj).forEach(function(prop){
    $scope[prop] = obj[prop];
  });

  $scope.cancel = function(){
    $scope.editing = $scope.adding = false;
    $scope.clientID = '';
    $scope.clientSecret = '';
  }

  $scope.cancel();

  $scope.callbackDomain = oauthFactory.getOauthdConfig().oauthd;
  $scope.callbackURL = oauthFactory.getOauthdConfig().oauthd + oauthFactory.getOauthdConfig().authBase;
  
  $scope.sorter = function(prov){
    return $scope.userProviders[prov.provider]? true: false;
  };
  
  $scope.removeDomain = function(domain){
    $scope.loading = true;
    $scope.domains.splice($scope.domains.indexOf(domain), 1);
    oauthFactory.updateDomains($scope.app, $scope.domains)
    .then(function(data){
      if(data.status !== "success") {
        sentry(data);
        throw new Error(data);
      }
      $timeout(function(){
        $scope.loading = false;
      });
    }, sentry);
  };

  $scope.addDomain = function(domain){
    if($scope.domains.indexOf(domain) !== -1){
      $scope.domainInput = '';
      return;
    }
    $scope.loading = true;
    $scope.domains.push(domain);
    if($scope.domains.indexOf('127.0.0.1')===-1) $scope.domains.push('127.0.0.1');
    if($scope.domains.indexOf('localhost')===-1) $scope.domains.push('localhost');
    oauthFactory.updateDomains($scope.app, $scope.domains)
    .then(function(data){
      if(data.status !== "success") {
        sentry(data);
        throw new Error(data);
      };
      $timeout(function(){
        $scope.loading = false;
        $scope.domainInput = '';
      });
    }, sentry);
  };

  $scope.removeProvider = function(provider){
    $scope.loadingProv = true;
    oauthFactory.removeProvider($scope.app, provider)
    .then(function(data){
      if(data.status !== "success") {
        sentry(data);
        throw new Error(data);
      };
      $timeout(function(){
        delete $scope.userProviders[provider];
        $scope.loadingProv = false;
      });
    }, sentry);
  };

  $scope.add = function(provider){
    $scope.provider = provider;
    $scope.editing = $scope.adding = true;
  };

  $scope.edit = function(provider) {
    $scope.provider = provider;
    $scope.clientID = $scope.userProviders[provider.provider].parameters.client_id;
    $scope.clientSecret = $scope.userProviders[provider.provider].parameters.client_secret;
    $scope.editing = true;
    $scope.adding = false;
  }

  $scope.done = function(){
    $scope.editing = $scope.adding = false;
    if(!$scope.app || !$scope.provider.provider || !$scope.clientID || !$scope.clientSecret){
      throw new Error('Missing information');
    };
    $scope.loadingProv = true;
    oauthFactory.addProvider($scope.app, $scope.provider.provider, $scope.clientID, $scope.clientSecret)
    .then(function(data){
      $timeout(function(){
        var obj = {
          response_type: 'code',
          parameters: {
            client_id: $scope.clientID,
            client_secret: $scope.clientSecret
          }
        };
        $scope.loadingProv = false;
        $scope.userProviders[$scope.provider.provider] = obj;
        $scope.clientID = $scope.clientSecret = '';
      });
    }, sentry);
  };

  $scope.validate = function(time){
    var minTime = 1000*60*60, maxTime = 1000*60*60*24*60;
    var valid = {'s':1000, 'm':1000*60, 'h':1000*60*60, 'd':1000*60*60*24, 'w':1000*60*60*24*7};
    if(/^[0-9]{1,}[smhdw]{1}$/.test(time)){
      for(var prop in valid){
        if(time.indexOf(prop) !== -1){
          var inMs = time.split(prop)[0] * valid[prop];
          return (inMs <= maxTime && inMs >= minTime) ? inMs : false;
        }
      }
    }
    return false;
  };

  $scope.updateExpiry = function(time){    
    if($scope.validate(time)){
      $scope.loading = true;
      oauthFactory.updateTime($scope.app, $scope.validate(time))
      .then(function(data){
        if(data.status !== "success") {
          sentry(data);
          throw new Error(data);
        }
        $timeout(function(){
          $scope.expiryTime = $scope.validate(time);
          $scope.loading = false;
          $scope.timeInput = '';
        });
      }, sentry);
    }
  };

  $scope.readTime = function(ms){
    var seconds, minutes, hours, days, rest;
    seconds = minutes = hours = days = rest = 0;
    var x = ms / 1000;
    seconds = x % 60;
    x /= 60;
    minutes = x % 60;
    x /= 60;
    hours = x % 24;
    x /= 24;
    days = x;
    days -= days%1;
    hours -= hours%1;
    minutes -= minutes%1;
    seconds -= seconds%1;
    
    return (days>=1 ? days + (' day' + (days>1?'s ':' ')) : '')
         + (hours ? hours + (' hour' + (hours>1?'s ':' ')) : '')
         + (minutes ? minutes + (' minute' + (minutes>1?'s ':' ')) : '')
         + (seconds ? seconds + (' second' + (seconds>1?'s ':' ')) : '');
  };
}

function OauthFactory($timeout, $q, $http){
  var oauth = {};
  var config = { 
    oauthd: "https://auth.appbase.io",
    authBase: "/",
    apiBase: "/api/"
  };
  var base_url = config.url = config.oauthd + config.apiBase;
  var providers = [{ name: 'google'},
                   { name: 'facebook'},
                   { name: 'linkedin'},
                   { name: 'dropbox'},
                   { name: 'github'}];


  oauth.getOauthdConfig = function() {
    return config;
  }

  var oauthAPI = oauth.oauthAPI = (function(){
    var points = ['apps', 'providers'];
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
  
  oauth.createApp = function(appName, secret, domains){
    return oauthAPI.apps.post('', '', {
      name: appName,
      domains: domains,
      secret: secret,
      tokenExpiry: 1000*60*60*24*30
    });
  };

  oauth.getApp = function(appName, secret){
    var deferred = $q.defer();

    oauthAPI.apps.get(appName).then(deferred.resolve, function(data){
      if(data === 500){
        oauth.createApp(appName, secret, ['localhost', '127.0.0.1'])
        .then(deferred.resolve, deferred.reject);
      } else {
        deferred.reject(data);
      }
    });

    return deferred.promise;
  };

  oauth.updateDomains = function(appName, domains){
    return oauthAPI.apps.post(appName, {domains: domains});
  };

  oauth.getProviders = function(){
    var promises = [];
    providers.forEach(function(provider){
      promises.push(oauthAPI.providers.get(provider.name));
    });
    return $q.all(promises);
  };

  oauth.getKeySets = function(app, appProviders){
    var deferred = $q.defer();
    var promises = [];
    var providers = {};

    appProviders.forEach(function(appProvider){
      var promise = oauthAPI.apps.get(app, 'keysets/' + appProvider).then(function(result){
        providers[appProvider] = result.data;
      });
      promises.push(promise);
    });

    $q.all(promises).then(function(){
      deferred.resolve(providers);
    });

    return deferred.promise;
  };

  oauth.removeProvider = function(app, provider){
    return oauthAPI.apps.delete(app, 'keysets/' + provider);
  };

  oauth.addProvider = function(app, provider, client, secret){
    return oauthAPI.apps.post(app, 'keysets/' + provider, {
      response_type: 'code',
      parameters: {
        client_id: client,
        client_secret: secret
      }
    });
  };

  oauth.updateTime = function(appName, time){
    return oauthAPI.apps.post(appName, '', {tokenExpiry: time});
  }

  return oauth;

  function request(req_type, app, subject, body, endpoint, try_num) {
    var deferred = $q.defer();
    var url = base_url + app + (subject ? ('/' + subject) : '') + (endpoint ? ('/' + endpoint) : '');
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
}


})();