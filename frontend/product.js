// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: Product.js
// PUBLIC PRODUCT DETAILS PAGE
//
// Hosting: Vercel
// Database: Neon PostgreSQL through the Express backend
// Cart: Browser localStorage
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var CART_STORAGE_KEY =
    "cart";

  var BACKEND_URL_STORAGE_KEY =
    "MMC_BACKEND_URL";

  var REQUEST_TIMEOUT_MILLISECONDS =
    15000;

  var currentProduct =
    null;

  var selectedVariant =
    null;

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
    /*
     * The production backend URL should normally be assigned by
     * config.js before this file loads.
     */

    if (
      typeof window.MMC_BACKEND_URL ===
        "string" &&
      window.MMC_BACKEND_URL.trim()
    ) {
      return removeTrailingSlashes(
        window.MMC_BACKEND_URL
      );
    }

    /*
     * Allow a manually saved Codespaces or development URL.
     */

    var savedBackendUrl =
      localStorage.getItem(
        BACKEND_URL_STORAGE_KEY
      );

    if (
      typeof savedBackendUrl ===
        "string" &&
      savedBackendUrl.trim()
    ) {
      return removeTrailingSlashes(
        savedBackendUrl
      );
    }

    /*
     * Local frontend development normally uses port 3000 while
     * the Express backend uses port 10000.
     */

    if (
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1"
    ) {
      return (
        window.location.protocol +
        "//" +
        window.location.hostname +
        ":10000"
      );
    }

    /*
     * Same-domain fallback.
     */

    return removeTrailingSlashes(
      window.location.origin
    );
  }

  var BACKEND_URL =
    getBackendUrl();

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

  function getFirstAvailableElement(
    elementIds
  ) {
    var selectedElement =
      null;

    elementIds.some(
      function (elementId) {
        var element =
          getElement(
            elementId
          );

        if (element) {
          selectedElement =
            element;

          return true;
        }

        return false;
      }
    );

    return selectedElement;
  }

  function setElementText(
    elementIds,
    value
  ) {
    var element =
      getFirstAvailableElement(
        elementIds
      );

    if (!element) {
      return;
    }

    element.textContent =
      value === undefined ||
      value === null
        ? ""
        : String(value);
  }

  function getProductNameElement() {
    return getFirstAvailableElement([
      "productName",
      "product-name"
    ]);
  }

  function getProductDescriptionElement() {
    return getFirstAvailableElement([
      "productDescription",
      "product-description"
    ]);
  }

  function getProductImageElement() {
    return getFirstAvailableElement([
      "productImage",
      "product-image"
    ]);
  }

  function getProductPriceElement() {
    return getFirstAvailableElement([
      "productPrice",
      "product-price"
    ]);
  }

  function getProductSkuElement() {
    return getFirstAvailableElement([
      "productSku",
      "product-sku"
    ]);
  }

  function getStockDisplayElement() {
    return getFirstAvailableElement([
      "stockDisplay",
      "stock-display"
    ]);
  }

  function getVariantSelect() {
    return getFirstAvailableElement([
      "variantSelect",
      "variant-select"
    ]);
  }

  function getVariantField() {
    return getFirstAvailableElement([
      "variantField",
      "variant-field"
    ]);
  }

  function getQuantityInput() {
    return getFirstAvailableElement([
      "productQuantity",
      "product-quantity",
      "quantity"
    ]);
  }

  function getAddToCartButton() {
    return getFirstAvailableElement([
      "addToCartButton",
      "add-to-cart-button"
    ]);
  }

  function getProductMessageElement() {
    return getFirstAvailableElement([
      "productMessage",
      "product-message"
    ]);
  }

  // ==========================================================
  // CURRENCY FORMATTING
  // ==========================================================

  function formatCurrency(
    value
  ) {
    var amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
      amount = 0;
    }

    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          "USD"
      }
    ).format(amount);
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
      !Number.isFinite(amount)
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
  // PRODUCT MESSAGE
  // ==========================================================

  function clearProductMessage() {
    var messageElement =
      getProductMessageElement();

    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      "";

    messageElement.classList.remove(
      "product-error",
      "product-success",
      "product-information"
    );

    messageElement.removeAttribute(
      "role"
    );
  }

  function showProductMessage(
    message,
    messageType
  ) {
    var normalizedMessage =
      String(message || "");

    var messageElement =
      getProductMessageElement();

    if (!messageElement) {
      if (
        messageType ===
        "error"
      ) {
        console.error(
          normalizedMessage
        );
      } else {
        console.log(
          normalizedMessage
        );
      }

      return;
    }

    messageElement.textContent =
      normalizedMessage;

    messageElement.classList.remove(
      "product-error",
      "product-success",
      "product-information"
    );

    if (!normalizedMessage) {
      messageElement.removeAttribute(
        "role"
      );

      return;
    }

    if (
      messageType ===
      "success"
    ) {
      messageElement.classList.add(
        "product-success"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else if (
      messageType ===
      "information"
    ) {
      messageElement.classList.add(
        "product-information"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else {
      messageElement.classList.add(
        "product-error"
      );

      messageElement.setAttribute(
        "role",
        "alert"
      );
    }
  }

  // ==========================================================
  // REQUEST WITH TIMEOUT
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
  // SERVER RESPONSE
  // ==========================================================

  async function readResponse(
    response
  ) {
    var responseText =
      "";

    try {
      responseText =
        await response.text();
    } catch (error) {
      return {
        error:
          "The server response could not be read."
      };
    }

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

  function getResponseErrorMessage(
    responseData,
    fallbackMessage
  ) {
    if (
      responseData &&
      typeof responseData.error ===
        "string" &&
      responseData.error.trim()
    ) {
      return responseData.error;
    }

    if (
      responseData &&
      responseData.error &&
      typeof responseData.error.message ===
        "string"
    ) {
      return responseData.error.message;
    }

    if (
      responseData &&
      typeof responseData.message ===
        "string" &&
      responseData.message.trim()
    ) {
      return responseData.message;
    }

    return fallbackMessage;
  }

  // ==========================================================
  // PRODUCT ID
  // ==========================================================

  function getProductIdFromUrl() {
    var searchParameters =
      new URLSearchParams(
        window.location.search
      );

    return String(
      searchParameters.get(
        "id"
      ) ||
      searchParameters.get(
        "productId"
      ) ||
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

    var variantIdentifier =
      String(
        sourceVariant.id ||
        sourceVariant._id ||
        (
          "variant-" +
          variantIndex
        )
      );

    return {
      id:
        variantIdentifier,

      _id:
        variantIdentifier,

      index:
        variantIndex,

      name:
        String(
          sourceVariant.name ||
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
    productData
  ) {
    var sourceProduct =
      productData &&
      typeof productData ===
        "object"
        ? productData
        : {};

    var productIdentifier =
      String(
        sourceProduct.id ||
        sourceProduct._id ||
        ""
      );

    var rawVariants =
      Array.isArray(
        sourceProduct.variants
      )
        ? sourceProduct.variants
        : [];

    return {
      id:
        productIdentifier,

      _id:
        productIdentifier,

      name:
        String(
          sourceProduct.name ||
          "Custom Product"
        ),

      description:
        String(
          sourceProduct.description ||
          ""
        ),

      image:
        String(
          sourceProduct.image ||
          ""
        ),

      price:
        normalizeMoney(
          sourceProduct.price
        ),

      sku:
        String(
          sourceProduct.sku ||
          ""
        ),

      stock:
        normalizeWholeNumber(
          sourceProduct.stock
        ),

      active:
        sourceProduct.active !==
        false,

      variants:
        rawVariants.map(
          normalizeVariant
        )
    };
  }

  // ==========================================================
  // LOAD PRODUCT
  // ==========================================================

  async function loadProduct(
    productId
  ) {
    var normalizedProductId =
      String(productId || "")
        .trim();

    if (!normalizedProductId) {
      showProductMessage(
        "A product ID was not included in the page address.",
        "error"
      );

      setAddToCartButtonState();

      return;
    }

    try {
      showProductMessage(
        "Loading product information...",
        "information"
      );

      var response =
        await fetchWithTimeout(
          BACKEND_URL +
          "/products/" +
          encodeURIComponent(
            normalizedProductId
          ),
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      var responseData =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(
            responseData,
            "The product could not be loaded."
          )
        );
      }

      /*
       * The current ProductRoutes.js returns:
       *
       * {
       *   "product": { ... }
       * }
       *
       * The fallback supports an older direct-product response.
       */

      currentProduct =
        normalizeProduct(
          responseData.product ||
          responseData
        );

      if (!currentProduct.id) {
        throw new Error(
          "The backend returned incomplete product information."
        );
      }

      selectedVariant =
        null;

      renderProduct();
      renderVariants();
      setAddToCartButtonState();
      clearProductMessage();
    } catch (error) {
      console.error(
        "Product loading failed:",
        error
      );

      currentProduct =
        null;

      selectedVariant =
        null;

      var errorMessage =
        error &&
        error.name ===
          "AbortError"
          ? "The product request took too long. Please try again."
          : (
              error &&
              error.message
                ? error.message
                : "The product could not be loaded."
            );

      showProductMessage(
        errorMessage,
        "error"
      );

      setAddToCartButtonState();
    }
  }

  // ==========================================================
  // RENDER PRODUCT
  // ==========================================================

  function renderProduct() {
    if (!currentProduct) {
      return;
    }

    var nameElement =
      getProductNameElement();

    var descriptionElement =
      getProductDescriptionElement();

    var imageElement =
      getProductImageElement();

    var priceElement =
      getProductPriceElement();

    var skuElement =
      getProductSkuElement();

    if (nameElement) {
      nameElement.textContent =
        currentProduct.name;
    }

    if (descriptionElement) {
      descriptionElement.textContent =
        currentProduct.description;
    }

    if (imageElement) {
      imageElement.src =
        currentProduct.image;

      imageElement.alt =
        currentProduct.name;
    }

    if (priceElement) {
      priceElement.textContent =
        formatCurrency(
          currentProduct.price
        );
    }

    if (skuElement) {
      skuElement.textContent =
        currentProduct.sku ||
        "Not available";
    }

    updateStockDisplay(
      currentProduct.stock
    );
  }

  // ==========================================================
  // VARIANT SELECTOR
  // ==========================================================

  function createVariantOption(
    value,
    text
  ) {
    var option =
      document.createElement(
        "option"
      );

    option.value =
      String(value);

    option.textContent =
      String(text);

    return option;
  }

  function renderVariants() {
    var variantSelect =
      getVariantSelect();

    var variantField =
      getVariantField();

    if (!variantSelect) {
      return;
    }

    variantSelect.replaceChildren();

    if (
      !currentProduct ||
      currentProduct.variants.length ===
        0
    ) {
      variantSelect.appendChild(
        createVariantOption(
          "",
          "No variants available"
        )
      );

      variantSelect.disabled =
        true;

      if (variantField) {
        variantField.hidden =
          true;
      }

      return;
    }

    variantSelect.appendChild(
      createVariantOption(
        "",
        "Select a variant..."
      )
    );

    currentProduct.variants.forEach(
      function (variant) {
        var optionText =
          variant.name +
          " | " +
          formatCurrency(
            variant.price
          );

        if (variant.sku) {
          optionText +=
            " | " +
            variant.sku;
        }

        if (variant.stock === 0) {
          optionText +=
            " | Out of stock";
        } else {
          optionText +=
            " | Stock: " +
            variant.stock;
        }

        var option =
          createVariantOption(
            variant.index,
            optionText
          );

        option.disabled =
          variant.stock === 0;

        variantSelect.appendChild(
          option
        );
      }
    );

    variantSelect.disabled =
      false;

    if (variantField) {
      variantField.hidden =
        false;
    }
  }

  function findVariantByIndex(
    variantIndex
  ) {
    if (!currentProduct) {
      return null;
    }

    return (
      currentProduct.variants.find(
        function (variant) {
          return (
            variant.index ===
            variantIndex
          );
        }
      ) ||
      null
    );
  }

  function handleVariantChange() {
    var variantSelect =
      getVariantSelect();

    if (
      !variantSelect ||
      !currentProduct
    ) {
      return;
    }

    clearProductMessage();

    if (
      variantSelect.value ===
      ""
    ) {
      selectedVariant =
        null;

      renderProduct();
      setAddToCartButtonState();

      return;
    }

    var selectedIndex =
      Number(
        variantSelect.value
      );

    selectedVariant =
      findVariantByIndex(
        selectedIndex
      );

    if (!selectedVariant) {
      showProductMessage(
        "The selected product variant could not be found.",
        "error"
      );

      renderProduct();
      setAddToCartButtonState();

      return;
    }

    var imageElement =
      getProductImageElement();

    var priceElement =
      getProductPriceElement();

    var skuElement =
      getProductSkuElement();

    if (priceElement) {
      priceElement.textContent =
        formatCurrency(
          selectedVariant.price
        );
    }

    if (skuElement) {
      skuElement.textContent =
        selectedVariant.sku ||
        currentProduct.sku ||
        "Not available";
    }

    if (imageElement) {
      imageElement.src =
        selectedVariant.image ||
        currentProduct.image;

      imageElement.alt =
        currentProduct.name +
        " - " +
        selectedVariant.name;
    }

    updateStockDisplay(
      selectedVariant.stock
    );

    setAddToCartButtonState();
  }

  // ==========================================================
  // STOCK DISPLAY
  // ==========================================================

  function updateStockDisplay(
    stock
  ) {
    var stockDisplay =
      getStockDisplayElement();

    if (!stockDisplay) {
      return;
    }

    var normalizedStock =
      normalizeWholeNumber(
        stock
      );

    stockDisplay.classList.remove(
      "stock-normal",
      "stock-low",
      "stock-empty"
    );

    if (normalizedStock === 0) {
      stockDisplay.textContent =
        "Out of stock";

      stockDisplay.classList.add(
        "stock-empty"
      );

      return;
    }

    stockDisplay.textContent =
      "In stock: " +
      normalizedStock;

    if (normalizedStock <= 5) {
      stockDisplay.classList.add(
        "stock-low"
      );
    } else {
      stockDisplay.classList.add(
        "stock-normal"
      );
    }
  }

  // ==========================================================
  // QUANTITY
  // ==========================================================

  function getRequestedQuantity() {
    var quantityInput =
      getQuantityInput();

    if (!quantityInput) {
      return 1;
    }

    var quantity =
      Number(
        quantityInput.value
      );

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      showProductMessage(
        "Quantity must be a whole number of 1 or higher.",
        "error"
      );

      quantityInput.focus();

      return null;
    }

    return quantity;
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
    } catch (error) {
      console.error(
        "The shopping cart could not be loaded:",
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

    if (
      typeof window.renderCart ===
      "function"
    ) {
      window.renderCart();
    }
  }

  // ==========================================================
  // CART ITEM MATCHING
  // ==========================================================

  function cartItemMatches(
    cartItem,
    productId,
    variantIndex
  ) {
    var cartProductId =
      String(
        cartItem.productId ||
        cartItem.id ||
        ""
      );

    var cartVariantIndex =
      cartItem.variantIndex;

    if (
      cartVariantIndex ===
        undefined ||
      cartVariantIndex ===
        null ||
      cartVariantIndex ===
        ""
    ) {
      cartVariantIndex =
        null;
    } else {
      cartVariantIndex =
        Number(
          cartVariantIndex
        );
    }

    return (
      cartProductId ===
        String(productId) &&
      cartVariantIndex ===
        variantIndex
    );
  }

  // ==========================================================
  // ADD TO CART
  // ==========================================================

  function addToCart() {
    if (!currentProduct) {
      showProductMessage(
        "The product is not available yet.",
        "error"
      );

      return;
    }

    if (
      currentProduct.variants.length >
        0 &&
      !selectedVariant
    ) {
      showProductMessage(
        "Select a product variant before adding this item to your cart.",
        "error"
      );

      var variantSelect =
        getVariantSelect();

      if (variantSelect) {
        variantSelect.focus();
      }

      return;
    }

    var quantity =
      getRequestedQuantity();

    if (quantity === null) {
      return;
    }

    var availableStock =
      selectedVariant
        ? selectedVariant.stock
        : currentProduct.stock;

    if (availableStock <= 0) {
      showProductMessage(
        "This product selection is currently out of stock.",
        "error"
      );

      return;
    }

    if (quantity > availableStock) {
      showProductMessage(
        "Only " +
        availableStock +
        " item(s) are currently available.",
        "error"
      );

      return;
    }

    var variantIndex =
      selectedVariant
        ? selectedVariant.index
        : null;

    var cart =
      loadCart();

    var existingCartItem =
      cart.find(
        function (cartItem) {
          return cartItemMatches(
            cartItem,
            currentProduct.id,
            variantIndex
          );
        }
      );

    if (existingCartItem) {
      var existingQuantity =
        normalizeWholeNumber(
          existingCartItem.quantity ||
          1
        );

      var combinedQuantity =
        existingQuantity +
        quantity;

      if (
        combinedQuantity >
        availableStock
      ) {
        showProductMessage(
          "Your cart already contains this selection. Adding that quantity would exceed the available stock.",
          "error"
        );

        return;
      }

      existingCartItem.quantity =
        combinedQuantity;
    } else {
      cart.push({
        id:
          currentProduct.id,

        productId:
          currentProduct.id,

        name:
          currentProduct.name,

        price:
          selectedVariant
            ? selectedVariant.price
            : currentProduct.price,

        sku:
          selectedVariant
            ? selectedVariant.sku
            : currentProduct.sku,

        image:
          selectedVariant &&
          selectedVariant.image
            ? selectedVariant.image
            : currentProduct.image,

        quantity:
          quantity,

        variantIndex:
          variantIndex,

        variantId:
          selectedVariant
            ? selectedVariant.id
            : "",

        variantName:
          selectedVariant
            ? selectedVariant.name
            : ""
      });
    }

    saveCart(
      cart
    );

    showProductMessage(
      currentProduct.name +
      (
        selectedVariant
          ? " - " +
            selectedVariant.name
          : ""
      ) +
      " was added to your cart.",
      "success"
    );

    setAddToCartButtonState();
  }

  // ==========================================================
  // ADD-TO-CART BUTTON STATE
  // ==========================================================

  function setAddToCartButtonState() {
    var addToCartButton =
      getAddToCartButton();

    if (!addToCartButton) {
      return;
    }

    if (!currentProduct) {
      addToCartButton.disabled =
        true;

      addToCartButton.textContent =
        "Product Unavailable";

      return;
    }

    if (
      currentProduct.variants.length >
        0 &&
      !selectedVariant
    ) {
      addToCartButton.disabled =
        false;

      addToCartButton.textContent =
        "Select a Variant";
      
      return;
    }

    var availableStock =
      selectedVariant
        ? selectedVariant.stock
        : currentProduct.stock;

    if (availableStock <= 0) {
      addToCartButton.disabled =
        true;

      addToCartButton.textContent =
        "Out of Stock";

      return;
    }

    addToCartButton.disabled =
      false;

    addToCartButton.textContent =
      "Add to Cart";
  }

  // ==========================================================
  // PAGE INITIALIZATION
  // ==========================================================

  function initializeProductPage() {
    var variantSelect =
      getVariantSelect();

    var addToCartButton =
      getAddToCartButton();

    if (variantSelect) {
      variantSelect.addEventListener(
        "change",
        handleVariantChange
      );
    }

    if (addToCartButton) {
      addToCartButton.addEventListener(
        "click",
        addToCart
      );
    }

    setAddToCartButtonState();

    var productId =
      getProductIdFromUrl();

    loadProduct(
      productId
    );

    console.log(
      "MMC product page initialized."
    );

    console.log(
      "Product backend URL:",
      BACKEND_URL
    );
  }

  // ==========================================================
  // STARTUP
  // ==========================================================

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeProductPage
    );
  } else {
    initializeProductPage();
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.loadProduct =
    loadProduct;

  window.addToCart =
    addToCart;
}());