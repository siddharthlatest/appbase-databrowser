/**
 * Created by Sagar on 30/8/14.
 */
(function(){
angular.module("abDataBrowser", ['ngAppbase', 'ngRoute', 'ng-breadcrumbs', 'ngDialog', 'easypiechart', 'ngAnimate'])
  .run(FirstRun)
  .config(Routes);

function FirstRun($rootScope, $location, stringManipulation){
  $rootScope.currentApp = sessionStorage.getItem('URL') ? stringManipulation.urlToAppname(sessionStorage.getItem('URL')) : '';
  $rootScope.$watch('currentApp', function(app){
    sessionStorage.setItem('URL', stringManipulation.appToURL(app));
  });
  $rootScope.goToApps = function() {
    $location.path('/');
  }
  $rootScope.goToBrowser = function(path) {
    path = path || ($rootScope.currentApp ? stringManipulation.appToURL($rootScope.currentApp) : '');
    $location.path('/browser/' + path);
  }
  $rootScope.goToStats = function(path){
    if(path) $rootScope.currentApp = path;
    else path = $rootScope.currentApp;
    $location.path('/stats/' + path);
  }
  $rootScope.goToOauth = function(path){
    if(path) $rootScope.currentApp = path;
    else path = $rootScope.currentApp;
    $location.path('/oauth/' + path);
  }

} 

function Routes($routeProvider){
  var browser = {
    controller: 'browser',
    templateUrl: 'html/browser.html'
  }, stats = {
    controller: 'stats',
    templateUrl: 'html/stats.html'
  }, apps = {
    controller: 'apps',
    templateUrl: 'html/apps.html'
  }, signup = {
    controller: 'signup',
    templateUrl: 'html/signup.html'
  }, oauth = {
    controller: 'oauthd',
    templateUrl: 'html/oauth.html'
  };

  $routeProvider
    .when('/', apps)
    .when('/signup', signup)
    .when('/browser', browser)
    .when('/browser/:path*', browser)
    .when('/stats/:path*', stats)
    .when('/stats', stats)
    .when('/oauth/:path*', oauth)
    .when('/oauth', oauth)
    .otherwise({ redirectTo: '/' });
}
})();



