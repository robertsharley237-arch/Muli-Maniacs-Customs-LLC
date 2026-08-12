// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// GALLERY FILTERS AND MINI CART
// ============================================================

(function () {
  "use strict";

  var GALLERY_FILTER_STORAGE_KEY =
    "mmcGalleryFilter";

  var GALLERY_ALL_FILTER =
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

  function getGalleryFilterButtons() {
    return Array.prototype.slice.call(
      document.querySelectorAll(
        "[data-gallery-filter]"
      )
    );
  }

  function normalizeGalleryCategory(
    value
  ) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  // ==========================================================
  // ACTIVE FILTER BUTTON
  // ==========================================================

  function updateActiveGalleryButton(
    selectedFilter
  ) {
    var buttons =
      getGalleryFilterButtons();

    buttons.forEach(
      function (button) {
        var buttonFilter =
          normalizeGalleryCategory(
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

  function saveGalleryFilter(
    selectedFilter
  ) {
    try {
      sessionStorage.setItem(
        GALLERY_FILTER_STORAGE_KEY,
        selectedFilter
      );
    } catch (error) {
      console.warn(
        "Gallery filter could not be saved:",
        error
      );
    }
  }

  function getSavedGalleryFilter() {
    try {
      return (
        sessionStorage.getItem(
          GALLERY_FILTER_STORAGE_KEY
        ) ||
        GALLERY_ALL_FILTER
      );
    } catch (error) {
      return GALLERY_ALL_FILTER;
    }
  }

  // ==========================================================
  // FILTER GALLERY
  // ==========================================================

  function filterGallery(
    selectedCategory
  ) {
    var selectedFilter =
      normalizeGalleryCategory(
        selectedCategory
      ) ||
      GALLERY_ALL_FILTER;

    var cards =
      getGalleryCards();

    var visibleCount = 0;

    cards.forEach(
      function (card) {
        var cardCategory =
          normalizeGalleryCategory(
            card.getAttribute(
              "data-gallery-category"
            )
          );

        var shouldShow =
          selectedFilter ===
            GALLERY_ALL_FILTER ||
          cardCategory ===
            selectedFilter;

        card.hidden =
          !shouldShow;

        if (shouldShow) {
          visibleCount += 1;
        }
      }
    );

    updateActiveGalleryButton(
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

    saveGalleryFilter(
      selectedFilter
    );
  }

  // ==========================================================
  // FILTER BUTTON CLICK
  // ==========================================================

  function handleGalleryFilterClick(
    event
  ) {
    var button =
      event.currentTarget;

    var selectedFilter =
      button.getAttribute(
        "data-gallery-filter"
      );

    filterGallery(
      selectedFilter ||
      GALLERY_ALL_FILTER
    );
  }

  // ==========================================================
  // MINI CART
  // ==========================================================

  function readGalleryCart() {
    try {
      var savedCart =
        localStorage.getItem(
          "cart"
        );

      var parsedCart =
        savedCart
          ? JSON.parse(savedCart)
          : [];

      return Array.isArray(
        parsedCart
      )
        ? parsedCart
        : [];
    } catch (error) {
      console.warn(
        "Gallery mini cart could not be loaded:",
        error
      );

      return [];
    }
  }

  function getGalleryCartQuantity(
    cart
  ) {
    return cart.reduce(
      function (total, item) {
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
          quantity = 1;
        }

        return total + quantity;
      },
      0
    );
  }

  function loadGalleryMiniCart() {
    var miniCartItems =
      document.getElementById(
        "miniCartItems"
      );

    if (!miniCartItems) {
      return;
    }

    var cart =
      readGalleryCart();

    miniCartItems.replaceChildren();

    if (cart.length === 0) {
      var emptyMessage =
        document.createElement(
          "p"
        );

      emptyMessage.textContent =
        "Your cart is empty.";

      miniCartItems.appendChild(
        emptyMessage
      );

      return;
    }

    var itemCount =
      getGalleryCartQuantity(
        cart
      );

    var cartSummary =
      document.createElement(
        "p"
      );

    var cartLink =
      document.createElement(
        "a"
      );

    if (itemCount === 1) {
      cartSummary.textContent =
        "1 item in your cart.";
    } else {
      cartSummary.textContent =
        itemCount +
        " items in your cart.";
    }

    cartLink.href =
      "Cart.html";

    cartLink.textContent =
      "View Cart";

    miniCartItems.appendChild(
      cartSummary
    );

    miniCartItems.appendChild(
      cartLink
    );
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  function initializeGallery() {
    var buttons =
      getGalleryFilterButtons();

    buttons.forEach(
      function (button) {
        button.setAttribute(
          "aria-pressed",
          "false"
        );

        button.addEventListener(
          "click",
          handleGalleryFilterClick
        );
      }
    );

    filterGallery(
      getSavedGalleryFilter()
    );

    loadGalleryMiniCart();
  }

  document.addEventListener(
    "DOMContentLoaded",
    initializeGallery
  );

  // ==========================================================
  // OPTIONAL INLINE HTML SUPPORT
  // ==========================================================

  window.filterGallery =
    filterGallery;

  window.loadGalleryMiniCart =
    loadGalleryMiniCart;
})();