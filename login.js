
function doBrowserIdLogin() {
    navigator.id.getVerifiedEmail(function(assertion) {
        if (assertion) {
            // This code will be invoked once the user has successfully
	    // selected an email address they control to sign in with.

	    $.ajax({url: "https://browserid.org/verify",
                    data: {"assertion": assertion,
			    "audience": "evilbrainjono.net"},
                    type: "POST",
		    success: function(data, textStatus) {
		        $("#debug").html(data);
                    },
                    error: function(req, textStatus, error) {
		        $("#debug").html(error);
	            },
		    dataType: "json"});
        } else {
	    $("#debug").html("BrowserID login failed.");
            // something went wrong!  the user isn't logged in.
        }
    });
}