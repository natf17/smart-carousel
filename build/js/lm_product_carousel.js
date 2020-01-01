var carousel_variant_event_adapter = (function carousel_variant_event_adapter(globalVariable) {

	$(globalVariable).on("PR_changeMatchingVariants", function(event) {
		var matchingVariants = event.detail;
		if(matchingVariants && matchingVariants.length == 1) {
			carousel.changeVariant(event.detail[0]);
		} else {
			console.log("Need more details to match 1 variant!");
		}
		
	});

})(window);

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
		mode2_showDefaultImagesIncludedInVariant: true, // but if variant has no image, it will ALWAYS default to the default images, or to all if there are on "default"
		mode1_mode2_pauseCarouselIfVariantImage: true,
		//mode1_mode2_tryToShowDefaultIfNoVariantImage: true, // false: if a variant has no image, show all
	};



	function Variant_Mode1() {
		this.variantId = null;
		this.defaultThumbnailDiv = null; // represents the thumbnail to select if this variant is selected
		this.initializedWithVariantThumbnail = false; // is the defaultThumbnailDiv the featured image for the variant?
	}

	function Variant_Mode2() {
		this.variantId = null;
		this.defaultThumbnailDiv = null;
		this.initializedWithVariantThumbnail = false; // is the defaultThumbnailDiv the featured image for the variant?

		this.thumbnaildivs = []; // all the thumbnails assigned to this variant, might be 1 or default + 1 
	}

	function ImageSrcEntry(variantId, productVariantSrc, productImageSrc) {
		this.variantId = variantId;
		this.productVariantSrc = productVariantSrc; // nullable if the variant had no featured image
		this.productImageSrc = productImageSrc; // nullable if the variant had no featured image
	}

	function ThumbnailContainer_Mode1() {
		this.currentVariantId = null;
		this.allVariants = []; // Variant_Mode1
		this.allThumbnails = null;
		this.currentVariantObject = null;
		this.currentThumbnailSelected = null;
		this.currentThumbnailList = []; // same as all thumbnails
	}

	function ThumbnailContainer_Mode2() {
		this.currentVariantId = null; //
		this.allVariants = []; // Variant_Mode2
		this.allThumbnails = null;
		this.currentVariantObject = null;
		this.currentThumbnailSelected = null;
		this.currentThumbnailList = [];
	}

	function ThumbnailContainer_Mode3() {
		this.allThumbnails = null;
		this.currentThumbnailSelected = null;
		this.currentThumbnailList = null;
	}

	// contains information about the product and the thumbnail configuration. Aggregates all the information needed to populate the
	// Product objects 
	function ProductInfo() {
		this.allThumbnailDivs = null; // the thumbnail divs as provided by the Liquid template
		this.mode; // "mode1", "mode2", or "mode3"?
		this.defaultImagesSrc = []; // all the img src strings from the global variable that aren't assigned to a variant
		this.imageSrcMappings = []; // a list of ImageSrcEntry
		this.doesAVariantHaveFeaturedImage = false; // if there's at least one variant with an image
		this.currentVariantId = null; // can be null... mode 3
	}

	function LargeImageObject(src, elementRef) {
	    this.src = src;
		this.elementRef = elementRef;
	}

	function LargeImageContainer() {
		this.largeImages = []; // LargeImageObject
		this.selectedDiv = null;
	}

	var THUMBNAIL_CONTAINER;
	var LARGE_IMAGE_CONTAINER;

	// will hold interval of autoplay
	var autoplayVar;

	$(document).ready(function(){

		if(!globalVariable) {
			throw new Error("globalVariable argument is required");
		}

		if(globalVariable["injectedGlobs"]["insideProduct"] != true) {
			return;
		}

		/*
		 *
		 * CREATE ALL NECESSARY MAPPINGS, AND OBJECTS: THUMBNAIL_CONTAINER
		 *
		 *
		 */
		// begin extracting information to create the objects we'll use for the carousel
		var PRODUCT_INFO = new ProductInfo();

		// get all thumbnail divs
		PRODUCT_INFO.allThumbnailDivs = getAllThumbnails();


		// create the image src mappings: defaultImagesSrc and imageSrcMappings properties 
		processImages(PRODUCT_INFO, globalVariable);

		// determine current mode: "mode1", or "mode2" or "mode3"
		populateModeAndCurrentVariantId(PRODUCT_INFO, settings, globalVariable);


		// a fully populated VariantContainer_Mode{}
		THUMBNAIL_CONTAINER = createParentObject(settings, globalVariable, PRODUCT_INFO);

		LARGE_IMAGE_CONTAINER = new LargeImageContainer();

		init(THUMBNAIL_CONTAINER, LARGE_IMAGE_CONTAINER, settings);

		if(shouldEnableCarousel(settings.autoplay, settings.mode1_mode2_pauseCarouselIfVariantImage, THUMBNAIL_CONTAINER)) {
			autoplayVar = enable(THUMBNAIL_CONTAINER, LARGE_IMAGE_CONTAINER, settings);
		}

	}); // end document ready





	/*
	 * Create a fully populated ThumbnailContainer_Mode{x}. This function decides which thumbnail div is the default one for each variant.
	 *
	 * Requires the following productInfo properties:
	 *	- allThumbnailDivs
	 *	- currentVariantId
	 *	- imageSrcMappings
	 *	- defaultImagesSrc
	 */
	function createParentObject(settings, globVar, productInfo) {
		var allProductThumbnails = productInfo.allThumbnailDivs;
		var currentVariantId = productInfo.currentVariantId; // will be null for mode 3
		
		var variantContainer = null;

		// mode3: select the first image
		if(productInfo.mode == "mode3") {
			variantContainer = new ThumbnailContainer_Mode3();
			variantContainer.allThumbnails = allProductThumbnails;
			variantContainer.currentThumbnailList = allProductThumbnails;
			variantContainer.currentThumbnailSelected = allProductThumbnails[0];
			return variantContainer;
		}

		var variantObjects = [];
		var variantObject = null;
		var imageSrcEntry = null;
		for(var i = 0; i < productInfo.imageSrcMappings.length; i++) {
			imageSrcEntry = productInfo.imageSrcMappings[i];

			if(productInfo.mode == "mode1") {
				variantObject = new Variant_Mode1();
				variantObject.variantId = imageSrcEntry.variantId;
				// this variant has no featured image so select the first available image
				if(imageSrcEntry.productVariantSrc == null || imageSrcEntry.productImageSrc == null) {
					variantObject.defaultThumbnailDiv = allProductThumbnails[0];
					variantObject.initializedWithVariantThumbnail = false;
				} else {
					variantObject.initializedWithVariantThumbnail = true;
				}

			} else if(productInfo.mode == "mode2") {
				variantObject = new Variant_Mode2();
				variantObject.variantId = imageSrcEntry.variantId;

				variantObject.thumbnaildivs = getThumbnailDivListForVariantImgSrc(imageSrcEntry.productVariantSrc, productInfo, settings.mode2_showDefaultImagesIncludedInVariant);
				// this variant has no featured image so select the first available image from its list of thumbnails
				if(imageSrcEntry.productVariantSrc == null || imageSrcEntry.productImageSrc == null) {
					variantObject.defaultThumbnailDiv = variantObject.thumbnaildivs[0];
					variantObject.initializedWithVariantThumbnail = false;
				} else {
					variantObject.initializedWithVariantThumbnail = true;
				}

			} else {
				throw new Error("Unrecognized mode: " + productInfo.mode);
			}


			// if the default thumbnail div hasn't been set, it's because the variant has a featured image
			if(!variantObject.defaultThumbnailDiv) {
				variantObject.defaultThumbnailDiv = getThumbnailDivForVariantImgSrc(imageSrcEntry.productImageSrc, allProductThumbnails);

			}

			// try again			
			if(!variantObject.defaultThumbnailDiv) {
				variantObject.defaultThumbnailDiv = getThumbnailDivForVariantImgSrc(imageSrcEntry.productVariantSrc, allProductThumbnails);

			}

			if(!variantObject.defaultThumbnailDiv) {
				// we couldn't find it...?
				throw new Error("No thumbnail found that matches the image src: " + imageSrcEntry.productImageSrc + "for variant id " + variantObject.variantId);
			}
			variantObjects.push(variantObject);
			
		}

		if(productInfo.mode == "mode1") {
			variantContainer = new ThumbnailContainer_Mode1();
		} else if(productInfo.mode == "mode2") {
			variantContainer = new ThumbnailContainer_Mode2();
		} else {
			throw new Error("Unrecognized mode: " + productInfo.mode);
		}

		variantContainer.allThumbnails = allProductThumbnails;
		variantContainer.currentVariantId = currentVariantId;
		variantContainer.allVariants = variantObjects;


		var currentVariantObject = null;
		for(var i = 0; i < variantObjects.length; i++) {
			if(variantObjects[i]["variantId"] == currentVariantId) {
				currentVariantObject = variantObjects[i];
				variantContainer.currentVariantObject = currentVariantObject;
				variantContainer.currentThumbnailSelected = currentVariantObject.defaultThumbnailDiv;
				if(variantContainer instanceof ThumbnailContainer_Mode1) {
					variantContainer.currentThumbnailList = variantContainer.allThumbnails;
				} else {
					variantContainer.currentThumbnailList = currentVariantObject.thumbnaildivs;

				}
				break;

			}
		}

		if(currentVariantObject == null) {
			throw new Error("No variant object found for " + currentVariantId);
		}

		return variantContainer;



	}

	/*
	 * Search the thumbnailDivs array for the thumbnail whose image element's src attribute "matches" variantImgSrc.
	 * Uses synchronizeImagePaths().
	 */
	function getThumbnailDivForVariantImgSrc(variantImgSrc, thumbnailDivs) {
		var matchingThumbnail = null;

		var thumbnailImageSrc = null;
		thumbnailDivs.each(function() {
			// get image element
		    thumbnailImageSrc = $(this).children("img").attr("src");
		    if(synchronizeImagePaths(variantImgSrc, thumbnailImageSrc)) {
				matchingThumbnail = $(this);
				return false;

		    }

		});

		return matchingThumbnail;

	}

	/*
	 * Use productInfo to obtain all the thumbnails and defaultThumbnails. Depending on shouldAddDefaultImagesToVariantFeaturedImage,
	 * either the default thumbnails as well as the variant thumbnail, or just the variant thumbnail will be returned. However, if  
	 * variantImgSrc is null (the variant has no featured image), the default thumbnails will be returned. If there are no default
	 * thumbnails (all are assigned to variants), then all the thumbnails are returned.
	 * 
	 */
	function getThumbnailDivListForVariantImgSrc(variantImgSrc, productInfo, shouldAddDefaultImagesToVariantFeaturedImage) {
		var thumbnailDivList = [];
		var allThumbnails = productInfo.allThumbnailDivs;

		// if shouldAddDefaultImagesToVariantFeaturedImage is false and if the variant has a featured image
		// then only find the variant image thumbnail, and we're done.
		if(variantImgSrc && shouldAddDefaultImagesToVariantFeaturedImage == false) {
			thumbnailDivList.push(getThumbnailDivForVariantImgSrc(variantImgSrc, allThumbnails));
			return thumbnailDivList;
		}

		// at this point, we want to include the default images

		// if there are no default images, just send back all the thumbnails
		if(productInfo.defaultImagesSrc.length < 1) {
			for(var i = 0; i < allThumbnails.length; i++) {
				thumbnailDivList.push(allThumbnails[i]);
			}
			return thumbnailDivList;
		}
		
		// there are definitely default images, although there might be no variant image
		var alreadyAddedVariant = false;
		if(!variantImgSrc) {
			alreadyAddedVariant = true; // we don't need to look for the variant image 
		}

		var thumbnailImageSrc = null;
		var alreadyAddedVariant = false;
		allThumbnails.each(function() {
			// get image element
		    thumbnailImageSrc = $(this).children("img").attr("src");
		    
		    // if this is the variant featured image thumbnail, add it
		    if(alreadyAddedVariant == false) {
		    	if(synchronizeImagePaths(variantImgSrc, thumbnailImageSrc)) {
		    		thumbnailDivList.push($(this));
		    		alreadyAddedVariant = true;
					return true;

		   		 }
		    } 

		    // if this is a default image, add it
		    for(var i = 0; i < productInfo.defaultImagesSrc.length; i++) {
				if(synchronizeImagePaths(productInfo.defaultImagesSrc[i], thumbnailImageSrc)) {
		    		thumbnailDivList.push($(this));
					return true;

		   		 }

		    }
		    // neither a default thumbnail, nor the variant featured image

		});

		if(thumbnailDivList.length < 1) {
			throw new Error("No matching thumbnails for this variant " + variantObject.variantId);
		}

		return $(thumbnailDivList);

	}

	/*
	 * Set the defaultImagesSrc and imageSrcMappings properties of productInfo by generating ImageSrcEntry objects for 
	 * variant image src to product image source mappings and adding the default image src strings. If a variant doesn't have
	 * a featured image, a ImageSrcEntry will still be created.
	 * 
	 * Populates the following productInfo fields:
	 *	- defaultImagesSrc
	 *	- imageSrcMappings
	 * 	- doesAVariantHaveFeaturedImage
	 */
	function processImages(productInfo, globVar) {
		var product = globVar["injectedGlobs"]["product"];

		// get all images for this product
		// array of strings: img links
		var allImagesSrcInProduct = product["images"];
		var defaultImagesSrc = [];

		for(var i = 0; i < allImagesSrcInProduct.length; i++) {
			defaultImagesSrc.push(allImagesSrcInProduct[i]);
		}

		// populate imageSrcMappings property of productInfo
		var prodVariant = null;
		var variantImageUrl = null;
		var variantImageUrlInProduct = null;
		var imageSrcEntry = null;
		for(var i = 0; i < product.variants.length; i++) {
			variantImageUrl = null;
			prodVariant = product.variants[i];
			if(prodVariant["featured_image"]) {
				variantImageUrl = prodVariant["featured_image"];
				if(variantImageUrl) {
					variantImageUrl = variantImageUrl["src"];
				}
			}

			if(!variantImageUrl) {
				imageSrcEntry = new ImageSrcEntry(prodVariant["id"], null, null);
				productInfo.imageSrcMappings.push(imageSrcEntry);
				continue;
			}

			productInfo.doesAVariantHaveFeaturedImage = true;

			// remove variant image from the list of default...
			// and create variant image src to product image src entry mapping
			var j = 0;
			for (j = 0; j < allImagesSrcInProduct.length; j++) {
				variantImageUrlInProduct = allImagesSrcInProduct[j];
				if (synchronizeImagePaths(variantImageUrl, variantImageUrlInProduct)) {
					imageSrcEntry = new ImageSrcEntry(prodVariant["id"], variantImageUrl, variantImageUrlInProduct);
					productInfo.imageSrcMappings.push(imageSrcEntry);
					
					break;
				}
			}

			// variant image not found!
			if(j == allImagesSrcInProduct.length) {
				throw new Error("Couldn't find variant image " + variantImageUrl + " in list of product images.");
			} else {
				// remove from default variant list
  				defaultImagesSrc.splice(defaultImagesSrc.indexOf(variantImageUrl), 1);

			}

		}

		// populate defaultImagesSrc property of productInfo
		for(var i = 0; i < defaultImagesSrc.length; i++) {
			productInfo.defaultImagesSrc.push(defaultImagesSrc[i]);
		}

		return productInfo;

	}

	/*
	 * What mode is enabled? What mode will be used?
	 *
	 * Populates the following productInfo properties:
	 * 	- currentVariantId
	 *	- mode
	 * 
	 * Requires the following productInfo properties:
	 *	- doesAVariantHaveFeaturedImage
	 *	- imageSrcMappings
	 */
	function populateModeAndCurrentVariantId(productInfo, settings, globVar) {
		var currentMode = null;
		var currentVariantId = null;
		var defaultMode1 = false;
		if(settings.mode1 == false && settings.mode2 == false && settings.mode3 == false) {
			defaultMode1 = true;
		} 

		if(settings.mode1 == true || settings.mode2 == true || defaultMode1 == true) {
			currentVariantId = findCurrentVariantId(settings, globVar);
			if(currentVariantId) {
				currentMode = (settings.mode1 == true || defaultMode1 == true)? "mode1" : "mode2";
			} else {
				// no variant found... fall back to mode 3
				currentMode = "mode3";
			}
		} else if(settings.mode3Enabled == true){
			currentMode = "mode3";
		} else {
			// should never happen
			currentMode = "mode3";
		}

		/*
		 * Use mode 3 if...
		 *	- there's only one variant (it must be the default)
		 *	- there are no default variant images
		 */

		if(productInfo.imageSrcMappings.length < 2) {

		 	currentMode = "mode3";
		}

		if(productInfo.doesAVariantHaveFeaturedImage == false) {

		 	currentMode = "mode3";
		}

		if(settings.mode3Enabled == true) {
			currentMode = "mode3";
		}

		productInfo.mode = currentMode;
		productInfo.currentVariantId = currentVariantId;
		return productInfo;

	}

	/*
	 * Will return either the initial variant id specified in the settings object, or the one specified in the 
	 * "selected_or_first_available_variant" property of the "injectedGlobs" object in the globalVariable.
	 *
	 */
	function findCurrentVariantId(settings, globVar) {
		var currentVariantId;
		// if one has been provided... use that one
		if(settings.initialVariant) {
			currentVariantId = settings.initialVariant;
		}

		// else - return the selected_or_first_available_variant from global obj
		else if(globVar["injectedGlobs"]["selected_or_first_available_variant"]) {
			currentVariantId = globVar["injectedGlobs"]["selected_or_first_available_variant"]["id"];
		}

		// else - fall back to disabling variant functionality
		else {
			currentVariantId = null;
		}
		

		return currentVariantId;
	}

	/*
	 * Returns all the thumbnails in the DOM.
	 *
	 */
	function getAllThumbnails() {
		var allThumbnails = $("." + settings.thumbnailDivContainerClass).find("div." + settings.thumbnailDivClass);

		return allThumbnails;
	}

	/*
	 * Are the two src strings equivalent? If they aren't, null is returned.
	 *
	 */
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
		var newUrlShort = extractSrcDimensionsComparator(urlShort);
		var newUrlLong = extractSrcDimensionsComparator(urlLong);

		if(newUrlShort == newUrlLong) {
			return newUrlLong;
		}




		/*
		 * STRATEGY 4: "."
		 * Our last strategy will fall back on breaking up the strings by "."
		 * Only one of the string pieces will have "/", and this is the one we're interested in.
		 *
		 * Ex:
		 * //cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRW-E-RI_FLATUP_1000x1000.progressive.jpg?v=1576817622
		 * We want to extract "com/s/files/1/1213/2366/products/31-V743GRW-E-RI_FLATUP_1000x1000" for comparison.
		 *
		 */
		 var urlShortDotPieces = newUrlShort.split(".");
		 var urlLongDotPieces = newUrlLong.split(".");

		 var fragmentShortToComp = null;
		 var fragmentLongToComp = null;

		 for(var i = 0; i < urlShortDotPieces.length; i++) {
		 	if(urlShortDotPieces[i].indexOf("/") > -1) {
		 		fragmentShortToComp = urlShortDotPieces[i];
		 		break;
		 	}
		}

		if(!fragmentShortToComp) {
		 	return null;
		}

		for(var i = 0; i < urlLongDotPieces.length; i++) {
		 	if(urlLongDotPieces[i].indexOf("/") > -1) {
		 		fragmentLongToComp = urlLongDotPieces[i];
		 		break;
		 	}
		}

		if(!fragmentLongToComp) {
		 	return null;
		}

		if(fragmentShortToComp == fragmentLongToComp) {
			return newUrlLong;
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


		function extractSrcDimensionsComparator(firstUrl) {
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

			var splitAt_Array = firstUrl.split("_");

			if(splitAt_Array.length < 2) {
				// no "_" found!
				return firstUrl;
			}

			var lastMatchWithUnderscore = splitAt_Array[splitAt_Array.length - 1];
			var splitAtXArray = lastMatchWithUnderscore.split("x");
			if(splitAtXArray.length < 2) {
				// no "x" found!
				// try uppercase
				splitAtXArray = lastMatchWithUnderscore.split("X");
				if(splitAtXArray.length < 2) {
					// no "X" found
					return firstUrl;
				}

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
				return firstUrl;
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
			return finalUrl;


		}

	}
	/*
	 * CALLED WHEN WE ARE READY FOR INITIALIZATION OF THUMBNAILS AND MAIN IMAGE.
	 *
	 * Accepts a ThumbnailContainer_Mode{X}, LargeImageContainer, and settings objects
	 *
	 */
	function init(thumbnailContainer, largeImageContainer, settings) {

		// make sure current variant's thumbnail images are visible, and others are hidden
		refreshVisibleThumbnails(thumbnailContainer);

		// select the appropriate thumbnail
		refreshSelectedThumbnail(thumbnailContainer, settings);

		// add large images to the DOM and populate largeImageContainer
		constructLargeImageContainer(largeImageContainer, thumbnailContainer, settings);

		// locate thumbnails and add listeners to bind thumbnails to large images
		bindClickListenersToThumbnails(thumbnailContainer, largeImageContainer, settings);

		// enable arrows
		enableArrows(thumbnailContainer, largeImageContainer, settings);

		  
		/*
		 * Refresh the thumbnails the user sees. It uses the thumbnailContainer to determine the current variant info.
		 * Called upon initilialization or when there is a variant change.
		 * It does assume that there is a 1:1 mapping between the variant div thumbnails and all the thumbnails.
		 * 
		 */
		function refreshVisibleThumbnails(thumbnailContainer) {
			var currentThumbnailList = thumbnailContainer.currentThumbnailList;

			var currentVariantThumbnails = [];
			var currentVariantId = thumbnailContainer.currentVariantId;
			var allVariants = thumbnailContainer.allVariants;

			// make sure all the thumbnails for this variant are visible
			currentThumbnailList.each(function() {
				$(this).css("display", ""); // empty string removes the display property			
			});

			// for mode2, remove the rest
			if(thumbnailContainer instanceof ThumbnailContainer_Mode2) {
				// find thumbnails that should be active for the current variant
				currentVariantThumbnails = thumbnailContainer.currentVariantObject.thumbnaildivs;

				// go through each existing thumbnail and compare it to the variant's thumbnails to determine if it should be hidden
				
				thumbnailContainer.allThumbnails.each(function() {
					var j;
					for(j = 0; j < currentVariantThumbnails.length; j++) {
						if($(this).is(currentVariantThumbnails[j])) {
							break;
						}
					}
					// thumbnail not found in variant's list, so hide
					if(j == currentVariantThumbnails.length) {
						$(this).css("display", "none"); 			
					}		

				});
			}

		}

		    
		/*
		 * Construct the largeImageContainer usings settings and thumbnailContainer to first add the thumbnails as large images.
		 * Called upon initialization or variant change. The entire main image frame is redrawn.
		 */
		function constructLargeImageContainer(largeImageContainer, thumbnailContainer, settings) {
			var mainImageContainerDiv = $("." + settings.mainImageContainerDivClass);
			// clear large image div
			mainImageContainerDiv.empty();

			var currentThumbnails = thumbnailContainer.currentThumbnailList;

		    // for each thumbnail, add main images to image container and populate largeImageContainer
		    var largeImageDiv = null;
		    currentThumbnails.each(function() {
			    var thumbnailImageSrc;
			    var isSelected = false;
			    
			    // get image element
			    thumbnailImageSrc = $(this).children("img").attr("src");
			    if($(this).hasClass(settings.thumbnailDivSelectedClass)) {
			    	isSelected = true;
			    }

			    largeImageDiv = $("<div class='" + (isSelected ? settings.mainImageDivCurrentClass : settings.mainImageDivHiddenClass) + " " + settings.mainImageDivClass +"'><img src='" + thumbnailImageSrc + "'></div>");

			    if(isSelected == true) {
					largeImageContainer.selectedDiv = largeImageDiv;
			    }

			    largeImageContainer.largeImages.push(new LargeImageObject(thumbnailImageSrc, largeImageDiv));
			    mainImageContainerDiv.append(largeImageDiv);

		    });

		    return largeImageContainer;

		}

		/*
		 * Bind all the current thumbnails to their corresponding image.
		 * Called upon initilialization or when there is a variant change.
		 */
		function bindClickListenersToThumbnails(thumbnailContainer, largeImageContainer, settings) {
			var currentThumbnails = thumbnailContainer.currentThumbnailList;

			// mode1, mode3: add all the thumbnails to the largeImageContainer
			currentThumbnails.each(function() {
		     
		    	// find corresponding main image
		     	var tempImg = null;
		     	var corrMainImgObj = null;

		      	for(var k = 0; k < largeImageContainer.largeImages.length; k++) {
			        tempImg = largeImageContainer.largeImages[k];
			        if(tempImg["src"] == $(this).children("img").attr("src")) {
			          corrMainImgObj = tempImg;
			          break;
			        }
			    }

		    	if(!corrMainImgObj) {
		        	throw new Error("Unable to bind to thumbnail: matching image not found");
		    	}
		    	 // remove previous listeners...
		    	$(this).off("click");

		    	$(this).on("click", {thumbnailContainer: thumbnailContainer, largeImageContainer: largeImageContainer, largeImage: corrMainImgObj, thumbnailClicked: this, settings: settings}, thumbnailClickedBehavior);

		    });

		}


		/*
		 * When a thumbnail is clicked, this function gets executed. It updates the productContainer and imageContainer, and sends
		 * both for processing to update the selected thumbnail and the corresponding image.
		 */
		function thumbnailClickedBehavior(event) {
			// stop autoplay
			pauseCarousel();

			var thumbnailClicked = event.data.thumbnailClicked;
			var imageToShow = event.data.largeImage;
			var productContainer = event.data.thumbnailContainer;
			var imageContainer = event.data.largeImageContainer;
			var settings = event.data.settings;

			// update the two main objects: thumbnailContainer, largeImageContainer
			productContainer.currentThumbnailSelected = thumbnailClicked;
			imageContainer.selectedDiv = imageToShow["elementRef"];

			refreshSelectedThumbnail(thumbnailContainer, settings)

			refreshMainImage(imageContainer);
		}

		/*
		 * If provided, configure arrows and bind listeners.
		 *
		 */ 
		function enableArrows(thumbnailContainer, largeImageContainer, settings) {
			var currentThumbnails = thumbnailContainer.currentThumbnailList;

			if(currentThumbnails.length < 2) {
				return;
			}

		    // enable arrows?
		    var forwardArrow = $("#" + settings.idOfForwardArrow);
		    var backwardArrow = $("#" + settings.idOfBackArrow);

		    if(forwardArrow.length != 1 && backwardArrow.length != 1) {
		    	return;
		    }

		    forwardArrow.css("display", "block");
		    backwardArrow.css("display", "block");

		    // remove previous listeners...
		    forwardArrow.off("click");
			backwardArrow.off("click");

		    // listener for foward arrow
		    forwardArrow.on("click", {thumbnailContainer: thumbnailContainer, largeImageContainer: largeImageContainer, settings: settings, isForwardOrBack: "FORWARD"}, arrowClickBehavior);

		    // listener for backward arrow
		    backwardArrow.on("click", {thumbnailContainer: thumbnailContainer, largeImageContainer: largeImageContainer, settings: settings, isForwardOrBack: "BACK"}, arrowClickBehavior);

		}

		/*
		 * When an arrow is clicked, this function gets executed.
		 */
		function arrowClickBehavior(event) {
		    // stop autoplay
		    pauseCarousel();

		    setNextOrPreviousThumbnailAndImage(event.data.thumbnailContainer, event.data.largeImageContainer, event.data.isForwardOrBack);

		    refreshSelectedThumbnail(event.data.thumbnailContainer, event.data.settings);

			refreshMainImage(event.data.largeImageContainer);
		    
		}
		  
	}

	/*
	 * Select the correct thumbnail. It uses the thumbnailContainer to determine the current thumbnail to select.
	 * Called upon initilialization, when there is a variant change, when a thumbnail is clicked/selected.
	 */
	function refreshSelectedThumbnail(thumbnailContainer, settings) {
		var selectedThumbnail = null;
		var thumbnailToSelect = thumbnailContainer.currentThumbnailSelected;
		
		// select/unselect all thumbnails
		thumbnailContainer.allThumbnails.each(function() {
			//console.log($(this));
			if($(this).is(thumbnailToSelect)) {
				$(this).removeClass(settings.thumbnailDivSelectedClass + " " + settings.thumbnailDivUnselectedClass).addClass(settings.thumbnailDivSelectedClass);
			} else {
				$(this).removeClass(settings.thumbnailDivSelectedClass + " " + settings.thumbnailDivUnselectedClass).addClass(settings.thumbnailDivUnselectedClass);
			}
		
		});

	}

	/*
	 * Updates the currentThumbnailSelected property of thumbnailContainer with the new thumbnail, either the "next" or
	 * "previous" from the thumbnailContainer's thumbnail list.
	 *
	 * Also updates the selectedDiv property of largeImageContainer.
	 */
	function setNextOrPreviousThumbnailAndImage(thumbnailContainer, largeImageContainer, isForwardOrBack) {
		// what's the current thumbnail selected?
	    var currentThumbnail = thumbnailContainer.currentThumbnailSelected;
	    var thumbnailDivList = thumbnailContainer.currentThumbnailList;
	    var currentThumbnailPosition = null;
		var newThumbnail = null;

	    for(currentThumbnailPosition = 0; currentThumbnailPosition < thumbnailDivList.length; currentThumbnailPosition++) {
	    	if($(thumbnailDivList[currentThumbnailPosition]).is(currentThumbnail)) {
	    		break;
	    	}
	    }

	    if(currentThumbnailPosition == thumbnailDivList.length) {
	    	throw new Error("Current thumbnail not found in list of thumbnails!");
	    }

	    if(isForwardOrBack == "FORWARD") {
	        // if current is the last on the list...
	        if(currentThumbnailPosition == thumbnailDivList.length - 1) {
	            // next is the first one..
	            newThumbnail = thumbnailDivList[0];
	        } else {
	            newThumbnail = thumbnailDivList[currentThumbnailPosition + 1];
	        }

	    } else if(isForwardOrBack="BACK") {
		    // if current is the first on the list...
		    if(currentThumbnailPosition == 0) {
			    // back is the last one..
			    newThumbnail = thumbnailDivList[thumbnailDivList.length - 1];
	        } else {
	            newThumbnail = thumbnailDivList[currentThumbnailPosition - 1];
	        }
	            
	        	
	    } else {
	        throw new Error("Expected FORWARD or BACK");
	    } 

		thumbnailContainer.currentThumbnailSelected = newThumbnail;

		// set the corresponding selectedDiv in largeImageContainer
	    var corrImageDiv = searchImageContainerForThumbnailMatch(largeImageContainer, newThumbnail);

	    if(!corrImageDiv) {
	      throw new Error("CORRESPONDING Main IMAGE for this thumbnail not found");
	    }

	    largeImageContainer.selectedDiv = corrImageDiv;

	}

	function searchImageContainerForThumbnailMatch(largeImageContainer, thumbnail) {
		var tempMainObj = null;
	    var corrImageDiv = null;

	    for(var i = 0; i < largeImageContainer.largeImages.length; i++) {
	      tempMainObj = largeImageContainer.largeImages[i];
	      
	      if(tempMainObj["src"] == $(thumbnail).children("img").attr("src")) {
	        corrImageDiv = tempMainObj["elementRef"];
	        break;
	      }

	    }

	    return corrImageDiv;
	}


	/*
	 * Takes the imageContainer and uses it to update the large image frame.
	 * Used after the div container is constructed (e.g. thumbnail selected, autoplay, arrow, ...)
	 */
	function refreshMainImage(imageContainer) {
		var newMainImage = imageContainer.selectedDiv;
		var imageObject = null;
		var transientMainImage = null;
		for(var i = 0; i < imageContainer.largeImages.length; i++) {
			transientMainImage = imageContainer.largeImages[i].elementRef;
			if(transientMainImage.is(newMainImage)) {
				transientMainImage.removeClass(settings.mainImageDivHiddenClass).addClass(settings.mainImageDivCurrentClass);
			} else {
				transientMainImage.removeClass(settings.mainImageDivCurrentClass).addClass(settings.mainImageDivHiddenClass);
			}
		}

	}

	function autoplay(thumbnailContainer, largeImageContainer, settings) {
		// shouldn't happen, but check again: only change if there is more than one image
		if(thumbnailContainer.currentThumbnailList.length > 1) {
			setNextOrPreviousThumbnailAndImage(thumbnailContainer, largeImageContainer, "FORWARD");
			refreshSelectedThumbnail(thumbnailContainer, settings);
			refreshMainImage(largeImageContainer);
		}

	}
	
	/*
	 * Stops the carousel.
	 */
	function pauseCarousel() {
		globalVariable.clearInterval(autoplayVar);

	}

	/*
	* Accesses the "global" THUMBNAIL_CONTAINER, LARGE_IMAGE_CONTAINER, and settings to continue the carousel, if applicable
	*/
	function continueCarousel() {
		if(shouldEnableCarousel(settings.autoplay, settings.mode1_mode2_pauseCarouselIfVariantImage, THUMBNAIL_CONTAINER)) {
			autoplayVar = setInterval(function() {
	    							autoplay(THUMBNAIL_CONTAINER, LARGE_IMAGE_CONTAINER, settings);
	    						  }, settings.secondsCarousel);
		}

	}

	/*
	 * Will enable the carousel functionality based on a variety of factors.
	 * The carousel will only activate if the defaultEnable property is set to true.
	 * If the current thumbnails are fewer than 2, the carousel won't active; also if 
	 * we're in modes 1/2 and we're showing the featured variant image (and pauseCarouselIfVariantImage is true).
	 * In any other scenario, it will activate
	 */
	function shouldEnableCarousel(defaultEnable, pauseCarouselIfVariantImage, thumbnailContainer) {
		if(defaultEnable != true) {
			return false;
		}

		if(thumbnailContainer.currentThumbnailList.length < 2){
			return false;
		}

		if(thumbnailContainer instanceof ThumbnailContainer_Mode3) {
			return true;
		}

		var showingVariantImage = thumbnailContainer.currentVariantObject.initializedWithVariantThumbnail;
		if(pauseCarouselIfVariantImage == true && showingVariantImage == true) {
			return false;
		}

		return true;
		
	}

	// begin autoplay
	function enable(thumbnailContainer, largeImageContainer, settings) {
		return setInterval(function() {
	    			autoplay(thumbnailContainer, largeImageContainer, settings);
	    		}, settings.secondsCarousel);

	}


	/*
	 * Refreshes the THUMBNAIL_CONTAINER with the variantObject that has the provided id (if it exists).
	 * For mode 1, it simply selects the appropiate large image from LARGE_IMAGE_CONTAINER and refeshes the DOM.
	 * For mode 2, it gets a fresh copy of LARGE_IMAGE_CONTAINER and calls init() to re-initialize.
	 * For mode 3, it does nothing.
	 *
	 * The carousel is restarted if it meets the criteria.
	 */
	function changeVariant(newVariantId) {
		// disabled...
		if(THUMBNAIL_CONTAINER instanceof ThumbnailContainer_Mode3) {
			return;
		}

		// stop the carousel
		pauseCarousel();

		// update the "global" objects

		// first, find the variant object that has the same id as argument
		var transientVariant;
		var matchingVariantObject;
		for(var i = 0; i < THUMBNAIL_CONTAINER.allVariants.length; i++) {
			transientVariant = THUMBNAIL_CONTAINER.allVariants[i];
			if(transientVariant["variantId"] == newVariantId) {
				matchingVariantObject = transientVariant;
				break;
			}
		}

		if(matchingVariantObject == null) {
			throw new Error("No variant object found for " + newVariantId);
		}

		// update variant container with the new variant object 
		THUMBNAIL_CONTAINER.currentVariantObject = matchingVariantObject;
		THUMBNAIL_CONTAINER.currentThumbnailSelected = matchingVariantObject.defaultThumbnailDiv;

		if(THUMBNAIL_CONTAINER instanceof ThumbnailContainer_Mode1) {
			// current thumbnail list doesn't change
		} else {
			THUMBNAIL_CONTAINER.currentThumbnailList = matchingVariantObject.thumbnaildivs;

		}

		/*
		 * In mode 1, we don't need to redraw and rebind everything...
		 *
		 * - update the large image container after finding the corresponding large image
		 * - "select" the new current thumbnail in the container
		 */
		var largeImageDiv = null;
		if(THUMBNAIL_CONTAINER instanceof ThumbnailContainer_Mode1) {			
			largeImageDiv = searchImageContainerForThumbnailMatch(LARGE_IMAGE_CONTAINER, THUMBNAIL_CONTAINER.currentThumbnailSelected);
			
			if(!largeImageDiv) {
	      		throw new Error("CORRESPONDING Main IMAGE for this thumbnail not found");
	    	}

	    	LARGE_IMAGE_CONTAINER.selectedDiv = largeImageDiv;

	    	refreshSelectedThumbnail(THUMBNAIL_CONTAINER, settings);

			refreshMainImage(LARGE_IMAGE_CONTAINER);
		} else {
			// full restart needed
			LARGE_IMAGE_CONTAINER = new LargeImageContainer();
			init(THUMBNAIL_CONTAINER, LARGE_IMAGE_CONTAINER, settings);
		}


		if(shouldEnableCarousel(settings.autoplay, settings.mode1_mode2_pauseCarouselIfVariantImage, THUMBNAIL_CONTAINER)) {
			autoplayVar = enable(THUMBNAIL_CONTAINER, LARGE_IMAGE_CONTAINER, settings);
		}

	}

	/*
 	 * Provides a fresh set of "global" objects PRODUCT_INFO, THUMBNAIL_CONTAINER, and LARGE_IMAGE_CONTAINER.
 	 * The initialization process is run all over again.
	 */
	function restart() {

		// stop the carousel
		pauseCarousel();


		PRODUCT_INFO = new ProductInfo();

		// get all thumbnail divs
		PRODUCT_INFO.allThumbnailDivs = getAllThumbnails();


		// create the image src mappings: defaultImagesSrc and imageSrcMappings properties 
		processImages(PRODUCT_INFO, globalVariable);

		// determine current mode: "mode1", or "mode2" or "mode3"
		populateModeAndCurrentVariantId(PRODUCT_INFO, settings, globalVariable);


		// a fully populated VariantContainer_Mode{}
		THUMBNAIL_CONTAINER = createParentObject(settings, globalVariable, PRODUCT_INFO);

		LARGE_IMAGE_CONTAINER = new LargeImageContainer();

		init(THUMBNAIL_CONTAINER, LARGE_IMAGE_CONTAINER, settings);

		// will hold interval of autoplay
		var autoplayVar;
		if(shouldEnableCarousel(settings.autoplay, settings.mode1_mode2_pauseCarouselIfVariantImage, THUMBNAIL_CONTAINER)) {
			autoplayVar = enable(THUMBNAIL_CONTAINER, LARGE_IMAGE_CONTAINER, settings);
		}

	}

	return {
		pause: pauseCarousel,
		continue: continueCarousel,
		changeVariant: changeVariant,
		restart: restart
	};


})(window);
