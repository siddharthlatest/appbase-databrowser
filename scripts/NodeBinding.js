(function(){
angular
.module("AppbaseDashboard")
.factory('nodeBinding',['data', '$location',
  'utils','$timeout','$appbase','$rootScope','session','ngDialog', '$route', NodeBinding]);

function debug(a) {
  return JSON.parse(JSON.stringify(a))
}

function NodeBinding(data, $location, utils, $timeout, $appbase, $rootScope, session, ngDialog, $route) {
  var nodeBinding = {};
  nodeBinding.creating = [];
  function addNamespaces(node, childName) {
    for(var i=0 ; i<node.children.length; i++) {
       if(node.children[i].name === childName) {
         return true;
       }
    }
    return false;
  }

  nodeBinding.bindAsRoot = function($scope) {
    var root = {isR: true};
    root.name = utils.getBaseUrl();
    root.meAsRoot = function() {
      $rootScope.goToBrowser(utils.pathToUrl(''));
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
    var initialPoll = true;
    function pollNamespaces(cb){
      data.getNamespaces(function(namespaceObjs){
        $timeout(function() {
          // removes old ones. saves the indexes to avoid modifying looping array
          var toRemove = [];
          if(root.children) {
            root.children.forEach(function(each, index){
              var found = false;
              namespaceObjs.forEach(function(obj){
                if(each.name === obj.name) {
                  found = true;
                  return;
                }
              });
              if(!found && nodeBinding.creating.indexOf(each.name) === -1) {
                toRemove.push(index);
              }
            });
            toRemove.forEach(function(each){
              root.children.splice(each, 1);
              $('.tooltip.fade.top').remove();
            });
          }
          //adds new ones
          namespaceObjs.forEach(function(nsObj) {
            if(nodeBinding.creating.indexOf(nsObj.name) !== -1) {
              nodeBinding.creating.splice(nodeBinding.creating.indexOf(nsObj.name), 1);
            }
            if(!addNamespaces(root, nsObj.name)) {
              var p = root.children.push(nodeBinding.bindAsNamespace($scope,nsObj.name));
              if(!initialPoll) {
                p--;
                $timeout(function(){
                  root.children[p]['added'] = true;
                });

                $timeout(function(){
                  root.children[p]['added'] = false;
                }, 1100);
              }
            }
          });
          initialPoll = false;
        });
        if(cb) cb();
      });
    }

    return root
  }
  
  var vertexBindCallbacks = {
    onAdd :function(scope, vData, vRef, done) {
      nodeBinding.bindAsVertex(scope, vRef.path(), vData);
      $timeout(function(){
        vData.added = true;
      });
      done();

      $timeout(function() {
        vData.added = false;
      }, 1100);
    },
    onUnbind : function(scope, vData, vRef) {
      vData.ref && vData.ref.unbind();
    },
    onRemove : function(scope, vData, vRef, done) {
      $timeout(function() {
        vData.removed = true;
        $('.tooltip.fade.top').remove();
      });
      $timeout(function() {
        done();
      }, 1100)
    },
    onChange : function(scope, vData, vRef, done) {
      $timeout(function(){
        vData.mod = true;
      });
      done();

      $timeout(function() {
        vData.mod = false;
      }, 1100);
    }
  }

  nodeBinding.bindAsNamespace = function($scope, namespace) {
    nodeBinding.creating.push(namespace);
    var ns =  {name: namespace, isNS: true, ref: $appbase.ns(namespace)}
    ns.meAsRoot = function() {
      session.setBrowserURL(utils.pathToUrl(namespace));
      $route.reload();
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

    var ignoreToggleClick = false;

    ns.remove = function() {
      ns.deleting = true;
      data.deleteNamespace(ns.name, function(error){
        if(error) sentry(error);
        ns.deleting = false;
      });
    }

    return ns
  }

  nodeBinding.bindAsVertex = function($scope, path, useThisVertex) {
    $scope.stringify = function(v) {
      if(angular.isObject(v)) {
        try {
          v = JSON.stringify(v);
        } catch(e) {};
      }
      return v;
    }
    var parsedPath = utils.parsePath(path);
    var vertex = useThisVertex || {
      ref: $appbase.ns(parsedPath.ns).v(parsedPath.v)
    }    
    vertex.isV = true
    vertex.page = 0;

    vertex.nextPage = function(){
      if(vertex.children.length === 25) {
        vertex.page++;
        vertex.expand();
      }
    }

    vertex.prevPage = function(){
      if(vertex.page > 0) {
        vertex.page--;
        vertex.expand();
      }
    }

    vertex.expand = function() {
      vertex.expanded = true;
      vertex.loading = true;
      vertex.children=vertex.ref.bindEdges($scope,$.extend({},vertexBindCallbacks,{onComplete: function(a){
        $timeout(function(){
          vertex.loading = false;
        });
      }}), function(){}, {limit: 25, skip: vertex.page * 25 });
    }

    vertex.meAsRoot = function() {
      $rootScope.goToBrowser(utils.pathToUrl(path));
    }

    vertex.contract = function() {
      vertex.expanded = false;
      vertex.ref.unbindEdges();
    }

    vertex.removeProperty = function(prop, done) {
      vertex.removingProp = prop;
      vertex.ref.removeData([prop], function(error){
         if(error) sentry(error);
         $timeout(function(){vertex.removingProp = false;});
         if(done) done();
      });
    }

    vertex.removeSelfEdge = function() {
      vertex.deleting = true;
      var isARootVertex = (utils.parsePath(path).obj_path === undefined);
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
    var initial = true;
    vertex.ref.bindProperties($scope, {
      onProperties : function(scope, properties, ref, done) {
        $timeout(function() {
          if(!initial) {
            vertex.propchange = true;
            $timeout(function(){
              vertex.propchange = false;
            }, 2000);
          }
          initial = false;
          $scope[uuid] = vertex.properties = properties;
        });
      }
    })
    $scope.$watch(uuid, function(val){
      if(!val) return;
      vertex.hasProps = Object.keys($scope[uuid]).length>0;
    });
    
    return vertex;
  }
  nodeBinding.addNamespaces = addNamespaces;
  return nodeBinding;
}

})();