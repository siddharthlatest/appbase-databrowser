(function(){
angular
.module("AppbaseDashboard")
.factory('nodeBinding',['data',
  'stringManipulation','$timeout','$appbase','$rootScope','session','ngDialog',NodeBinding]);

function debug(a) {
  return JSON.parse(JSON.stringify(a))
}

function NodeBinding(data, stringManipulation, $timeout, $appbase, $rootScope, session, ngDialog) {
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
      root.loading = true;
      pollNamespaces(function(){
        root.loading = false;
      });
      setInterval(pollNamespaces, 2000);
    }
    root.contract = function(){
      root.expanded = false;
      root.children = [];
    }

    function pollNamespaces(cb){
      data.getNamespaces(function(namespaceObjs){
        $timeout(function() {
          namespaceObjs.forEach(function(namespaceObj) {
            if(!nodeBinding.childExists(root, namespaceObj.name)) {
              root.children.push(nodeBinding.bindAsNamespace($scope, namespaceObj.name, namespaceObj.searchable));
            }
          });
        });
        if(cb) cb();
      });
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
        $('[data-toggle="tooltip"]').tooltip('destroy');
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
    },
    onComplete : function(){
      
    }
  }

  nodeBinding.bindAsNamespace = function($scope, namespace, searchable) {
    var ns =  {name: namespace, isNS: true, ref: $appbase.ns(namespace)}
    ns.meAsRoot = function() {
      $rootScope.goToBrowser(stringManipulation.pathToUrl(namespace));
    }
    ns.expand = function() {
      ns.expanded = true;
      ns.loading = true;
      ns.children = ns.ref.bindVertices($scope, $.extend({}, vertexBindCallbacks, { onComplete: function(){
        $timeout(function(){
          ns.loading = false;
        });
        var children = JSON.parse(JSON.stringify(ns.children));

      }}));
    }
    ns.contract = function() {
      ns.expanded = false;
      ns.ref.unbindVertices();
    }

    ns.searchable = searchable || false;
    var ignoreToggleClick = false;

    ns.toggleSearch = function() {
      ns.toggling = true;
      // prevents multiple clicks
      if(ignoreToggleClick) return;
      ignoreToggleClick = true;
      data.namespaceSearchOptions(namespace, !ns.searchable, $timeout.bind(null, function() {
        ns.toggling = false;
        ns.searchable = !ns.searchable;
        ignoreToggleClick = false;
      }));
    }

    ns.remove = function() {
      ns.deleting = true;
      data.deleteNamespace(ns.name, function(error){
        if(error) throw error;
        ns.deleting = false;
      });
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

    vertex.removeProperty = function(prop, done) {
      vertex.removingProp = prop;
      vertex.ref.removeData([prop], function(error){
         if(error) throw error;
         $timeout(function(){vertex.removingProp = false;});
         if(done) done();
      });
    }

    vertex.removeSelfEdge = function() {
      vertex.deleting = true;
      var isARootVertex = (stringManipulation.parsePath(path).obj_path === undefined);
      isARootVertex? vertex.ref.destroy() : vertex.ref.inVertex().removeEdge(vertex.name);
      //destroy if root vertex, remove edge if not
    }

    vertex.addProp = function(){
      ngDialog.open({
        template: '/developer/html/prop.html',
        controller: ['$scope', function($dialogScope) {
          $dialogScope.done = function() {
            if($dialogScope.prop && $dialogScope.val){
              vertex.addProperty($dialogScope.prop, $dialogScope.val);
              $dialogScope.closeThisDialog();
            }
          }
        }],
        className: 'ngdialog-theme-dialog-small'
      });
    }

    vertex.editProp = function(prop, val){
      ngDialog.open({
        template: '/developer/html/prop.html',
        controller: ['$scope', function($dialogScope) {
          $dialogScope.prop = prop;
          $dialogScope.val = val;
          $dialogScope.done = function() {
            if($dialogScope.prop && $dialogScope.val){
              if($dialogScope.prop !== prop){
                vertex.removeProperty(prop, function(){
                  vertex.addProperty($dialogScope.prop, $dialogScope.val);
                  $dialogScope.closeThisDialog();
                });
              } else {
                vertex.addProperty($dialogScope.prop, $dialogScope.val);
                $dialogScope.closeThisDialog();
              }
            }
          }
        }],
        className: 'ngdialog-theme-dialog-small'
      });
    }

    vertex.addProperty = function(prop, value) {
      var vData = {};
      vData[prop] = value;
      vertex.ref.setData(vData, function(){
        $scope.$apply();
      });
    }

    if(useThisVertex === undefined) {
      vertex.properties = vertex.ref.bindProperties($scope, {
        onProperties : function(scope, properties, ref, done) {
          console.log(properties)
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

    /* Future programmer: do not mess with this. You have no idea what you're getting into. 
     * If you feel like optimizing something, I can point you to the minified file of the AngularJS library;
     * it's actually safer to mess with stuff from there. Employ your adventurous spirit somewhere else.
     * Consider yourself warned.
     */
    var uuid = 'a' + Appbase.uuid();
    vertex.ref.bindProperties($scope, {
      onProperties : function(scope, properties, ref, done) {
        $timeout(function() {
          $scope[uuid] = vertex.properties = properties;
        });
      }
    })
    $scope[uuid] = vertex.properties;
    vertex.hasProps = Object.keys($scope[uuid]).length>0;
    $scope.$watch(uuid, function(val){
      vertex.hasProps = Object.keys($scope[uuid]).length>0;
    });
    
    return vertex;
  }
  return nodeBinding;
}

})();