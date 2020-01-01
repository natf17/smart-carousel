var carousel_variant_event_adapter = (function carousel_variant_event_adapter(globalVariable) {

	$(globalVariable).on("PR_changeMatchingVariants", function(event) {
		var matchingVariants = event.detail;
		var id = null;
		if(matchingVariants && matchingVariants.length == 1) {
			id = (event.detail[0]["id"]);
			carousel.changeVariant(id);
		} else {
		}
		
	});

})(window);
