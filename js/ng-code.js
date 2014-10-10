/**
 * Created by Sagar on 30/8/14.
 */
OAuth.initialize('fjDZzYff0kMpDgKVm9dBkeb439g');
angular.module("abDataBrowser", ['ngAppbase', 'ngRoute', 'ng-breadcrumbs', 'ngDialog', 'easypiechart', 'ngAnimate'])
  .run(FirstRun)
  .config(Routes)
  .factory("oauthFactory", OauthFactory)
  .factory('stringManipulation', StringManipulationFactory)
  .factory('session', ['stringManipulation', SessionFactory])
  .factory('nodeBinding', ['data', 'stringManipulation', '$timeout', '$appbaseRef', '$rootScope', NodeBinding])
  .factory('data', ['$timeout', '$location', '$appbaseRef', 'stringManipulation', 'session', '$rootScope', DataFactory])
  .controller('signup', ['$rootScope', '$scope', 'session', '$route', '$location', SignupCtrl])
  .controller('sidebar', SidebarCtrl)
  .controller("apps", ['$scope', 'session', '$route', 'data', '$timeout', 'stringManipulation', '$rootScope', 'oauthFactory', AppsCtrl])
  .controller('stats', StatsCtrl)
  .controller('oauthd', OauthCtrl)
  .controller("browser",
             ['$scope', '$appbaseRef', '$timeout', '$routeParams', '$location',
              'data', 'stringManipulation', 'breadcrumbs', 'ngDialog', 'nodeBinding',
              'session', '$rootScope', BrowserCtrl])
  .directive('imgSrc', ImgSrc)
  .directive('barchart', BarChart);

