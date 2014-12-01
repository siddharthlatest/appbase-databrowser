'use strict';
$(function(){
	$('#nav').load('/include/navbar.html');
	$('footer').load('/include/footer.html');
	//$('#olark').load('/include/olark.html');
	//$('#login_modal').load('/include/login-modal.html');
	$('body').append($('<div>').load('/include/login-modal.html'));
});