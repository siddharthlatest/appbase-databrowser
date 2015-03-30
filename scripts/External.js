if(window.Raven) {
	window.Raven.config('https://08f51a5b99d24ba786e28143316dfe5d@app.getsentry.com/39142').install();
}
window.localEnv = window.location.hostname === '127.0.0.1';

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

angular.module('AppbaseDashboard')
  .run(ExternalLibs);

function ExternalLibs($rootScope, $window, session, $location){
	var unknownUser = {
	  name: 'unknown',
	  email: 'unknown',
	  uid: 'unknown'
	};

	document.addEventListener('postLogin', updateLibs);
	if($rootScope.logged) updateLibs();
	$rootScope.$watch('looged', function(logged){
		if(logged) updateLibs();
	});

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
		  if(window.localEnv) {
		  	setTimeout(function() {
		  		$('a').each(function(){
			  		var el = $(this);
			  		var href = el.attr('href');
			  		if(href && href.indexOf('/developer/') !== -1 && href.indexOf('/developer/#/') === -1) {
			  			href = href.split('/developer/');
			  			href[0] = '/developer/#/';
			  			el.attr('href', href.join(''));
			  		}
			  	});
		  	}, 500);
		  }
		  $window.Intercom('update');
		  if(typeof(ga) === 'function'){
		    ga('send', 'pageview', ['/developer',$location.path()].join(''));
		  }
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