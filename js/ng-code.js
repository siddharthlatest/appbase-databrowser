/**
 * Created by Sagar on 30/8/14.
 */
angular.module("abDataBrowser", ['ngAppbase', 'ngRoute', 'ng-breadcrumbs', 'ngDialog'])
  .run(function($rootScope) {
  })
  .config(function($routeProvider) {
    $routeProvider
      .when('/',
      {
        controller:'browser',
        templateUrl:'html/browser.html'
      }
    ).when('/:path*',
      {
        controller:'browser',
        templateUrl:'html/browser.html'
      }
    ).otherwise({ redirectTo: '/' });
  })
  .controller("browser", function($scope, $appbaseRef, $timeout, $routeParams, $location, data, stringManipulation, breadcrumbs, ngDialog) {
    $scope.alertType = 'danger'

    var appName;
    if((appName = stringManipulation.parseURL(stringManipulation.cutLeadingTrailingSlashes($routeParams.path)).appName) === undefined){
      $scope.alert = 'The URL is not proper.'
      return
    }

    if(!data.isInitComplete() && !data.init(appName)) {
      $scope.alert = 'You are not allowed to browse this data. Go to the developer page and try logging in again.'
      return
    }

    $scope.goUp = function() {
      $location.path(stringManipulation.parentUrl($scope.url))
    }

    var path

    if((path = stringManipulation.urlToPath($scope.url = stringManipulation.cutLeadingTrailingSlashes($routeParams.path))) === undefined) {
      console.log('root', path, $scope.url)
      $scope.node = data.bindAsRoot($scope)
    } else if(path.indexOf('/') === -1) {
      console.log('ns', path, $scope.url)
      $scope.node = data.bindAsNamespace($scope, path)
    } else {
      console.log('v', path, $scope.url)
      $scope.node = data.bindAsVertex($scope , path)
    }
    $scope.node.expand()

    $scope.baseUrl = stringManipulation.cutLeadingTrailingSlashes(stringManipulation.getBaseUrl())
    $scope.breadcrumbs = (path === undefined)? undefined : breadcrumbs.generateBreadcrumbs(path)

    $scope.addEdgeInto = function(node) {
      ngDialog.open({
        template: 'html/dialog-small.html',
        controller: function($scope) {
          $scope.title = "Add Out-vertex at path: " + node.$ref.$path();
          $scope.text = "in " + node.name
          $scope.vTypeOptions = ['New Vertex', 'Existing Vertex']
          $scope.vType = $scope.vTypeOptions[0]
          $scope.namespaceN = 'asdkj'

          $scope.namespaces = ['Loading..']
          data.getNamespaces(function(array) {
            $timeout(function() {
              $scope.namespaces = array
            })
          })

          //prevents user from choosing 'Loading..'
          $scope.$watch( function() {
            return $scope.namespaceSelected
          }, function(val) {
            $scope.namespaceSelected = (val === 'Loading..' ? null : val)
          })

          $scope.done = function() {
            var prepareParams = function() {
              var params = {}
              if($scope.vType === $scope.vTypeOptions[0]) { // New Vertex
                params.namespace = ($scope.namespaceSelected === undefined || $scope.namespaceSelected === null) ? $scope.namespaceNew : $scope.namespaceSelected
                params.vId = ($scope.vId === undefined || $scope.vId === "") ? Appbase.uuid() : $scope.vId
                params.ref = $appbaseRef(Appbase.create(params.namespace, params.vId))
              } else {
                params.vPath = $scope.vPath
                params.ref = $appbaseRef(params.vPath)
              }

              params.eName = ($scope.eName === undefined || $scope.eName === "") ? (params.vId === undefined? Appbase.uuid() : params.vId) : $scope.eName
              params.pR = ($scope.pR === undefined || $scope.pR === null) ? undefined : $scope.pR

              return params
            }

            var params = prepareParams()
            node.$ref.$setEdge(params.ref, params.eName, params.pR)
            $scope.closeThisDialog()
          }

          $scope.no = function() {
            $scope.closeThisDialog()
          }
        },
        className: 'ngdialog-theme-dialog-small',
        showClose: false
      })
    }

  })
  .factory('data', function($timeout, $location, $appbaseRef, stringManipulation) {
    var data = {};
    var appName;
    var secret;

    data.isInitComplete = function(){
      return appName !== undefined
    }

    data.init = function(appName) {
      var app_creds = JSON.parse(sessionStorage.getItem('app_creds'))
      var secret = app_creds !== undefined && app_creds !== null ? app_creds[appName] : undefined
      if(secret !== undefined) {
        data.setAppCredentials(appName, secret)
        return true
      } else {
        return false
      }
    }

    data.bindAsRoot = function($scope) {
      var root = {}
      root.name = stringManipulation.getBaseUrl()
      root.meAsRoot = function() {
        $location.path(stringManipulation.pathToUrl(''))
      }
      root.expand = function() {
        root.children = []
        root.expanded = true
        data.getNamespaces(function(namespaces) {
          $timeout(function(){
            namespaces.forEach(function(namespace) {
              root.children.push(data.bindAsNamespace($scope, namespace))
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

    data.bindAsNamespace = function($scope, namespace) {
      var ns =  {name: namespace}
      ns.meAsRoot = function() {
        $location.path(stringManipulation.pathToUrl(namespace))
      }
      ns.expand = function(){
        ns.children = []
        ns.expanded = true
        data.getVerticesOfNamespace(namespace, function(vertices) {
          $timeout(function() {
            vertices.forEach(function(vertexPath) {
              ns.children.push(data.bindAsVertex($scope, vertexPath))
            })
          })
        })
      }
      ns.contract = function() {
        ns.expanded = false
        ns.children = []
      }
      return ns
    }

    data.bindAsVertex = function($scope, path, useThisVertex) {
      var bindEdges = function($ref) {
        return $ref.$bindEdges($scope, true, false, {
          onAdd :function(scope, edgeData, edgeRef, done) {
            edgeData.$ref = $appbaseRef(edgeRef)
            data.bindAsVertex($scope, edgeRef.path(), edgeData)
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

      vertex.expand = function() {
        vertex.expanded = true
        vertex.children = bindEdges(vertex.$ref)
      }

      vertex.meAsRoot = function() {
        $location.path(stringManipulation.pathToUrl(path))
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
        console.log('removing self edge', vertex.name)
        vertex.$ref.$inVertex().$removeEdge(vertex.name)
      }

      vertex.addProperty = function(prop, value) {
        var data = {}
        data[prop] = value
        vertex.$ref.$setData(data)
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

    data.setAppCredentials = function(app, s) {
      Appbase.credentials(app, s);
      appName = app;
      secret = s;
      stringManipulation.setBaseUrl('http://'+ appName + '.' + 'api1.appbase.io/')
    };

    data.getAppname = function() {
      return appName;
    };

    data.getVerticesOfNamespace = function(namespace, done) {
      atomic.post('http://'+ appName + '.' + 'api1.appbase.io/' + namespace + '/~list', {"data": [""], "secret": secret})
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
      atomic.get('http://104.130.24.118/app/'+ appName +'/namespaces')
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

    return data;
  })
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

    return stringManipulation
  })