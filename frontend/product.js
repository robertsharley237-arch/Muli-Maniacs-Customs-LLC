// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: product.js
// PUBLIC PRODUCT DETAILS PAGE
//
// Frontend: Vercel
// Backend: Express on Vercel
// Database: Neon PostgreSQL
// Cart: Browser localStorage
// ============================================================

(function () {

  "use strict";


  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var CART_STORAGE_KEY =
    "cart";


  var REQUEST_TIMEOUT_MILLISECONDS =
    15000;


  var currentProduct =
    null;


  var selectedVariant =
    null;



  // ==========================================================
  // ELEMENT HELPER
  // ==========================================================

  function getElement(
    elementId
  ) {

    return document.getElementById(
      elementId
    );

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





  // ==========================================================
  // FETCH WITH TIMEOUT
  // ==========================================================

  async function fetchWithTimeout(
    url,
    options
  ) {


    var controller =
      new AbortController();


    var timeoutIdentifier =
      window.setTimeout(
        function () {

          controller.abort();

        },
        REQUEST_TIMEOUT_MILLISECONDS
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
        timeoutIdentifier
      );


    }


  }





  // ==========================================================
  // RESPONSE READER
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


    } catch(error) {


      return {

        error:
          responseText

      };


    }


  }





  function getErrorMessage(
    value,
    fallbackMessage
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
          fallbackMessage
        );


      }


    }



    return fallbackMessage;


  }





  // ==========================================================
  // NUMBER HELPERS
  // ==========================================================


  function normalizeMoney(
    value
  ) {


    var amount =
      Number(value);



    if (

      !Number.isFinite(
        amount
      )

    ) {


      return 0;


    }



    return Math.max(
      0,
      Math.round(
        amount * 100
      ) / 100
    );


  }





  function normalizeWholeNumber(
    value
  ) {


    var number =
      Number(value);



    if (

      !Number.isFinite(
        number
      )

    ) {


      return 0;


    }



    return Math.max(
      0,
      Math.floor(number)
    );


  }





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

      normalizeMoney(value)

    );


  }





  // ==========================================================
  // PRODUCT ID FROM URL
  // ==========================================================

  function getProductIdFromUrl() {


    var searchParameters =
      new URLSearchParams(
        window.location.search
      );



    return String(

      searchParameters.get(
        "id"
      )

      ||

      searchParameters.get(
        "productId"
      )

      ||

      ""

    ).trim();


  }





  // ==========================================================
  // PRODUCT NORMALIZATION
  // ==========================================================


  function normalizeVariant(
    variant,
    variantIndex
  ) {


    var sourceVariant =
      variant &&

      typeof variant ===
        "object"

        ? variant

        : {};



    return {


      id:

        String(

          sourceVariant.id

          ||

          sourceVariant._id

          ||

          (
            "variant-" +
            variantIndex
          )

        ),



      index:
        variantIndex,



      name:

        String(

          sourceVariant.name

          ||

          (
            "Variant " +
            (
              variantIndex + 1
            )
          )

        ).trim(),



      sku:

        String(
          sourceVariant.sku ||
          ""
        ),



      price:

        normalizeMoney(
          sourceVariant.price
        ),



      stock:

        normalizeWholeNumber(
          sourceVariant.stock
        ),



      image:

        String(
          sourceVariant.image ||
          ""
        )


    };


  }





  function normalizeProduct(
    product
  ) {


    var sourceProduct =
      product &&

      typeof product ===
        "object"

        ? product

        : {};



    var variants =
      Array.isArray(
        sourceProduct.variants
      )

      ?

      sourceProduct.variants.map(
        normalizeVariant
      )

      :

      [];



    return {


      id:

        String(

          sourceProduct.id

          ||

          sourceProduct._id

          ||

          ""

        ),



      name:

        String(

          sourceProduct.name

          ||

          "Unnamed Product"

        ),



      sku:

        String(
          sourceProduct.sku ||
          ""
        ),



      description:

        String(
          sourceProduct.description ||
          ""
        ),



      category:

        String(
          sourceProduct.category ||
          "General"
        ),



      price:

        normalizeMoney(
          sourceProduct.price
        ),



      stock:

        normalizeWholeNumber(
          sourceProduct.stock
        ),



      image:

        String(
          sourceProduct.image ||
          ""
        ),



      variants:
        variants


    };


  }
    // ==========================================================
  // PRODUCT NORMALIZATION CONTINUED
  // ==========================================================

  function normalizeProduct(product) {

    var sourceProduct =
      product &&
      typeof product === "object"
        ? product
        : {};

    var rawVariants =
      Array.isArray(sourceProduct.variants)
        ? sourceProduct.variants
        : [];

    return {

      id:
        String(
          sourceProduct.id ||
          sourceProduct._id ||
          ""
        ),

      name:
        String(
          sourceProduct.name ||
          "Unnamed Product"
        ).trim(),

      sku:
        String(
          sourceProduct.sku ||
          "N/A"
        ).trim(),

      description:
        String(
          sourceProduct.description ||
          "No description available."
        ).trim(),

      category:
        String(
          sourceProduct.category ||
          "General"
        ).trim(),

      image:
        String(
          sourceProduct.image ||
          sourceProduct.imageUrl ||
          "images/mmc-logo.png"
        ).trim(),

      price:
        normalizeMoney(
          sourceProduct.price
        ),

      inventory:
        normalizeWholeNumber(
          sourceProduct.inventory ??
          sourceProduct.stock ??
          0
        ),

      variants:
        rawVariants.map(
          normalizeVariant
        )
    };
  }


  // ==========================================================
  // PAGE ELEMENTS
  // ==========================================================

  function setText(
    elementId,
    value
  ) {

    var element =
      getElement(elementId);

    if (!element) {
      return;
    }

    element.textContent =
      value;
  }


  function setProductImage(
    imageUrl,
    altText
  ) {

    var container =
      getElement(
        "product-image-container"
      );

    if (!container) {
      return;
    }


    container.innerHTML = "";


    var image =
      document.createElement(
        "img"
      );


    image.className =
      "product-image";


    image.src =
      imageUrl ||
      "images/mmc-logo.png";


    image.alt =
      altText ||
      "Multi-Maniacs Customs product";


    image.loading =
      "lazy";


    image.onerror =
      function () {

        image.src =
          "images/mmc-logo.png";

      };


    container.appendChild(
      image
    );
  }



  // ==========================================================
  // DISPLAY PRODUCT
  // ==========================================================

  function displayProduct(
    product
  ) {

    currentProduct =
      normalizeProduct(
        product
      );


    setText(
      "productName",
      currentProduct.name
    );


    setText(
      "productSku",
      currentProduct.sku
    );


    setText(
      "productPrice",
      formatCurrency(
        currentProduct.price
      )
    );


    setText(
      "productCategory",
      currentProduct.category
    );


    setText(
      "productDescription",
      currentProduct.description
    );


    setProductImage(
      currentProduct.image,
      currentProduct.name
    );


    setupVariants();


    updateStockDisplay();


    updateAddButton();

  }



  // ==========================================================
  // VARIANT HANDLING
  // ==========================================================

  function setupVariants(){

    var variantField =
      getElement(
        "variantField"
      );


    var variantSelect =
      getElement(
        "variantSelect"
      );


    if (
      !variantField ||
      !variantSelect
    ){
      return;
    }


    variantSelect.innerHTML =
      "";


    if (
      !currentProduct ||
      currentProduct.variants.length === 0
    ){

      variantField.hidden =
        true;


      selectedVariant =
        null;


      return;

    }


    variantField.hidden =
      false;


    currentProduct.variants.forEach(
      function(
        variant
      ){

        var option =
          document.createElement(
            "option"
          );


        option.value =
          variant.id;


        option.textContent =
          variant.name +
          " - " +
          formatCurrency(
            variant.price
          );


        variantSelect.appendChild(
          option
        );

      }
    );


    selectedVariant =
      currentProduct.variants[0];


    variantSelect.value =
      selectedVariant.id;



    variantSelect.addEventListener(
      "change",
      function(){

        selectedVariant =
          currentProduct.variants.find(
            function(
              item
            ){

              return (
                item.id ===
                variantSelect.value
              );

            }
          )
          ||
          null;


        updateStockDisplay();

        updateAddButton();

      }
    );

  }
  // ==========================================================
