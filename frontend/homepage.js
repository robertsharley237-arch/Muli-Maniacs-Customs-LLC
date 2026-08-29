// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: homepage.js
// HOMEPAGE MINI CART
//
// Purpose:
// - Display a mini cart on the homepage
// - Update all cart-count badges
// - Display up to three cart selections
// - Show quantities, variants, prices, and subtotal
// - Link clients to the shop, cart, and checkout pages
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var CART_STORAGE_KEY =
    "cart";

  var MAXIMUM_VISIBLE_ITEMS =
    3;

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
      text === undefined ||
      text === null
        ? ""
        : String(text);

    return element;
  }

  function createActionLink(
    destination,
    className,
    text
  ) {
    var link =
      document.createElement(
        "a"
      );

    link.href =
      destination;

    link.className =
      className;

    link.textContent =
      text;

    return link;
  }

  // ==========================================================
  // CART VALUE HELPERS
  // ==========================================================

  function getItemQuantity(
    item
  ) {
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

  function getItemPrice(
    item
  ) {
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

  function getItemName(
    item
  ) {
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

  function getItemVariantName(
    item
  ) {
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

  function getItemSku(
    item
  ) {
    if (
      !item ||
      !item.sku
    ) {
      return "";
    }

    return String(
      item.sku
    );
  }

  function getItemImage(
    item
  ) {
    if (
      !item ||
      !item.image
    ) {
      return "";
    }

    return String(
      item.image
    );
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
  // LOAD THE SAVED CART
  // ==========================================================

  function loadStoredCart() {
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

      if (
        !Array.isArray(
          parsedCart
        )
      ) {
        console.warn(
          "The saved MMC cart is not a valid array."
        );

        return [];
      }

      return parsedCart.filter(
        function (item) {
          return (
            item &&
            typeof item ===
              "object"
          );
        }
      );
    } catch (error) {
      console.error(
        "The homepage mini cart could not load the saved cart:",
        error
      );

      return [];
    }
  }

  // ==========================================================
  // CART TOTALS
  // ==========================================================

  function getTotalQuantity(
    cart
  ) {
    return cart.reduce(
      function (
        total,
        item
      ) {
        return (
          total +
          getItemQuantity(
            item
          )
        );
      },
      0
    );
  }

  function getCartSubtotal(
    cart
  ) {
    return cart.reduce(
      function (
        total,
        item
      ) {
        return (
          total +
          getItemPrice(
            item
          ) *
          getItemQuantity(
            item
          )
        );
      },
      0
    );
  }

  // ==========================================================
  // CART-COUNT BADGES
  // ==========================================================

  function updateCartCount(
    totalQuantity
  ) {
    var cartBadges =
      document.querySelectorAll(
        "#cart-count, " +
        "[data-cart-count]"
      );

    var accessibleLabel =
      String(totalQuantity) +
      (
        totalQuantity === 1
          ? " item in cart"
          : " items in cart"
      );

    cartBadges.forEach(
      function (badge) {
        badge.textContent =
          String(
            totalQuantity
          );

        badge.setAttribute(
          "aria-label",
          accessibleLabel
        );

        badge.dataset.cartQuantity =
          String(
            totalQuantity
          );
      }
    );
  }

  // ==========================================================
  // MINI-CART IMAGE
  // ==========================================================

  function createMiniCartImage(
    item
  ) {
    var imageUrl =
      getItemImage(
        item
      );

    if (!imageUrl) {
      return null;
    }

    var imageContainer =
      document.createElement(
        "div"
      );

    imageContainer.className =
      "mini-cart-item-image-container";

    var image =
      document.createElement(
        "img"
      );

    image.className =
      "mini-cart-item-image";

    image.src =
      imageUrl;

    image.alt =
      getItemName(item);

    image.loading =
      "lazy";

    image.addEventListener(
      "error",
      function () {
        imageContainer.remove();
      }
    );

    imageContainer.appendChild(
      image
    );

    return imageContainer;
  }

  // ==========================================================
  // CREATE A MINI-CART ITEM
  // ==========================================================

  function createMiniCartItem(
    item
  ) {
    var itemContainer =
      document.createElement(
        "article"
      );

    itemContainer.className =
      "mini-cart-item";

    var imageContainer =
      createMiniCartImage(
        item
      );

    if (imageContainer) {
      itemContainer.appendChild(
        imageContainer
      );
    }

    var itemContent =
      document.createElement(
        "div"
      );

    itemContent.className =
      "mini-cart-item-content";

    var quantity =
      getItemQuantity(
        item
      );

    var price =
      getItemPrice(
        item
      );

    var variantName =
      getItemVariantName(
        item
      );

    var sku =
      getItemSku(
        item
      );

    itemContent.appendChild(
      createTextElement(
        "h3",
        "mini-cart-item-name",
        getItemName(item)
      )
    );

    if (variantName) {
      itemContent.appendChild(
        createTextElement(
          "p",
          "mini-cart-item-variant",
          "Variant: " +
          variantName
        )
      );
    }

    if (sku) {
      itemContent.appendChild(
        createTextElement(
          "p",
          "mini-cart-item-sku",
          "SKU: " +
          sku
        )
      );
    }

    itemContent.appendChild(
      createTextElement(
        "p",
        "mini-cart-item-details",
        String(quantity) +
        " x " +
        formatCurrency(price)
      )
    );

    itemContent.appendChild(
      createTextElement(
        "p",
        "mini-cart-item-total",
        "Item total: " +
        formatCurrency(
          price * quantity
        )
      )
    );

    itemContainer.appendChild(
      itemContent
    );

    return itemContainer;
  }

  // ==========================================================
  // EMPTY CART DISPLAY
  // ==========================================================

  function displayEmptyMiniCart(
    container
  ) {
    var emptyState =
      document.createElement(
        "div"
      );

    emptyState.className =
      "mini-cart-empty-state";

    emptyState.appendChild(
      createTextElement(
        "p",
        "mini-cart-empty",
        "Your cart is currently empty."
      )
    );

    emptyState.appendChild(
      createActionLink(
        "shop.html",
        "mini-cart-link",
        "Browse the Shop"
      )
    );

    container.appendChild(
      emptyState
    );
  }

  // ==========================================================
  // ADDITIONAL CART ITEMS
  // ==========================================================

  function displayAdditionalItems(
    container,
    cart
  ) {
    if (
      cart.length <=
      MAXIMUM_VISIBLE_ITEMS
    ) {
      return;
    }

    var hiddenItemCount =
      cart.length -
      MAXIMUM_VISIBLE_ITEMS;

    var message =
      "+" +
      String(
        hiddenItemCount
      ) +
      (
        hiddenItemCount === 1
          ? " more cart selection"
          : " more cart selections"
      );

    container.appendChild(
      createTextElement(
        "p",
        "mini-cart-more-items",
        message
      )
    );
  }

  // ==========================================================
  // MINI-CART SUMMARY
  // ==========================================================

  function displayMiniCartSummary(
    container,
    cart
  ) {
    var totalQuantity =
      getTotalQuantity(
        cart
      );

    var subtotal =
      getCartSubtotal(
        cart
      );

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
          : String(
              totalQuantity
            ) +
            " items in your cart."
      )
    );

    summary.appendChild(
      createTextElement(
        "p",
        "mini-cart-subtotal",
        "Subtotal: " +
        formatCurrency(
          subtotal
        )
      )
    );

    var actionContainer =
      document.createElement(
        "div"
      );

    actionContainer.className =
      "mini-cart-actions";

    actionContainer.appendChild(
      createActionLink(
        "cart.html",
        "mini-cart-link",
        "View Full Cart"
      )
    );

    actionContainer.appendChild(
      createActionLink(
        "checkout.html",
        "mini-cart-checkout-link",
        "Continue to Checkout"
      )
    );

    summary.appendChild(
      actionContainer
    );

    container.appendChild(
      summary
    );
  }

  // ==========================================================
  // RENDER THE HOMEPAGE MINI CART
  // ==========================================================

  function renderMiniCart() {
    var miniCartContainer =
      getElement(
        "miniCartItems"
      );

    var cart =
      loadStoredCart();

    var totalQuantity =
      getTotalQuantity(
        cart
      );

    updateCartCount(
      totalQuantity
    );

    if (!miniCartContainer) {
      return;
    }

    miniCartContainer.replaceChildren();

    if (
      cart.length === 0
    ) {
      displayEmptyMiniCart(
        miniCartContainer
      );

      return;
    }

    var visibleItems =
      cart.slice(
        0,
        MAXIMUM_VISIBLE_ITEMS
      );

    var visibleItemsContainer =
      document.createElement(
        "div"
      );

    visibleItemsContainer.className =
      "mini-cart-visible-items";

    visibleItems.forEach(
      function (item) {
        visibleItemsContainer.appendChild(
          createMiniCartItem(
            item
          )
        );
      }
    );

    miniCartContainer.appendChild(
      visibleItemsContainer
    );

    displayAdditionalItems(
      miniCartContainer,
      cart
    );

    displayMiniCartSummary(
      miniCartContainer,
      cart
    );
  }

  // ==========================================================
  // CART UPDATE EVENTS
  // ==========================================================

  function handleStorageChange(
    event
  ) {
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
  // INITIALIZE HOMEPAGE
  // ==========================================================

  function initializeHomepage() {
    renderMiniCart();

    document.addEventListener(
      "cartUpdated",
      handleCartUpdated
    );

    window.addEventListener(
      "mmc-cart-updated",
      handleCartUpdated
    );

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    console.log(
      "MMC homepage mini cart initialized."
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
      initializeHomepage
    );
  } else {
    initializeHomepage();
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.renderMiniCart =
    renderMiniCart;

  window.refreshMiniCart =
    renderMiniCart;

  window.updateHomepageCartCount =
    updateCartCount;
}());