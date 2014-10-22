(function(){
angular
.module("abDataBrowser")
.factory('stringManipulation', StringManipulationFactory)
.factory('session', ['stringManipulation', '$rootScope', SessionFactory])
.factory('nodeBinding', ['data', 'stringManipulation', '$timeout', '$appbaseRef', '$rootScope', NodeBinding])
.factory('data', ['$timeout', '$location', '$appbaseRef', 'stringManipulation', 'session', '$rootScope', DataFactory]);

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
    console.log('storing', url);
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

    //console.log('stored',  sessionStorage.getItem('URL'));
    //URL = (URL = sessionStorage.getItem('URL')) !== null ? URL : ((apps = session.getApps()) !== null)
    //? stringManipulation.appToURL(Object.keys(apps)[0]) : undefined;
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

  stringManipulation.parseURL = function(url) {
    var intermediate = url;
    intermediate = intermediate === undefined? undefined: url.split(/\/\/(.+)?/)[1]
    intermediate = intermediate === undefined? undefined: intermediate.split(/\.(.+)?/)
    var appname = intermediate === undefined? undefined: intermediate[0]
    var path = intermediate === undefined? undefined: intermediate[1].split(/\/(.+)?/)[1]
    return {
      appName: appname,
      path: path
    }
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
    return 'http://'+ app + '.' + 'api'+(api?'1':'2')+'.appbase.io/';
  }

  return stringManipulation;
}

function DataFactory($timeout, $location, $appbaseRef, stringManipulation, session, $rootScope) {
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
    console.log('creds for ', app)
    Appbase.credentials(app, s);
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
        console.log(response);
        if(typeof response === "string") {
          done(response)
        } else if(typeof response === "object") {
          console.log(session.getProfile().id, app)
          atomic.put(atob(server)+'user/'+ session.getProfile().id, {"appname":app})
            .success(function(result) {
              console.log(result)
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
            console.log(appsAndSecrets);
            done(appsAndSecrets);
          }
        }
        apps.forEach(function(app) {
          data.getAppsSecret(app, function(secret) {
            atomic.get(atob(server)+'app/'+app+'/metrics')
              .success(function(metrics){
                console.log(app, secret, metrics);
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

function NodeBinding(data, stringManipulation, $timeout, $appbaseRef, $rootScope) {
  var nodeBinding = {};
  nodeBinding.bindAsRoot = function($scope) {
    var root = {isR: true}
    console.log('root')
    root.name = stringManipulation.getBaseUrl()
    root.meAsRoot = function() {
      $rootScope.goToBrowser(stringManipulation.pathToUrl(''))
    }
    root.expand = function() {
      root.children = []
      root.expanded = true
      data.getNamespaces(function(namespaceObjs) {
        $timeout(function(){
          namespaceObjs.forEach(function(namespaceObj) {
            root.children.push(nodeBinding.bindAsNamespace($scope, namespaceObj.name, namespaceObj.searchable))
          })
        })
      })
    }
    root.contract = function(){
      root.expanded = false
      root.children = []
    }

    return root
  }

  nodeBinding.bindAsNamespace = function($scope, namespace, searchable) {
    var ns =  {name: namespace, isNS: true}
    ns.meAsRoot = function() {
      $rootScope.goToBrowser(stringManipulation.pathToUrl(namespace))
    }
    ns.expand = function(){
      ns.children = []
      ns.expanded = true
      data.getVerticesOfNamespace(namespace, function(vertices) {
        $timeout(function() {
          vertices.forEach(function(vertexPath) {
            console.log(vertexPath)
            ns.children.push(nodeBinding.bindAsVertex($scope, vertexPath))
          })
        })
      })
      // Appbase.ns(namespace).on('vertex_added', function(err, vref){
      //   $timeout(function(){
      //     ns.children.push(nodeBinding.bindAsVertex($scope, stringManipulation.urlToPath(vref.URL())));
      //   });
      // });
    }
    ns.contract = function() {
      ns.expanded = false
      ns.children = []
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
      }))
    }
    return ns
  }

  nodeBinding.bindAsVertex = function($scope, path, useThisVertex) {
    console.log(path, useThisVertex)
    var bindEdges = function($ref) {
      return $ref.$bindEdges($scope, true, false, {
        onAdd :function(scope, edgeData, edgeRef, done) {
          edgeData.$ref = $appbaseRef(edgeRef)
          nodeBinding.bindAsVertex($scope, edgeRef.path(), edgeData)
          done()

          $timeout(function() {
            edgeData.color = 'white'
          }, 500)
        },
        onUnbind : function(scope, edgeData, edgeRef) {
          edgeData.$ref && edgeData.$ref.$unbind()
        },
        onRemove : function(scope, edgeData, edgeRef, done) {
          $timeout(function() {
            edgeData.color = 'tomato'
          })

          $timeout(function() {
            done()
          }, 500)
        },
        onChange : function(scope, edgeData, edgeRef, done) {
          edgeData.color = 'gold'
          done()

          $timeout(function() {
            edgeData.color = 'white'
          }, 500)
        }
      })
    }

    var vertex = useThisVertex || {
      $ref: $appbaseRef(path)
    }

    vertex.isV = true

    vertex.expand = function() {
      vertex.expanded = true
      vertex.children = bindEdges(vertex.$ref)
    }

    vertex.meAsRoot = function() {
      $rootScope.goToBrowser(stringManipulation.pathToUrl(path))
    }

    vertex.color = 'yellowgreen'

    vertex.contract = function() {
      vertex.expanded = false
      vertex.$ref.$unbindEdges()
    }

    vertex.removeProperty = function(prop) {
      vertex.$ref.$removeData([prop])
    }

    vertex.removeSelfEdge = function() {
      vertex.$ref.$inVertex().$removeEdge(vertex.name)
    }

    vertex.addProperty = function(prop, value) {
      var vData = {}
      vData[prop] = value
      vertex.$ref.$setData(vData)
    }

    if(useThisVertex === undefined) {
      vertex.properties = vertex.$ref.$bindProperties($scope, {
        onProperties : function(scope, properties, ref, done) {
          if(vertex.color == 'white')
            vertex.color = 'gold'
          done()

          $timeout(function() {
            vertex.color = 'white'
          }, 500)
        }
      })
      vertex.name = path.slice(path.lastIndexOf('/') + 1)
    }
    return vertex
  }
  return nodeBinding;
}

})();
