(function(){
angular
.module("AppbaseDashboard")
.controller('start', Start);

function Start($rootScope, session, $location, $scope, $timeout, Apps) {
  var user = session.getProfile();
  var lastApp = Apps.get()[0].name;

  if(lastApp) {
  	$location.path(lastApp + '/dash');
  } else {
    Apps.refresh().then(function(apps){
      $timeout(function(){
        if(!apps.length) {
            tutorial();
        } else {
          $location.path('/apps');
        }
      });
    });
  }

  function tutorial(){
    // To do: tutorial
    $location.path('/apps');
    //$scope.tutorialMode = true;

  }
  // http://bootstraptour.com/api/#step-options
  // var tour = new Tour({
  //   steps: [
  //   {
  //     element: "#my-element",
  //     title: "Title of my step",
  //     content: "Content of my step",
  //     onNext: func
  //   },
  //   {
  //     element: "#my-other-element",
  //     title: "Title of my step",
  //     content: "Content of my step"
  //   }
  // ]});

  // tour.init();
  // tour.start();

  // if(!user || !apps.length) {
  // } else console.log(apps)
}

})();