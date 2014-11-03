$(function() {
  var first = true;
  $(window).scroll(function() {
    if ($(window).scrollTop() > 600 && true) {
      first = false;
      $("#show-full-signup").css("display", "block");
      $("#show-small-signup").css("display", "none");
    }
  });
  setInterval(function() {
		$.get(atob("Ly9hY2NvdW50cy5hcHBiYXNlLmlvLw==")+'metrics/', function(data) {
			calls = data.allAPIcalls.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			$("#apicalls").html(calls);
		})
	}, 2000);
});
