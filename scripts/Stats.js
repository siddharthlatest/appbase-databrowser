(function(){
angular
.module("AppbaseDashboard")
.controller('stats', StatsCtrl);

function StatsCtrl($routeParams, stringManipulation, $scope, session, $rootScope, $location, $timeout){
  $rootScope.db_loading = true;
  var appName = stringManipulation.cutLeadingTrailingSlashes(stringManipulation.parentPath($location.path()));
  if(!appName || !session.getApps() || !session.getApps()[appName]) {
    $rootScope.goToApps();
  } else {
    $rootScope.currentApp = appName;
  }

  $scope.cap = 500000;
  $scope.chart = {};
  $scope.chartOptions = {
    animate:{
        duration:0,
        enabled:false
    },
    barColor:'#138FCD',
    scaleColor:false,
    lineWidth:20,
    lineCap:'circle'
  };
  $scope.morris = {
    xkey: 'formatedDate',
    ykeys: ['restAPICalls', 'socketAPICalls', 'searchAPICalls'],
    labels: ['Rest API Calls', 'Socket API Calls', 'Search API Calls'],
    colors: ['#1f9e5a', '#138FCD', '#777']
  };

  var sessionApps = JSON.parse(sessionStorage.getItem('apps'));
  $scope.apps = sessionApps;
  setApp();

  function setApp(){
    getMetrics();
    if(appName){
      $scope.app = appName;
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
      var a = JSON.stringify(calls)
      console.log(JSON.parse(a))
      if(!calls){
        $scope.apps[prop].metrics = [];
      } else {
        var metrics = [];
        for(var name in calls){
          if(name !== '_id' && name !== 'appname' && name !== 'last_access_at'){
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
    $rootScope.db_loading = false;
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