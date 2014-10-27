(function(){
angular
.module("abDataBrowser")
.factory('stringManipulation', StringManipulationFactory)
.factory('session', ['stringManipulation', '$rootScope', SessionFactory])
.factory('nodeBinding', ['data', 'stringManipulation', '$timeout', '$appbase', '$rootScope', NodeBinding])
.factory('data', ['$timeout', '$location', '$appbase', 'stringManipulation', 'session', '$rootScope', DataFactory]);

function SessionFactory(stringManipulation, $rootScope){
  var session = {};

  session.setApps = function(apps) {
    sessionStorage.setItem('apps', JSON.stringify(apps));
  };

  session.getApps = function() {
    return JSON.parse(sessionStorage.getItem('apps'));
  };

  session.getAppSecret = function(appName) {
    var apps = session.getApps();
    return (apps !== undefined && apps !== null ? apps[appName].secret : undefined);
  };

  session.setProfile = function(profile) {
    sessionStorage.setItem('devProfile', JSON.stringify(profile));
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
      URL = apps ? stringManipulation.appToURL(Object.keys(apps)[0]) : undefined;
    }
    return URL;
  };

  session.getProfile = function() {
    return JSON.parse(sessionStorage.getItem('devProfile'));
  };

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

  stringManipulation.appToURL = function(app, api) {
    return "https://api.appbase.io/"+ app +"/v" + (api? "1": "2") + "/";
  }

  return stringManipulation;
}

function DataFactory($timeout, $location, $appbase, stringManipulation, session, $rootScope) {
  var data = {};
  var appName;
  var secret;
  var server = "Ly9hY2NvdW50cy5hcHBiYXNlLmlvLw==";

  data.init = function(appName) {
    secret = session.getAppSecret(appName)
    if(secret !== undefined) {
      data.setAppCredentials(appName, secret)
      return true
    } else {
      return false
    }
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
    atomic.post(stringManipulation.appToURL(appName) + namespace + '/~list', {"data": [""], "secret": secret})
      .success(function(result) {
        var vertices = []
        result.forEach(function(obj) {
          vertices.push(obj.rootPath)
        })
        done(vertices)
      })
      .error(function(error) {
        throw error
      })
  }

  data.getNamespaces = function(done) {
    atomic.get(atob(server)+'app/'+ appName +'/namespaces')
      .success(function(result) {
        if(result !== undefined && result.namesapces !== undefined && result.search_enabled !== undefined) {
          return console.error("Unexpected response from server for namespaces:", result);
        }
      
        var namespaces = []
        result.namespaces.forEach(function(obj) {
          obj.name = obj.name.slice(obj.name.indexOf('.') + 1)
          if(obj.name !== 'system.indexes') {
            obj.searchable = (result.search_enabled.indexOf(obj.name) !== -1)
            namespaces.push(obj)
          }
        })
        
        done(namespaces)
      })
      .error(function(error) {
        throw error
      })
  };

  data.namespaceSearchOptions = function (ns, bool, done) {
    var request = {"namespace": [ns]};
    if(bool) {
      request["enable"] = true;
    } else {
      request["disable"] = true;
    }
    atomic.post(atob(server)+'app/'+ appName +'/search', request)
      .success(function(result) {
        console.log(result)
        done()
      })
      .error(function(error) {
        console.log(error)
        throw error
      })
  }

  data.createApp = function(app, done) {
    atomic.put(atob(server)+'app/'+ app)
      .success(function(response) {
        if(typeof response === "string") {
          done(response)
        } else if(typeof response === "object") {
          atomic.put(atob(server)+'user/'+ session.getProfile().id, {"appname":app})
            .success(function(result) {
              done(null)
            })
            .error(function(error) {
              throw error
            })
        } else {
          throw 'Server Error, try again.'
        }
      })
      .error(function(error) {
        throw error
      })
  }

  data.getDevsApps = function(done) {
    atomic.get(atob(server)+'user/'+ session.getProfile().id)
      .success(function(apps) {
        var appsAndSecrets = {};
        var appsArrived = 0;
        var secretArrived = function(app, secret, metrics) {
          appsArrived += 1;
          appsAndSecrets[app] = {};
          appsAndSecrets[app].secret = secret;
          appsAndSecrets[app].metrics = metrics;
          if(appsArrived === apps.length) {
            done(appsAndSecrets);
          }
        }
        apps.forEach(function(app) {
          data.getAppsSecret(app, function(secret) {
            atomic.get(atob(server)+'app/'+app+'/metrics')
              .success(function(metrics){
                secretArrived(app, secret, metrics);
              });
          });
        });
        $rootScope.fetching = false;
        $rootScope.$apply();
      })
      .error(function(error) {
        throw error
      })
  }

  data.getAppsSecret = function(app, done) {
    atomic.get(atob(server)+'app/'+ app)
      .success(function(result) {
        done(result.secret);
      })
      .error(function(error) {
        throw error
      })
  }

  return data;
}

function NodeBinding(data, stringManipulation, $timeout, $appbase, $rootScope) {
  var nodeBinding = {};
  nodeBinding.bindAsRoot = function($scope) {
    var root = {isR: true};
    root.name = stringManipulation.getBaseUrl();
    root.meAsRoot = function() {
      $rootScope.goToBrowser(stringManipulation.pathToUrl(''));
    }
    root.expand = function() {
      root.children = [];
      root.expanded = true;
      var existingNamespaces = [];
      setInterval(data.getNamespaces.bind(null, function(namespaceObjs) {
        $timeout(function() {
          namespaceObjs.forEach(function(namespaceObj) {
            if(existingNamespaces.indexOf(namespaceObj.name) === -1) {
              root.children.push(nodeBinding.bindAsNamespace($scope, namespaceObj.name, namespaceObj.searchable));
              existingNamespaces.push(namespaceObj.name);
            }
          })
        })
      }), 2000)
    }
    root.contract = function(){
      root.expanded = false;
      root.children = [];
    }

    return root
  }
  
  var vertexBindCallbacks = {
    onAdd :function(scope, vData, vRef, done) {
      nodeBinding.bindAsVertex(scope, vRef.path(), vData);
      done();

      $timeout(function() {
        vData.color = 'white';
      }, 500);
    },
    onUnbind : function(scope, vData, vRef) {
      vData.ref && vData.ref.unbind();
    },
    onRemove : function(scope, vData, vRef, done) {
      $timeout(function() {
        vData.color = 'tomato';
      });

      $timeout(function() {
        done();
      }, 500)
    },
    onChange : function(scope, vData, vRef, done) {
      vData.color = 'gold';
      done();

      $timeout(function() {
        vData.color = 'white';
      }, 500);
    }
  }

  nodeBinding.bindAsNamespace = function($scope, namespace, searchable) {
    var ns =  {name: namespace, isNS: true, ref: $appbase.ns(namespace)}
    ns.meAsRoot = function() {
      $rootScope.goToBrowser(stringManipulation.pathToUrl(namespace));
    }
    ns.expand = function() {
      ns.children = ns.ref.bindVertices($scope, vertexBindCallbacks);
      ns.expanded = true;
    }
    
    ns.contract = function() {
      ns.expanded = false;
      ns.ref.unbindVertices();
    }

    ns.searchable = searchable || false;
    var ignoreToggleClick = false;

    ns.toggleSearch = function() {
      // prevents multiple clicks
      if(ignoreToggleClick) return;
      ignoreToggleClick = true;
      data.namespaceSearchOptions(namespace, !ns.searchable, $timeout.bind(null, function() {
        ns.searchable = !ns.searchable;
        ignoreToggleClick = false;
      }));
    }
    return ns
  }

  nodeBinding.bindAsVertex = function($scope, path, useThisVertex) {
    
    var parsedPath = stringManipulation.parsePath(path);
    var vertex = useThisVertex || {
      ref: $appbase.ns(parsedPath.ns).v(parsedPath.v)
    }

    vertex.isV = true

    vertex.expand = function() {
      vertex.expanded = true;
      vertex.children = vertex.ref.bindEdges($scope, vertexBindCallbacks);
    }

    vertex.meAsRoot = function() {
      $rootScope.goToBrowser(stringManipulation.pathToUrl(path));
    }

    vertex.color = 'yellowgreen';

    vertex.contract = function() {
      vertex.expanded = false;
      vertex.ref.unbindEdges();
    }

    vertex.removeProperty = function(prop) {
      vertex.ref.removeData([prop]);
    }

    vertex.removeSelfEdge = function() {
      var isARootVertex = (stringManipulation.parsePath(path).obj_path === undefined);
      isARootVertex? vertex.ref.destroy() : vertex.ref.inVertex().removeEdge(vertex.name); //destroy if root vertex, remove edge if not
    }

    vertex.addProperty = function(prop, value) {
      var vData = {};
      vData[prop] = value;
      vertex.ref.setData(vData);
    }

    if(useThisVertex === undefined) {
      vertex.properties = vertex.ref.bindProperties($scope, {
        onProperties : function(scope, properties, ref, done) {
          if(vertex.color == 'white')
            vertex.color = 'gold';
          done();

          $timeout(function() {
            vertex.color = 'white';
          }, 500);
        }
      })
      vertex.name = path.slice(path.lastIndexOf('/') + 1);
    }
    return vertex;
  }
  return nodeBinding;
}

})();
