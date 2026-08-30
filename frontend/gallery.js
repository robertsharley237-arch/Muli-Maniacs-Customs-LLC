// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: gallery.js
// GALLERY FILTERS AND CART SUMMARY
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var FILTER_STORAGE_KEY =
    "mmcGalleryFilter";

  var CART_STORAGE_KEY =
    "cart";

  var ALL_FILTER =
    "all";

  // ==========================================================
  // GALLERY ELEMENTS
  // ==========================================================

  function getGalleryCards() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        ".gallery-card"
      )
    );
  }

  function getFilterButtons() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        "[data-gallery-filter]"
      )
    );
  }

  function normalizeCategory(
    value
  ) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function isKnownFilter(
    filter
  ) {
    if (
      filter ===
      ALL_FILTER
    ) {
      return true;
    }

    return getGalleryCards().some(
      function (card) {
        return (
          normalizeCategory(
            card.getAttribute(
              "data-gallery-category"
            )
          ) ===
          filter
        );
      }
    );
  }

  // ==========================================================
  // ACTIVE FILTER BUTTON
  // ==========================================================

  function updateActiveButton(
    selectedFilter
  ) {
    getFilterButtons().forEach(
      function (button) {
        var buttonFilter =
          normalizeCategory(
            button.getAttribute(
              "data-gallery-filter"
            )
          );

        var isActive =
          buttonFilter ===
          selectedFilter;

        button.classList.toggle(
          "active",
          isActive
        );

        button.setAttribute(
          "aria-pressed",
          isActive
            ? "true"
            : "false"
        );
      }
    );
  }

  // ==========================================================
  // SAVE AND RESTORE FILTER
  // ==========================================================

  function saveFilter(
    selectedFilter
  ) {
    try {
      sessionStorage.setItem(
        FILTER_STORAGE_KEY,
        selectedFilter
      );
    } catch (error) {
      console.warn(
        "The gallery filter could not be saved.",
        error
      );
    }
  }

  function getSavedFilter() {
    try {
      return (
        normalizeCategory(
          sessionStorage.getItem(
            FILTER_STORAGE_KEY
          )
        ) ||
        ALL_FILTER
      );
    } catch (error) {
      return ALL_FILTER;
    }
  }

  // ==========================================================
  // FILTER GALLERY
  // ==========================================================

  function filterGallery(
    selectedCategory
  ) {
    var selectedFilter =
      normalizeCategory(
        selectedCategory
      ) ||
      ALL_FILTER;

    if (
      !isKnownFilter(
        selectedFilter
      )
    ) {
      selectedFilter =
        ALL_FILTER;
    }

    var visibleCount =
      0;

    getGalleryCards().forEach(
      function (card) {
        var cardCategory =
          normalizeCategory(
            card.getAttribute(
              "data-gallery-category"
            )
          );

        var shouldShow =
          selectedFilter ===
            ALL_FILTER ||
          cardCategory ===
            selectedFilter;

        card.hidden =
          !shouldShow;

        if (shouldShow) {
          visibleCount +=
            1;
        }
      }
    );

    updateActiveButton(
      selectedFilter
    );

    var emptyMessage =
      document.getElementById(
        "gallery-empty-message"
      );

    if (emptyMessage) {
      emptyMessage.hidden =
        visibleCount > 0;
    }

    var resultCount =
      document.getElementById(
        "gallery-result-count"
      );

    if (resultCount) {
      resultCount.textContent =
        visibleCount === 1
          ? "1 gallery item"
          : (
              visibleCount +
              " gallery items"
            );
    }

    saveFilter(
      selectedFilter
    );
  }

  // ==========================================================
  // FILTER BUTTON CLICK
  // ==========================================================

  function handleFilterClick(
    event
  ) {
    var selectedFilter =
      event.currentTarget
        .getAttribute(
          "data-gallery-filter"
        );

    filterGallery(
      selectedFilter ||
      ALL_FILTER
    );
  }

  // ==========================================================
  // CART STORAGE
  // ==========================================================

  function readCart() {
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
    } catch (error) {
      console.warn(
        "The Gallery cart summary could not be loaded.",
        error
      );

      return [];
    }
  }

  function getItemQuantity(
    item
  ) {
    var quantity =
      Number(
        item &&
        item.quantity
      );

    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity < 1
    ) {
      return 1;
    }

    return quantity;
  }

  function getCartQuantity(
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

  // ==========================================================
  // CART BADGES
  // ==========================================================

  function updateCartBadges(
    totalQuantity
  ) {
    var accessibleLabel =
      totalQuantity === 1
        ? "1 item in cart"
        : (
            totalQuantity +
            " items in cart"
          );

    var cartBadges =
      document.querySelectorAll(
        "#cart-count, " +
        "[data-cart-count]"
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
  // GALLERY MINI CART
  // ==========================================================

  function loadGalleryMiniCart() {
    var cart =
      readCart();

    var totalQuantity =
      getCartQuantity(
        cart
      );

    updateCartBadges(
      totalQuantity
    );

    var miniCartItems =
      document.getElementById(
        "miniCartItems"
      );

    if (!miniCartItems) {
      return;
    }

    miniCartItems.replaceChildren();

    var cartSummary =
      document.createElement(
        "p"
      );

    if (
      totalQuantity ===
      0
    ) {
      cartSummary.textContent =
        "Your cart is empty.";
    } else if (
      totalQuantity ===
      1
    ) {
      cartSummary.textContent =
        "1 item in your cart.";
    } else {
      cartSummary.textContent =
        totalQuantity +
        " items in your cart.";
    }

    miniCartItems.appendChild(
      cartSummary
    );

    var cartLink =
      document.createElement(
        "a"
      );

    cartLink.className =
      "mini-cart-link";

    if (
      totalQuantity ===
      0
    ) {
      cartLink.href =
        "shop.html";

      cartLink.textContent =
        "Browse the Shop";
    } else {
      cartLink.href =
        "cart.html";

      cartLink.textContent =
        "View Cart";
    }

    miniCartItems.appendChild(
      cartLink
    );
  }

  // ==========================================================
  // PAGE INITIALIZATION
  // ==========================================================

  function initializeGallery() {
    getFilterButtons().forEach(
      function (button) {
        button.setAttribute(
          "type",
          "button"
        );

        button.setAttribute(
          "aria-pressed",
          "false"
        );

        button.addEventListener(
          "click",
          handleFilterClick
        );
      }
    );

    filterGallery(
      getSavedFilter()
    );

    loadGalleryMiniCart();

    document.addEventListener(
      "cartUpdated",
      loadGalleryMiniCart
    );

    window.addEventListener(
      "mmc-cart-updated",
      loadGalleryMiniCart
    );

    window.addEventListener(
      "storage",
      function (event) {
        if (
          event.key ===
          CART_STORAGE_KEY
        ) {
          loadGalleryMiniCart();
        }
      }
    );

    console.log(
      "MMC Gallery initialized."
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
      initializeGallery
    );
  } else {
    initializeGallery();
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.filterGallery =
    filterGallery;

  window.loadGalleryMiniCart =
    loadGalleryMiniCart;
}());