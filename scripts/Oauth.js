(function(){
angular
.module("AppbaseDashboard")
.controller('oauthd', OauthCtrl)
.factory("oauthFactory", OauthFactory);

function OauthCtrl($scope, oauthFactory, stringManipulation, $routeParams, $timeout, $filter, data, session, $rootScope, $location){
  $('[data-toggle="tooltip"]').tooltip({ trigger: "hover" });

  $scope.status = "Loading...";
  $scope.loading = $scope.loadingProv = $scope.editing = false;
  $scope.callbackDomain = oauthFactory.getOauthdConfig().oauthd;
  $scope.callbackURL = oauthFactory.getOauthdConfig().oauthd + oauthFactory.getOauthdConfig().authBase;
  $scope.sorter = function(prov){
    return $scope.userProviders[prov.provider]? true: false;
  };
  $scope.removeDomain = function(domain){
    $scope.loading = true;
    $scope.domains.splice($scope.domains.indexOf(domain), 1);
    oauthFactory.removeDomain($scope.app, $scope.domains)
    .then(function(data){
      if(data.status !== "success") throw data;
      $timeout(function(){
        $scope.loading = false;
      });
    }, function(data){throw data;});
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
    oauthFactory.addDomain($scope.app, $scope.domains)
    .then(function(data){
      if(data.status !== "success") throw data;
      $timeout(function(){
        $scope.loading = false;
        $scope.domainInput = '';
      });
    },function(data){throw data;});
  };
  $scope.removeProvider = function(provider){
    $scope.loadingProv = true;
    oauthFactory.removeProvider($scope.app, provider)
    .then(function(data){
      if(data.status !== "success") throw data;
      $timeout(function(){
        delete $scope.userProviders[provider];
        $scope.loadingProv = false;
      });
    }, function(data){throw data;});
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
    if(!$scope.app || !$scope.provider.provider || !$scope.clientID || !$scope.clientSecret) throw 'error';
    $scope.loadingProv = true;
    oauthFactory.addProvider($scope.app, $scope.provider.provider, $scope.clientID, $scope.clientSecret)
    .then(function(data){
      $timeout(function(){
        $scope.loadingProv = false;
        $scope.userProviders[$scope.provider.provider] = {response_type: 'code', parameters: {client_id: $scope.clientID, client_secret: $scope.clientSecret}};
        $scope.clientID = $scope.clientSecret = '';
      });
    }, function(err){throw err});
  }
  $scope.cancel = function(){
    $scope.editing = $scope.adding = false;
    $scope.clientID = '';
    $scope.clientSecret = '';
  }

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
  }

  $scope.updateExpiry = function(time){    
    if($scope.validate(time)){
      $scope.loading = true;
      oauthFactory.updateTime($scope.app, $scope.validate(time))
      .then(function(data){
        if(data.status !== "success") throw data;
        $timeout(function(){
          $scope.expiryTime = $scope.validate(time);
          $scope.loading = false;
          $scope.timeInput = '';
        });
      },function(data){throw data;});
    }
  }

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
  }

  oauthFactory.getProviders()
  .then(function(data){
    $scope.providers = data;
  }, function(data){
    throw data;
  });

  var appName = stringManipulation.cutLeadingTrailingSlashes(stringManipulation.parentPath($location.path()));
  var app = session.appFromName(appName);
  if(!app) {
    $rootScope.goToApps();
  } else {
    $rootScope.logged = true;
    $rootScope.currentApp = appName;
    $scope.app = appName;
  }
  var sessionApps = JSON.parse(sessionStorage.getItem('apps'));
  $scope.apps = sessionApps;
  $rootScope.db_loading = false;
  
  $scope.cancel();
  $scope.status = $scope.provStatus = "Loading...";
  $scope.domains = [];
  $scope.userProviders = {};
  oauthFactory.getApp(app.name, app.secret)
  .then(function(oauth){
    oauth = oauth.data;
    $timeout(function() {
      $scope.status = false;
      $scope.domains = oauth.domains;
      if($scope.domains.indexOf('127.0.0.1')===-1) $scope.domains.push('127.0.0.1');
      if($scope.domains.indexOf('localhost')===-1) $scope.domains.push('localhost');
      console.log(oauth)
      $scope.expiryTime = oauth.tokenExpiry || 1000*60*60*24*30;
    });
    if(oauth.keysets.length){
      oauthFactory.getKeySets(app.name, oauth.keysets)
      .then(function(data){
        data.forEach(function(each) {
          $scope.userProviders[each.provider] = each;
        });
        $timeout(function(){
          $scope.keys = data;
          $scope.provStatus = false;
        });
      }, function(data){throw data});
    } else {
      $timeout(function(){
        $scope.provStatus = false;
      });
    }
  }, function(data){throw data});
}

