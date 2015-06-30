(function(){
angular
.module('AppbaseDashboard')
.directive('imgSrc', ImgSrc)
.directive('backgroundColor', BackgroundColor)
.directive('abModalShow', ModalShow)
.directive('hideParent', HideParent)
.directive('showParent', ShowParent)
.directive('loadingLine', LoadingLine)
.directive('abModal', Modal)
.directive('abTooltip', Tooltip);

function Tooltip(){
  return {
    restrict: 'A',
    link: function(scope, element, attrs){
      $(element).tooltip({ trigger: "hover" });
    }
  }
}

function Modal(){
  var rememberCache = {};

  function link(scope, element, attrs){
    var el = $(element);

    var input = '<div class="form-group text">'
    + '<input type="text" class="form-control"/></div>';

    var checkboxActive = '<div class="checkbox"><label>'
    + '<input type="checkbox" checked class="check">'
    + ' Remember choice </label> </div>';

    var checkboxInactive = '<div class="checkbox"><label>'
    + '<input type="checkbox" class="check">'
    + ' Remember choice </label> </div>';

    el.click(function(){
      if(scope.abRemember && rememberCache[scope.abRemember]) {
        scope.abCallback();
        return;
      }

      var message = scope.abInput ? (scope.abMessage + input) : scope.abMessage;
      message = scope.abInclude ? $('<div></div>').load(scope.abInclude) : message;

      var cssClass = 'modal-custom';
      cssClass += scope.abClass ? (' ' + scope.abClass) : '';

      var title = scope.abTitle || 'Message';
      var callback;
      var buttons = [];

      if(angular.isFunction(scope.abCallback)) {
        if(scope.abRemember && !scope.abInclude){
          message += scope.abChecked ? checkboxActive : checkboxInactive;
        }

        callback = function(text, remember, dialog){
          if(scope.abRemember) rememberCache[scope.abRemember] = remember;
          scope.abCallback(text);
          dialog.close();
        }

        buttons = [{
            label: 'Cancel',
            cssClass: 'btn-no',
            action: function(dialog) {
              dialog.close();
            }
          }, {
            label: 'Yes',
            cssClass: 'btn-yes',
            action: function(dialog) {
              if(!angular.isFunction(callback)) return;

              var input = scope.abInput ? dialog.getModalBody().find('.text') : '';
              var text = input.length ? input.find('input').val() : '';
              var remember = scope.abRemember?dialog.getModalBody().find('.check').is(':checked'):false;

              if(scope.abInput && scope.abValidate) {
                if(text === scope.abValidate) {
                  callback(text, remember, dialog);
                } else {
                  input.addClass('has-error');
                }
              } else {
                callback(text, remember, dialog);
              }
            }
        }];
      }

      BootstrapDialog.show({
        message: message,
        cssClass: cssClass,
        title: title,
        buttons: buttons
      });
    });
  }

  return {
    restrict: 'A',
    scope: {
      abCallback: '=',
      abMessage: '@',
      abTitle: '@',
      abClass: '@',
      abInclude: '@',
      abInput: '=',
      abValidate: '=',
      abChecked: '=',
      abRemember: '='
    },
    link: link
  }
}

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

function ModalShow($timeout) {
  return {
    restrict: 'A',
    scope: {
      abModalShow: '='
    },
    link: function(scope, element){
      scope.$watch('abModalShow', function(bool){
        if(bool) element.modal('show');
      });
      $(element).on('hide.bs.modal', function (e) {
        $timeout(function(){
          scope.abModalShow = false;
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

})();