// STOCK DISPLAY
// ==========================================================

function getCurrentInventory() {

  if (
    selectedVariant &&
    selectedVariant.inventory !== undefined
  ) {

    return normalizeWholeNumber(
      selectedVariant.inventory
    );

  }


  if (!currentProduct) {

    return 0;

  }


  return normalizeWholeNumber(
    currentProduct.inventory
  );

}



function updateStockDisplay() {

  var stockDisplay =
    getElement(
      "stockDisplay"
    );


  if (!stockDisplay) {

    return;

  }


  var stock =
    getCurrentInventory();


  stockDisplay.className =
    "stock-display";


  if (stock <= 0) {

    stockDisplay.textContent =
      "Currently unavailable";


    stockDisplay.classList.add(
      "stock-empty"
    );


    return;

  }


  if (stock <= 5) {

    stockDisplay.textContent =
      "Low stock: " +
      stock +
      " available";


    stockDisplay.classList.add(
      "stock-low"
    );


    return;

  }


  stockDisplay.textContent =
    "Available: " +
    stock +
    " in stock";


  stockDisplay.classList.add(
    "stock-available"
  );

}



// ==========================================================
// ADD BUTTON STATE
// ==========================================================

function updateAddButton() {

  var button =
    getElement(
      "addToCartButton"
    );


  if (!button) {

    return;

  }


  var stock =
    getCurrentInventory();


  if (
    !currentProduct ||
    stock <= 0
  ) {

    button.disabled =
      true;


    button.textContent =
      "Unavailable";


    return;

  }


  button.disabled =
    false;


  button.textContent =
    "Add To Cart";

}



