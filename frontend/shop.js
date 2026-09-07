// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: shop.js
// PUBLIC SHOP PAGE
//
// Frontend: Vercel
// Backend: Express on Vercel
// Database: Neon PostgreSQL
// ============================================================

(function () {

  "use strict";


  // ==========================================================
  // CONFIGURATION
  // ==========================================================


  var REQUEST_TIMEOUT_MS =
    15000;


  var CART_STORAGE_KEY =
    "cart";


  var shopProducts =
    [];


  var storeOpen =
    true;



  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================


  function getElement(
    elementId
  ) {

    return document.getElementById(
      elementId
    );

  }

  function createElement(
    tagName,
    className,
    text
  ) {

    var element =
      document.createElement(
        tagName
      );


    if (className) {

      element.className =
        className;

    }


    if (
      text !== undefined &&
      text !== null
    ) {

      element.textContent =
        String(text);

    }


    return element;

  }



  // ==========================================================
  // BACKEND URL
  // ==========================================================


  function removeTrailingSlashes(
    value
  ) {

    return String(value || "")
      .trim()
      .replace(
        /\/+$/,
        ""
      );

  }



  function getBackendUrl() {


    if (

      typeof window.MMC_BACKEND_URL ===
        "string"

      &&

      window.MMC_BACKEND_URL.trim()

    ) {

      return removeTrailingSlashes(
        window.MMC_BACKEND_URL
      );

    }



    if (

      window.location.hostname ===
        "localhost"

      ||

      window.location.hostname ===
        "127.0.0.1"

    ) {


      return "http://localhost:10000";


    }



    return removeTrailingSlashes(
      window.location.origin
    );


  }



  var BACKEND_URL =
    getBackendUrl();



  var PRODUCTS_URL =
    BACKEND_URL +
    "/products";



  var SETTINGS_URL =
    BACKEND_URL +
    "/settings";





  // ==========================================================
  // FETCH WITH TIMEOUT
  // ==========================================================


  async function fetchWithTimeout(
    url,
    options
  ) {


    var controller =
      new AbortController();



    var timeoutId =
      window.setTimeout(

        function () {

          controller.abort();

        },

        REQUEST_TIMEOUT_MS

      );



    try {


      return await fetch(

        url,

        Object.assign(

          {},

          options || {},

          {

            signal:
              controller.signal

          }

        )

      );


    } finally {


      window.clearTimeout(
        timeoutId
      );


    }


  }





  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================


  async function readResponse(
    response
  ) {


    var responseText =
      await response.text();



    if (!responseText) {

      return {};

    }



    try {


      return JSON.parse(
        responseText
      );


    } catch (error) {


      return {

        error:
          responseText

      };


    }


  }





  function getErrorMessage(
    value,
    fallback
  ) {


    if (

      typeof value ===
        "string"

      &&

      value.trim()

    ) {


      return value.trim();


    }



    if (

      value

      &&

      typeof value ===
        "object"

    ) {



      if (

        typeof value.message ===
          "string"

        &&

        value.message.trim()

      ) {


        return value.message.trim();


      }




      if (
        value.error !==
        undefined
      ) {


        return getErrorMessage(

          value.error,

          fallback

        );


      }


    }



    return fallback;


  }





  // ==========================================================
  // SHOP MESSAGES
  // ==========================================================


  function showMessage(
    message,
    messageType
  ) {


    var messageBox =
      getElement(
        "shop-message"
      );



    if (!messageBox) {

      return;

    }



    messageBox.textContent =
      String(message || "");




    messageBox.classList.remove(

      "shop-error",

      "shop-success",

      "shop-information"

    );



    messageBox.removeAttribute(
      "role"
    );



    if (!message) {

      return;

    }




    if (

      messageType ===
      "success"

    ) {


      messageBox.classList.add(
        "shop-success"
      );


      messageBox.setAttribute(

        "role",

        "status"

      );



    } else if (

      messageType ===
      "information"

    ) {


      messageBox.classList.add(
        "shop-information"
      );


      messageBox.setAttribute(

        "role",

        "status"

      );



    } else {


      messageBox.classList.add(
        "shop-error"
      );


      messageBox.setAttribute(

        "role",

        "alert"

      );


    }


  }
  // ==========================================================
  // NUMBER HELPERS
  // ==========================================================


  function toMoney(
    value
  ) {

    var number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {

      return 0;

    }


    return Math.max(
      0,
      number
    );

  }




  function toStock(
    value
  ) {

    var number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {

      return 0;

    }


    return Math.max(
      0,
      Math.floor(number)
    );

  }





  // ==========================================================
  // PRODUCT NORMALIZATION
  // ==========================================================


  function normalizeVariant(
    variant,
    variantIndex
  ) {


    var source =
      variant &&
      typeof variant ===
        "object"

        ? variant

        : {};



    return {


      id:

        String(

          source.id ||

          source._id ||

          (
            "variant-" +
            variantIndex
          )

        ),



      index:

        variantIndex,



      name:

        String(

          source.name ||

          (
            "Variant " +
            (
              variantIndex +
              1
            )
          )

        ),



      sku:

        String(

          source.sku ||

          ""

        ),



      price:

        toMoney(

          source.price

        ),



      stock:

        toStock(

          source.stock

        ),



      image:

        String(

          source.image ||

          ""

        )

    };


  }





  function normalizeProduct(
    product
  ) {


    var source =

      product &&

      typeof product ===
        "object"

        ? product

        : {};



    var variants =

      Array.isArray(
        source.variants
      )

        ? source.variants

        : [];



    return {


      id:

        String(

          source.id ||

          source._id ||

          ""

        ),



      name:

        String(

          source.name ||

          "Unnamed Product"

        ),



      sku:

        String(

          source.sku ||

          ""

        ),



      description:

        String(

          source.description ||

          ""

        ),



      category:

        String(

          source.category ||

          source.categoryName ||

          "General"

        ),



      price:

        toMoney(

          source.price

        ),



      stock:

        toStock(

          source.stock

        ),



      image:

        String(

          source.image ||

          ""

        ),



      active:

        source.active !==
        false,



      variants:

        variants.map(

          normalizeVariant

        )

    };


  }





  // ==========================================================
  // CURRENCY
  // ==========================================================


  function formatCurrency(
    value
  ) {


    return new Intl.NumberFormat(

      "en-US",

      {

        style:
          "currency",


        currency:
          "USD"

      }

    ).format(

      toMoney(value)

    );


  }





  // ==========================================================
  // PRODUCT AVAILABILITY
  // ==========================================================


  function getAvailableVariants(
    product
  ) {


    return product.variants.filter(

      function (
        variant
      ) {


        return variant.stock > 0;


      }

    );


  }





  function isProductAvailable(
    product
  ) {


    if (

      product.variants.length >

      0

    ) {


      return (

        getAvailableVariants(

          product

        ).length > 0

      );


    }



    return product.stock > 0;


  }





  // ==========================================================
  // PRODUCT PRICING
  // ==========================================================


  function getStartingPrice(
    product
  ) {


    var availableVariants =

      getAvailableVariants(

        product

      );



    if (

      availableVariants.length ===

      0

    ) {


      return product.price;


    }



    return Math.min.apply(

      null,

      availableVariants.map(

        function (
          variant
        ) {


          return variant.price;


        }

      )

    );


  }





  function getPriceText(
    product
  ) {


    var availableVariants =

      getAvailableVariants(

        product

      );



    if (

      availableVariants.length ===

      0

    ) {


      return formatCurrency(

        product.price

      );


    }



    var prices =

      availableVariants.map(

        function (
          variant
        ) {


          return variant.price;


        }

      );



    var minimumPrice =

      Math.min.apply(

        null,

        prices

      );



    var maximumPrice =

      Math.max.apply(

        null,

        prices

      );



    if (

      minimumPrice ===

      maximumPrice

    ) {


      return formatCurrency(

        minimumPrice

      );


    }



    return (

      "From " +

      formatCurrency(

        minimumPrice

      )

    );


  }
    // ==========================================================
  // PRODUCT IMAGE
  // ==========================================================


  function getDisplayImage(
    product
  ) {


    if (
      product.image
    ) {

      return product.image;

    }



    var variantWithImage =

      product.variants.find(

        function (
          variant
        ) {


          return Boolean(

            variant.image

          );


        }

      );



    return variantWithImage

      ? variantWithImage.image

      : "";

  }





  function createProductImage(
    product
  ) {


    var imageContainer =

      createElement(

        "div",

        "product-image-container"

      );



    var imageUrl =

      getDisplayImage(

        product

      );



    if (
      !imageUrl
    ) {


      imageContainer.appendChild(

        createElement(

          "div",

          "product-image-placeholder",

          "No product image"

        )

      );


      return imageContainer;


    }



    var image =

      document.createElement(

        "img"

      );



    image.className =

      "product-image";



    image.src =

      imageUrl;



    image.alt =

      product.name;



    image.loading =

      "lazy";



    image.addEventListener(

      "error",

      function () {


        imageContainer.replaceChildren(

          createElement(

            "div",

            "product-image-placeholder",

            "Image unavailable"

          )

        );


      }

    );



    imageContainer.appendChild(

      image

    );



    return imageContainer;


  }





  // ==========================================================
  // STOCK DISPLAY
  // ==========================================================


  function getStockDisplay(
    product
  ) {


    if (

      product.variants.length >

      0

    ) {


      var availableCount =

        getAvailableVariants(

          product

        ).length;



      if (

        availableCount ===

        0

      ) {


        return {


          text:

            "Out of stock",



          className:

            "product-stock stock-unavailable"


        };


      }



      return {


        text:

          availableCount === 1

            ? "1 variant available"

            :

              availableCount +

              " variants available",



        className:

          "product-stock stock-available"


      };


    }



    if (

      product.stock <= 0

    ) {


      return {


        text:

          "Out of stock",



        className:

          "product-stock stock-unavailable"


      };


    }



    if (

      product.stock <= 5

    ) {


      return {


        text:

          "Only " +

          product.stock +

          " available",



        className:

          "product-stock stock-low"


      };


    }



    return {


      text:

        "In stock: " +

        product.stock,



      className:

        "product-stock stock-available"


    };


  }





  // ==========================================================
  // CART STORAGE
  // ==========================================================


  function loadCart() {


    try {


      var savedCart =

        localStorage.getItem(

          CART_STORAGE_KEY

        );



      var parsedCart =

        JSON.parse(

          savedCart ||

          "[]"

        );



      return Array.isArray(

        parsedCart

      )

        ? parsedCart

        : [];



    } catch (
      error
    ) {


      console.error(

        "The cart could not be loaded.",

        error

      );



      return [];


    }


  }





  function saveCart(
    cart
  ) {


    localStorage.setItem(

      CART_STORAGE_KEY,

      JSON.stringify(

        cart

      )

    );



    document.dispatchEvent(

      new CustomEvent(

        "cartUpdated",

        {

          detail: {

            cart:

              cart

          }

        }

      )

    );



    window.dispatchEvent(

      new CustomEvent(

        "mmc-cart-updated",

        {

          detail: {

            cart:

              cart

          }

        }

      )

    );


  }





  // ==========================================================
  // ADD SIMPLE PRODUCT TO CART
  // ==========================================================


  function addSimpleProductToCart(
    product
  ) {


    var cart =

      loadCart();



    var existingItem =

      cart.find(

        function (
          item
        ) {


          return (

            String(

              item.productId ||

              item.id ||

              ""

            ) ===

            product.id


            &&


            (

              item.variantIndex === null

              ||

              item.variantIndex === undefined

            )

          );


        }

      );



    if (
      existingItem
    ) {


      var existingQuantity =

        toStock(

          existingItem.quantity ||

          1

        );



      if (

        existingQuantity + 1 >

        product.stock

      ) {


        throw new Error(

          "The available stock is already in your cart."

        );


      }



      existingItem.quantity =

        existingQuantity + 1;



    } else {


      cart.push({


        id:

          product.id,



        productId:

          product.id,



        name:

          product.name,



        sku:

          product.sku,



        price:

          product.price,



        image:

          getDisplayImage(

            product

          ),



        quantity:

          1,



        variantId:

          "",



        variantIndex:

          null,



        variantName:

          ""


      });


    }



    saveCart(

      cart

    );


  }
    // ==========================================================
  // PRODUCT IMAGE
  // ==========================================================


  function getDisplayImage(
    product
  ) {


    if (
      product.image
    ) {

      return product.image;

    }



    var variantWithImage =

      product.variants.find(

        function (
          variant
        ) {


          return Boolean(

            variant.image

          );


        }

      );



    return variantWithImage

      ? variantWithImage.image

      : "";

  }





  function createProductImage(
    product
  ) {


    var imageContainer =

      createElement(

        "div",

        "product-image-container"

      );



    var imageUrl =

      getDisplayImage(

        product

      );



    if (
      !imageUrl
    ) {


      imageContainer.appendChild(

        createElement(

          "div",

          "product-image-placeholder",

          "No product image"

        )

      );


      return imageContainer;


    }



    var image =

      document.createElement(

        "img"

      );



    image.className =

      "product-image";



    image.src =

      imageUrl;



    image.alt =

      product.name;



    image.loading =

      "lazy";



    image.addEventListener(

      "error",

      function () {


        imageContainer.replaceChildren(

          createElement(

            "div",

            "product-image-placeholder",

            "Image unavailable"

          )

        );


      }

    );



    imageContainer.appendChild(

      image

    );



    return imageContainer;


  }





  // ==========================================================
  // STOCK DISPLAY
  // ==========================================================


  function getStockDisplay(
    product
  ) {


    if (

      product.variants.length >

      0

    ) {


      var availableCount =

        getAvailableVariants(

          product

        ).length;



      if (

        availableCount ===

        0

      ) {


        return {


          text:

            "Out of stock",



          className:

            "product-stock stock-unavailable"


        };


      }



      return {


        text:

          availableCount === 1

            ? "1 variant available"

            :

              availableCount +

              " variants available",



        className:

          "product-stock stock-available"


      };


    }



    if (

      product.stock <= 0

    ) {


      return {


        text:

          "Out of stock",



        className:

          "product-stock stock-unavailable"


      };


    }



    if (

      product.stock <= 5

    ) {


      return {


        text:

          "Only " +

          product.stock +

          " available",



        className:

          "product-stock stock-low"


      };


    }



    return {


      text:

        "In stock: " +

        product.stock,



      className:

        "product-stock stock-available"


    };


  }





  // ==========================================================
  // CART STORAGE
  // ==========================================================


  function loadCart() {


    try {


      var savedCart =

        localStorage.getItem(

          CART_STORAGE_KEY

        );



      var parsedCart =

        JSON.parse(

          savedCart ||

          "[]"

        );



      return Array.isArray(

        parsedCart

      )

        ? parsedCart

        : [];



    } catch (
      error
    ) {


      console.error(

        "The cart could not be loaded.",

        error

      );



      return [];


    }


  }





  function saveCart(
    cart
  ) {


    localStorage.setItem(

      CART_STORAGE_KEY,

      JSON.stringify(

        cart

      )

    );



    document.dispatchEvent(

      new CustomEvent(

        "cartUpdated",

        {

          detail: {

            cart:

              cart

          }

        }

      )

    );



    window.dispatchEvent(

      new CustomEvent(

        "mmc-cart-updated",

        {

          detail: {

            cart:

              cart

          }

        }

      )

    );


  }





  // ==========================================================
  // ADD SIMPLE PRODUCT TO CART
  // ==========================================================


  function addSimpleProductToCart(
    product
  ) {


    var cart =

      loadCart();



    var existingItem =

      cart.find(

        function (
          item
        ) {


          return (

            String(

              item.productId ||

              item.id ||

              ""

            ) ===

            product.id


            &&


            (

              item.variantIndex === null

              ||

              item.variantIndex === undefined

            )

          );


        }

      );



    if (
      existingItem
    ) {


      var existingQuantity =

        toStock(

          existingItem.quantity ||

          1

        );



      if (

        existingQuantity + 1 >

        product.stock

      ) {


        throw new Error(

          "The available stock is already in your cart."

        );


      }



      existingItem.quantity =

        existingQuantity + 1;



    } else {


      cart.push({


        id:

          product.id,



        productId:

          product.id,



        name:

          product.name,



        sku:

          product.sku,



        price:

          product.price,



        image:

          getDisplayImage(

            product

          ),



        quantity:

          1,



        variantId:

          "",



        variantIndex:

          null,



        variantName:

          ""


      });


    }



    saveCart(

      cart

    );


  }
    // ==========================================================
  // GLOBAL SUPPORT FUNCTIONS
  // ==========================================================

  window.loadShopProducts = loadProducts;

  window.renderShopProducts = renderProducts;


  // ==========================================================
  // CART UPDATE LISTENER
  // ==========================================================

  window.addEventListener(
    "mmc-cart-updated",
    function () {
      console.log(
        "MMC cart updated."
      );
    }
  );


  // ==========================================================
  // START APPLICATION
  // ==========================================================

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeShop
    );

  } else {

    initializeShop();

  }


})();