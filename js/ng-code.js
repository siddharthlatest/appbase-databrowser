/**
 * Created by Sagar on 30/8/14.
 */
OAuth.initialize('fjDZzYff0kMpDgKVm9dBkeb439g');
angular.module("abDataBrowser", ['ngAppbase', 'ngRoute', 'ng-breadcrumbs', 'ngDialog'])
  .run(function($rootScope, $location) {
    $rootScope.goToApps = function() {
      $location.path('/');
    }
    $rootScope.goToBrowser = function(path) {
      $location.path('/browser' + (path !== undefined ? "/" + path: ""));
    }
  })
  .config(function($routeProvider) {
    $routeProvider
      .when('/',
      {
        controller:'apps',
        templateUrl:'html/apps.html'
      }
    ).when('/browser',
      {
        controller:'browser',
        templateUrl:'html/browser.html'
      }
    ).when('/browser/:path*',
      {
        controller:'browser',
        templateUrl:'html/browser.html'
      }
    ).otherwise({ redirectTo: '/' });
  })
  .controller("sidebar", function($scope) {
    $scope.$on('$routeChangeSuccess', function(event, current, prev) {
      $scope.currentScope = current? current.controller: undefined
    });
  })
  .controller("apps", ['$scope', 'session', '$route', 'data', '$timeout', 'stringManipulation', function($scope, session, $route, data, $timeout, stringManipulation) {
    Prism.highlightAll();
    if($scope.devProfile = session.getProfile()) {
      var fetchApps = function() {
        data.getDevsApps(function(apps) {
          $timeout(function(){
            $scope.apps = apps;
            session.setApps(apps);
          })
        });
      }

      $scope.createApp = function (app) {
        data.createApp(app, function(error) {
          if(error) {
            alert('Name taken. Try another name.');
          } else {
            fetchApps();
          }
        })
      }

      $scope.logout = function() {
        session.setApps(null);
        session.setProfile(null);
        $route.reload();
      }

      $scope.appToURL = stringManipulation.appToURL;
      fetchApps()
    } else {
      $scope.loginPopup = function() {
        OAuth.popup('google')
          .done(function(result) {
            result.me()
              .done(function(profile) {
                session.setProfile(profile.raw);
                $route.reload();
              })
              .fail(console.log.bind(console))
          })
          .fail(console.log.bind(console))
      }
    }
  }])
  .controller("browser", ['$scope', '$appbaseRef', '$timeout', '$routeParams', '$location', 'data', 'stringManipulation', 'breadcrumbs', 'ngDialog', 'nodeBinding', 'session', '$rootScope', function($scope, $appbaseRef, $timeout, $routeParams, $location, data, stringManipulation, breadcrumbs, ngDialog, nodeBinding, session, $rootScope) {
    $scope.alertType = 'danger';
    $scope.goToBrowser = $rootScope.goToBrowser;

    var appName;
    var URL;
    if((appName = stringManipulation.parseURL(URL = stringManipulation.cutLeadingTrailingSlashes($routeParams.path)).appName) === undefined) {
      if((appName = stringManipulation.parseURL(URL = session.getBrowserURL()).appName) === undefined) {
        $scope.alert = 'The URL is not proper, or, you are not logged in.';
        return;
      } else {
        $rootScope.goToBrowser(URL);
      }
    } else {
      session.setBrowserURL(URL);
    }

    if(!data.init(appName)) {
      $scope.alert = 'You are not allowed to browse this data. Go to the developer page and try logging in again.'
      return
    }

    $scope.goUp = function() {
      $location.path(stringManipulation.parentUrl($scope.url))
    }

    var path

    if((path = stringManipulation.urlToPath($scope.url = stringManipulation.cutLeadingTrailingSlashes($routeParams.path))) === undefined) {
      $scope.node = nodeBinding.bindAsRoot($scope)
    } else if(path.indexOf('/') === -1) {
      $scope.node = nodeBinding.bindAsNamespace($scope, path)
    } else {
      $scope.node = nodeBinding.bindAsVertex($scope , path)
    }
    $scope.node.expand()

    $scope.baseUrl = stringManipulation.cutLeadingTrailingSlashes(stringManipulation.getBaseUrl())
    $scope.breadcrumbs = (path === undefined)? undefined : breadcrumbs.generateBreadcrumbs(path)

    $scope.addEdgeInto = function(node) {
      ngDialog.open({
        template: 'html/dialog-small.html',
        controller: ['$scope', function($dialogScope) {
          $dialogScope.node = node
          if (!node.isV) {
            $dialogScope.title = "Add Vertex"
          } else {
            $dialogScope.title = "Add Out-vertex at path: " + node.$ref.$path();
          }
          if(node.isNS) {
            $dialogScope.namespaceSelected = node.name
          }
          $dialogScope.text = "in " + node.name
          $dialogScope.vTypeOptions = ['New Vertex', 'Existing Vertex']
          $dialogScope.vType = $dialogScope.vTypeOptions[0]
          $dialogScope.namespaceN = 'asdkj'

          $dialogScope.namespaces = ['Loading..']
          data.getNamespaces(function(array) {
            $timeout(function() {
              $dialogScope.namespaces = array
            })
          })

          //prevents user from choosing 'Loading..'
          $dialogScope.$watch( function() {
            return $dialogScope.namespaceSelected
          }, function(val) {
            $dialogScope.namespaceSelected = (val === 'Loading..' ? null : val)
          })

          $dialogScope.done = function() {
            var prepareParams = function() {
              var params = {}
              if($dialogScope.vType === $dialogScope.vTypeOptions[0]) { // New Vertex
                params.namespace = ($dialogScope.namespaceSelected === undefined || $dialogScope.namespaceSelected === null) ? $dialogScope.namespaceNew : $dialogScope.namespaceSelected
                params.vId = ($dialogScope.vId === undefined || $dialogScope.vId === "") ? Appbase.uuid() : $dialogScope.vId
                params.ref = $appbaseRef(Appbase.create(params.namespace, params.vId))
              } else {
                params.vPath = $dialogScope.vPath
                params.ref = $appbaseRef(params.vPath)
              }

              params.eName = ($dialogScope.eName === undefined || $dialogScope.eName === "") ? (params.vId === undefined? Appbase.uuid() : params.vId) : $dialogScope.eName
              params.pR = ($dialogScope.pR === undefined || $dialogScope.pR === null) ? undefined : $dialogScope.pR

              return params
            }

            var params = prepareParams()
            if(node.isV) {
              node.$ref.$setEdge(params.ref, params.eName, params.pR)
            } else if(node.isNS) {
              node.children.unshift(nodeBinding.bindAsVertex($scope, params.namespace + '/' + params.vId))
            } else {
              node.children.unshift(nodeBinding.bindAsNamespace($scope, params.namespace))
            }
            $dialogScope.closeThisDialog()
          }

          $dialogScope.no = function() {
            $dialogScope.closeThisDialog()
          }
        }],
        className: 'ngdialog-theme-dialog-small',
        showClose: false
      })
    }

  }])
  .factory('nodeBinding', ['data', 'stringManipulation', '$timeout', '$appbaseRef', '$rootScope', function(data, stringManipulation, $timeout, $appbaseRef, $rootScope) {
    var nodeBinding = {};
    nodeBinding.bindAsRoot = function($scope) {
      var root = {isR: true}
      root.name = stringManipulation.getBaseUrl()
      root.meAsRoot = function() {
        $rootScope.goToBrowser(stringManipulation.pathToUrl(''))
      }
      root.expand = function() {
        root.children = []
        root.expanded = true
        data.getNamespaces(function(namespaces) {
          $timeout(function(){
            namespaces.forEach(function(namespace) {
              root.children.push(nodeBinding.bindAsNamespace($scope, namespace))
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

    nodeBinding.bindAsNamespace = function($scope, namespace) {
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
              ns.children.push(nodeBinding.bindAsVertex($scope, vertexPath))
            })
          })
        })
      }
      ns.contract = function() {
        ns.expanded = false
        ns.children = []
      }

      ns.searchable = false;
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
  }])
  .factory('data', ['$timeout', '$location', '$appbaseRef', 'stringManipulation', 'session', function($timeout, $location, $appbaseRef, stringManipulation, session) {
    var data = {};
    var appName;
    var secret;
    var server = "aHR0cDovLzEwNC4xMzAuMjQuMTE4Lw==";

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
          var namespaces = []
          result.forEach(function(obj) {
            obj.name = obj.name.slice(obj.name.indexOf('.') + 1)
            if(obj.name !== 'system.indexes'){
              namespaces.push(obj.name)
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
          var secretArrived = function(app, secret) {
            appsArrived += 1;
            appsAndSecrets[app] = secret;
            if(appsArrived === apps.length) {
              done(appsAndSecrets);
            }
          }
          apps.forEach(function(app) {
            data.getAppsSecret(app, function(secret) {
              secretArrived(app, secret);
            });
          });
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
  }])
  .factory('stringManipulation', function() {
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

    stringManipulation.appToURL = function(app) {
      return 'http://'+ app + '.' + 'api1.appbase.io/';
    }

    return stringManipulation
  })
  .factory('session', ['stringManipulation', function(stringManipulation) {
    var session = {};

    session.setApps = function(apps) {
      sessionStorage.setItem('apps', JSON.stringify(apps));
    };

    session.getApps = function() {
      return JSON.parse(sessionStorage.getItem('apps'));
    };

    session.getAppSecret = function(appName) {
      var apps = session.getApps();
      return (apps !== undefined && apps !== null ? apps[appName] : undefined);
    };

    session.setProfile = function(profile) {
      sessionStorage.setItem('devProfile', JSON.stringify(profile));
    };

    session.setBrowserURL = function(url) {
      console.log('storing', url);
      sessionStorage.setItem('URL', url);
    };

    session.getBrowserURL = function() {
      var URL;
      var apps;
      console.log('stored',  sessionStorage.getItem('URL'));
      URL = (URL = sessionStorage.getItem('URL')) !== null ? URL : ((apps = session.getApps()) !== null) ? stringManipulation.appToURL(Object.keys(apps)[0]) : undefined;
      return URL;
    };

    session.getProfile = function() {
      return JSON.parse(sessionStorage.getItem('devProfile'));
    };

    return session;
  }])