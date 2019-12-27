var carousel_variant_event_adapter = (function carousel_variant_event_adapter(globalVariable) {

	$(window).on("PR_changeMatchingVariants", function(event) {
		var matchingVariants = event.detail;
		if(matchingVariants && matchingVariants.length == 1) {
			carousel.changeVariant(event.detail[0]);
		} else {
			console.log("Need more details to match 1 variant!");
		}
		
	});

})(window);
