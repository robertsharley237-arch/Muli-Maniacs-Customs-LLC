// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: cart.js
// CART, SAVED ITEMS, INVENTORY, AND CHECKOUT
// SECTION 1 OF 2
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var CART_STORAGE_KEY =
    "cart";

  var SAVED_STORAGE_KEY =
    "savedForLater";

  var REQUEST_TIMEOUT_MS =
    15000;

  var cartItems =
    readStoredArray(
      CART_STORAGE_KEY
    );

  var savedItems =
    readStoredArray(
      SAVED_STORAGE_KEY
    );

  var taxRate =
    0;

  var checkoutInProgress =
    false;

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
        "string" &&
      window.MMC_BACKEND_URL.trim()
    ) {
      return removeTrailingSlashes(
        window.MMC_BACKEND_URL
      );
    }

    if (
      window.location.hostname ===
        "localhost" ||
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

  var CHECKOUT_URL =
    BACKEND_URL +
    "/create-checkout-session";

  // ==========================================================
  // LOCAL STORAGE
  // ==========================================================

  function readStoredArray(
    storageKey
  ) {
    try {
      var storedValue =
        localStorage.getItem(
          storageKey
        );

      var parsedValue =
        JSON.parse(
          storedValue ||
          "[]"
        );

      return Array.isArray(
        parsedValue
      )
        ? parsedValue
        : [];
    } catch (error) {
      console.error(
        "Could not read " +
        storageKey +
        ".",
        error
      );

      return [];
    }
  }

  function saveCartData() {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(
          cartItems
        )
      );

      localStorage.setItem(
        SAVED_STORAGE_KEY,
        JSON.stringify(
          savedItems
        )
      );
    } catch (error) {
      console.error(
        "The cart could not be saved.",
        error
      );

      showCartMessage(
        "The cart could not be saved in this browser.",
        "error"
      );

      return false;
    }

    updateCartBadge();
    dispatchCartUpdate();

    return true;
  }

  // ==========================================================
  // NUMBER HELPERS
  // ==========================================================

  function normalizeMoney(
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
      Math.round(
        number * 100
      ) / 100
    );
  }

  function normalizeWholeNumber(
    value,
    minimum
  ) {
    var number =
      Number(value);

    if (
      !Number.isFinite(number)
    ) {
      return minimum;
    }

    return Math.max(
      minimum,
      Math.floor(number)
    );
  }

  function normalizeVariantIndex(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    var variantIndex =
      Number(value);

    if (
      Number.isInteger(
        variantIndex
      ) &&
      variantIndex >= 0
    ) {
      return variantIndex;
    }

    return null;
  }

  // ==========================================================
  // CART ITEM NORMALIZATION
  // ==========================================================

  function normalizeCartItem(
    item
  ) {
    var source =
      item &&
      typeof item ===
        "object"
        ? item
        : {};

    var productId =
      String(
        source.productId ||
        source.product_id ||
        source.id ||
        source._id ||
        ""
      );

    return {
      id:
        productId,

      productId:
        productId,

      name:
        String(
          source.name ||
          "Product"
        ),

      price:
        normalizeMoney(
          source.price
        ),

      sku:
        String(
          source.sku ||
          ""
        ),

      image:
        String(
          source.image ||
          ""
        ),

      variantIndex:
        normalizeVariantIndex(
          source.variantIndex
        ),

      variantId:
        String(
          source.variantId ||
          source.variant_id ||
          ""
        ),

      variantName:
        String(
          source.variantName ||
          source.variant_name ||
          ""
        ),

      quantity:
        normalizeWholeNumber(
          source.quantity,
          1
        ),

      stock:
        normalizeWholeNumber(
          source.stock,
          0
        )
    };
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

      price:
        normalizeMoney(
          source.price
        ),

      sku:
        String(
          source.sku ||
          ""
        ),

      image:
        String(
          source.image ||
          ""
        ),

      stock:
        normalizeWholeNumber(
          source.stock,
          0
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
          "Product"
        ),

      price:
        normalizeMoney(
          source.price
        ),

      sku:
        String(
          source.sku ||
          ""
        ),

      image:
        String(
          source.image ||
          ""
        ),

      stock:
        normalizeWholeNumber(
          source.stock,
          0
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
  // CART ITEM KEY
  // ==========================================================

  function getCartItemKey(
    item
  ) {
    var normalized =
      normalizeCartItem(
        item
      );

    return (
      normalized.productId +
      "::" +
      (
        normalized.variantIndex ===
          null
          ? "base"
          : normalized.variantIndex
      )
    );
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
      normalizeMoney(value)
    );
  }

  // ==========================================================
  // ERROR MESSAGE
  // ==========================================================

  function normalizeErrorMessage(
    value,
    fallbackMessage
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {
      if (
        typeof value.message ===
          "string" &&
        value.message.trim()
      ) {
        return value.message.trim();
      }

      if (
        value.error !==
        undefined
      ) {
        return normalizeErrorMessage(
          value.error,
          fallbackMessage
        );
      }
    }

    return fallbackMessage;
  }

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
        timeoutIdentifier
      );
    }
  }

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

  // ==========================================================
  // CART MESSAGES
  // ==========================================================

  function showCartMessage(
    message,
    messageType
  ) {
    var messageBox =
      getElement(
        "cart-message"
      );

    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      String(message || "");

    messageBox.classList.remove(
      "cart-error",
      "cart-success",
      "cart-information"
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
        "cart-success"
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
        "cart-information"
      );

      messageBox.setAttribute(
        "role",
        "status"
      );
    } else {
      messageBox.classList.add(
        "cart-error"
      );

      messageBox.setAttribute(
        "role",
        "alert"
      );
    }
  }

  // ==========================================================
  // CART BADGE
  // ==========================================================

  function getCartQuantity() {
    return cartItems.reduce(
      function (
        total,
        item
      ) {
        return (
          total +
          normalizeCartItem(
            item
          ).quantity
        );
      },
      0
    );
  }

  function updateCartBadge() {
    var itemCount =
      getCartQuantity();

    var accessibleLabel =
      itemCount === 1
        ? "1 item in cart"
        : (
            itemCount +
            " items in cart"
          );

    var badges =
      document.querySelectorAll(
        "#cart-count, " +
        "[data-cart-count]"
      );

    badges.forEach(
      function (badge) {
        badge.textContent =
          String(
            itemCount
          );

        badge.setAttribute(
          "aria-label",
          accessibleLabel
        );
      }
    );
  }

  function dispatchCartUpdate() {
    var eventDetails = {
      cart:
        cartItems.slice(),

      savedItems:
        savedItems.slice()
    };

    document.dispatchEvent(
      new CustomEvent(
        "cartUpdated",
        {
          detail:
            eventDetails
        }
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "mmc-cart-updated",
        {
          detail:
            eventDetails
        }
      )
    );
  }

  // ==========================================================
  // FETCH PRODUCT
  // ==========================================================

  async function fetchProduct(
    productId
  ) {
    var normalizedProductId =
      String(productId || "")
        .trim();

    if (!normalizedProductId) {
      throw new Error(
        "A valid product ID is required."
      );
    }

    var response =
      await fetchWithTimeout(
        PRODUCTS_URL +
        "/" +
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
        normalizeErrorMessage(
          responseData.error ||
          responseData.message ||
          responseData,
          "The product could not be loaded."
        )
      );
    }

    return normalizeProduct(
      responseData.product ||
      responseData
    );
  }

  // ==========================================================
  // ADD TO CART
  // ==========================================================

  async function addToCart(
    productId,
    variantIndex
  ) {
    try {
      var product =
        await fetchProduct(
          productId
        );

      var normalizedVariantIndex =
        normalizeVariantIndex(
          variantIndex
        );

      if (
        !product.id ||
        !product.active
      ) {
        throw new Error(
          "This product is not currently available."
        );
      }

      var variant =
        normalizedVariantIndex ===
          null
          ? null
          : (
              product.variants[
                normalizedVariantIndex
              ] ||
              null
            );

      if (
        normalizedVariantIndex !==
          null &&
        !variant
      ) {
        throw new Error(
          "The selected product variant could not be found."
        );
      }

      if (
        product.variants.length >
          0 &&
        normalizedVariantIndex ===
          null
      ) {
        throw new Error(
          "Select a product variant before adding this item."
        );
      }

      var availableStock =
        variant
          ? variant.stock
          : product.stock;

      if (
        availableStock <= 0
      ) {
        throw new Error(
          "This item is out of stock."
        );
      }

      var newItem = {
        id:
          product.id,

        productId:
          product.id,

        name:
          product.name,

        price:
          variant
            ? variant.price
            : product.price,

        sku:
          variant
            ? variant.sku
            : product.sku,

        image:
          variant &&
          variant.image
            ? variant.image
            : product.image,

        variantIndex:
          normalizedVariantIndex,

        variantId:
          variant
            ? variant.id
            : "",

        variantName:
          variant
            ? variant.name
            : "",

        quantity:
          1,

        stock:
          availableStock
      };

      var itemKey =
        getCartItemKey(
          newItem
        );

      var existingItem =
        cartItems.find(
          function (item) {
            return (
              getCartItemKey(
                item
              ) ===
              itemKey
            );
          }
        );

      if (existingItem) {
        var existingQuantity =
          normalizeCartItem(
            existingItem
          ).quantity;

        if (
          existingQuantity >=
          availableStock
        ) {
          throw new Error(
            "You already have the maximum available quantity in your cart."
          );
        }

        existingItem.quantity =
          existingQuantity +
          1;

        existingItem.stock =
          availableStock;
      } else {
        cartItems.push(
          newItem
        );
      }

      saveCartData();
      renderCart();

      showCartMessage(
        product.name +
        " was added to your cart.",
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Add to cart failed.",
        error
      );

      showCartMessage(
        normalizeErrorMessage(
          error,
          "The item could not be added to your cart."
        ),
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // REMOVE FROM CART
  // ==========================================================

  function removeFromCart(
    index
  ) {
    if (
      index < 0 ||
      index >= cartItems.length
    ) {
      return;
    }

    cartItems.splice(
      index,
      1
    );

    saveCartData();
    renderCart();

    showCartMessage(
      "Item removed from your cart.",
      "information"
    );
  }

  // ==========================================================
  // SAVE FOR LATER
  // ==========================================================

  function moveToSaved(
    index
  ) {
    if (
      index < 0 ||
      index >= cartItems.length
    ) {
      return;
    }

    var movingItem =
      normalizeCartItem(
        cartItems[index]
      );

    var existingItem =
      savedItems.find(
        function (item) {
          return (
            getCartItemKey(
              item
            ) ===
            getCartItemKey(
              movingItem
            )
          );
        }
      );

    if (existingItem) {
      existingItem.quantity =
        normalizeCartItem(
          existingItem
        ).quantity +
        movingItem.quantity;
    } else {
      savedItems.push(
        movingItem
      );
    }

    cartItems.splice(
      index,
      1
    );

    saveCartData();
    renderCart();

    showCartMessage(
      "Item saved for later.",
      "success"
    );
  }

  // ==========================================================
  // MOVE SAVED ITEM BACK TO CART
  // ==========================================================

  function moveBackToCart(
    index
  ) {
    if (
      index < 0 ||
      index >= savedItems.length
    ) {
      return;
    }

    var movingItem =
      normalizeCartItem(
        savedItems[index]
      );

    var existingItem =
      cartItems.find(
        function (item) {
          return (
            getCartItemKey(
              item
            ) ===
            getCartItemKey(
              movingItem
            )
          );
        }
      );

    if (existingItem) {
      var combinedQuantity =
        normalizeCartItem(
          existingItem
        ).quantity +
        movingItem.quantity;

      if (
        movingItem.stock > 0
      ) {
        combinedQuantity =
          Math.min(
            combinedQuantity,
            movingItem.stock
          );
      }

      existingItem.quantity =
        combinedQuantity;

      existingItem.stock =
        movingItem.stock;
    } else {
      cartItems.push(
        movingItem
      );
    }

    savedItems.splice(
      index,
      1
    );

    saveCartData();
    renderCart();

    showCartMessage(
      "Item moved back to your cart.",
      "success"
    );
  }

  // ==========================================================
  // REMOVE SAVED ITEM
  // ==========================================================

  function removeSavedItem(
    index
  ) {
    if (
      index < 0 ||
      index >= savedItems.length
    ) {
      return;
    }

    savedItems.splice(
      index,
      1
    );

    saveCartData();
    renderCart();

    showCartMessage(
      "Saved item removed.",
      "information"
    );
  }

  // ==========================================================
  // UPDATE QUANTITY
  // ==========================================================

  function updateQuantity(
    index,
    newQuantity
  ) {
    if (
      index < 0 ||
      index >= cartItems.length
    ) {
      return;
    }

    var item =
      normalizeCartItem(
        cartItems[index]
      );

    var quantity =
      normalizeWholeNumber(
        newQuantity,
        1
      );

    if (
      item.stock > 0 &&
      quantity > item.stock
    ) {
      quantity =
        item.stock;

      showCartMessage(
        "Quantity was limited to the available stock.",
        "information"
      );
    }

    cartItems[index].quantity =
      quantity;

    saveCartData();
    renderCart();
  }

  // ==========================================================
  // CLEAR CART
  // ==========================================================

  function clearCart() {
    if (
      cartItems.length ===
      0
    ) {
      return;
    }

    var shouldClear =
      window.confirm(
        "Remove every item from your cart?"
      );

    if (!shouldClear) {
      return;
    }

    cartItems =
      [];

    saveCartData();
    renderCart();

    showCartMessage(
      "Your cart was cleared.",
      "information"
    );
  }

  // ==========================================================
  // PRODUCT IMAGE
  // ==========================================================

  function createProductImage(
    item
  ) {
    var container =
      createElement(
        "div",
        "cart-item-image-container"
      );

    if (!item.image) {
      container.appendChild(
        createElement(
          "div",
          "cart-item-image-placeholder",
          "No product image"
        )
      );

      return container;
    }

    var image =
      document.createElement(
        "img"
      );

    image.className =
      "cart-item-image";

    image.src =
      item.image;

    image.alt =
      item.name;

    image.loading =
      "lazy";

    image.addEventListener(
      "error",
      function () {
        container.replaceChildren(
          createElement(
            "div",
            "cart-item-image-placeholder",
            "Image unavailable"
          )
        );
      }
    );

    container.appendChild(
      image
    );

    return container;
  }

  // ==========================================================
  // STOCK MESSAGE
  // ==========================================================

  function createStockMessage(
    item
  ) {
    if (
      item.stock <= 0
    ) {
      return createElement(
        "p",
        "stock-message stock-unavailable",
        "Availability will be verified at checkout."
      );
    }

    if (
      item.stock <= 5
    ) {
      return createElement(
        "p",
        "stock-message stock-low",
        (
          "Only " +
          item.stock +
          " available."
        )
      );
    }

    return createElement(
      "p",
      "stock-message stock-available",
      "In stock"
    );
  }

  // ==========================================================
  // SECTION 2 CONTINUES WITH CREATE CART ITEM
  // ==========================================================
  function createCartItem(
    item,
    index,
    isSaved
  ) {
    var normalized =
      normalizeCartItem(
        item
      );

    var card =
      createElement(
        "article",
        "cart-item"
      );

    var content =
      createElement(
        "div",
        "cart-item-content"
      );

    var heading =
      createElement(
        "div",
        "cart-item-heading"
      );

    var title =
      document.createElement(
        "h2"
      );

    var titleLink =
      document.createElement(
        "a"
      );

    titleLink.href =
      "product.html?id=" +
      encodeURIComponent(
        normalized.productId
      );

    titleLink.textContent =
      normalized.name;

    title.appendChild(
      titleLink
    );

    heading.appendChild(
      title
    );

    heading.appendChild(
      createElement(
        "p",
        "cart-item-price",
        formatCurrency(
          normalized.price *
          normalized.quantity
        )
      )
    );

    content.appendChild(
      heading
    );

    if (normalized.variantName) {
      content.appendChild(
        createElement(
          "p",
          "cart-item-detail",
          (
            "Variant: " +
            normalized.variantName
          )
        )
      );
    }

    if (normalized.sku) {
      content.appendChild(
        createElement(
          "p",
          "cart-item-detail",
          (
            "SKU: " +
            normalized.sku
          )
        )
      );
    }

    content.appendChild(
      createElement(
        "p",
        "cart-item-detail",
        (
          "Unit price: " +
          formatCurrency(
            normalized.price
          )
        )
      )
    );

    if (!isSaved) {
      content.appendChild(
        createStockMessage(
          normalized
        )
      );
    }

    var actions =
      createElement(
        "div",
        "cart-item-actions"
      );

    if (!isSaved) {
      var quantityField =
        createElement(
          "div",
          "quantity-field"
        );

      var quantityLabel =
        createElement(
          "label",
          "",
          "Quantity"
        );

      var quantityInput =
        document.createElement(
          "input"
        );

      var quantityId =
        "cart-quantity-" +
        index;

      quantityLabel.htmlFor =
        quantityId;

      quantityInput.id =
        quantityId;

      quantityInput.className =
        "quantity-input";

      quantityInput.type =
        "number";

      quantityInput.min =
        "1";

      quantityInput.step =
        "1";

      quantityInput.value =
        String(
          normalized.quantity
        );

      quantityInput.setAttribute(
        "aria-label",
        (
          "Quantity for " +
          normalized.name
        )
      );

      if (
        normalized.stock > 0
      ) {
        quantityInput.max =
          String(
            normalized.stock
          );
      }

      quantityInput.addEventListener(
        "change",
        function () {
          updateQuantity(
            index,
            quantityInput.value
          );
        }
      );

      quantityField.appendChild(
        quantityLabel
      );

      quantityField.appendChild(
        quantityInput
      );

      actions.appendChild(
        quantityField
      );

      var saveButton =
        createElement(
          "button",
          (
            "cart-item-button " +
            "save-item-button"
          ),
          "Save for Later"
        );

      saveButton.type =
        "button";

      saveButton.addEventListener(
        "click",
        function () {
          moveToSaved(
            index
          );
        }
      );

      actions.appendChild(
        saveButton
      );

      var removeButton =
        createElement(
          "button",
          (
            "cart-item-button " +
            "remove-item-button"
          ),
          "Remove"
        );

      removeButton.type =
        "button";

      removeButton.addEventListener(
        "click",
        function () {
          removeFromCart(
            index
          );
        }
      );

      actions.appendChild(
        removeButton
      );
    } else {
      var moveButton =
        createElement(
          "button",
          (
            "cart-item-button " +
            "move-to-cart-button"
          ),
          "Move to Cart"
        );

      moveButton.type =
        "button";

      moveButton.addEventListener(
        "click",
        function () {
          moveBackToCart(
            index
          );
        }
      );

      actions.appendChild(
        moveButton
      );

      var removeSavedButton =
        createElement(
          "button",
          (
            "cart-item-button " +
            "remove-saved-item-button"
          ),
          "Remove"
        );

      removeSavedButton.type =
        "button";

      removeSavedButton.addEventListener(
        "click",
        function () {
          removeSavedItem(
            index
          );
        }
      );

      actions.appendChild(
        removeSavedButton
      );
    }

    content.appendChild(
      actions
    );

    card.appendChild(
      createProductImage(
        normalized
      )
    );

    card.appendChild(
      content
    );

    return card;
  }

  // ==========================================================
  // TOTAL CALCULATIONS
  // ==========================================================

  function calculateTotals() {
    var subtotal =
      cartItems.reduce(
        function (
          total,
          item
        ) {
          var normalized =
            normalizeCartItem(
              item
            );

          return (
            total +
            (
              normalized.price *
              normalized.quantity
            )
          );
        },
        0
      );

    var tax =
      subtotal *
      (
        taxRate /
        100
      );

    return {
      subtotal:
        subtotal,

      tax:
        tax,

      total:
        subtotal +
        tax
    };
  }

  function updateTotals() {
    var totals =
      calculateTotals();

    var subtotalElement =
      getElement(
        "subtotal"
      );

    var taxElement =
      getElement(
        "tax"
      );

    var totalElement =
      getElement(
        "total"
      );

    var taxRateLabel =
      getElement(
        "tax-rate-label"
      );

    var itemCountElement =
      getElement(
        "summary-item-count"
      );

    var checkoutButton =
      getElement(
        "checkout-button"
      );

    if (subtotalElement) {
      subtotalElement.textContent =
        formatCurrency(
          totals.subtotal
        );
    }

    if (taxElement) {
      taxElement.textContent =
        formatCurrency(
          totals.tax
        );
    }

    if (totalElement) {
      totalElement.textContent =
        formatCurrency(
          totals.total
        );
    }

    if (taxRateLabel) {
      taxRateLabel.textContent =
        (
          "(" +
          taxRate +
          "%)"
        );
    }

    if (itemCountElement) {
      itemCountElement.textContent =
        String(
          getCartQuantity()
        );
    }

    if (checkoutButton) {
      checkoutButton.disabled =
        checkoutInProgress ||
        cartItems.length ===
          0;

      checkoutButton.textContent =
        checkoutInProgress
          ? "Opening Secure Checkout..."
          : "Proceed to Secure Checkout";
    }
  }

  // ==========================================================
  // RENDER CART
  // ==========================================================

  function renderCart() {
    cartItems =
      cartItems
        .map(
          normalizeCartItem
        )
        .filter(
          function (item) {
            return Boolean(
              item.productId
            );
          }
        );

    savedItems =
      savedItems
        .map(
          normalizeCartItem
        )
        .filter(
          function (item) {
            return Boolean(
              item.productId
            );
          }
        );

    var cartContainer =
      getElement(
        "cart-items"
      );

    var savedContainer =
      getElement(
        "saved-items"
      );

    var clearButton =
      getElement(
        "clear-cart-button"
      );

    if (cartContainer) {
      cartContainer.replaceChildren();

      cartContainer.setAttribute(
        "aria-busy",
        "false"
      );

      if (
        cartItems.length ===
        0
      ) {
        var emptyMessage =
          createElement(
            "p",
            "cart-empty-message",
            "Your cart is currently empty. "
          );

        var shopLink =
          document.createElement(
            "a"
          );

        shopLink.href =
          "shop.html";

        shopLink.textContent =
          "Browse the shop.";

        emptyMessage.appendChild(
          shopLink
        );

        cartContainer.appendChild(
          emptyMessage
        );
      } else {
        cartItems.forEach(
          function (
            item,
            index
          ) {
            cartContainer.appendChild(
              createCartItem(
                item,
                index,
                false
              )
            );
          }
        );
      }
    }

    if (savedContainer) {
      savedContainer.replaceChildren();

      savedContainer.setAttribute(
        "aria-busy",
        "false"
      );

      if (
        savedItems.length ===
        0
      ) {
        savedContainer.appendChild(
          createElement(
            "p",
            "cart-empty-message",
            "You have no items saved for later."
          )
        );
      } else {
        savedItems.forEach(
          function (
            item,
            index
          ) {
            savedContainer.appendChild(
              createCartItem(
                item,
                index,
                true
              )
            );
          }
        );
      }
    }

    if (clearButton) {
      clearButton.hidden =
        cartItems.length ===
        0;
    }

    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(
          cartItems
        )
      );

      localStorage.setItem(
        SAVED_STORAGE_KEY,
        JSON.stringify(
          savedItems
        )
      );
    } catch (error) {
      console.error(
        "The cart could not be stored.",
        error
      );
    }

    updateCartBadge();
    updateTotals();
  }

  // ==========================================================
  // LOAD TAX RATE
  // ==========================================================

  async function loadTaxRate() {
    try {
      var response =
        await fetchWithTimeout(
          SETTINGS_URL,
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (!response.ok) {
        updateTotals();

        return;
      }

      var responseData =
        await readResponse(
          response
        );

      var settings =
        responseData.settings ||
        responseData;

      var rate =
        Number(
          settings.taxRate !==
            undefined
            ? settings.taxRate
            : settings.tax_rate
        );

      taxRate =
        Number.isFinite(rate) &&
        rate >= 0
          ? rate
          : 0;
    } catch (error) {
      console.warn(
        "Tax settings could not be loaded.",
        error
      );

      taxRate =
        0;
    }

    updateTotals();
  }

  // ==========================================================
  // CHECKOUT
  // ==========================================================

  async function checkout() {
    if (checkoutInProgress) {
      return;
    }

    if (
      cartItems.length ===
      0
    ) {
      showCartMessage(
        "Your cart is empty.",
        "error"
      );

      return;
    }

    checkoutInProgress =
      true;

    updateTotals();

    showCartMessage(
      "Verifying your cart and opening secure checkout...",
      "information"
    );

    try {
      var checkoutCart =
        cartItems.map(
          function (item) {
            var normalized =
              normalizeCartItem(
                item
              );

            return {
              id:
                normalized.productId,

              productId:
                normalized.productId,

              variantIndex:
                normalized.variantIndex,

              variantId:
                normalized.variantId,

              quantity:
                normalized.quantity
            };
          }
        );

      var response =
        await fetchWithTimeout(
          CHECKOUT_URL,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json"
            },

            body:
              JSON.stringify({
                cart:
                  checkoutCart,

                items:
                  checkoutCart
              })
          }
        );

      var responseData =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(
            responseData.error ||
            responseData.message ||
            responseData,
            "Checkout could not be started."
          )
        );
      }

      var secureCheckoutUrl =
        responseData.url ||
        responseData.checkoutUrl ||
        responseData.checkout_url;

      if (!secureCheckoutUrl) {
        throw new Error(
          "The checkout service did not return a secure checkout URL."
        );
      }

      window.location.assign(
        secureCheckoutUrl
      );
    } catch (error) {
      console.error(
        "Checkout failed.",
        error
      );

      checkoutInProgress =
        false;

      updateTotals();

      var errorMessage;

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        errorMessage =
          "The checkout request took too long. Please try again.";
      } else if (
        error instanceof
        TypeError
      ) {
        errorMessage =
          "The checkout server could not be reached. " +
          "Check the backend URL and try again.";
      } else {
        errorMessage =
          normalizeErrorMessage(
            error,
            "Checkout could not be started."
          );
      }

      showCartMessage(
        errorMessage,
        "error"
      );
    }
  }

  // ==========================================================
  // PAGE INITIALIZATION
  // ==========================================================

  function initializeCart() {
    var checkoutButton =
      getElement(
        "checkout-button"
      );

    var clearButton =
      getElement(
        "clear-cart-button"
      );

    if (checkoutButton) {
      checkoutButton.addEventListener(
        "click",
        checkout
      );
    }

    if (clearButton) {
      clearButton.addEventListener(
        "click",
        clearCart
      );
    }

    renderCart();
    loadTaxRate();

    showCartMessage(
      "",
      "information"
    );

    window.addEventListener(
      "storage",
      function (event) {
        if (
          event.key ===
            CART_STORAGE_KEY ||
          event.key ===
            SAVED_STORAGE_KEY
        ) {
          cartItems =
            readStoredArray(
              CART_STORAGE_KEY
            );

          savedItems =
            readStoredArray(
              SAVED_STORAGE_KEY
            );

          renderCart();
        }
      }
    );

    console.log(
      "MMC cart initialized."
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
      initializeCart
    );
  } else {
    initializeCart();
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.addToCart =
    addToCart;

  window.removeFromCart =
    removeFromCart;

  window.moveToSaved =
    moveToSaved;

  window.moveBackToCart =
    moveBackToCart;

  window.removeSavedItem =
    removeSavedItem;

  window.updateQuantity =
    updateQuantity;

  window.clearCart =
    clearCart;

  window.renderCart =
    renderCart;

  window.checkout =
    checkout;
}());
