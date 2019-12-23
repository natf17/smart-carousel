# Testing

The following scenarios must be tested:
1. Multiple variants, some have pictures
2. Multiple variants, none have pictures
3. 1 variant - has picture
4. 1 variant - has no picture



Setup
1. Save all thumbnails provided via liquid in "allThumbnails"

2. With every variant id, we want a list of the corresponding image urls and whether the image urls contain a variant image, or if they're default. This is saved as an array in "variantIdImagesArray" (see getVariantIdsAndImagesFromProduct())

3. *MODE2*  Obtain all the thumbnails that correspond to unassigned (default) images and save them in "defaultThumbnailDivs" (see getDefaultThumbnailDivs)

4. *MODE2*  For every variant id, use the image srcs to pick out the corresponding thumbnail divs, and save this in an array in "productAllThumbnailDivs" (see getProductAllThumbNailDivs())

5. Obtain the current thumbnail divs that correspond to the current variant id and save them in "thumbnailDivs" (see getCurrentThumbnailDivs())

6. *MODE2* Determine if the current variant selected only contains default images, and save this in "showingDefaultImagesOnly" (see willBeShowingDefaultImagesOnly())

7. *MODE1* Determine if any of the variants have images, and save this in "showingDefaultImagesOnly" (see doVariantsHaveImages())

8. *MODE2* Hide all the thumbnails that don't correspond to currently selected variannt (see hideOtherThumbnails())

9. *MODE2* Make sure all the thumbnails corresponding to current variant are displayed, and either select the variant image or the first thumbnail that appears (see showCurrentThumbnails())

The selectedVariantImage holds a boolean - whether the current variant selected's thumbnail was found and selected, or if it defaulted to selecting the first image

Initialize - init()
1. Make sure the main image container is empty (see clearMainImageContainer())
2. Again make sure one thumbnail is selected, and all the thumbnails in "thumbnailDivs" (current variant thumbnails) to the main image container (see setup()).
3. Populate an array of ImageObject, where each correspodns to an image in the large. The array is saved in the variable "imagesInventory" (see findMain())
4. To each thumbail div, add a listener so that when it's clicked, the carousel stops, and the main image is refreshed
5. Add arrow functionality (see enableArrows())





problems/inefficiennces... we keep calling synchronizepaths() - see selectCurrentVariant...