(function(){
angular
.module("abDataBrowser")
.controller("apps", ['$scope', 'session', '$route', 'data', '$timeout', 'stringManipulation', '$rootScope', 'oauthFactory', '$appbase', AppsCtrl]);

function AppsCtrl($scope, session, $route, data, $timeout, stringManipulation, $rootScope, oauthFactory, $appbase) {
  $scope.api = false;
  Prism.highlightAll();
  if($scope.devProfile = session.getProfile()) {
    $rootScope.logged = true;
    $.post('http://162.243.5.104:8080/u', {user: $scope.devProfile.uid}).done(function(data){
      $rootScope.code = (data == "true");
      $rootScope.$apply();
      if($rootScope.code) console.log('User has $50 coupon.');
    });
    $rootScope.affiliate = false; 
    $.ajax({url:'http://162.243.5.104:8088/e', type:"POST",
      data: JSON.stringify({email: $scope.devProfile.email}), contentType:"application/json; charset=utf-8",
      dataType:"json",
      success: function(data){
        console.log($scope.devProfile.email, ': ', data)
        $timeout(function(){
           if(data) $rootScope.affiliate = true;
        });
      } 
    });
    
    var fetchApps = function() {
      $scope.fetching = true;
      data.getDevsApps(function(apps) {
        $timeout(function(){
          for(var app in apps){
            oauthFactory.getApp(app, apps[app].secret)
            .then(function(data){
              apps[app].oauth = data;
            }, function(data){
              throw data;
            });
          }
          $scope.fetching = false;
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
      $timeout(function(){
        $rootScope.logged = false;
        $appbase.unauth();
        session.setApps(null);
        session.setProfile(null);
        $route.reload();
      });
    }

    $scope.appToURL = stringManipulation.appToURL;
    fetchApps()
  } else {
    $scope.loginPopup = function(provider) {
      $appbase.credentials('aphrodite');
      $appbase.authPopup(provider, provider === 'google' ? { authorize: { scope: ['openid email'] } } : {},
          function(error, result, req) {
          if(error) {
            throw error;
          }
          session.setProfile(result);
          $route.reload();
        }
      )
    }
  }
  $rootScope.$watch('fetching', function(data){
    $scope.fetching = data;
  });
}
})();
(function(){
angular
.module("abDataBrowser")
.controller("browser",
             ['$scope', '$appbase', '$timeout', '$routeParams', '$location',
              'data', 'stringManipulation', 'breadcrumbs', 'ngDialog', 'nodeBinding',
              'session', '$rootScope', BrowserCtrl]);

function BrowserCtrl($scope, $appbase, $timeout, $routeParams, $location, data, stringManipulation, breadcrumbs, ngDialog, nodeBinding, session, $rootScope){
  $scope.alertType = 'danger';
  $scope.goToBrowser = $rootScope.goToBrowser;

  var appName;
  var URL;

  if((appName = stringManipulation.parseURL(URL = stringManipulation.cutLeadingTrailingSlashes($routeParams.path)).appName) === undefined){
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

  var path;

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
      template: 'html/dialog-new-vertex.html',
      controller: ['$scope', function($dialogScope) {
        $dialogScope.node = node
        if (!node.isV) {
          $dialogScope.title = "Add Vertex"
        } else {
          $dialogScope.title = "Add Out-vertex at path: " + node.ref.path();
        }
        if(node.isNS) {
          $dialogScope.namespaceSelected = node.name
        }
        $dialogScope.text = "in " + node.name
        $dialogScope.vTypeOptions = ['New Vertex', 'Existing Vertex']
        $dialogScope.vType = $dialogScope.vTypeOptions[0]

        $dialogScope.namespaces = ['Loading..']
        data.getNamespaces(function(array) {
          $timeout(function() {
            $dialogScope.namespaces = [];
            for(var i=0; i< array.length; i++) {
              $dialogScope.namespaces.push(array[i].name);
            }
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
              params.namespace =
                ($dialogScope.namespaceSelected === undefined || $dialogScope.namespaceSelected === null) ?
                $dialogScope.namespaceNew : $dialogScope.namespaceSelected
              params.vId = ($dialogScope.vId === undefined || $dialogScope.vId === "") ? $appbase.uuid() : $dialogScope.vId
              params.ref = $appbase.ns(params.namespace).v(params.vId)
            } else {
              params.vPath = $dialogScope.vPath
              var parsedPath = stringManipulation.parsePath(params.vPath);
              params.ref = $appbase.ns(parsedPath.ns).v(parsedPath.v);
            }

            params.eName = 
              ($dialogScope.eName === undefined || $dialogScope.eName === "") ?
              (params.vId === undefined? $appbase.uuid() : params.vId) : $dialogScope.eName
            params.pR = ($dialogScope.pR === undefined || $dialogScope.pR === null) ? undefined : $dialogScope.pR

            return params
          }

          var params = prepareParams()
          if(node.isV) {
            if(params.pR !== undefined) node.ref.setEdge(params.eName, params.ref, params.pR)
            else node.ref.setEdge(params.eName, params.ref)
          } else if(node.isR) {
            if(!nodeBinding.childExists(node, params.namespace)) {
              node.children.unshift(nodeBinding.bindAsNamespace($scope, params.namespace))
            }
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
}
})();
(function(){
angular
.module("abDataBrowser")
.directive('imgSrc', ImgSrc)
.directive('barchart', BarChart);


function ImgSrc(){
  return {
    scope: {
      src: '@'
    },
    link: function(scope, element, attrs) {
      attrs.$observe('src', function(src){
        element.css('display', 'block');
      });
      element.bind('error', function(err) {
        element.css('display', 'none');
      });
    }
  } 
}

function BarChart(){
  return {

      // required to make it work as an element
      restrict: 'E',
      template: '<div></div>',
      replace: true,
      scope: {
        data: "=",
        xkey: "=",
        ykeys: "=",
        labels: "="
      },
      // observe and manipulate the DOM
      link: function($scope, element, attrs) {

          var graph = Morris.Area({
            element: element,
            data: $scope.data,
            xkey: $scope.xkey,
            ykeys: $scope.ykeys,
            labels: $scope.labels
          });
          $scope.$watch('data', function(newData){
            graph.setData(newData);
          });
      }

  };
}

})();
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
          atomic.put(atob(server)+'user/'+ session.getProfile().uid, {"appname":app})
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
    atomic.get(atob(server)+'user/'+ session.getProfile().uid)
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
  nodeBinding.childExists = function(node, childName) {
    for(var i=0 ; i<node.children.length; i++) {
       if(node.children[i].name === childName) {
         return true;
       }
    }
    return false;
  };
  
  nodeBinding.bindAsRoot = function($scope) {
    var root = {isR: true};
    root.name = stringManipulation.getBaseUrl();
    root.meAsRoot = function() {
      $rootScope.goToBrowser(stringManipulation.pathToUrl(''));
    }
    
    root.expand = function() {
      root.children = [];
      root.expanded = true;
      root.intervalID = setInterval(data.getNamespaces.bind(null, function(namespaceObjs) {
        $timeout(function() {
          namespaceObjs.forEach(function(namespaceObj) {
            if(!nodeBinding.childExists(root, namespaceObj.name)) {
              root.children.unshift(nodeBinding.bindAsNamespace($scope, namespaceObj.name, namespaceObj.searchable));
            }
          })
        })
      }), 2000);
    }
    
    root.contract = function() {
      root.expanded = false;
      root.children.forEach(function(namespaceNode) {
        namespaceNode.contract();
      });
      root.children = [];
      if(root.intervalID !== undefined) clearInterval(root.intervalID);
    }
    
    $scope.$on('$destroy', function() {
      root.contract();
    })

    return root
  }
  
  var vertexBindCallbacks = {
    onAdd : function(scope, vData, vRef, done) {
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

(function(){
angular
.module("abDataBrowser")
.controller('oauthd', OauthCtrl)
.factory("oauthFactory", OauthFactory);

function OauthCtrl($scope, oauthFactory, stringManipulation, $routeParams, $timeout, $filter, data, session, $rootScope, $location){
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
  $scope.tab = function(app) {
    $scope.cancel();
    $scope.status = $scope.provStatus = "Loading...";
    $scope.domains = [];
    $scope.userProviders = {};
    oauthFactory.getApp(app, $scope.apps[app].secret)
    .then(function(oauth){
      oauth = oauth.data;
      $timeout(function() {
        $scope.status = false;
        $scope.domains = oauth.domains;
        $scope.expiryTime = oauth.expiryTime || 1000*60*60*24*30;
        //not showing localhost and 127.0.0.1 in the view
        if($scope.domains.indexOf('127.0.0.1') !== -1) $scope.domains.splice($scope.domains.indexOf('127.0.0.1'), 1);
        if($scope.domains.indexOf('localhost') !== -1) $scope.domains.splice($scope.domains.indexOf('localhost'), 1);
      });
      if(oauth.keysets.length){
        oauthFactory.getKeySets(app, oauth.keysets)
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
    $scope.app = app;
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
  }

  $scope.updateExpiry = function(time){    
    if($scope.validate(time)){
      $scope.loading = true;
      oauthFactory.updateTime($scope.app, $scope.validate(time))
      .then(function(data){
        if(data.status !== "success") throw data;
        $timeout(function(){
          $scope.loading = false;
          $scope.timeInput = '';
        });
      },function(data){throw data;});
    }
  }

  $scope.readTime = function(ms){
    var x = ms / 1000;
    seconds = x % 60;
    x /= 60;
    minutes = x % 60;
    x /= 60;
    hours = x % 24;
    x /= 24;
    days = x;
    return (days ? days + ' days' : '')
         + (hours ? hours + ' hours' : '')
         + (minutes ? minutes + ' minutes' : '')
         + (seconds ? seconds + ' seconds' : '');
  }

  $scope.switch = function(tab){
    $location.path('oauth/'+tab);
    $rootScope.currentApp = tab;
  }

  oauthFactory.getProviders()
  .then(function(data){
    $scope.providers = data;
  }, function(data){
    throw data;
  });

  var app = stringManipulation.cutLeadingTrailingSlashes($routeParams.path);
  var sessionApps = JSON.parse(sessionStorage.getItem('apps'));

  
  if(typeof sessionApps === "object" && sessionApps){
    if(!Object.getOwnPropertyNames(sessionApps).length){
      fetchApps();
    } else {
      $scope.apps = sessionApps;
      init();
    }
  } else {
    if(session.getProfile())
      fetchApps();
    else
      $rootScope.goToApps();
  }

  function init(){
    if(app){
      $scope.app = app;
    } else {
      var arr = [];
      for (var prop in $scope.apps) arr.push(prop);
      $scope.app = arr.sort()[0];
      $location.path('oauth/' + $scope.app);
    }
    $scope.tab($scope.app);
  }



  function fetchApps(){
    data.getDevsApps(function(apps) {
      $timeout(function(){
        // for(var app in apps){
        //   oauthFactory.getApp(app, apps[app].secret)
        //   .then(function(data){
        //     apps[app].oauth = data;
        //   }, function(data){
        //     throw data;
        //   });
        // }
        $scope.apps = apps;
        init();
      });
    });
  }
}

function OauthFactory($timeout, $q){
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
(function(){
angular
.module("abDataBrowser")
.controller('signup', ['$rootScope', '$scope', 'session', '$route', '$location', SignupCtrl])
.controller('sidebar', SidebarCtrl);

function SidebarCtrl($scope, $rootScope){
  $scope.hide = false;
  $scope.code = false;
  $scope.logged = false;
  $scope.$on('$routeChangeSuccess', function(event, current, prev) {
    $scope.currentScope = current? current.controller: undefined
  });

  $rootScope.$watch('hide', function(data){
    if(typeof data !== 'undefined') $scope.hide = data;
  });

  $rootScope.$watch('code', function(data){
    $scope.code = data ? '$50' : '$0';
  })
  
  $rootScope.$watch('logged', function(data){
    $scope.logged = data;
  })
}

function SignupCtrl($rootScope, $scope, session, $route, $location){
  $rootScope.hide = true;
  $scope.promoCode = function(){
    var proceed = function(profile) {
      var userID = profile.uid;
      $.post('http://162.243.5.104:8080', {code: $scope.codeInput, user: userID}).done(function(data){
        if(data == "true") {
          profile["code"] = true;
          console.log('here')
          session.setProfile(profile);
          $.post('http://162.243.5.104:8080/u', {user: userID}).done(function(data) {
            console.log(data)
            $rootScope.hide = false;
            if(data == "true") {
              $rootScope.code = true;
              $rootScope.goToApps();
              $rootScope.$apply();
            } else {
              $rootScope.goToApps();
              $rootScope.$apply();
            }
          })
        } else {
          console.log(data);
          alert('Sorry, unable to verify your code.');
          $route.reload();
        }
      })
    }
  }
    
  $appbase.authPopup('google', { authorize: { scope: ['openid email'] } }, function(error, result, req) {
    if(error) {
      throw error;
    }
    proceed(result);
  })
    
}

})();
(function(){
angular
.module("abDataBrowser")
.controller('stats', StatsCtrl);

function StatsCtrl($routeParams, stringManipulation, $scope, session, $rootScope, $location){
  $scope.cap = 500000;
  $scope.chart = {};
  $scope.chartOptions = {
    animate:{
        duration:0,
        enabled:false
    },
    barColor:'#428bca',
    scaleColor:false,
    lineWidth:20,
    lineCap:'circle'
  };
  $scope.morris = {
    xkey: 'formatedDate',
    ykeys: ['restAPICalls', 'socketAPICalls', 'searchAPICalls'],
    labels: ['Rest API Calls', 'Socket API Calls', 'Search API Calls']
  };
  var app = stringManipulation.cutLeadingTrailingSlashes($routeParams.path);
  var sessionApps = JSON.parse(sessionStorage.getItem('apps'));
  if(sessionApps){
    if(!Object.getOwnPropertyNames(sessionApps).length){
      fetchApps();
    } else {
      $scope.apps = sessionApps;
      setApp();
    }
  } else {
    if(session.getProfile())
      fetchApps();
    else{
      $rootScope.goToApps();
    }
  }

  function setApp(){
    getMetrics();
    if(app){
      $scope.app = app;
    } else {
      var arr = [];
      for (var prop in $scope.apps) arr.push(prop);
      $scope.app = arr.sort()[0];
      $location.path('stats/' + $scope.app)
    }
    setGraph($scope.app);
  }

  function getMetrics(){
    for(var prop in $scope.apps){
      // Iterate through properties of objects inside $scope.apps
      $scope.apps[prop].vertices = $scope.apps[prop].metrics.edgesAndVertices.Vertices;
      $scope.apps[prop].edges = $scope.apps[prop].metrics.edgesAndVertices.Edges;
      var calls = $scope.apps[prop].metrics.calls;
      if(!calls){
        $scope.apps[prop].metrics = [];
      } else {
        var metrics = [];
        for(var name in calls){
          if(name !== '_id' && name !== 'appname'){
            var split = name.split(':');
            var data = split[1];
            var date = parseInt(split[0]);
            var existing = false;
            metrics.forEach(function(each){
              if(each.date === date){
                each[data] = calls[name];
                existing = true;
              }
            });
            if(!existing){
              var toPush = {};
              toPush.date = date;
              date = new Date(date);
              toPush.formatedDate = date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
              toPush[data] = calls[name];
              metrics.push(toPush);
            }
          }
        }
        $scope.apps[prop].metrics = metrics;
        var grandTotal = 0;
        $scope.apps[prop].metrics.forEach(function(each){
          var total = 0;
          total += (each.restAPICalls = each.restAPICalls || 0);
          total += (each.socketAPICalls = each.socketAPICalls || 0);
          total += (each.searchAPICalls = each.searchAPICalls || 0);
          each.total = total;
          grandTotal += total;
        });
        $scope.apps[prop].totalAPI = grandTotal;

        var monthData=0, weekData=0, dayData;
        var miliDay   = 1000 * 60 * 60 * 24;
        var miliWeek  = miliDay * 7;
        var miliMonth = miliDay * 30;
        var now = Date.now();
        
        $scope.apps[prop].metrics.forEach(function(each){
          if(now - each.date <= miliMonth) {
            monthData += each.total;
            if(now - each.date <= miliWeek){
              weekData += each.total;
              dayData = each.total;
            }
          }
        });

        $scope.apps[prop].day = dayData;
        $scope.apps[prop].week = weekData;
        $scope.apps[prop].month = monthData;
      }
    }
  }

  function setGraph(tab){
    var app = $scope.apps[tab];
    $scope.vert = app.vertices;
    $scope.edges = app.edges;
    $scope.total = app.totalAPI;
    var metrics = app.metrics;
    if(metrics.length){
      $scope.morris.data = metrics;
      $scope.chart.month = app.month;
      $scope.chart.week = app.week;
      $scope.chart.day = app.day;
      
      $scope.noData = false;
    } else {
      $scope.noData = true;
    }
  }

  $scope.tab = function(tab){
    $scope.app = tab;
    setGraph(tab);
  }

  $scope.switch = function(tab){
    $location.path('stats/' + tab);
    $rootScope.currentApp = tab;
  }

  function fetchApps(){
    data.getDevsApps(function(apps) {
      $timeout(function(){
        $scope.apps = apps;
        setApp();
      });
    });
  }

}

})();