(function(){
angular.module('AppbaseDashboard', ['ngAppbase',
                                    'ngRoute',
                                    'ng-breadcrumbs',
                                    'easypiechart',
                                    'ngAnimate',
                                    'ngDialog',
                                    'highcharts-ng',
                                    'ngClipboard'])
  .run(FirstRun);

function FirstRun($rootScope, $location, session, $route, $timeout, Apps, $routeParams){

  if(!localStorage.getItem('devProfile') || localStorage.getItem('devProfile') === 'null'){
    Apps.clear();
    session.setProfile(null);
    $rootScope.logged = false;
    $location.path('/login');
  } else $rootScope.logged = true;

  $rootScope.confirm = function(title, message, callback, field){
    BootstrapDialog.show({
        title: title,
        message: message
        + (field ? '<div class="form-group"><input type="text" class="form-control" /></div>':''),
        cssClass: 'modal-custom',
        closable: false,
        buttons: [{
            label: 'Cancel',
            cssClass: 'btn-no',
            action: function(dialog) {
                dialog.close();
            }
        }, {
            label: 'Yes',
            cssClass: 'btn-yes',
            action: function(dialog) {
              var input = dialog.getModalBody().find('.form-group');
              var value = input.find('input').val();
              if(!field) {callback();dialog.close();}
              else if(value) callback(value);  
            }
        }]
    });
  }

  $rootScope.where = function(here) {
    var path = $location.path().split('/');
    if( ($routeParams.app || path[1] === 'apps') && here === 'apps') return true;
    return here ? (path[1] === here) : path[1];
  }

  document.addEventListener('postLogin', function() {
    $timeout(function(){
      $rootScope.logged = true;
      $location.path('/');
    });
  });

} 

})();