function OauthFactory($timeout, $q, session){
  var oauth = {};
  var config = { 
    oauthd: "https://auth.appbase.io",
    authBase: "/",
    apiBase: "/api/"
  };
  var url = config.oauthd + config.apiBase;
  var providers = [{ name: 'google'},
                   { name: 'facebook'},
                   { name: 'linkedin'},
                   { name: 'dropbox'},
                   { name: 'github'}];

  oauth.getOauthdConfig = function() {
    return config;
  }
  
  oauth.createApp = function(appName, secret, domains){
    var deferred = $q.defer();
    atomic.post(url + 'apps', {name: appName, domains: domains, secret: secret, tokenExpiry: 1000*60*60*24*30})
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(err){
      deferred.reject(err);
    });
    return deferred.promise;
  };

  oauth.getApp = function(appName, secret){
    var deferred = $q.defer();
    atomic.get(url + 'apps/' + appName)
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(data){
      if(data.status === "error" && data.message === "Unknown key"){
        oauth.createApp(appName, secret, ['localhost', '127.0.0.1'])
        .then(function(data){
          deferred.resolve(data);
        })
        .error(function(data){
          deferred.reject(data);
        });
      } else {
        deferred.reject(data);
      }
    });
    return deferred.promise;
  };

  oauth.updateApps = function(done){
    var apps = session.getApps();
    var received = 0;
    apps.forEach(function(app){
      oauth.getApp(app.name, session.getAppSecret(app.name))
      .then(function(data){
        var apps_ = session.getApps();
        apps_.forEach(function(b){
          if(b.name === app.name){
            b.oauth = data.data;
          }
        });
        session.setApps(apps_);
        received += 1;
        if(received === apps.length && done) done();
      }, function(e){
        throw e;
      });
    });
  }

  oauth.removeDomain = function(appName, domains){
    var deferred = $q.defer();
    atomic.post(url + 'apps/' + appName, {domains: domains})
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(data){
      deferred.reject(data);
    });
    return deferred.promise;
  };

  oauth.addDomain = function(appName, domains){
    var deferred = $q.defer();
    atomic.post(url + 'apps/' + appName, {domains: domains})
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(data){
      deferred.reject(data);
    });
    return deferred.promise;
  };

  oauth.getProviders = function(){
    var deferred = $q.defer();
    var retProviders = [];
    var providerNumber = 0;
    providers.forEach(function(each){
      atomic.get(url + 'providers/' + each.name)
      .success(function(data){
        data.data.logo = url + 'providers/' + each.name + '/logo';
        retProviders.push(data.data);
        providerNumber++;
        if(providerNumber === providers.length)
          deferred.resolve(retProviders);
      })
      .error(function(data){
        deferred.reject(data);
      });
    });
    return deferred.promise;
  };

  oauth.getKeySets = function(app, appProviders){
    var deferred = $q.defer();
    var providerNumber = 0;
    var retProviders = [];
    appProviders.forEach(function(each){
      atomic.get(url + 'apps/' + app + '/keysets/' + each)
      .success(function(data){
        data.data.provider = each;
        retProviders.push(data.data);
        providerNumber++;
        if(providerNumber === appProviders.length)
          deferred.resolve(retProviders);
      })
      .error(function(data){deferred.reject(data)});
    });
    return deferred.promise;
  };

  oauth.removeProvider = function(app, provider){
    var deferred = $q.defer();
    atomic.delete(url + 'apps/' + app + '/keysets/' + provider)
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(err){
      deferred.reject(err);
    });
    return deferred.promise;
  };

  oauth.addProvider = function(app, provider, client, secret){
    var deferred = $q.defer();
    atomic.post(url + 'apps/' + app + '/keysets/' + provider,
    {response_type: 'code', parameters: {client_id: client, client_secret: secret}})
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(err){
      deferred.reject(err);
    });
    return deferred.promise;
  };

  oauth.updateTime = function(appName, time){
    var deferred = $q.defer();
    atomic.post(url + 'apps/' + appName, {tokenExpiry: time})
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(data){
      deferred.reject(data);
    });
    return deferred.promise;
  }

  return oauth;
}




})();