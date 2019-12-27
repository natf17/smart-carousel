# Testing

The tests were done with "mode1" = true. Check out the html pages for a live test:

- CarouselTest_1.html: With 1 variant, no featured image, product has multiple images
- CarouselTest_2.html: With 1 variant, has featured image, product has multiple images
Expected: With one variant, the carousel always runs, and doesn't select the variant's featured image.

- CarouselTest_3.html: With multiple variants, none have featured image, product has multiple
- CarouselTest_4.html: With multiple variants, some have featured image, product has multiple

Open each page, then change "mode1" to false and "mode2" to true and repeat.

Sample urls to test the synchronizePaths() function:

Strings in the product's "images" array:

0: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRW-E-RI_FLATUP.jpg?v=1576817622"
1: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRW-E-RI.jpg?v=1576817622"
2: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRW-E-RI_ANGLE.jpg?v=1576817622"
3: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743_GRW_-E-RI_FLAT_UP.jpg?v=1576817622"
4: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRY-E-RI_FLATUP.jpg?v=1576817622"
5: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRY-E-RI_ANGLE.jpg?v=1576817622"
6: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRY-E-RI.jpg?v=1576817622"
7: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRR-E-RI_FLATUP.jpg?v=1576817622"
8: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRR-E-RI_ANGLE.jpg?v=1576817622"
9: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRR-E-RI.jpg?v=1576817622"
10: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743_GRR_-E-RI_FLAT_UP.jpg?v=1576817622"
11: "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743_GRY_-E-RI_FLAT_U

A sample variant image source:
//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRW-E-RI_FLATUP_1000x1000.progressive.jpg?v=1576817622

In the Image_Checker_Test.html console, you can do:

```
imageChecker.areEqual("//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRW-E-RI_FLATUP.jpg?v=1576817622", "//cdn.shopify.com/s/files/1/1213/2366/products/31-V743GRW-E-RI_FLATUP_1000x1000.progressive.jpg?v=1576817622");
```