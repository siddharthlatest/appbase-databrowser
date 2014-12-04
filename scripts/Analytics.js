(function(){
angular.module("AppbaseDashboard")
  .run(['$rootScope', '$location', '$window',Analytics]);

function Analytics($rootScope, $location) {
    $rootScope.$on('$routeChangeSuccess', function(){
    	if(typeof(ga) === 'function'){
        	ga('send', 'pageview', $location.path());
    	}
    });
};

});