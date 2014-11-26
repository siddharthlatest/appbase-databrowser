(function(){
angular
.module("AppbaseDashboard")
.factory('nodeBinding', ['data','stringManipulation','$timeout','$appbase','$rootScope','session','$log',NodeBinding]);

function NodeBinding(data, stringManipulation, $timeout, $appbase, $rootScope, session) {
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
      console.timeEnd('Angular on complete fired')
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
      console.log('removin')
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
      vertex.deleting = true;
      var isARootVertex = (stringManipulation.parsePath(path).obj_path === undefined);
      isARootVertex? vertex.ref.destroy() : vertex.ref.inVertex().removeEdge(vertex.name);
      //destroy if root vertex, remove edge if not
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