// ==========================================================
// QUANTITY VALIDATION
// ==========================================================

function getQuantity() {

  var quantityInput =
    getElement(
      "productQuantity"
    );


  if (!quantityInput) {

    return 1;

  }


  var quantity =
    normalizeWholeNumber(
      quantityInput.value
    );


  return Math.max(
    1,
    quantity
  );

}



// ==========================================================
// CART STORAGE
// ==========================================================

function getCart() {

  try {

    var savedCart =
      localStorage.getItem(
        CART_STORAGE_KEY
      );


    if (!savedCart) {

      return [];

    }


    var parsedCart =
      JSON.parse(
        savedCart
      );


    return Array.isArray(
      parsedCart
    )
      ? parsedCart
      : [];


  } catch(error) {

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


}



function addProductToCart() {

  if (
    !currentProduct
  ) {

    return;

  }


  var quantity =
    getQuantity();


  var stock =
    getCurrentInventory();


  if (
    quantity > stock
  ) {

    showMessage(
      "Requested quantity exceeds available inventory.",
      "error"
    );

    return;

  }



  var cart =
    getCart();



  var variantName =
    selectedVariant
      ? selectedVariant.name
      : "";



  var cartId =
    currentProduct.id +
    "-" +
    (
      selectedVariant
        ? selectedVariant.id
        : "default"
    );



  var existingItem =
    cart.find(
      function(item){

        return (
          item.cartId ===
          cartId
        );

      }
    );



  if(existingItem){

    existingItem.quantity +=
      quantity;

  } else {


    cart.push({

      cartId:
        cartId,


      id:
        currentProduct.id,


      name:
        currentProduct.name,


      sku:
        currentProduct.sku,


      image:
        currentProduct.image,


      price:
        selectedVariant
          ? selectedVariant.price
          : currentProduct.price,


      variant:
        variantName,


      quantity:
        quantity

    });


  }



  saveCart(
    cart
  );



  showMessage(
    "Product added to cart!",
    "success"
  );



  updateCartCount();

}



// ==========================================================
// MESSAGE DISPLAY
// ==========================================================

function showMessage(
  message,
  type
){

  var element =
    getElement(
      "productMessage"
    );


  if(!element){

    return;

  }


  element.textContent =
    message;


  element.className =
    "product-message";


  if(type){

    element.classList.add(
      "product-" + type
    );

  }

}
// ==========================================================
// LOAD PRODUCT FROM BACKEND
// ==========================================================

async function loadProduct() {

  var productId =
    getProductIdFromUrl();


  if (!productId) {

    showMessage(
      "No product ID was provided.",
      "error"
    );


    setText(
      "productName",
      "Product Not Found"
    );


    return;

  }



  try {


    var response =
      await fetchWithTimeout(
        BACKEND_URL +
        "/api/products/" +
        encodeURIComponent(
          productId
        )
      );



    var data =
      await readResponse(
        response
      );



    if (!response.ok) {

      throw new Error(
        getErrorMessage(
          data,
          "Unable to load product."
        )
      );

    }



    var product =
      data.product ||
      data;



    displayProduct(
      product
    );



    showMessage(
      "Product loaded successfully.",
      "information"
    );



  } catch(error) {


    console.error(
      "Product loading error:",
      error
    );



    setText(
      "productName",
      "Product Unavailable"
    );



    showMessage(
      getErrorMessage(
        error.message,
        "Unable to load product."
      ),
      "error"
    );

  }

}



// ==========================================================
// CART COUNT UPDATE
// ==========================================================

function updateCartCount(){

  var badge =
    document.querySelector(
      "[data-cart-count]"
    );


  if(!badge){

    return;

  }



  var cart =
    getCart();



  var total =
    cart.reduce(
      function(
        count,
        item
      ){

        return (
          count +
          normalizeWholeNumber(
            item.quantity
          )
        );

      },
      0
    );



  badge.textContent =
    String(
      total
    );


  badge.setAttribute(
    "aria-label",
    total +
    " items in cart"
  );

}



// ==========================================================
// EVENT LISTENERS
// ==========================================================

function setupEvents(){


  var button =
    getElement(
      "addToCartButton"
    );



  if(button){

    button.addEventListener(
      "click",
      function(){

        addProductToCart();

      }
    );

  }



  var quantityInput =
    getElement(
      "productQuantity"
    );



  if(quantityInput){

    quantityInput.addEventListener(
      "change",
      function(){

        var value =
          getQuantity();


        quantityInput.value =
          value;


      }
    );

  }


}



// ==========================================================
// PAGE STARTUP
// ==========================================================

function initializeProductPage(){


  setupEvents();


  updateCartCount();


  loadProduct();


}



// ==========================================================
// WAIT FOR PAGE LOAD
// ==========================================================

if(
  document.readyState ===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    initializeProductPage
  );

} else {


  initializeProductPage();


}



})();