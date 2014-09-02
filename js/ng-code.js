/**
 * Created by Sagar on 30/8/14.
 */
angular.module("abDataBrowser", ['ngAppbase', 'ngRoute'])
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
      })
      .otherwise({ redirectTo: '/' });
  })
  .controller("browser", function($scope, $appbaseRef, $timeout, $routeParams, $location, data, stringManipulation) {
    data.setAppCredentials("twitter_2", "57e11a4b959241d8d9c3a69c31c63391")
    $scope.goUp = function() {
      $location.path(stringManipulation.parentPath($scope.path))
    }

    if($routeParams.path === undefined) {
      $scope.node = data.bindAsRoot($scope)
    } else if(($scope.path = stringManipulation.cutLeadingTrailingSlashes($routeParams.path)).indexOf('/') === -1){
      $scope.node = data.bindAsNamespace($scope, $scope.path)
    } else {
      $scope.node = data.bindAsVertex($scope ,$scope.path)
    }

    $scope.node.expand()
  })
  .factory('data', function($timeout, $location, $appbaseRef) {
    var data = {};
    var appName;
    var secret;

    data.bindAsRoot = function($scope) {
      var root = {}
      root.name = appName
      root.meAsRoot = function() {
        $location.path('')
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
        $location.path('/'+ namespace)
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

    data.bindAsVertex = function($scope, path) {
      var bindEdges = function($ref) {
        return $ref.$bindEdges($scope, true, false, {
          onAdd :function(scope, edgeData, edgeRef, done) {
            edgeData.$ref = $appbaseRef(edgeRef)
            edgeData.expand = function() {
              edgeData.expanded = true
              edgeData.children = bindEdges(edgeData.$ref)
            }
            edgeData.contract = function() {
              edgeData.expanded = false
              edgeData.$ref.$unbindEdges()
            }
            edgeData.meAsRoot = function() {
              $location.path(edgeRef.path())
            }

            edgeData.color = 'green'
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
              edgeData.color = 'red'
            })

            $timeout(function() {
              done()
            }, 500)
          },
          onChange : function(scope, edgeData, edgeRef, done) {
            edgeData.color = 'yellow'
            done()

            $timeout(function() {
              edgeData.color = 'white'
            }, 500)
          }
        })
      }

      var vertex = {
        $ref: $appbaseRef(path)
      }

      vertex.expand = function() {
        vertex.expanded = true
        vertex.children = bindEdges(vertex.$ref)
      }

      vertex.meAsRoot = function() {
        $location.path(path)
      }

      vertex.contract = function() {
        vertex.expanded = false
        vertex.$ref.$unbindEdges()
      }

      vertex.properties = vertex.$ref.$bindProperties($scope, {
        onProperties : function(scope, properties, ref, done) {
          if(vertex.color == 'white')
            vertex.color = 'yellow'
          else vertex.color = 'green'
          done()

          $timeout(function() {
            vertex.color = 'white'
          }, 500)
        }
      })
      vertex.name = path.slice(path.lastIndexOf('/') + 1)

      return vertex
    }

    data.setAppCredentials = function(app, s) {
      Appbase.credentials(app, s);
      appName = app;
      secret = s;
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

    stringManipulation.cutLeadingTrailingSlashes = function(input) {
      while(input.charAt(input.length - 1) === '/') {
        input = input.slice(0,-1);
      }
      while(input.charAt(0) === '/') {
        input = input.slice(1);
      }
      return input;
    }

    stringManipulation.parentPath = function(path) {
      var slashI;
      return path === undefined? '': path.slice(0, (slashI = path.lastIndexOf('/')) === -1? 0: slashI);
    }

    return stringManipulation
  })