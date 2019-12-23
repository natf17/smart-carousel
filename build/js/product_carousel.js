var carousel = (function carouselProductPage(globalVariable) {
	var settings = {
		autoplay: true,
		thumbnailDivContainerClass: "product-img-nav", // MUST BE PROVIDED: class of container div that contains thumbnails
		thumbnailDivClass: "lm_gall-thumb", // MUST BE PROVIDED: class of thumbnail divs - have a child img
		thumbnailDivSelectedClass: "selected", 
		thumbnailDivUnselectedClass: "unselected",
		mainImageDivCurrentClass: "current",
		mainImageDivHiddenClass: "hidden",
		idOfBackArrow: "backArrow",
		idOfForwardArrow:"forwardArrow",
		mainImageContainerDivClass: "prod-img-showcase", // MUST BE PROVIDED: class of container div that will hold large product image
		mainImageDivClass: "lm_gall-mainimg",
		secondsCarousel: 5000,
		variantFunctionalityEnabled: true,
		initialVariant: null,
		mode1: true, // show all pictures, but with variant selected
		mode2: false, // only show pictures for variant
		mode3: false, // show all pictures, with variants disabled permanently, will be fall back
		mode2_selectCurrentVariantThumbnail: true,
		mode2_showDefaultImagesIncludedInVariant: true,
		mode1_mode2_pauseCarouselIfVariantImage: false,
		mode1_mode2_pauseCarouselIfVariantChosen: true,


	};


	var currentVariant = null;

	/*
	 * An array of arrays....
	 * One array for each variant:
	 * elem[0] = variantId
	 * elem[1] = variant image urls for this variant
	 * elem[2] = false - does this variant only have default images 
	 * 

	 */
	var variantIdImagesArray = [];

	// contains all thumbnail divs as provided by the liquid template
	var allThumbnails;

	// will hold a thumbnailDiv for every variant... array: [[variantId, thumbnailDivs], [...,...]]
	var productAllThumbnailDivs;

	// will hold the default thumbnails: array of divs that contain images in the "default" - images not present in any variant
	var defaultThumbnailDivs;

	// will hold current thumbnailDivs
	var thumbnailDivs;

	// will hold large images
	var imagesInventory = [];

	var showingDefaultImagesOnly = true;
	var selectedVariantImage = false;

	// what mode is enabled?
	var mode1Enabled = false;
	var mode2Enabled = false;
	var mode3Enabled = false;

	var mode;

	// will hold interval of autoplay
	var autoplayVar;

				$(document).ready(function(){


	if(!globalVariable) {
		throw new Error("globalVariable argument is required");
	}

	if(globalVariable["injectedGlobs"]["insideProduct"] != true) {
		
		return;
	}

	

	//start: get ALL THUMBNAILS!
	allThumbnails = getAllThumbnails();

	// determine what mode we will be on!
	if(settings.mode1 == true || settings.mode2 == true) {
		currentVariant = findCurrentVariant();

		if(currentVariant) {
			if(settings.mode1 == true) {
				mode1Enabled = true;
				mode = "mode1";
			} else if(settings.mode2 == true) {
				mode2Enabled = true;
				mode = "mode2";
			}
		} else {
			// no variant found... fall back to mode 3
			mode3Enabled = true;
			mode = "mode3";
		}
	} else {
		mode3Enabled = true;
		mode = "mode3";
	}


	/* if we want variant functionality...
	** populate currentVariant with the one that will be shown
	** populate variantIdImagesArray
	*/

	if(mode1Enabled == true || mode2Enabled == true) {




		if(mode2Enabled == true) {
		
			// array: [["variantId", ["img1", "img2", ...], hasOnlyDefault], [...,[...,...],...], ...]
			variantIdImagesArray = getVariantIdsAndImagesFromProduct(true, settings.mode2_showDefaultImagesIncludedInVariant);





			// get an array of divs that contain images in the "default" - images not present in any variant
			defaultThumbnailDivs = getDefaultThumbnailDivs(allThumbnails, variantIdImagesArray);

			// populate productAllThumbnailDivs
			// array: [[variantId, thumbnailDivs], [...,...]]
			productAllThumbnailDivs = getProductAllThumbNailDivs(defaultThumbnailDivs, allThumbnails, variantIdImagesArray);

			thumbnailDivs = getCurrentThumbnailDivs(currentVariant, productAllThumbnailDivs);
			showingDefaultImagesOnly = willBeShowingDefaultImagesOnly(currentVariant, variantIdImagesArray);

			// hide all other thumbnails

			hideOtherThumbnails(thumbnailDivs, allThumbnails);

			// make sure current thumbnails are visible
			// also sets selectedVariantImage variable
			showCurrentThumbnails(thumbnailDivs, settings.mode2_selectCurrentVariantThumbnail);
		} else if(mode1Enabled == true) {
			// show all the pictures and select the current variant
			thumbnailDivs = allThumbnails;

			// array: [["variantId", ["img1", "img2", ...], hasOnlyDefault], [...,[...,...],...], ...]
			variantIdImagesArray = getVariantIdsAndImagesFromProduct(false, false);


			// in mode1: showingDefaultImagesOnly means no variants have any image
			// in mode1: this variabble will not change
			showingDefaultImagesOnly = !doVariantsHaveImages();


			// select currentVariant

			selectedVariantImage = (selectCurrentVariant(currentVariant, variantIdImagesArray, thumbnailDivs))[0];
		}

	} 

	// no currentVariant -> no variant functionality
	else if (mode3Enabled){
		currentVariant = null; 
		thumbnailDivs = allThumbnails;
		showingDefaultImagesOnly = true;

	} else {
		throw new Error("No MODE selected"); // should never happen
	}


	
	// we are ready to initialize
	init();


	decideIfEnableCarousel(null, autoplay.var, settings.mode1_mode2_pauseCarouselIfVariantImage, showingDefaultImagesOnly, selectedVariantImage, mode);




}); // end document ready

	function doVariantsHaveImages() {
		// used exclusively in mode1
		var product = globalVariable["injectedGlobs"]["product"];

		for(var i = 0; i < product.variants.length; i++) {
			if(product.variants[i]["featured_image"]) {
				return true;
			}
		}

		return false;

	}



	function willBeShowingDefaultImagesOnly(currentVariant, variantIdImagesArray) {
		var iteratedVariant;
		var i;
		for(i = 0; i < variantIdImagesArray.length; i++) {
			iteratedVariant = variantIdImagesArray[i];
			if(iteratedVariant[0] == currentVariant) {
				// third element has a true or false - whether it is default...

				return iteratedVariant[2];
			}
		}


		throw new Error("Current variant NOT FOUND while determining if we are showing default images");
	}




	function showCurrentThumbnails(thumbnailDivs, doSelectCurrentVariant) {
		thumbnailDivs.each(function() {
			$(this).css("display", ""); // empty string removes the display property
		});

		// select current variant...
		if(doSelectCurrentVariant) {
			selectedVariantImage = (selectCurrentVariant(currentVariant, variantIdImagesArray, thumbnailDivs))[0];
		} else {
			selectFirstImage(thumbnailDivs);

			selectedVariantImage = false;
		}
	}

	function selectCurrentVariant(currentVariant, variantIdImagesArray, thumbnailDivs) {
		/*
		*	FUNCTIONALITY:
		** 
		** 1. Find element in variantIdImagesArray that matches this variant --- [variant, ["src1", "src2", ...]]
		** 2. Starting with the first imgSrc for this variant do the following:
		** 3. Find corresponding thumbnailDiv in thumbnailDivs by checking thumbnail's src
		** 4. If found, select it
		** 5. If none found, repeat 2-4 for every imgSrc for this variant
		** 6. If none are found - select first image
		*
		*  If currentVariant not found - throw an exception
		*
		** return: [boolean,thumbnail] 
		**         0 - if variant image selected
		**.        1 - thumbnail selected
		*/

		var chosenThumbnail = null;
		var variantFound = false;
		var currentVariantImageSrc = null;
		var imageSourceInter = null;
		var currentVariantImageSrc = null;
		var returnValue = [];

		// 1.
		for(var i = 0; i < variantIdImagesArray.length; i++) {
			if(variantIdImagesArray[i][0] == currentVariant) {
				// we found the variant
				currentVariantImageSrc = variantIdImagesArray[i][1];
				break;
			}
		}

		// if not found, return null
		if(currentVariantImageSrc == null) {
			throw "Current variant not in variantIdImagesArray";
		}


		// 2 - 5.
		for(var i = 0; i < currentVariantImageSrc.length; i++) {
			currentVariantImageSrc = currentVariantImageSrc[i];

			thumbnailDivs.each(function() {
				imageSourceInter = $(this).children("img").attr("src");


				// if we have already found the variant, unselect this one
				if(variantFound == true) {
					$(this).removeClass(settings.thumbnailDivSelectedClass + " " + settings.thumbnailDivUnselectedClass).addClass(settings.thumbnailDivUnselectedClass);
					

				}

				// if variant not found yet, search

				if(synchronizeImagePaths(currentVariantImageSrc,imageSourceInter)) {
					// there's a match
					variantFound = true;
					chosenThumbnail = $(this);
					// select
					$(this).removeClass(settings.thumbnailDivSelectedClass + " " + settings.thumbnailDivUnselectedClass).addClass(settings.thumbnailDivSelectedClass);

				} else {
					// no match - unselect
					$(this).removeClass(settings.thumbnailDivSelectedClass + " " + settings.thumbnailDivUnselectedClass).addClass(settings.thumbnailDivUnselectedClass)
				}
			});

			// if we have already found the variant, break
			if(variantFound == true) {
				// we have already gone through all the thumbnails to either select or unselect
				break;

			}
		}



		// 6.
		if(variantFound == false) {
			chosenThumbnail = selectFirstImage(thumbnailDivs);

		}

		returnValue[0] = variantFound;
		returnValue[1] = chosenThumbnail;

		return returnValue;

		
		
	}


	function selectFirstImage(thumbnailDivs) {
		// select first thumbnail that is in thumbnailDivs

		var counter = 0;
		selectedThumbnail = null;

		thumbnailDivs.each(function() {

			if(counter == 0) {
				// select the first...
				$(this).removeClass(settings.thumbnailDivSelectedClass + " " + settings.thumbnailDivUnselectedClass).addClass(settings.thumbnailDivSelectedClass);
				selectedThumbnail = $(this);
			} else {
				$(this).removeClass(settings.thumbnailDivSelectedClass + " " + settings.thumbnailDivUnselectedClass).addClass(settings.thumbnailDivUnselectedClass);
			}

			counter++;
			
		});

		return selectedThumbnail;

				
	}

	function hideOtherThumbnails(thumbnailDivs, allThumbnails) {
		var thumbnailIntermittentSrc;
		var thumbnailIntermittent;
		var thumbnailDivSrc;

		// for every thumbnail in allThumbnails, if it's not thumbnailDivs, make sure it is hidden
		var counter;
		var thumbnailDivSize = thumbnailDivs.length;

		var imageComparisonResult;
		allThumbnails.each(function() {
			counter = 0;
			thumbnailIntermittentSrc = $(this).children("img").attr("src");
			thumbnailIntermittent = this;
			thumbnailDivs.each(function() {
				thumbnailDivSrc = $(this).children("img").attr("src");
				imageComparisonResult = synchronizeImagePaths(thumbnailIntermittentSrc, thumbnailDivSrc);
				if(imageComparisonResult) {
					return false;
				}
				counter++;
			});

			// we went through all thumbnailDivs, and it wasn't there!
			if(counter == thumbnailDivSize) {
				$(thumbnailIntermittent).css("display", "none");
			}
			
		});
	}

	// initialize current thumbnailDivs

	function getCurrentThumbnailDivs(currentVariant, productAllThumbnailDivs) {
		// find thumbnaildivs for currentVariant

		for(var i = 0; i < productAllThumbnailDivs.length; i++) {
			if(productAllThumbnailDivs[i][0] == currentVariant) {
				return $(productAllThumbnailDivs[i][1]);
			}
		}

		// every existing variant is in productAllThumbnailDivs
		throw new Error("Error: variant not found");


	}

	function getAllThumbnails() {
		var allThumbnails;

		allThumbnails = $("." + settings.thumbnailDivContainerClass).find("div." + settings.thumbnailDivClass);



		return allThumbnails;
	}



	function getDefaultThumbnailDivs(allThumbnails, variantIdImagesArray) {
		var defaultThumbnailDivs = [];
		var defaultThumbnailUrls = [];

		// variantIdImagesArray: [["variantId", ["img1", "img2", ...], hasDefaultImages], [...,[...,...],...], ...]

		// find first variant with defaultThumbnails
		var i;
		for(i = 0; i < variantIdImagesArray.length; i++) {
			if(variantIdImagesArray[i][2] == true) {
				// this has the default...
				// so set the default image urls
				defaultThumbnailUrls = variantIdImagesArray[i][1];
				break;
			}
		}

		// if there is no defaultThumbnailUrls, return empty array.
		if(i == defaultThumbnailUrls.length) {
			return [];
		}

		// if there are defaultThumbnailUrls...
		// get corresponding divs

		var thumbnailImageSrc;
		allThumbnails.each(function() {
			// get image element
		    thumbnailImageSrc = $(this).children("img").attr("src");

		    // if image's src is in the array of default image srcs...
		    var imageComparisonResult;
		    for(var i = 0; i < defaultThumbnailUrls.length; i++) {
		    	imageComparisonResult = synchronizeImagePaths(defaultThumbnailUrls[i], thumbnailImageSrc);
		    	if(imageComparisonResult) {
		    		// match
		    		defaultThumbnailDivs.push($(this));
		    	}
		    }

		});


		return $(defaultThumbnailDivs);


	}


	function findCurrentVariant() {
		var currentVariant;
		// if one has been provided... use that one
		if(settings.initialVariant) {
			currentVariant = settings.initialVariant;
		}

		// else - return the selected_or_first_available_variant from global obj
		else if(globalVariable["injectedGlobs"]["selected_or_first_available_variant"]) {
			currentVariant = globalVariable["injectedGlobs"]["selected_or_first_available_variant"]["id"];
		}

		// else - fall back to disabling variant functionality
		else {
			currentVariant = null;
		}
		

		return currentVariant;
	}

	function getProductAllThumbNailDivs(defaultThumbnailDivs, allThumbnails, variantIdImagesArray) {
		// populate productAllThumbnailDivs
		// array: [[variantId, thumbnailDivs], [...,...]]

		var productAllThumbNailDivs = [];
		var variantArrayWithIdandThumbnails = [];


		/* for each variant
		** -does it have the default images?
		** - if it doesn't then:
		*** for each image: find corresponding thumbnail div
		*/
		var variantId;
		var variantImageUrls; // to compare with thumbnailImageSrc
		var variantHasDefault;
		var thumbnailImageSrc; // will hold src of thumbnail div in current iteration to compare
		var variantThumbnailDivs; // will hold divs for this variant - either default or its own
		var imageComparisonResult;
		for (var i = 0; i < variantIdImagesArray.length; i++) {
			variantArrayWithIdandThumbnails = [];

			variantId = variantIdImagesArray[i][0];
			variantHasDefault = variantIdImagesArray[i][2];

			variantArrayWithIdandThumbnails[0] = variantId;

			if(variantHasDefault == true) {
				variantThumbnailDivs = defaultThumbnailDivs;

			} 

			// variant does not have default pictures... find variant pictures
			else {
				variantThumbnailDivs = [];

				// find corresponding divs
				variantImageUrls = variantIdImagesArray[i][1]

				allThumbnails.each(function() {
					// get image element
		    		thumbnailImageSrc = $(this).children("img").attr("src");


					for(var j = 0; j < variantImageUrls.length; j++) {
		    			imageComparisonResult = synchronizeImagePaths(variantImageUrls[j], thumbnailImageSrc);
		    			
		    			if(imageComparisonResult) {
		    				// match
		    				variantThumbnailDivs.push($(this));
		    			}
		    		}

				});
			}
			variantArrayWithIdandThumbnails[1] = $(variantThumbnailDivs);


			productAllThumbNailDivs.push(variantArrayWithIdandThumbnails);
		

		}

		return productAllThumbNailDivs;


	}

	function synchronizeImagePaths(thumbnailImgSrc, objectImgSrc) {

		//cdn.shopify.com/s/files/1/2464/4489/products/DSC_0003_-_front_7e841e23-870e-47f4-9b16-9e010810e8fa.jpg?v=1523393803
		//thumbnail://cdn.shopify.com/s/files/1/2464/4489/products/DSC_0003_-_front_7e841e23-870e-47f4-9b16-9e010810e8fa_1000x1000.jpg?v=1523393803


		/*
		** expects: thumbnailImgSrc = (....).jpg?v=xyxyxyx
		**          objectImgSrc = (....)_1000x1000.jpg?v=xyxyxyx
		**
		**
		** returns: if match -> longest url
		**          else     -> null
		*/

		


	


		/* Pre-Strategy: http: || https: prefix and startsWith...
		**
		*/

		thumbnailImgSrc = removePrefix(thumbnailImgSrc, "http:");
		

		objectImgSrc = removePrefix(objectImgSrc, "http:");
		

		thumbnailImgSrc = removePrefix(thumbnailImgSrc, "https:");
		

		objectImgSrc = removePrefix(objectImgSrc, "https:");


		if(thumbnailImgSrc.startsWith("//")) {
			thumbnailImgSrc = thumbnailImgSrc.substr(2);
		}

		if(objectImgSrc.startsWith("//")) {
			objectImgSrc = objectImgSrc.substr(2);

		}






		/* STRATEGY 1: url size
		** if strings are the same size, they must be exactly the same -> return true
		*/



		if(thumbnailImgSrc.length == objectImgSrc.length) {
			if(stringSameLengthComparator(thumbnailImgSrc, objectImgSrc)) {
				// same size
				return thumbnailImgSrc;
			} else {
				return null;
			}

		}

		var urlLong;
		var urlShort;

		if(thumbnailImgSrc.length < objectImgSrc.length) {
			urlShort = thumbnailImgSrc;
			urlLong = objectImgSrc;
		} else {
			urlShort = objectImgSrc;
			urlLong = thumbnailImgSrc;
		}





		/*
		** STRATEGY 2: .jpg
		** if one of the images contains ".jpg", proceed:
			1. remove ".jpg" from whichever url has it
			2. determine if shorter url is in the longer, or vice versa
			3. if it is, they are the same images
			4. else, if same size, must be equal
			5. else continue
		*/

		var urlNoJpgArray;
		var urlNoJpgLong = null;
		var urlNoJpgShort = null;





		if(urlShort.includes(".jpg") || urlLong.includes(".jpg")) {
			if(urlShort.includes(".jpg")) {
				urlNoJpgArray = urlShort.split(".jpg");
				urlNoJpgShort = urlNoJpgArray[0];
				urlShort = urlNoJpgShort;
			}

			if(urlLong.includes(".jpg")) {
				urlNoJpgArray = urlLong.split(".jpg");
				urlNoJpgLong = urlNoJpgArray[0];
				urlLong = urlNoJpgLong;
			}
		}



		// if same size... must be equal
		if(urlLong.length == urlShort.length) {
			if(stringSameLengthComparator(urlLong, urlShort)) {
				// same size
				return thumbnailImgSrc;
			} else {
				return null;
			}

		}






		/*
		** STRATEGY 3: 1000x1000
		** Last strategy:find string that has dimensions (e.g. 100x100)
		        - remove them from string
				- compare strings...
				- if either contains the other, return the one with dimensions
				- else return false
		*/


		var urlToBeReturned = extractSrcDimensionsComparator(urlShort, urlLong);


		if(urlToBeReturned) {
			return urlToBeReturned;
		}

		// no match found!!
		return null;


		function stringSameLengthComparator(arg1, arg2) {
			// arguments must be of same size!
			if(arg1.length == arg2.length) {
				if(arg1 == arg2) {
					return arg1;
				} else {
					return null;
				}
			} else {
				return null; // not same size
			}



		}

		function removePrefix(url, prefix) {

			var finalString;
			if(url.includes(prefix)) {
				finalString = url.substr(prefix.length);
			} else {
				finalString = url;
			}
			

			return finalString;



		}


		function extractSrcDimensionsComparator(firstUrl, secondUrl) {
			/*
			** determine if what is after the last undercore of firstUrl is image dimensions
			** make sure they are of different sizes... the firstUrl will be the longer one
				1. split firstUrl url at "_"
				2. split last matching group by "x"
				3. look at first group (fg) and second group (sg)
				4. if fg ends in a number and sg starts with a number -- MATCH for dimensions, proceed to 5
				5. else: return null
				6. remove fg's portion of dimensions
				7. do the same for sg
				8. merge all pieces of original URL, adding back "_" where necessary, except for last group
				9. merge all pieces of last '_' group, adding back "x" where necessary, except for last group
				10.add fg_noDimensions and sg_noDimensions
				11. if the firstUrl includes secondUrl, return the larger firstUrl
				12. else return null

			*/

			// equally sized strings cannot contain dimensions and be equal
			if(firstUrl.length == secondUrl.length) {
				return null;
			}

			var tempUrl;
			if(secondUrl.length > firstUrl.length) {
				tempUrl = firstUrl;
				firstUrl = secondUrl;
				secondUrl = tempUrl;


			}


			var splitAt_Array = firstUrl.split("_");

			if(splitAt_Array.length < 2) {
				// no "_" found!
				return null;
			}



			var lastMatchWithUnderscore = splitAt_Array[splitAt_Array.length - 1];
			var splitAtXArray = lastMatchWithUnderscore.split("x");
			if(splitAtXArray.length < 2) {
				// no "x" found!
				return null;
			}

			// look at the last 'x'
			var fg = splitAtXArray[splitAtXArray.length - 2];
			var sg = splitAtXArray[splitAtXArray.length - 1];

			var lastChar_fg = fg.substr(fg.length - 1, 1);
			var firstChar_sg = sg.substr(0, 1);
			var numberSize_fg = 0;
			var numberSize_sg = 0;

			var fg_to_array = fg.split("");
			var sg_to_array = sg.split("");



			if($.isNumeric(lastChar_fg) && $.isNumeric(firstChar_sg)) {


				// determine how many numbers are at the end of fg
				for(var i = fg_to_array.length - 1; i >= 0; i--) {
					if($.isNumeric(fg_to_array[i])) {
						numberSize_fg++;
					} else {
						// first non numeric character... break
						break;
					}
				}

				// determine how many numbers are at the start of sg
				for(var i = 0; i < sg_to_array.length; i++) {
					if($.isNumeric(sg_to_array[i])) {

						numberSize_sg++;
					} else {
						// first non numeric character... break
						break;
					}
				}

			} else {
				// no dimension found at end..
				return null;
			}


			// add elements from first
			var finalUrl = [];
			var fg_noDimensions = fg.substr(-1 * numberSize_fg, fg.length - numberSize_fg); // wer1000
			var sg_noDimensions = sg.substr(numberSize_sg); //1000wer


			// put together pieces that were split by _ excluding the last group
			for(var i = 0; i < splitAt_Array.length - 1; i++) {
				if(i != 0) {
					finalUrl.push("_");
				}
				finalUrl.push(splitAt_Array[i]);
			}


			// add pieces that were split by 'x', excluding the last group (which includes the dimensions)
			for(var i = 0; i < splitAtXArray.length - 2; i++) {
				if(i != 0) {
					finalUrl.push("x");
				}
				finalUrl.push(splitAtXArray[i]); // ["wer", "x", ""wefs"]

			}

			// add pieces surrounding dimensions in the last group (eg. excf from ex100x100cf)
			// push fg and lg, without dimension characters
			finalUrl.push(fg_noDimensions);
			finalUrl.push(sg_noDimensions);



			finalUrl = finalUrl.join('');

			
			// STEP 10


			if(secondUrl == finalUrl) {
				// return url with size
				return firstUrl; 

			} else {
				return null;
			}

		}


	}

	/*
	 * Returns an array of arrays. Each sub array matches a variant. 
	 * array[0]: variant id
	 * array[1]: images to show for this variant
	 * array[2]: whether the images for this variant are only the "default" images for the product
	 */
	function getVariantIdsAndImagesFromProduct(addDefaultImagesIfNoVariantImage, addDefaultImagesToVariants) {
		var product = globalVariable["injectedGlobs"]["product"];

		// get all images for this product
		// array of strings: img links
		var allImagesSrcInProduct = [];
		var defaultImagesSrc = [];
		for(var i = 0; i < product["images"].length; i++) {
			allImagesSrcInProduct.push(product["images"][i]);
			defaultImagesSrc.push(product["images"][i]);
		}


		// get all variants and their corresponding image
		var variantIdImagesArray = [];


		var prodVariant = null;
		var variantId = null;
		var variantImageUrls;
		var variantImageUrl = null;
		var variantIdImage;
		for(var i = 0; i < product.variants.length; i++) {
			variantIdImage = [];
			variantImageUrls = [];
			variantImageUrl = null;

			prodVariant = product.variants[i];
			variantId = prodVariant["id"];

			if(prodVariant["featured_image"]) {
				variantImageUrl = prodVariant["featured_image"]["src"];

			}



			// remove variant image from the list of default...
			// and replace variant image src with corresponding src from products object for consistency
			var j = 0;
			var imageComparisonResult;
			if(variantImageUrl) {
				for (j = 0; j < allImagesSrcInProduct.length; j++) {
					imageComparisonResult = synchronizeImagePaths(variantImageUrl, allImagesSrcInProduct[j]);
					if (imageComparisonResult) {
						variantImageUrl = allImagesSrcInProduct[j];
						variantImageUrls.push(variantImageUrl);
						break;
					}

				}

				if(j == allImagesSrcInProduct.length) {
					// variant image not found!
					throw new Error("Couldn't find variant image in list of product images: " + variantImageUrl);
				} else {
					// remove from default variant list
  					defaultImagesSrc.splice(defaultImagesSrc.indexOf(variantImageUrl), 1);
					console.log("Successfully updated list of default image sources.");

				}


			} else {
				// if there is no feautured image, variantImageUrls will have no elements. 
				variantImageUrls = [];
			}
			


			variantIdImage[0] = variantId;
			variantIdImage[1] = variantImageUrls;
			variantIdImage[2] = false; // will later say if the variant has only default images

			variantIdImagesArray.push(variantIdImage);
		}

		

		// at this point: variantIdImagesArray = [ ["variandId", ["imageSrc"]], [,]]





		/* if there is one variant - this is the default NO MATTER WHAT
		** if there is more than one variant...
		**** add default images if necessary
		*/

		// if there is more than one variant...
		var hasOnlyDefaultImages;

		if(variantIdImagesArray.length > 1) {
			// add default images to each if necessary
			for(var i = 0; i < variantIdImagesArray.length; i++) {
				variantImageUrls = variantIdImagesArray[i][1];
				if((variantImageUrls.length == 0) && addDefaultImagesIfNoVariantImage == true) {
					hasOnlyDefaultImages = true;
					// make all images for default available
					addDefaultImages(defaultImagesSrc, variantImageUrls);
					variantIdImagesArray[i][2] = hasOnlyDefaultImages;

				} else {
					// this variant already has an image

					// check to see if default should be appended anyway...
					if(addDefaultImagesToVariants == true) {
						addDefaultImages(defaultImagesSrc, variantImageUrls)
					}
				}

			}
			

		}

		// there is one variant - make the default
		// add all images in product to this default
		else {
			
			variantImageUrls = variantIdImagesArray[0][1];
			hasDefaultImages = true;
			addDefaultImages(defaultImagesSrc, variantImageUrls);
			variantIdImagesArray[0][2] = hasDefaultImages;

			
		}


		return variantIdImagesArray;




		function addDefaultImages(defaultImages, destinationArray) {
			for (var k = 0; k < defaultImages.length; k++) {
				destinationArray.push(defaultImages[k]);
			}
		}


	}




/* WE ARE READY FOR INITIALIZATION OF THUMBNAILS AND MAIN IMAGE */









	function init () {

		clearMainImageContainer();

		// add images in mainImageDivClass
		setup(thumbnailDivs);



		// populate array of large images
		imagesInventory = findMain(imagesInventory);

		//locate thumbnails and add listeners to bind thumbnails to large image
		locateThumbnails(thumbnailDivs, imagesInventory);

		//enable arrows
		enableArrows(thumbnailDivs, imagesInventory);

		  
		    

		function setup() {
		    // find thumbnails
		    //var thumbnailDivs = $("." + settings.thumbnailDivContainerClass).find("div." + settings.thumbnailDivClass);
		    var divsToPushMain = [];
		    var hasSelected = false;
		    var countToEnsureOneSelected = 0;


		    // determine if a thumbnail has a class = selected
		    thumbnailDivs.each(function() {
		      if($(this).hasClass(settings.thumbnailDivSelectedClass)) {
		        hasSelected = true;
		      }
		    });

		    if(hasSelected) {
		      thumbnailDivs.each(function() {
		        // if the thumbnail has class = selected and is the first one to have it
		        if(($(this).hasClass(settings.thumbnailDivSelectedClass)) && countToEnsureOneSelected == 0) {
		          countToEnsureOneSelected++;
		          
		        } else {
		          // all other thumbnails: remove multiple selected
		          $(this).removeClass(settings.thumbnailDivSelectedClass);
		          // set as unselected
		          $(this).addClass(settings.thumbnailDivUnselectedClass);
		        }
		      });
		    } else {
		      // first thumbnail is "selected"
		      $(thumbnailDivs[0]).addClass(settings.thumbnailDivSelectedClass);

		      // others are "unselected"
		        thumbnailDivs.each(function() {
		          // there is only one "selected", so ignore that one
		          if(!($(this).hasClass(settings.thumbnailDivSelectedClass))) {
		            
		            $(this).addClass(settings.thumbnailDivUnselectedClass);

		          }
		        });

		    }

		    // for each thumnail, add main images to image container
		    thumbnailDivs.each(function() {
		      var thumbnailImageSrc;
		      var isSelected = false;
		      // get image element
		      thumbnailImageSrc = $(this).children("img").attr("src");
		      if($(this).hasClass(settings.thumbnailDivSelectedClass)) {
		        isSelected = true;
		      }
		      divsToPushMain.push("<div class='" + (isSelected ? settings.mainImageDivCurrentClass : settings.mainImageDivHiddenClass) + " " + settings.mainImageDivClass +"'><img src='" + thumbnailImageSrc + "'></div>");
		    });


		    $("." + settings.mainImageContainerDivClass).append(divsToPushMain.join(""));



		}


		function clearMainImageContainer() {
		  	$("." + settings.mainImageContainerDivClass).empty();
		}


		//populates arrays of large images
		function findMain(largeImagesArray) {
		    var mainImgMap = [];

		    // extract child divs (assume they hold img)
		    var divChildrenOfMain = $("." + settings.mainImageContainerDivClass).children("div." + settings.mainImageDivClass);

		    var aMainImgElem;


		    divChildrenOfMain.each(function() {
		      var aMainImgObj;
		      var imageSource;
		      var enabledCondition;

		      imageSource = $(this).children("img").attr("src");

		      if($(this).hasClass(settings.mainImageDivCurrentClass)) {
		      	enabledCondition = settings.mainImageDivCurrentClass;
		      } 
		      else if($(this).hasClass(settings.mainImageDivHiddenClass)){
		      	enabledCondition = settings.mainImageDivHiddenClass;
		      } 
		      else {
		      	throw new Error("Every mainImage must have an enabledCondition class");
		      }

		      aMainImgObj = new ImageObject(imageSource, enabledCondition, $(this));

		      mainImgMap.push(aMainImgObj);

		    });


		    return mainImgMap;

		}

		function locateThumbnails(thumbnailDivs, imagesInventory) {
		    

		    thumbnailDivs.each(function() {
		      // find corresponding main image
		      var tempImg;
		      var corrMainImgObj;

		      for(var k = 0; k < imagesInventory.length; k++) {
		        tempImg = imagesInventory[k];
		        if(tempImg["src"] == $(this).children("img").attr("src")) {
		          corrMainImgObj = tempImg;
		        }
		      }

		      if(!corrMainImgObj) {
		        throw new Error("Matching image not found");
		      }

		      $(this).on("click", {matchMainImgObj: corrMainImgObj, inventory: imagesInventory}, function(event) {
		        // stop autoplay
		        pauseCarousel();

		        // unselect all thumbnails, hide all main images
		        // select current thumbnail, show current image
		        refreshMainImage(this, false);



		      });

		    });

		}

		// this object represents an image in the lm-gall_mainimg class div
		function ImageObject(src, isEnabled, elementRef) {
		    this.src = src;
		    this.isEnabled = isEnabled;
		    this.elementRef = elementRef;
		}

		  
		function enableArrows(thumbnailDivs, imagesInventory) {
		    var shouldEnableArrows = false;
		    var forwardArrow;
		    var backwardArrow;

		    thumbnailDivs.each(function() {
		      if($(this).children("img").length > 0) {
		        shouldEnableArrows = true;
		      }
		    });

		    if(!shouldEnableArrows) {
		      return;
		    }

		    // enable arrows...
		    forwardArrow = $("#" + settings.idOfForwardArrow);
		    forwardArrow.css("display", "block");

		    backwardArrow = $("#" + settings.idOfBackArrow);
		    backwardArrow.css("display", "block");

		    // remove previous listeners...
		    forwardArrow.off("click");
			backwardArrow.off("click");

		    // listener for foward arrow
		    forwardArrow.on("click", {orderedThumbnails: thumbnailDivs, inventory: imagesInventory, isForwardOrBack: "FORWARD"}, arrowBehavior);


		    // listener for backward arrow
		    backwardArrow.on("click", {orderedThumbnails: thumbnailDivs, inventory: imagesInventory, isForwardOrBack: "BACK"}, arrowBehavior);


		}


		function arrowBehavior(event) {
		    // stop autoplay
		    pauseCarousel();

		    //clearInterval(nextOrPrevious);
		    nextOrPrevious(event.data.orderedThumbnails, event.data.inventory, event.data.isForwardOrBack);
		    
		}

		  
	}


	// this function sets EVERYTHING to unselected or hidden
	function prepareToChangeImage(currentThumbnail, imagesInventory) {


		unselectThumbnails(currentThumbnail);
		unselectMainImages(imagesInventory);
	}

	function unselectThumbnails(currentThumbnail) {
		var otherThumbnails;

		otherThumbnails = $(currentThumbnail).siblings("div." + settings.thumbnailDivClass);
	    otherThumbnails.each(function() {
	      if($(this).hasClass(settings.thumbnailDivSelectedClass)) {
	      	$(this).removeClass(settings.thumbnailDivSelectedClass);
	        $(this).addClass(settings.thumbnailDivUnselectedClass);
	      }
	    });
		$(currentThumbnail).removeClass(settings.thumbnailDivSelectedClass)
	    $(currentThumbnail).addClass(settings.thumbnailDivUnselectedClass);
	}

	function unselectMainImages(imagesInventory) {
		var imageToBeHidden;

		for(var j = 0; j < imagesInventory.length; j++) {

	      if(imagesInventory[j]["isEnabled"] == settings.mainImageDivCurrentClass) {
	        imageToBeHidden = imagesInventory[j]["elementRef"];
	        imagesInventory[j]["isEnabled"] = settings.mainImageDivHiddenClass;
	        $(imageToBeHidden).removeClass(settings.mainImageDivCurrentClass);
	        $(imageToBeHidden).addClass(settings.mainImageDivHiddenClass);

	      }

	    }
	}

	function nextOrPrevious(thumbnailDivs, imagesInventory, isForwardOrBack) {
	    // what's the current thumbnail selected?
	    var currentThumbnail = null;
	    var nextThumbnail = null;

	    var tempMainObj;
	    var corrMainObj;


	    for(var k = 0; k < thumbnailDivs.length; k ++) {

	    	if($(thumbnailDivs[k]).hasClass(settings.thumbnailDivSelectedClass)) {

	    		currentThumbnail = thumbnailDivs[k];
	    	}
	      	// if current has been found, look for next
	      	if(currentThumbnail) {

	        	if(isForwardOrBack == "FORWARD") {
	          		// if current is the last on the list...
	          		if(k == thumbnailDivs.length - 1) {
	            		// next is the first one..
	            		nextThumbnail = thumbnailDivs[0];
	          		} else {
	            		nextThumbnail = thumbnailDivs[k + 1];
	          		}

	          		break;

	          	} else if(isForwardOrBack="BACK") {
		            // if current is the last on the list...
		            if(k == 0) {
		            	// next is the first one..
		              	nextThumbnail = thumbnailDivs[thumbnailDivs.length - 1];
	            	} else {
	              		nextThumbnail = thumbnailDivs[k - 1];
	            	}
	            
	            break;
	        	
	        	} else {
	          		throw new Error("ARROW MUST BE FORWARD OR BACK");
	        	} 

	      	}

	    }

	    if (!currentThumbnail) {
	      throw new Error("Current Thumbnail Not Found!");

	    }

	    if (!nextThumbnail) {
	      throw new Error("Next Thumbnail Not Found!");

	    }

	    refreshMainImage(nextThumbnail,false);


	}

	function refreshMainImage(currentThumbnail, hasThumbnailBeenSelected) {
		// what's the corresponding image for the NEXT?
	    var tempMainObj = null;
	    var corrMainObj = null;


	    for(var i = 0; i < imagesInventory.length; i++) {
	      tempMainObj = imagesInventory[i];
	      
	      if(tempMainObj["src"] == $(currentThumbnail).children("img").attr("src")) {
	        corrMainObj = imagesInventory[i];
	      }

	    }

	    if(!corrMainObj) {
	      throw new Error("CORRESPONDING Main IMAGE for this thumbnail not found");
	    }

	    // now we have a referenbce to the mainObj we want to show

	    if(hasThumbnailBeenSelected == false) {
	    	// set "unselected" on all thumbnails, "hidden" on all main images, "hidden" for each element in imagesInventory array
	    	prepareToChangeImage(currentThumbnail, imagesInventory);

	    	// "select" new thumbnail
	    	$(currentThumbnail).removeClass(settings.thumbnailDivUnselectedClass);   
	    	$(currentThumbnail).addClass(settings.thumbnailDivSelectedClass);

	    } else if(hasThumbnailBeenSelected == true){
	    	// just hide mainImages
	    	unselectMainImages(imagesInventory);

	    } else {
	    	throw "invalid args";
	    }



	    // "current" corresponding main image
	    $(corrMainObj["elementRef"]).removeClass(settings.mainImageDivHiddenClass);	    
	    $(corrMainObj["elementRef"]).addClass(settings.mainImageDivCurrentClass);

	    // "current" in corresponding element in imagesInventory array
	    corrMainObj["isEnabled"] = settings.mainImageDivCurrentClass;
	}

	function autoplay(thumbnailDivs, imagesInventory) {
		// only autoplay if there is more than one image
		if(thumbnailDivs.length > 1) {
			nextOrPrevious(thumbnailDivs, imagesInventory, "FORWARD");
		}
		else { }
	    

	}

	function pauseCarousel() {

		globalVariable.clearInterval(autoplayVar);

	}

	function continueCarousel() {
		autoplayVar = setInterval(function() {
	    							autoplay(thumbnailDivs, imagesInventory);
	    						  }, settings.secondsCarousel);

	}


	function decideIfEnableCarousel(doEnable, defaultEnable, pauseCarouselIfVariantImage, showingDefaultImagesOnly, showingVariantImage, mode) {
		// doEnable forces enabling...
		if(doEnable == true) {
			enable();

			return;
		}
		if(doEnable == false) {

			return; // don't enable
		}
		else if (doEnable == null) {
			if(mode == "mode1") {
				if(pauseCarouselIfVariantImage && showingVariantImage) {
					// don't enable
				} else {
					enable();
				}

			} else if(mode == "mode2") {
				if(pauseCarouselIfVariantImage && (showingVariantImage && !showingDefaultImagesOnly)) {
					// don't enable
				} else {
					enable();
				}

			} else if(mode == "mode3")

			if(defaultEnable == true) {
				enable();
			}
		}

		function enable() {
			//begin autoplay
			autoplayVar = setInterval(function() {
	    			autoplay(thumbnailDivs, imagesInventory);
	    			}, settings.secondsCarousel);

		}
		
	}

	function changeVariant(variantId) {
		// disabled...

		if(mode3Enabled) {
			throw new Error("Variant functionality disabled - mode 3");
			return;
		}

		// stop the carousel
		pauseCarousel();

		if(mode1Enabled) {
			if(showingDefaultImagesOnly == true) {
				// there are no variant images
			} else {
				// some variants have images
				var selectThumbnailResult = selectCurrentVariant(variantId, variantIdImagesArray, thumbnailDivs);

				if(selectThumbnailResult[0] == true) {
					// found and selected the variant!
					selectedVariantImage = true;
					currentVariant = variantId;
					showingDefaultImagesOnly = false;

					// update imageContainer 
					

				} else {
					// not found... possibly restart the carousel....
					selectedVariantImage = false;
					currentVariant = "default";
				}

				refreshMainImage(selectThumbnailResult[1], true);

			}
			

			decideIfEnableCarousel(null, settings.autoplay, settings.mode1_mode2_pauseCarouselIfVariantChosen, showingDefaultImagesOnly, selectedVariantImage, mode);



		} else if(mode2Enabled) {
			// set current thumbnaildivs
			try {
				thumbnailDivs = getCurrentThumbnailDivs(variantId, productAllThumbnailDivs);
			} catch(error) {
				throw new Error("Variant NOT found: " + variantId);

				return;
			}

			// this variantId was successfully found
			currentVariant = variantId;


			// hide all other thumbnails
			hideOtherThumbnails(thumbnailDivs, allThumbnails);

			// make sure current thumbnails are visible
			showCurrentThumbnails(thumbnailDivs, settings.mode2_selectCurrentVariantThumbnail);

			// restart
			init();

			showingDefaultImagesOnly = willBeShowingDefaultImagesOnly(currentVariant, variantIdImagesArray);

			// make sure slideshow is stopped only if variant has no default images
			decideIfEnableCarousel(null, settings.autoplay, settings.mode1_mode2_pauseCarouselIfVariantChosen, showingDefaultImagesOnly, selectedVariantImage, mode);

		}

		


	}

	function showDefault() {
		// disabled if in mode3

		if(mode3Enabled) {
			throw new Error("Variant functionality disabled - mode 3");
			return;
		}
		// stop the carousel
		pauseCarousel();

		if(mode1Enabled) {
			var selectedThumnail = null;
			// the product has no variant images
			if(showingDefaultImagesOnly) {
			} else {
				// select first image...
				selectedThumbnail = selectFirstImage(thumbnailDivs);
				currentVariant = "default"; // only time this variable doesn't hold an id
				selectedVariantImage = false;

				// refresh imageContainer
				refreshMainImage(selectedThumbnail, true);
			}



		} else if(mode2Enabled) {
			// set current thumbnaildivs
			currentVariant = "default"; // only time this variable doesn't hold an id
			thumbnailDivs = defaultThumbnailDivs;
			
			// hide all other thumbnails
			hideOtherThumbnails(thumbnailDivs, allThumbnails);

			showCurrentThumbnails(thumbnailDivs, false);

			// restart
			init();

			showingDefaultImagesOnly = true;

		}

		decideIfEnableCarousel(null, settings.autoplay, settings.mode1_mode2_pauseCarouselIfVariantImage, showingDefaultImagesOnly, selectedVariantImage, mode);

	}

	return {
		pause: pauseCarousel,
		continue: continueCarousel,
		changeVariant: changeVariant,
		showDefault: showDefault
	};

	

})(window);














