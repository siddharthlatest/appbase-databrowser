(function(){
angular
.module("AppbaseDashboard")
.directive('imgSrc', ImgSrc)
.directive('backgroundColor', BackgroundColor)
.directive('hideParent', HideParent)
.directive('barchart', BarChart);


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
        labels: "=",
        colors: "="
      },
      // observe and manipulate the DOM
      link: function($scope, element, attrs) {

          var graph = Morris.Area({
            element: element,
            data: $scope.data,
            xkey: $scope.xkey,
            ykeys: $scope.ykeys,
            labels: $scope.labels,
            lineColors: $scope.colors,
            gridTextFamily: 'Source Sans Pro Regular'
          });

          $scope.$watch('data', function(newData){
            graph.setData(newData);
          });

          window.asdf = graph.setData
          window.dataa = $scope.data
      }

  };
}

function BackgroundColor() {
  return {
    restrict: 'A',
    scope: {
      backgroundColor: '='
    },
    link: function(scope, element){
      scope.$watch('backgroundColor', function(color){
        element.css('background-color', color);
      });
    }
  }
}

function HideParent() {
  return {
    restrict: 'A',
    link: function (scope, element) {
      if(!element.closest('.child').length) {
        element.hide();
      }
    }
  }
}

})();