(function(){
angular
.module('AppbaseDashboard')
.directive('imgSrc', ImgSrc)
.directive('backgroundColor', BackgroundColor)
.directive('ngModal', NgModal)
.directive('hideParent', HideParent)
.directive('showParent', ShowParent)
.directive('loadingLine', LoadingLine);

function LoadingLine($rootScope){
  return {
    restrict: 'C',
    scope: {
      loading: '='
    },
    link: function(scope, element, attrs) {
      var toReset;
      var element = $(element);
      var glow = element.next();

      scope.$watch('loading', function(progress){ 
        if(toReset) {
          element.stop().css('width', progress + 'vw');
          glow.stop().css('left', progress + 'vw');
          toReset = false;
        }

        if(progress > 0) element.parent().stop(false, false).css('opacity', 1);

        setWidth(progress);

        if(progress >= 100) {
          element.parent().delay(800).animate({opacity: 0});
          toReset = true;
        }
          
        function setWidth(width) {
          width = width + 'vw';
          element.animate({'width': width});
          glow.animate({'left': width});
        }

      });
    }
  }
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

function NgModal($timeout) {
  return {
    restrict: 'A',
    scope: {
      ngModal: '='
    },
    link: function(scope, element){
      scope.$watch('ngModal', function(bool){
        if(bool) element.modal('show');
      });
      $(element).on('hide.bs.modal', function (e) {
        $timeout(function(){
          scope.ngModal = false;
        });
      })
    }
  }
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

function ShowParent() {
  return {
    restrict: 'C',
    link: function (scope, element) {
      if(!element.closest('.child').length) {
        element.show();
      }
    }
  }
}

// requires sanitize
// function ContentEditable($sce) {
//   return {
//     restrict: 'A', // only activate on element attribute
//     require: '?ngModel', // get a hold of NgModelController
//     link: function(scope, element, attrs, ngModel) {
//       if (!ngModel) return; // do nothing if no ng-model

//       // Specify how UI should be updated
//       ngModel.$render = function() {
//         element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
//       };

//       // Listen for change events to enable binding
//       element.on('blur keyup change', function() {
//         scope.$evalAsync(read);
//       });
//       read(); // initialize

//       // Write data to the model
//       function read() {
//         var html = element.html();
//         // When we clear the content editable the browser leaves a <br> behind
//         // If strip-br attribute is provided then we strip this out
//         if ( attrs.stripBr && html == '<br>' ) {
//           html = '';
//         }
//         ngModel.$setViewValue(html);
//       }
//     }
//   }
// }

})();