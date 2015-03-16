(function(){
angular
.module("AppbaseDashboard")
.factory('stringManipulation', StringManipulationFactory)
.factory('session', ['stringManipulation', '$rootScope', 'data', '$q', SessionFactory])
.factory('data',
  ['$timeout', '$location', '$appbase', 'stringManipulation', '$rootScope', '$q', DataFactory]);

function SessionFactory(stringManipulation, $rootScope, data, $q){
  var session = {};

  session.setApps = function(apps) {
    var toDelete = [];
    if(angular.isArray(apps)){
      apps.forEach(function(app, index){
        if(!app) toDelete.push(index);
      });
      toDelete.forEach(function(index){
        apps.splice(index, 1);
      });
    } else {
      apps = []; 
    }
    sessionStorage.setItem('apps', JSON.stringify(apps));
  };

  session.getApps = function() {
    if(session.getProfile()){
      var apps = sessionStorage.getItem('apps');
      return apps? JSON.parse(apps) : [];
    } else return [];
  };

  session.appFromName = function(appName) {
    var apps = session.getApps();
    return apps? apps.filter(function(app){
      return app.name === appName;
    })[0] : undefined;
  };

  session.fetchApps = function(done) {
    data.getDevsApps(function(apps){
      var existing = session.getApps();
      var first = !existing.length;
      if(first){
        var profile = session.getProfile();
        if(profile) {
          var order = localStorage.getItem(profile.uid + 'order');
          if(order) order = JSON.parse(order);
          else first = false;
        }
      }
      existing.forEach(function(app, index){
        var newRef = apps.filter(function(newApp){
          return newApp.name === app.name;
        })[0];
        if(newRef){
          app = newRef;
        } else {
          existing.splice(index, 1);
        } 
      }); // old removed

      apps.forEach(function(app){
        if(existing.filter(function(old){
          return app.name === old.name;
        }).length === 0){
          existing.unshift(app);
        }
      }); // new added
      //persists order after logout
      if(first){
        existing.sort(function(a,b){
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
      //console.time('total')
      var overall = 0;
      existing.forEach(function(app){
        //console.time(app.name);
        app.metrics.totalRec = 0;
        app.metrics.totalRec += parseInt(app.metrics.edgesAndVertices.Vertices) || 0;
        app.metrics.totalRec += parseInt(app.metrics.edgesAndVertices.Edges) || 0;

        var total = 0;
        var calls = app.metrics.calls && Object.keys(app.metrics.calls);
        if(calls && calls.length) {
          calls.forEach(function(call){
            total += call.indexOf('APICalls') !== -1 ? app.metrics.calls[call] : 0;
          });
        }

        app.metrics.totalCalls = total;
        overall += total;
        //console.timeEnd(app.name);
      });
      //console.timeEnd('total')
      session.setApps(existing);

      var obj = {
        email: 'unknown',
        name: 'unknown'
      };

      var user = session.getProfile() || obj;

      window.Intercom('update', { 'apps': existing.length, 
                                  'calls': overall, 
                                  'name': user.name,
                                  'email': user.email });
      if(done) done();
    });
  }

  session.getAppSecret = function(appName) {
    var apps = session.getApps();
    return (apps.length? session.appFromName(appName).secret : undefined);
  };

  session.setProfile = function(profile) {
    localStorage.setItem('devProfile', JSON.stringify(profile));
  };

  session.setBrowserURL = function(url) {
    sessionStorage.setItem('URL', url);
    $rootScope.currentApp = stringManipulation.urlToAppname(url);
  };

  session.getBrowserURL = function() {
    var URL;
    var apps;

    URL = sessionStorage.getItem('URL');
    if(URL === null){
      apps = session.getApps();
      URL = apps ? apps[0].name : undefined;
    }
    return URL;
  };

  session.getProfile = function() {
    return JSON.parse(localStorage.getItem('devProfile'));
  };

  session.init = function(appName) {
    secret = session.getAppSecret(appName)
    if(secret !== undefined) {
      data.setAppCredentials(appName, secret)
      return true
    } else {
      return false
    }
  }

  return session;
}

function StringManipulationFactory(){
  var stringManipulation = {}
  var baseUrl
  stringManipulation.setBaseUrl = function(bUrl){
    baseUrl = bUrl
  }

  stringManipulation.getBaseUrl = function(bUrl){
    return baseUrl
  }

  stringManipulation.urlToAppname = function(url) {
    return stringManipulation.parseURL(url).appName
  }

  stringManipulation.urlToPath = function(url) {
    return stringManipulation.parseURL(url).path
  }

  stringManipulation.pathToUrl = function(path) {
    return baseUrl + path
  }
  
  stringManipulation.parsePath = function(path) {
    return stringManipulation.parseURL(stringManipulation.pathToUrl(path));
  }

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
  }

  stringManipulation.parentUrl = function(url) {
    return stringManipulation.pathToUrl(stringManipulation.parentPath(stringManipulation.urlToPath(url)))
  }

  stringManipulation.parentPath = function(path) {
    var slashI;
    return path === undefined? '': path.slice(0, (slashI = path.lastIndexOf('/')) === -1? 0: slashI);
  }

  stringManipulation.appToURL = function(app) {
    return "https://api.appbase.io/"+ app +"/v2/";
  }

  return stringManipulation;
}

function DataFactory($timeout, $location, $appbase, stringManipulation, $rootScope, $q) {
  var data = {};
  var appName;
  var secret;
  var server = "Ly9hY2NvdW50cy5hcHBiYXNlLmlvLw==";

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

  data.getVerticesOfNamespace = function(namespace, done) {
    atomic.post(stringManipulation.appToURL(appName) + namespace + '/~list',{"data":[""],"secret":secret})
      .success(function(result) {
        var vertices = []
        result.forEach(function(obj) {
          vertices.push(obj.rootPath)
        })
        done(vertices)
      })
      .error(sentry)
  }

  data.getNamespaces = function(done) {
    atomic.get(atob(server)+'app/'+ appName +'/namespaces')
      .success(function(result) {
        if(result !== undefined && result.namesapces !== undefined){
          return console.error("Unexpected response from server for namespaces:", result);
        }
        var namespaces = []
        if(result.namespaces) {
          result.namespaces.forEach(function(obj) {
            obj.name = obj.name.slice(obj.name.indexOf('.') + 1)
            if(obj.name !== 'system.indexes') {
              namespaces.push(obj)
            }
          })
        }
        done(namespaces)
      })
      .error(sentry)
  };

  data.deleteNamespace = function(namespace, done) {
    atomic.delete(atob(server)+'app/'+ appName +'/namespaces', {"namespace": namespace, "secret": secret})
      .success(function(result){
        done();
      }).error(done);
  }

  data.createApp = function(app, done) {
    atomic.put(atob(server)+'app/'+ app)
      .success(function(response) {
        if(typeof response === "string") {
          done(response)
        } else if(typeof response === "object") {
          atomic.put(atob(server)+'user/'+ getEmail(), {"appname":app})
            .success(function(result) {
              atomic.put(atob(server)+'app/'+app+'/owners', {"owner":getEmail()})
              .success(function(){
                done(null)
              })
              .error(sentry);
            })
            .error(sentry);
        } else {
          if(angular.isObject(response) || angular.isArray(response)){
            response = JSON.stringify(response);
          }
          sentry(new Error('App creation unexpected return ' + response))
        }
      })
      .error(sentry)
  } 
  
  data.getGeneric = function(app, what, done) {
    var deferred = $q.defer();
    atomic.get(atob(server) + 'app/' + app + '/' + what)
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(err){
      deferred.reject(err);
    });
    return deferred.promise;
  };

  data.putUser = function(app, user) {
    var deferred = $q.defer();
    atomic.put(atob(server) + 'app/' + app + '/users', {user: user})
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(err){
      deferred.reject(err);
    });
    return deferred.promise;
  };

  data.deleteUser = function(app, user) {
    var deferred = $q.defer();
    var step1 = atomic.delete(atob(server) + 'user/' + user, {appname: app}).error(error);
    var step2 = atomic.delete(atob(server) + 'app/' + app + '/users', {user: user}).error(error);
    
    step1.success(function(){
      step2.success(function(){
        deferred.resolve(data);
      });
    });

    function error(err){
      deferred.reject(err);
    }
    return deferred.promise;
  }

  data.putApp = function(user, app) {
    var deferred = $q.defer();
    atomic.put(atob(server) + 'user/' + user, {'appname': app})
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(err){
      deferred.reject(err);
    });
    return deferred.promise;
  };

  data.deleteApp = function(app, done) {
    atomic.delete(atob(server)+'app/'+ app, {'kill':true, 'secret': secret})
      .success(function(response) {
        atomic.delete(atob(server)+'user/' + getEmail(), {'appname' : app})
          .success(function(response){
            done();
          })
      })
      .error(sentry)
  }
  
  // checks if the user has any apps with registered with uid, pushes them with emailid
  data.uidToEmail = function(done) {
    //fetch from uid
    atomic.get(atob(server)+'user/'+ getUID())
      .success(function(apps) {
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
          atomic.put(atob(server)+'user/'+ getEmail(), {"appname":app})
            .success(function(result) {
              //delete from uid
              atomic.delete(atob(server)+'user/'+ getUID(), {"appname":app})
                .success(function(result) {
                  checkForDone();
                })
                .error(sentry)
            })
            .error(sentry)
        });
      })
  }
  
  data.getDevsAppsWithEmail = function(done) {
    atomic.get(atob(server)+'user/'+ getEmail())
      .success(function(apps) {
        var appsAndSecrets = [];
        var appsArrived = 0;
        var secretArrived = function(app, secret, metrics) {
          appsArrived += 1;
          appsAndSecrets.push({
            name: app,
            secret: secret,
            metrics: metrics
          });
          if(appsArrived === apps.length) {
            done(appsAndSecrets);
          }
        }
        apps.forEach(function(app) {
          data.getAppsSecret(app, function(secret) {
            getMetrics(app, secret, secretArrived);
          });
        });
        if(apps.length === 0){
          done([]);
          $rootScope.noApps = true;
          $rootScope.noCalls = $rootScope.noCalls || true;
        } else {
          $rootScope.noApps = false;
          $rootScope.noCalls = $rootScope.noCalls || false;
        }
        $rootScope.$apply();
      })
      .error(sentry)
  }

  function getMetrics(app, secret, secretArrived){
    atomic.get(atob(server)+'app/'+app+'/metrics')
      .success(function(metrics){
        secretArrived(app, secret, metrics);
      })
      .error(function(data, error) {
        if(error.response === ""){
          console.log('Empty response for ' + app + '\'s metrics, retrying');
          getMetrics(app, secret, secretArrived);
        } else sentry(error);
      });
  }

  data.getDevsApps = function(done) {
    data.uidToEmail(data.getDevsAppsWithEmail.bind(null, done));
  }
  
  data.getAppsSecret = getSecret;

  function getSecret(app, done) {
    atomic.get(atob(server)+'app/'+ app)
      .success(function(result) {
        done(result.secret);
      })
      .error(function(data, error) {
        if(error.response === ""){
          console.log('Empty response for ' + app + ', retrying');
          getSecret(app, done);
        } else sentry(error);
      }); 
  }

  return data;
}

})();
