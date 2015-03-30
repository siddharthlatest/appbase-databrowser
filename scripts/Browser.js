(function(){
angular
.module('AppbaseDashboard')
.controller("browser",
             ['$scope', '$appbase', '$timeout', 'data', 'utils', 'breadcrumbs', 'ngDialog',
             'nodeBinding', 'session', '$rootScope', 'Apps', '$routeParams', '$route', BrowserCtrl]);

function BrowserCtrl($scope, $appbase, $timeout, data, utils,
  breadcrumbs, ngDialog, nodeBinding, session, $rootScope, Apps, $routeParams, $route){

  $rootScope.$on('routeUpdate', function(){
    console.log('update')
  })
  var apps = Apps.get();
  $scope.status = "Loading";
  var appName = $scope.app = $routeParams.app;
  var URL, app;

  Apps.appFromName(appName).then(function(_app){
    app = _app;
    URL = session.getBrowserURL(apps);

    if(!URL || utils.urlToAppname(URL) !== appName) {
      URL = utils.appToURL(appName);
      session.setBrowserURL(URL);
    }

    app.$secret().then(function(data){
      gotSecret(app.secret);
    });

  });

  function gotSecret(secret){
    data.setAppCredentials(appName, secret);
    $scope.url = URL;
    $scope.goUp = function() {
      URL = utils.parentUrl($scope.url);
    }
    var path = utils.urlToPath($scope.url);

    if(path === undefined) {
      $scope.node = nodeBinding.bindAsRoot($scope)
    } else if(path.indexOf('/') === -1) {
      $scope.node = nodeBinding.bindAsNamespace($scope, path)
    } else {
      $scope.node = nodeBinding.bindAsVertex($scope , path)
    }
    $scope.node.expand()

    $scope.baseUrl = utils.cutLeadingTrailingSlashes(utils.getBaseUrl())
    $scope.breadcrumbs = (path === undefined)? undefined : breadcrumbs.generateBreadcrumbs(path)
    $scope.status = false;
  }

  $scope.goToBrowser = function(path) {
    session.setBrowserURL(path);
    $route.reload();
  }
  
  $scope.addEdgeInto = function(node) {
    var namespaces = [];
    node.loadingNs = true;
    data.getNamespaces(function(array) {
      $timeout(function(){
        node.loadingNs = false;
      });
      array.forEach(function(each){
        namespaces.push(each.name);
      });
      ngDialog.open({
        template: '/developer/html/dialog-new-vertex.html',
        controller: ['$scope', function($dialogScope) {
          $dialogScope.namespaces = namespaces;
          $dialogScope.node = node;
          if (!node.isV) {
            $dialogScope.title = "Add Vertex"
          } else {
            $dialogScope.title = "Add Out-vertex at path: " + node.ref.path();
          }
          if(node.isNS) {
            $dialogScope.namespaceSelected = node.name;
          }
          $dialogScope.text = "in " + node.name
          $dialogScope.vTypeOptions = ['New Vertex', 'Existing Vertex']
          $dialogScope.vType = $dialogScope.vTypeOptions[0]

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
                var parsedPath = utils.parsePath(params.vPath);
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
              if(params.pR !== undefined) {
                node.ref.setEdge(params.eName, params.ref, params.pR)
              }
              else {
                node.ref.setEdge(params.eName, params.ref)
              }
            } else if(node.isR) {
              if(!nodeBinding.addNamespaces(node, params.namespace)) {
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
      });


    });
  }
}
})();