// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// CART, SAVED ITEMS, INVENTORY, AND CHECKOUT
// ============================================================

(function () {
  "use strict";

  var CART_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var PRODUCTS_URL =
    CART_BACKEND_URL +
    "/products";

  var SETTINGS_URL =
    CART_BACKEND_URL +
    "/settings";

  var CHECKOUT_URL =
    CART_BACKEND_URL +
    "/create-checkout-session";

  var cartItems =
    readStoredArray("cart");

  var savedItems =
    readStoredArray(
      "savedForLater"
    );

  var taxRate = 0;
  var checkoutInProgress = false;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getElement(elementId) {
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

    if (text !== undefined) {
      element.textContent =
        text;
    }

    return element;
  }

  // ==========================================================
  // LOCAL STORAGE
  // ==========================================================

  function readStoredArray(
    storageKey
  ) {
    try {
      var storedValue =
        JSON.parse(
          localStorage.getItem(
            storageKey
          ) || "[]"
        );

      if (Array.isArray(storedValue)) {
        return storedValue;
      }

      return [];
    } catch (error) {
      console.error(
        "Could not read " +
        storageKey +
        ":",
        error
      );

      return [];
    }
  }

  function saveCartData() {
    localStorage.setItem(
      "cart",
      JSON.stringify(cartItems)
    );

    localStorage.setItem(
      "savedForLater",
      JSON.stringify(savedItems)
    );

    updateCartBadge();
  }

  // ==========================================================
  // PAGE MESSAGES
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
      message || "";

    messageBox.classList.remove(
      "cart-error",
      "cart-success",
      "cart-information"
    );

    if (messageType === "error") {
      messageBox.classList.add(
        "cart-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageBox.classList.add(
        "cart-success"
      );
    } else {
      messageBox.classList.add(
        "cart-information"
      );
    }
  }

  function clearCartMessage() {
    showCartMessage(
      "",
      "information"
    );
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readResponse(
    response
  ) {
    var data;

    try {
      data =
        await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        (
          "The request failed with status " +
          response.status +
          "."
        )
      );
    }

    return data;
  }

  // ==========================================================
  // NORMALIZE DATA
  // ==========================================================

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

  function normalizeCartItem(item) {
    return {
      id: String(
        item.id ||
        item.productId ||
        item.product_id ||
        item._id ||
        ""
      ),

      name: String(
        item.name ||
        "Product"
      ),

      price: Math.max(
        0,
        Number(
          item.price || 0
        )
      ),

      sku: String(
        item.sku || ""
      ),

      image: String(
        item.image || ""
      ),

      variantIndex:
        normalizeVariantIndex(
          item.variantIndex
        ),

      variantName: String(
        item.variantName || ""
      ),

      quantity: Math.max(
        1,
        Math.floor(
          Number(
            item.quantity || 1
          )
        )
      ),

      stock: Math.max(
        0,
        Number(
          item.stock || 0
        )
      )
    };
  }

  function normalizeProduct(product) {
    return {
      id: String(
        product.id ||
        product._id ||
        ""
      ),

      name: String(
        product.name ||
        "Product"
      ),

      price: Math.max(
        0,
        Number(
          product.price || 0
        )
      ),

      sku: String(
        product.sku || ""
      ),

      image: String(
        product.image || ""
      ),

      stock: Math.max(
        0,
        Number(
          product.stock || 0
        )
      ),

      active:
        product.active !== false,

      variants:
        Array.isArray(
          product.variants
        )
          ? product.variants
          : []
    };
  }

  function getVariant(
    product,
    variantIndex
  ) {
    if (
      variantIndex === null ||
      !Array.isArray(
        product.variants
      )
    ) {
      return null;
    }

    return (
      product.variants[
        variantIndex
      ] ||
      null
    );
  }

  function getCartItemKey(item) {
    return (
      item.id +
      "::" +
      (
        item.variantIndex === null
          ? "base"
          : item.variantIndex
      )
    );
  }

  // ==========================================================
  // DISPLAY FORMATTING
  // ==========================================================

  function formatCurrency(value) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(
      Number(value) || 0
    );
  }

  // ==========================================================
  // CART BADGE
  // ==========================================================

  function updateCartBadge() {
    var badge =
      getElement(
        "cart-count"
      );

    var itemCount =
      cartItems.reduce(
        function (
          total,
          item
        ) {
          return (
            total +
            Math.max(
              1,
              Number(
                item.quantity || 1
              )
            )
          );
        },
        0
      );

    if (badge) {
      badge.textContent =
        String(itemCount);

      badge.setAttribute(
        "aria-label",
        (
          itemCount +
          (
            itemCount === 1
              ? " item in cart"
              : " items in cart"
          )
        )
      );
    }
  }

  // ==========================================================
  // LOAD PRODUCT
  // ==========================================================

  async function fetchProduct(
    productId
  ) {
    var response = await fetch(
      PRODUCTS_URL +
      "/" +
      encodeURIComponent(
        productId
      )
    );

    var data =
      await readResponse(
        response
      );

    return normalizeProduct(
      data.product || data
    );
  }

  // ==========================================================
  // ADD TO CART
  // ==========================================================

  async function addToCart(
    productId,
    variantIndex
  ) {
    var normalizedVariantIndex =
      normalizeVariantIndex(
        variantIndex
      );

    try {
      var product =
        await fetchProduct(
          productId
        );

      if (
        !product.id ||
        product.active === false
      ) {
        throw new Error(
          "This product is not currently available."
        );
      }

      var variant =
        getVariant(
          product,
          normalizedVariantIndex
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

      var availableStock =
        variant
          ? Math.max(
              0,
              Number(
                variant.stock || 0
              )
            )
          : product.stock;

      if (availableStock <= 0) {
        throw new Error(
          "This item is out of stock."
        );
      }

      var cartItem = {
        id:
          product.id,

        name:
          product.name,

        price:
          variant
            ? Math.max(
                0,
                Number(
                  variant.price || 0
                )
              )
            : product.price,

        sku:
          variant
            ? String(
                variant.sku || ""
              )
            : product.sku,

        image:
          variant &&
          variant.image
            ? String(
                variant.image
              )
            : product.image,

        variantIndex:
          normalizedVariantIndex,

        variantName:
          variant
            ? String(
                variant.name || ""
              )
            : "",

        quantity: 1,
        stock:
          availableStock
      };

      var itemKey =
        getCartItemKey(
          cartItem
        );

      var existingItem =
        cartItems.find(
          function (item) {
            return (
              getCartItemKey(
                normalizeCartItem(
                  item
                )
              ) === itemKey
            );
          }
        );

      if (existingItem) {
        var existingQuantity =
          Math.max(
            1,
            Number(
              existingItem.quantity ||
              1
            )
          );

        if (
          existingQuantity >=
          availableStock
        ) {
          throw new Error(
            "You already have the maximum available quantity in your cart."
          );
        }

        existingItem.quantity =
          existingQuantity + 1;

        existingItem.stock =
          availableStock;
      } else {
        cartItems.push(
          cartItem
        );
      }

      saveCartData();
      renderCart();

      showCartMessage(
        "Added to cart.",
        "success"
      );
    } catch (error) {
      console.error(
        "Add to cart failed:",
        error
      );

      showCartMessage(
        error.message ||
        "The item could not be added to your cart.",
        "error"
      );

      window.alert(
        error.message ||
        "The item could not be added to your cart."
      );
    }
  }

  // ==========================================================
  // REMOVE AND MOVE ITEMS
  // ==========================================================

  function removeFromCart(index) {
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

  function moveToSaved(index) {
    if (
      index < 0 ||
      index >= cartItems.length
    ) {
      return;
    }

    savedItems.push(
      cartItems[index]
    );

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

  function moveBackToCart(index) {
    if (
      index < 0 ||
      index >= savedItems.length
    ) {
      return;
    }

    var item =
      normalizeCartItem(
        savedItems[index]
      );

    var itemKey =
      getCartItemKey(item);

    var existingItem =
      cartItems.find(
        function (cartItem) {
          return (
            getCartItemKey(
              normalizeCartItem(
                cartItem
              )
            ) === itemKey
          );
        }
      );

    if (existingItem) {
      existingItem.quantity =
        Math.max(
          1,
          Number(
            existingItem.quantity ||
            1
          )
        ) +
        item.quantity;
    } else {
      cartItems.push(item);
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

  function removeSavedItem(index) {
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
      Math.floor(
        Number(newQuantity)
      );

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      quantity = 1;
    }

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
  // PRODUCT IMAGE
  // ==========================================================

  function createProductImage(item) {
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

    container.appendChild(image);

    return container;
  }

  // ==========================================================
  // STOCK MESSAGE
  // ==========================================================

  function createStockMessage(item) {
    var message;
    var className;

    if (item.stock <= 0) {
      message =
        "Availability will be verified at checkout.";

      className =
        "stock-message stock-unavailable";
    } else if (
      item.stock <= 5
    ) {
      message =
        "Only " +
        item.stock +
        " available.";

      className =
        "stock-message stock-low";
    } else {
      message =
        "In stock";

      className =
        "stock-message stock-available";
    }

    return createElement(
      "p",
      className,
      message
    );
  }

  // ==========================================================
  // CREATE CART ITEM
  // ==========================================================

  function createCartItem(
    item,
    index,
    isSaved
  ) {
    var normalized =
      normalizeCartItem(item);

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

    heading.appendChild(
      createElement(
        "h2",
        "",
        normalized.name
      )
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

      if (normalized.stock > 0) {
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
          "cart-item-button",
          "Save for Later"
        );

      saveButton.type =
        "button";

      saveButton.addEventListener(
        "click",
        function () {
          moveToSaved(index);
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
          "cart-item-button",
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
            "remove-item-button"
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
        taxRate / 100
      );

    return {
      subtotal:
        subtotal,

      tax:
        tax,

      total:
        subtotal + tax
    };
  }

  function updateTotals() {
    var totals =
      calculateTotals();

    var subtotalElement =
      getElement("subtotal");

    var taxElement =
      getElement("tax");

    var totalElement =
      getElement("total");

    var taxRateLabel =
      getElement(
        "tax-rate-label"
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

    var checkoutButton =
      getElement(
        "checkout-button"
      );

    if (checkoutButton) {
      checkoutButton.disabled =
        checkoutInProgress ||
        cartItems.length === 0;

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
    var cartContainer =
      getElement(
        "cart-items"
      );

    var savedContainer =
      getElement(
        "saved-items"
      );

    cartItems =
      cartItems
        .map(normalizeCartItem)
        .filter(
          function (item) {
            return item.id !== "";
          }
        );

    savedItems =
      savedItems
        .map(normalizeCartItem)
        .filter(
          function (item) {
            return item.id !== "";
          }
        );

    if (cartContainer) {
      cartContainer.replaceChildren();

      if (!cartItems.length) {
        var emptyMessage =
          createElement(
            "p",
            "cart-empty-message",
            "Your cart is currently empty."
          );

        var shopLink =
          document.createElement(
            "a"
          );

        shopLink.href =
          "shop.html";

        shopLink.textContent =
          " Browse the shop.";

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

      if (!savedItems.length) {
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

    saveCartData();
    updateTotals();
  }

  // ==========================================================
  // LOAD TAX RATE
  // ==========================================================

  async function loadTaxRate() {
    try {
      var response = await fetch(
        SETTINGS_URL,
        {
          method: "GET"
        }
      );

      if (!response.ok) {
        return;
      }

      var data =
        await response.json();

      var settings =
        data.settings || data;

      var rate =
        settings.taxRate;

      if (rate === undefined) {
        rate =
          settings.tax_rate;
      }

      rate =
        Number(rate);

      if (
        Number.isFinite(rate) &&
        rate >= 0
      ) {
        taxRate = rate;
      } else {
        taxRate = 0;
      }
    } catch (error) {
      console.warn(
        "Tax settings could not be loaded:",
        error
      );

      taxRate = 0;
    }

    updateTotals();
  }

  // ==========================================================
  // STRIPE CHECKOUT
  // ==========================================================

  async function checkout() {
    if (
      !cartItems.length ||
      checkoutInProgress
    ) {
      showCartMessage(
        "Your cart is empty.",
        "error"
      );

      return;
    }

    checkoutInProgress = true;

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
                normalized.id,

              productId:
                normalized.id,

              variantIndex:
                normalized.variantIndex,

              quantity:
                normalized.quantity
            };
          }
        );

      var response = await fetch(
        CHECKOUT_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            cart:
              checkoutCart
          })
        }
      );

      var data =
        await readResponse(
          response
        );

      if (!data.url) {
        throw new Error(
          "The checkout service did not return a secure checkout URL."
        );
      }

      window.location.href =
        data.url;
    } catch (error) {
      console.error(
        "Checkout failed:",
        error
      );

      checkoutInProgress = false;

      updateTotals();

      showCartMessage(
        error.message ||
        "Checkout could not be started.",
        "error"
      );
    }
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      var checkoutButton =
        getElement(
          "checkout-button"
        );

      if (checkoutButton) {
        checkoutButton.addEventListener(
          "click",
          checkout
        );
      }

      renderCart();
      loadTaxRate();
      clearCartMessage();
    }
  );

  // ==========================================================
  // GLOBAL SHOP AND CART SUPPORT
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

  window.renderCart =
    renderCart;

  window.checkout =
    checkout;
}());
``