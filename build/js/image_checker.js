var imageChecker = (function carouselImageChecker(globalVariable) {
	
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

		


	

		console.log("synchronizeImagePaths: comparing ....." + thumbnailImgSrc + "  ------  " + objectImgSrc);

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
				console.log("MATCH - same size");
				return thumbnailImgSrc;
			} else {
				console.log("No MATCH - not same size");
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

		console.log("long: " + urlLong);
		console.log("short: " + urlShort);




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

		console.log("long: " + urlLong);
		console.log("short: " + urlShort);


		// if same size... must be equal
		if(urlLong.length == urlShort.length) {
			if(stringSameLengthComparator(urlLong, urlShort)) {
				// same size
				console.log("MATCH - same size after .jpg strategy");
				return thumbnailImgSrc;
			} else {
				console.log(" NO MATCH - same size after .jpg strategy, but not equal");
				return null;
			}

		}



		console.log(".jpg strategy INCONCLUSIVE")



		/*
		** STRATEGY 3: 1000x1000
		** Last strategy:find string that has dimensions (e.g. 100x100)
		        - remove them from string
				- compare strings...
				- if either contains the other, return the one with dimensions
				- else return false
		*/


		var urlToBeReturned = extractSrcDimensionsComparator(urlShort, urlLong);

		console.log(urlToBeReturned);

		if(urlToBeReturned) {
			console.log("Match - dimensions strategy");
			return urlToBeReturned;
		}

		urlToBeReturned = extractSrcDimensionsComparator(urlLong, urlShort);

		if(urlToBeReturned) {
			console.log("Match - dimensions strategy");
			return urlToBeReturned;
		}

		// no match found!!
		console.log("NO MATCH - strategies exhausted");
		return null;


		function stringSameLengthComparator(arg1, arg2) {
			// arguments must be of same size!
			if(arg1.length == arg2.length) {
				if(arg1 == arg2) {
					//console.log("Equal length - match");
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
				console.log("Equal size!");
				return null;
			}

			var tempUrl;
			if(secondUrl.length > firstUrl.length) {
				tempUrl = firstUrl;
				firstUrl = secondUrl;
				secondUrl = tempUrl;

				console.log("New urls: " + firstUrl);
				console.log("secondUrl: " + secondUrl);

			}


			var splitAt_Array = firstUrl.split("_");

			if(splitAt_Array.length < 2) {
				// no "_" found!
				console.log("No _");
				return null;
			}



			var lastMatchWithUnderscore = splitAt_Array[splitAt_Array.length - 1];
			console.log(lastMatchWithUnderscore);
			var splitAtXArray = lastMatchWithUnderscore.split("x");
			if(splitAtXArray.length < 2) {
				// no "x" found!
				console.log("No x");
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

			console.log(fg_to_array);
			console.log(sg_to_array);
			console.log(lastChar_fg);
			console.log(firstChar_sg);


			if($.isNumeric(lastChar_fg) && $.isNumeric(firstChar_sg)) {


				// determine how many numbers are at the end of fg
				for(var i = fg_to_array.length - 1; i >= 0; i--) {
					console.log(fg_to_array[i]);
					if($.isNumeric(fg_to_array[i])) {
						console.log("true");
						numberSize_fg++;
					} else {
						// first non numeric character... break
						console.log("false");
						break;
					}
				}

				// determine how many numbers are at the start of sg
				for(var i = 0; i < sg_to_array.length; i++) {
					if($.isNumeric(sg_to_array[i])) {
						console.log(sg_to_array[i]);
						console.log("true");
						numberSize_sg++;
					} else {
						// first non numeric character... break
						console.log("false");
						break;
					}
				}

			} else {
				// no dimension found at end..
				return null;
			}

			console.log(numberSize_fg);
			console.log(numberSize_sg);


			// add elements from first
			var finalUrl = [];
			var fg_noDimensions = fg.substr(-1 * numberSize_fg, fg.length - numberSize_fg); // wer1000
			var sg_noDimensions = sg.substr(numberSize_sg); //1000wer

			console.log(fg);
			console.log(sg);

			console.log(fg_noDimensions);
			console.log(sg_noDimensions);

			
			console.log(splitAt_Array);
			// put together pieces that were split by _ excluding the last group
			for(var i = 0; i < splitAt_Array.length - 1; i++) {
				if(i != 0) {
					finalUrl.push("_");
				}
				finalUrl.push(splitAt_Array[i]);
			}


			// add pieces that were split by 'x', excluding the last group (which includes the dimensions)
			console.log(splitAtXArray);
			for(var i = 0; i < splitAtXArray.length - 2; i++) {
				if(i != 0) {
					finalUrl.push("x");
				}
				finalUrl.push(splitAtXArray[i]); // ["wer", "x", ""wefs"]

			}
			console.log(finalUrl);

			// add pieces surrounding dimensions in the last group (eg. excf from ex100x100cf)
			// push fg and lg, without dimension characters
			finalUrl.push(fg_noDimensions);
			finalUrl.push(sg_noDimensions);

			console.log(finalUrl);


			finalUrl = finalUrl.join('');

			console.log(finalUrl);
			
			// STEP 10


			if(secondUrl == finalUrl) {
				// return url with size
				return firstUrl; 

			} else {
				return null;
			}

		}


	}


	return {
		areEqual: synchronizeImagePaths
	};

	

})(window);














