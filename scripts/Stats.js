(function(){
angular
.module("AppbaseDashboard")
.controller('stats', StatsCtrl);

function StatsCtrl($routeParams, stringManipulation, $scope, session, $rootScope, $location, $timeout){
  $scope.status = "Loading";
  var appName = stringManipulation.cutLeadingTrailingSlashes(stringManipulation.parentPath($location.path()));
  var sessionApps = JSON.parse(sessionStorage.getItem('apps'));
  $scope.apps = session.getApps();
  $scope.app = session.appFromName(appName);

  if(!appName || !$scope.app) {
    $rootScope.goToApps();
  } else {
    $rootScope.currentApp = appName;
  }
  $scope.cap = 100000;
  $rootScope.$watch('balance', function(val){
    $scope.cap = val || 100000;
  });
  $scope.chart = {};
  $scope.chart.month = $scope.chart.week = $scope.chart.day = 0;
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
  var app = $scope.app;
  app.vertices = app.metrics.edgesAndVertices.Vertices;
  app.edges = app.metrics.edgesAndVertices.Edges;
  var calls = app.metrics.calls;
  if(!calls){
    app.metrics = [];
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
    app.metrics = metrics;
    var grandTotal = 0;
    app.metrics.forEach(function(each){
      var total = 0;
      total += (each.restAPICalls = each.restAPICalls || 0);
      total += (each.socketAPICalls = each.socketAPICalls || 0);
      total += (each.searchAPICalls = each.searchAPICalls || 0);
      each.total = total;
      grandTotal += total;
    });
    app.totalAPI = grandTotal;

    var monthData=0, weekData=0, dayData;
    var miliDay   = 1000 * 60 * 60 * 24;
    var miliWeek  = miliDay * 7;
    var miliMonth = miliDay * 30;
    var now = Date.now();
    
    app.metrics.forEach(function(each){
      if(now - each.date <= miliMonth) {
        monthData += each.total;
        if(now - each.date <= miliWeek){
          weekData += each.total;
          dayData = each.total;
        }
      }
    });

    app.day = dayData;
    app.week = weekData;
    app.month = monthData;
  }

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
  $scope.status = false;
}

})();