function OauthFactory($timeout, $q){
  var oauth = {};
  var url = "http://auth.appbase.io:6284/api/";
  var providers = [{ name: 'google',   logo: 'http://i.imgur.com/DdiI23J.png'},
                   { name: 'facebook', logo: 'http://i.imgur.com/aw9vfpF.png'},
                   { name: 'linkedin', logo: 'http://i.imgur.com/Sj1lsuK.png'},
                   { name: 'dropbox',  logo: 'http://i.imgur.com/n1hwdcn.jpg'},
                   { name: 'github',   logo: 'http://i.imgur.com/87aTdQv.png'}];
  //logos added mannualy because the ones from the API are terrible
  oauth.getApp = function(appName, secret){
    var deferred = $q.defer();
    atomic.get(url + 'apps/' + appName)
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(data){
      if(data.status === "error" && data.message === "Unknown key"){
        oauth.createApp(appName, secret, ['localhost'])
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

  oauth.removeDomain = function(appName, domain){
    var deferred = $q.defer();
    atomic.delete(url + 'apps/' + appName + '/domains/' + domain)
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(data){
      deferred.reject(data);
    });
    return deferred.promise;
  };

  oauth.addDomain = function(appName, domain){
    var deferred = $q.defer();
    atomic.post(url + 'apps/' + appName + '/domains/' + domain)
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
    atomic.post(url + 'apps', {name: appName, domains: domains, secret: secret})
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
        data.data.logo = each.logo;
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
    {response_type: 'both', parameters: {client_id: client, client_secret: secret}})
    .success(function(data){
      deferred.resolve(data);
    })
    .error(function(err){
      deferred.reject(err);
    });
    return deferred.promise;
  };

  return oauth;
}

function FirstRun($rootScope, $location){
  $rootScope.goToApps = function() {
    $location.path('/');
  }
  $rootScope.goToBrowser = function(path) {
    $location.path('/browser' + (path !== undefined ? "/" + path: ""));
  }
  $rootScope.goToStats = function(path){
    $location.path('/stats' + (path ? "/" + path : ""));
  }
  $rootScope.goToOauth = function(path){
    $location.path('/oauth' + (path ? "/" + path : ""));
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
    .when('/oauth', oauth)
    .when('/oatuh/:path*', oauth)
    .otherwise({ redirectTo: '/' });
}

function OauthCtrl($scope, oauthFactory, stringManipulation, $routeParams, $timeout, $filter, data, session, $rootScope){
  $scope.status = "Loading...";
  $scope.loading = $scope.loadingProv = $scope.editing = false;
  $scope.callbackDomain = $scope.callbackURL = 'http://auth.appbase.io:6284';
  $scope.sorter = function(prov){
    return $scope.userProviders.indexOf(prov.provider);
  };
  $scope.removeDomain = function(domain){
    $scope.loading = true;
    oauthFactory.removeDomain($scope.app, encodeURIComponent(domain))
    .then(function(data){
      if(data.status !== "success") throw data;
      $timeout(function(){
        $scope.domains.splice($scope.domains.indexOf(domain), 1);
        $scope.loading = false;
      });
    }, function(data){throw data;});
  };
  $scope.addDomain = function(domain){
    $scope.loading = true;
    oauthFactory.addDomain($scope.app, encodeURIComponent(domain))
    .then(function(data){
      if(data.status !== "success") throw data;
      $timeout(function(){
        $scope.domains.push(domain);
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
        $scope.userProviders.splice($scope.userProviders.indexOf(provider), 1);
        $scope.loadingProv = false;
      });
    }, function(data){throw data;});
  };
  $scope.add = function(provider){
    $scope.provider = provider;
    $scope.editing = $scope.adding = true;
  };
  $scope.edit = function(provider){
    $scope.provider = provider;
    $scope.editing = true;
    $scope.adding = false;
  }
  $scope.done = function(){
    $scope.editing = $scope.adding = false;
    if(!$scope.app || !$scope.provider.provider || !$scope.clientID || !$scope.clientSecret) throw 'error';
    $scope.loadingProv = true;
    oauthFactory.addProvider($scope.app, $scope.provider.provider, $scope.clientID, $scope.clientSecret)
    .then(function(data){
      console.log(data);
      $timeout(function(){
        $scope.loadingProv = false;
        $scope.userProviders.push($scope.provider.provider);
      });
    }, function(err){throw err});
    $scope.clientID = $scope.clientSecret = '';
  }
  $scope.cancel = function(){
    $scope.editing = $scope.adding = false;
  }
  $scope.tab = function(app){
    $scope.status = $scope.provStatus = "Loading...";
    $scope.domains = [];
    $scope.userProviders = [];
    oauthFactory.getApp(app, $scope.apps[app].secret)
    .then(function(oauth){
      oauth = oauth.data;
      $timeout(function(){
        $scope.status = false;
        $scope.domains = oauth.domains;
      });
      if(oauth.keysets.length){
        oauthFactory.getKeySets(app, oauth.keysets)
        .then(function(data){
          data.forEach(function(each){
            $scope.userProviders.push(each.provider);
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

  oauthFactory.getProviders()
  .then(function(data){
    console.log(data)
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

function StatsCtrl($routeParams, stringManipulation, $scope, session, $rootScope){
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

  function fetchApps(){
    data.getDevsApps(function(apps) {
      $timeout(function(){
        $scope.apps = apps;
        setApp();
      });
    });
  }

}

function SignupCtrl($rootScope, $scope, session, $route, $location){
  $rootScope.hide = true;
  $scope.promoCode = function(){

    OAuth.popup('google')
      .done(function(result) {
        result.me()
          .done(function(profile) {
            var userID = profile.raw.id;
            $.post('http://162.243.5.104:8080', {code: $scope.codeInput, user: userID}).done(function(data){
              if(data == "true"){
                profile.raw["code"] = true;
                console.log('here')
                session.setProfile(profile.raw);
                $.post('http://162.243.5.104:8080/u', {user: userID}).done(function(data){
                  console.log(data)
                  $rootScope.hide = false;
                  if(data == "true"){
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
        })
        .fail(console.log.bind(console))
    })
    .fail(console.log.bind(console))
    
  }
}

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
  
function AppsCtrl($scope, session, $route, data, $timeout, stringManipulation, $rootScope, oauthFactory){
  Prism.highlightAll();
  if($scope.devProfile = session.getProfile()) {
    $rootScope.logged = true;
    $.post('http://162.243.5.104:8080/u', {user: $scope.devProfile.id}).done(function(data){
      $rootScope.code = (data == "true");
      $rootScope.$apply();
      if($rootScope.code) console.log('User has $50 coupon.');
    });
    $rootScope.affiliate = false;
    $scope.devProfile.emails.forEach(function(email){
      $.ajax({url:'http://162.243.5.104:8088/e', type:"POST",
        data: JSON.stringify({email: email.value}), contentType:"application/json; charset=utf-8",
        dataType:"json",
        success: function(data){
          console.log(email.value, ': ', data)
          $timeout(function(){
             if(data == "true") $rootScope.affiliate = true;
          });
        }
      });
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
        session.setApps(null);
        session.setProfile(null);
        $route.reload();
      });
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
  $rootScope.$watch('fetching', function(data){
    $scope.fetching = data;
  });
}

function BrowserCtrl($scope, $appbaseRef, $timeout, $routeParams, $location, data, stringManipulation, breadcrumbs, ngDialog, nodeBinding, session, $rootScope){
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
              params.namespace =($dialogScope.namespaceSelected === undefined || $dialogScope.namespaceSelected === null) ? $dialogScope.namespaceNew : $dialogScope.namespaceSelected
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
}


function NodeBinding(data, stringManipulation, $timeout, $appbaseRef, $rootScope) {
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
}
function DataFactory($timeout, $location, $appbaseRef, stringManipulation, session, $rootScope) {
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

  stringManipulation.appToURL = function(app) {
    return 'http://'+ app + '.' + 'api1.appbase.io/';
  }

  return stringManipulation;
}

function SessionFactory(stringManipulation){
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
}

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