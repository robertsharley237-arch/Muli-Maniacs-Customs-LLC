// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: homepage.js
// HOMEPAGE MINI CART
// ============================================================

(function () {
  "use strict";

  var CART_STORAGE_KEY =
    "cart";

  var MAXIMUM_VISIBLE_ITEMS =
    3;

  // ==========================================================
  // ELEMENT HELPER
  // ==========================================================

  function getElement(elementId) {
    return document.getElementById(
      elementId
    );
  }

  // ==========================================================
  // LOAD STORED CART
  // ==========================================================

  function loadStoredCart() {
    try {
      var savedCart =
        localStorage.getItem(
          CART_STORAGE_KEY
        );

      var parsedCart =
        savedCart
          ? JSON.parse(savedCart)
          : [];

      if (!Array.isArray(parsedCart)) {
        return [];
      }

      return parsedCart;
    } catch (error) {
      console.error(
        "The mini cart could not load the stored cart:",
        error
      );

      return [];
    }
  }

  // ==========================================================
  // CART ITEM HELPERS
  // ==========================================================

  function getItemQuantity(item) {
    var quantity =
      Number(
        item &&
        item.quantity
      );

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return 1;
    }

    return quantity;
  }

  function getItemPrice(item) {
    var price =
      Number(
        item &&
        item.price
      );

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return 0;
    }

    return price;
  }

  function getItemName(item) {
    if (
      !item ||
      !item.name
    ) {
      return "Custom Product";
    }

    return String(
      item.name
    );
  }

  function getItemVariantName(item) {
    if (
      !item ||
      !item.variantName
    ) {
      return "";
    }

    return String(
      item.variantName
    );
  }

  function getTotalQuantity(cart) {
    return cart.reduce(
      function (
        total,
        item
      ) {
        return (
          total +
          getItemQuantity(item)
        );
      },
      0
    );
  }

  function getCartSubtotal(cart) {
    return cart.reduce(
      function (
        total,
        item
      ) {
        return (
          total +
          getItemPrice(item) *
          getItemQuantity(item)
        );
      },
      0
    );
  }

  // ==========================================================
  // CURRENCY FORMATTING
  // ==========================================================

  function formatCurrency(value) {
    var amount =
      Number(value);

    if (!Number.isFinite(amount)) {
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
  // CREATE TEXT ELEMENT
  // ==========================================================

  function createTextElement(
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

    element.textContent =
      text;

    return element;
  }

  // ==========================================================
  // CREATE MINI-CART ITEM
  // ==========================================================

  function createMiniCartItem(item) {
    var itemContainer =
      document.createElement(
        "article"
      );

    var variantName =
      getItemVariantName(item);

    var quantity =
      getItemQuantity(item);

    var price =
      getItemPrice(item);

    itemContainer.className =
      "mini-cart-item";

    itemContainer.appendChild(
      createTextElement(
        "h3",
        "mini-cart-item-name",
        getItemName(item)
      )
    );

    if (variantName) {
      itemContainer.appendChild(
        createTextElement(
          "p",
          "mini-cart-item-variant",
          "Variant: " +
          variantName
        )
      );
    }

    itemContainer.appendChild(
      createTextElement(
        "p",
        "mini-cart-item-details",
        quantity +
        " x " +
        formatCurrency(price)
      )
    );

    itemContainer.appendChild(
      createTextElement(
        "p",
        "mini-cart-item-total",
        "Item total: " +
        formatCurrency(
          price * quantity
        )
      )
    );

    return itemContainer;
  }

  // ==========================================================
  // CREATE CART LINK
  // ==========================================================

  function createCartLink(text) {
    var link =
      document.createElement(
        "a"
      );

    link.href =
      "cart.html";

    link.className =
      "mini-cart-link";

    link.textContent =
      text;

    return link;
  }

  // ==========================================================
  // DISPLAY EMPTY MINI CART
  // ==========================================================

  function displayEmptyMiniCart(
    container
  ) {
    container.appendChild(
      createTextElement(
        "p",
        "mini-cart-empty",
        "Your cart is empty."
      )
    );

    var shopLink =
      document.createElement(
        "a"
      );

    shopLink.href =
      "shop.html";

    shopLink.className =
      "mini-cart-link";

    shopLink.textContent =
      "Browse the Shop";

    container.appendChild(
      shopLink
    );
  }

  // ==========================================================
  // DISPLAY MINI-CART SUMMARY
  // ==========================================================

  function displayMiniCartSummary(
    container,
    cart
  ) {
    var totalQuantity =
      getTotalQuantity(cart);

    var subtotal =
      getCartSubtotal(cart);

    var summary =
      document.createElement(
        "div"
      );

    summary.className =
      "mini-cart-summary";

    summary.appendChild(
      createTextElement(
        "p",
        "mini-cart-quantity",
        totalQuantity === 1
          ? "1 item in your cart."
          : totalQuantity +
            " items in your cart."
      )
    );

    summary.appendChild(
      createTextElement(
        "p",
        "mini-cart-subtotal",
        "Subtotal: " +
        formatCurrency(subtotal)
      )
    );

    summary.appendChild(
      createCartLink(
        "View Cart"
      )
    );

    container.appendChild(
      summary
    );
  }

  // ==========================================================
  // UPDATE CART COUNT BADGES
  // ==========================================================

  function updateCartCount(
    totalQuantity
  ) {
    var idBadge =
      getElement(
        "cart-count"
      );

    var dataBadges =
      document.querySelectorAll(
        "[data-cart-count]"
      );

    var accessibleLabel =
      totalQuantity +
      (
        totalQuantity === 1
          ? " item in cart"
          : " items in cart"
      );

    if (idBadge) {
      idBadge.textContent =
        String(
          totalQuantity
        );

      idBadge.setAttribute(
        "aria-label",
        accessibleLabel
      );
    }

    Array.prototype.forEach.call(
      dataBadges,
      function (badge) {
        badge.textContent =
          String(
            totalQuantity
          );

        badge.setAttribute(
          "aria-label",
          accessibleLabel
        );
      }
    );
  }

  // ==========================================================
  // RENDER MINI CART
  // ==========================================================

  function renderMiniCart() {
    var container =
      getElement(
        "miniCartItems"
      );

    var cart =
      loadStoredCart();

    var totalQuantity =
      getTotalQuantity(cart);

    updateCartCount(
      totalQuantity
    );

    if (!container) {
      return;
    }

    container.replaceChildren();

    if (cart.length === 0) {
      displayEmptyMiniCart(
        container
      );

      return;
    }

    cart
      .slice(
        0,
        MAXIMUM_VISIBLE_ITEMS
      )
      .forEach(
        function (item) {
          container.appendChild(
            createMiniCartItem(
              item
            )
          );
        }
      );

    if (
      cart.length >
      MAXIMUM_VISIBLE_ITEMS
    ) {
      container.appendChild(
        createTextElement(
          "p",
          "mini-cart-more-items",
          "+" +
          (
            cart.length -
            MAXIMUM_VISIBLE_ITEMS
          ) +
          " more cart item(s)"
        )
      );
    }

    displayMiniCartSummary(
      container,
      cart
    );
  }

  // ==========================================================
  // CART UPDATE EVENTS
  // ==========================================================

  function handleStorageChange(event) {
    if (
      event.key ===
      CART_STORAGE_KEY
    ) {
      renderMiniCart();
    }
  }

  function handleCartUpdated() {
    renderMiniCart();
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    renderMiniCart
  );

  document.addEventListener(
    "cartUpdated",
    handleCartUpdated
  );

  window.addEventListener(
    "storage",
    handleStorageChange
  );

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.renderMiniCart =
    renderMiniCart;

  window.refreshMiniCart =
    renderMiniCart;
}());