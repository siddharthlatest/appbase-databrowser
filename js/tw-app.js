Appbase.credentials("tw-app", "1ef2fcfb2db6835ddc72e1a1934f761b");
tweetRef = Appbase.ns("tweets").v("tweets"); // namespace, vertex

// add new tweets
$(".tw-button").on("click", function(e) {
	newTweet = Appbase.ns("misc").v(Appbase.uuid());
	newTweet.setData({"tw-user":$(".tw-user").val(),"tw-post":$(".tw-post").val()}, 
			function(error, ref) {
		tweetRef.setEdge(Appbase.uuid(), newTweet);
        $(".tw-user").val("");
        $(".tw-post").val("");
	});
	e.preventDefault();
})

// listen to tweets
tweetRef.on("edge_added", function(error, e_ref, edgeSnap) {
	e_ref.on("properties", function(error, v_ref, vSnap) {
		v_ref.off();
		var userobj = vSnap.properties();
		$(".tw-list").prepend('<li class="tw-post"><span class="tw-user"><b>@' + userobj["tw-user"] + '</b></span><span class="tw-text">' + userobj["tw-post"] + '</span></li>')
	})
});
