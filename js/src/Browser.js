(function(){
angular
.module("abDataBrowser")
.controller("browser",
             ['$scope', '$appbaseRef', '$timeout', '$routeParams', '$location',
              'data', 'stringManipulation', 'breadcrumbs', 'ngDialog', 'nodeBinding',
              'session', '$rootScope', BrowserCtrl]);

function BrowserCtrl($scope, $appbaseRef, $timeout, $routeParams, $location, data, stringManipulation, breadcrumbs, ngDialog, nodeBinding, session, $rootScope){
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
              params.namespace =
                ($dialogScope.namespaceSelected === undefined || $dialogScope.namespaceSelected === null) ?
                $dialogScope.namespaceNew : $dialogScope.namespaceSelected
              params.vId = ($dialogScope.vId === undefined || $dialogScope.vId === "") ? Appbase.uuid() : $dialogScope.vId
              params.ref = $appbaseRef(Appbase.create(params.namespace, params.vId))
            } else {
              params.vPath = $dialogScope.vPath
              params.ref = $appbaseRef(params.vPath)
            }

            params.eName = 
              ($dialogScope.eName === undefined || $dialogScope.eName === "") ?
              (params.vId === undefined? Appbase.uuid() : params.vId) : $dialogScope.eName
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
}
})();