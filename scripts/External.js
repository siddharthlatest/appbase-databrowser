window.Raven.config('https://08f51a5b99d24ba786e28143316dfe5d@app.getsentry.com/39142').install();

function sentry(error) {
  if(Raven) {
    Raven.captureException(error);
  } else {
    throw new Error(error);
  }
}

function debug(obj) {
  return JSON.parse(JSON.stringify(obj))
}

(function(){

angular.module("AppbaseDashboard")
  .run(ExternalLibs);

function ExternalLibs($rootScope, $window, session){
	var unknownUser = {
	  name: 'unknown',
	  email: 'unknown',
	  uid: 'unknown'
	};

	document.addEventListener('postLogin', updateLibs);
	$rootScope.$on('logged', updateLibs);
	if($rootScope.logged) updateLibs();

	function updateLibs(){
		var user = session.getProfile() || unknownUser;

		$window.Raven.setUser({
		    email: user.email,
		    id: user.uid
		});

		$window.Intercom('boot', {
		  app_id: "jnzcgdd7",
		  name: user.name,
		  email: user.email
		});
		
		$rootScope.$on('intercomStats', updateIntercom);
		$rootScope.$on('$routeChangeSuccess', function(){
		  $window.Intercom('update');
		});
	}

	function updateIntercom(evt, stats){
		var user = session.getProfile() || unknownUser;

		$window.Intercom('update', {
		  name: user.name,
		  email: user.email,
		  calls: stats.calls,
		  apps: stats.apps
		});
	}
}

})();