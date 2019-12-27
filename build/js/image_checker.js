var imageChecker = (function carouselImageChecker(globalVariable) {
	
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

		console.log(newUrlShort);
		console.log(newUrlLong);

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



	return {
		areEqual: synchronizeImagePaths
	};

	

})(window);














