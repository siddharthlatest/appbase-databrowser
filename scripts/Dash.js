(function(){
angular
.module("AppbaseDashboard")
.controller('dash', DashCtrl);

function DashCtrl($routeParams, stringManipulation, $scope, $rootScope, $location, $timeout, Apps, $routeParams){
  $scope.status = true;
  $scope.apps = Apps.get();
  $scope.strike = {};
  $scope.app = $rootScope.getAppFromName($routeParams.app);

  if(!$scope.app || !angular.isObject($scope.app)) {
    $rootScope.goToApps();
  } else {
    var app = $scope.app;
    $scope.loading = true;
    if(!app.metrics){
      app.$metrics().then(function(){
        var metrics = app.metrics;

        $timeout(function(){
          $scope.vert = metrics.edgesAndVertices.Vertices || 0;
          $scope.edges = metrics.edgesAndVertices.Edges || 0;

          defaultValues(metrics);
          graph();
        });
      });
    } else {
      $scope.vert = app.metrics.edgesAndVertices.Vertices || 0;
      $scope.edges = app.metrics.edgesAndVertices.Edges || 0;
      
      defaultValues(app.metrics);
      graph();
    }
    
  }



  function getGraphData(timeFrame, metrics){
    var calls = metrics.calls;
    var month = 0;
    var metrics = {};
    var xAxis = [];
    var types = ['rest', 'socket', 'search'];
    types.forEach(function(type){
      metrics[type] = [];
    });

    // better performance than keys
    for (var key in calls){
      if(key.indexOf('APICalls') !== -1) {
        var split = key.split(':');
        var date = parseInt(split[0]);
        if(date > timeFrame) {
          if(xAxis[xAxis.length-1] != date) {
            updateArraySize();
            xAxis.push(date);
          }
          var value = calls[key];
          month += value;
          types.forEach(function(type){
            if(key.indexOf(type) !== -1){
              metrics[type].push(value);
            };
          });
        }
      }
    }
    updateArraySize();

    types.forEach(function(type){
      if(!metrics[type].filter(function(data){
        return data != 0;
      }).length) {
        delete metrics[type];
      }
    });

    var xAxisLabels = [];
    xAxis.forEach(function(date){
      date = new Date(date);
      var formated = (date.getMonth()+1) + '/' + date.getDate();
      xAxisLabels.push(formated);
    });

    return { data: metrics, xAxis: xAxisLabels, month: month };

    function updateArraySize(){
      var lengths = [];
      var max = 0;
      types.forEach(function(type){
        var length = metrics[type].length;
        max = length > max ? length : max;
      });
      types.forEach(function(type){
        var obj = metrics[type];
        if(obj.length < max) obj.push(0);
      });
    }
  }

  $scope.graph = graph;

  function graph(timeFrame){
    var metrics = $scope.app.metrics;
    $scope.chartConfig.loading = true;

    var labels = {
      rest: 'REST API Calls',
      search: 'Search API Calls',
      socket: 'Socket API Calls'
    };

    var now = new Date();
    var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

    var presets = {
      week: function(){
        $scope.graphActive = 'week';
        timeFrame = utc.setDate(utc.getDate() - 7);
      },
      month: function(){
        $scope.graphActive = 'month';
        timeFrame = utc.setMonth(utc.getMonth() - 1);
      },
      all: function(){
        $scope.graphActive = 'all';
        timeFrame = 0;
      }
    }

    if(!timeFrame) timeFrame = 'month';
    if(presets[timeFrame]) {
      var timeLabel = timeFrame;
      presets[timeFrame]();
    }

    var retVal = getGraphData(timeFrame, metrics);
    var data = retVal.data;

    if(!$.isEmptyObject(data)){
      $scope.chart.month = $scope.chart.month || retVal.month;

      $scope.chartConfig.xAxis.categories =   retVal.xAxis;
      $scope.chartConfig.series = [];

      Object.keys(data).forEach(function(type){
        $scope.chartConfig.series.push({
          data: data[type],
          name: labels[type]
        });
      });
    } else {
      if(timeLabel && timeLabel !== 'all') {
        $scope.strike[timeLabel] = true;
        graph(timeLabel === 'week' ? 'month' : 'all');
      }
    }

    $scope.chartConfig.loading = false;

  }

  function defaultValues(metrics){
    $scope.noData = metrics && !angular.isObject(metrics.calls);

    $scope.cap = 100000;
    $rootScope.$watch('balance', function(val){
      $scope.cap = val || 100000;
    });
    $scope.chart = {};
    $scope.chart.month = 0;

    $scope.chartConfig = {
      options: {
          chart: { type: 'spline' },
          tooltip: {
              style: {
                  padding: 10,
                  fontWeight: 'bold'
              }
          },
          colors: ['#50BAEF', '#13C4A5'],
      },
      series: [],
      xAxis: { categories: [] },
      yAxis: { title: '', floor: 0 },
      loading: true,
      title: { text: '' }
    };

  }

  $scope.commas = function(number) {
    if(number) return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

}

})();