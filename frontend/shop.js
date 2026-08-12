// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// PUBLIC SHOP PAGE
// ============================================================

(function () {
  "use strict";

  var SHOP_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var PRODUCTS_URL =
    SHOP_BACKEND_URL +
    "/products";

  var SETTINGS_URL =
    SHOP_BACKEND_URL +
    "/settings";

  var shopProducts = [];
  var storeOpen = true;

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
          "Request failed with status " +
          response.status +
          "."
        )
      );
    }

    return data;
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
      message || "";

    messageBox.classList.remove(
      "shop-error",
      "shop-success",
      "shop-information"
    );

    if (messageType === "error") {
      messageBox.classList.add(
        "shop-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageBox.classList.add(
        "shop-success"
      );
    } else {
      messageBox.classList.add(
        "shop-information"
      );
    }
  }

  // ==========================================================
  // NORMALIZE PRODUCT
  // ==========================================================

  function normalizeProduct(
    product
  ) {
    return {
      id: String(
        product.id ||
        product._id ||
        ""
      ),

      name: String(
        product.name ||
        "Unnamed Product"
      ),

      description: String(
        product.description || ""
      ),

      category: String(
        product.category ||
        "General"
      ),

      price: Math.max(
        0,
        Number(
          product.price || 0
        )
      ),

      stock: Math.max(
        0,
        Number(
          product.stock || 0
        )
      ),

      image: String(
        product.image || ""
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

  // ==========================================================
  // CURRENCY
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
  // PRODUCT AVAILABILITY
  // ==========================================================

  function getAvailableVariants(
    product
  ) {
    return product.variants.filter(
      function (variant) {
        return (
          Number(
            variant.stock || 0
          ) > 0
        );
      }
    );
  }

  function isProductAvailable(
    product
  ) {
    if (product.variants.length) {
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

    if (!availableVariants.length) {
      return product.price;
    }

    var prices =
      availableVariants.map(
        function (variant) {
          return Math.max(
            0,
            Number(
              variant.price || 0
            )
          );
        }
      );

    return Math.min.apply(
      null,
      prices
    );
  }

  function getPriceText(
    product
  ) {
    var availableVariants =
      getAvailableVariants(
        product
      );

    if (!availableVariants.length) {
      return formatCurrency(
        product.price
      );
    }

    var prices =
      availableVariants.map(
        function (variant) {
          return Math.max(
            0,
            Number(
              variant.price || 0
            )
          );
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
    var imageUrl =
      product.image;

    product.variants.some(
      function (variant) {
        if (variant.image) {
          imageUrl =
            String(
              variant.image
            );

          return true;
        }

        return false;
      }
    );

    return imageUrl;
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

    if (!imageUrl) {
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
    if (product.variants.length) {
      var availableCount =
        getAvailableVariants(
          product
        ).length;

      if (!availableCount) {
        return {
          text:
            "Out of stock",

          className:
            "product-stock stock-unavailable"
        };
      }

      return {
        text:
          availableCount +
          (
            availableCount === 1
              ? " variant available"
              : " variants available"
          ),

        className:
          "product-stock stock-available"
      };
    }

    if (product.stock <= 0) {
      return {
        text:
          "Out of stock",

        className:
          "product-stock stock-unavailable"
      };
    }

    if (product.stock <= 5) {
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
  // CREATE PRODUCT CARD
  // ==========================================================

  function createProductCard(
    product
  ) {
    var card =
      createElement(
        "article",
        "product-card"
      );

    var content =
      createElement(
        "div",
        "product-card-content"
      );

    var stockDisplay =
      getStockDisplay(
        product
      );

    var actions =
      createElement(
        "div",
        "product-card-actions"
      );

    var viewProductLink =
      createElement(
        "a",
        (
          "product-action " +
          "view-product-action"
        ),
        "View Product"
      );

    var addButton =
      createElement(
        "button",
        (
          "product-action " +
          "add-product-action"
        ),
        "Add to Cart"
      );

    viewProductLink.href =
      "product.html?id=" +
      encodeURIComponent(
        product.id
      );

    addButton.type =
      "button";

    if (!storeOpen) {
      addButton.disabled = true;

      addButton.textContent =
        "Shop Closed";
    } else if (
      !isProductAvailable(
        product
      )
    ) {
      addButton.disabled = true;

      addButton.textContent =
        "Out of Stock";
    } else if (
      product.variants.length
    ) {
      addButton.textContent =
        "Choose Options";

      addButton.addEventListener(
        "click",
        function () {
          window.location.href =
            "product.html?id=" +
            encodeURIComponent(
              product.id
            );
        }
      );
    } else {
      addButton.addEventListener(
        "click",
        async function () {
          if (
            typeof window.addToCart !==
            "function"
          ) {
            showMessage(
              "The cart system could not be loaded.",
              "error"
            );

            return;
          }

          addButton.disabled =
            true;

          addButton.textContent =
            "Adding...";

          await window.addToCart(
            product.id,
            null
          );

          addButton.disabled =
            false;

          addButton.textContent =
            "Add to Cart";

          showMessage(
            product.name +
            " was added to your cart.",
            "success"
          );
        }
      );
    }

    content.appendChild(
      createElement(
        "p",
        "product-category",
        product.category
      )
    );

    content.appendChild(
      createElement(
        "h2",
        "product-name",
        product.name
      )
    );

    if (product.description) {
      content.appendChild(
        createElement(
          "p",
          "product-description",
          product.description
        )
      );
    }

    content.appendChild(
      createElement(
        "p",
        "product-price",
        getPriceText(
          product
        )
      )
    );

    content.appendChild(
      createElement(
        "p",
        stockDisplay.className,
        stockDisplay.text
      )
    );

    actions.appendChild(
      viewProductLink
    );

    actions.appendChild(
      addButton
    );

    content.appendChild(
      actions
    );

    card.appendChild(
      createProductImage(
        product
      )
    );

    card.appendChild(
      content
    );

    return card;
  }

  // ==========================================================
  // CATEGORY FILTER
  // ==========================================================

  function populateCategories() {
    var categorySelect =
      getElement(
        "shop-category-filter"
      );

    if (!categorySelect) {
      return;
    }

    var selectedCategory =
      categorySelect.value;

    var categories = [];

    shopProducts.forEach(
      function (product) {
        if (
          categories.indexOf(
            product.category
          ) === -1
        ) {
          categories.push(
            product.category
          );
        }
      }
    );

    categories.sort(
      function (
        firstCategory,
        secondCategory
      ) {
        return firstCategory.localeCompare(
          secondCategory
        );
      }
    );

    categorySelect.innerHTML =
      '<option value="all">All Categories</option>';

    categories.forEach(
      function (category) {
        var option =
          document.createElement(
            "option"
          );

        option.value =
          category;

        option.textContent =
          category;

        categorySelect.appendChild(
          option
        );
      }
    );

    if (
      selectedCategory === "all" ||
      categories.indexOf(
        selectedCategory
      ) >= 0
    ) {
      categorySelect.value =
        selectedCategory;
    }
  }

  // ==========================================================
  // SEARCH, FILTER, AND SORT
  // ==========================================================

  function getFilteredProducts() {
    var searchInput =
      getElement(
        "shop-search"
      );

    var categorySelect =
      getElement(
        "shop-category-filter"
      );

    var sortSelect =
      getElement(
        "shop-sort"
      );

    var searchQuery =
      searchInput
        ? searchInput.value
            .trim()
            .toLowerCase()
        : "";

    var selectedCategory =
      categorySelect
        ? categorySelect.value
        : "all";

    var selectedSort =
      sortSelect
        ? sortSelect.value
        : "name-ascending";

    var filteredProducts =
      shopProducts.filter(
        function (product) {
          var searchableText = [
            product.name,
            product.category,
            product.description
          ]
            .join(" ")
            .toLowerCase();

          var searchMatches =
            !searchQuery ||
            searchableText.indexOf(
              searchQuery
            ) >= 0;

          var categoryMatches =
            selectedCategory === "all" ||
            product.category ===
              selectedCategory;

          return (
            searchMatches &&
            categoryMatches
          );
        }
      );

    filteredProducts.sort(
      function (
        firstProduct,
        secondProduct
      ) {
        if (
          selectedSort ===
          "name-descending"
        ) {
          return secondProduct.name.localeCompare(
            firstProduct.name
          );
        }

        if (
          selectedSort ===
          "price-low"
        ) {
          return (
            getStartingPrice(
              firstProduct
            ) -
            getStartingPrice(
              secondProduct
            )
          );
        }

        if (
          selectedSort ===
          "price-high"
        ) {
          return (
            getStartingPrice(
              secondProduct
            ) -
            getStartingPrice(
              firstProduct
            )
          );
        }

        return firstProduct.name.localeCompare(
          secondProduct.name
        );
      }
    );

    return filteredProducts;
  }

  // ==========================================================
  // RENDER PRODUCTS
  // ==========================================================

  function renderProducts() {
    var shopGrid =
      getElement(
        "shop-grid"
      );

    if (!shopGrid) {
      return;
    }

    var filteredProducts =
      getFilteredProducts();

    shopGrid.replaceChildren();

    var resultCount =
      getElement(
        "shop-result-count"
      );

    if (resultCount) {
      resultCount.textContent =
        filteredProducts.length +
        (
          filteredProducts.length === 1
            ? " product"
            : " products"
        );
    }

    if (!filteredProducts.length) {
      shopGrid.appendChild(
        createElement(
          "p",
          "shop-empty",
          "No available products match your filters."
        )
      );

      return;
    }

    filteredProducts.forEach(
      function (product) {
        shopGrid.appendChild(
          createProductCard(
            product
          )
        );
      }
    );
  }

  // ==========================================================
  // LOAD STORE SETTINGS
  // ==========================================================

  async function loadStoreSettings() {
    var closedNotice =
      getElement(
        "shop-closed-notice"
      );

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

      if (
        settings.storeOpen !==
          undefined
      ) {
        storeOpen =
          settings.storeOpen !==
          false;
      } else {
        storeOpen =
          settings.store_open !==
          false;
      }

      if (closedNotice) {
        closedNotice.hidden =
          storeOpen;

        closedNotice.textContent =
          settings.closedStoreMessage ||
          settings.closed_store_message ||
          "The online shop is temporarily unavailable.";
      }
    } catch (error) {
      console.warn(
        "Shop settings could not be loaded:",
        error
      );
    }
  }

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  async function loadProducts() {
    var shopGrid =
      getElement(
        "shop-grid"
      );

    var refreshButton =
      getElement(
        "refresh-shop-button"
      );

    if (shopGrid) {
      shopGrid.replaceChildren(
        createElement(
          "p",
          "shop-loading",
          "Loading shop products..."
        )
      );
    }

    try {
      if (refreshButton) {
        refreshButton.disabled =
          true;

        refreshButton.textContent =
          "Refreshing...";
      }

      var response = await fetch(
        PRODUCTS_URL,
        {
          method: "GET"
        }
      );

      var data =
        await readResponse(
          response
        );

      var productList;

      if (Array.isArray(data)) {
        productList = data;
      } else if (
        data &&
        Array.isArray(
          data.products
        )
      ) {
        productList =
          data.products;
      } else {
        productList = [];
      }

      shopProducts =
        productList
          .map(
            normalizeProduct
          )
          .filter(
            function (product) {
              return (
                product.id &&
                product.active &&
                isProductAvailable(
                  product
                )
              );
            }
          );

      populateCategories();
      renderProducts();

      showMessage(
        "",
        "information"
      );
    } catch (error) {
      console.error(
        "Shop products could not be loaded:",
        error
      );

      shopProducts = [];

      if (shopGrid) {
        shopGrid.replaceChildren(
          createElement(
            "p",
            "shop-empty",
            "Shop products could not be loaded."
          )
        );
      }

      var resultCount =
        getElement(
          "shop-result-count"
        );

      if (resultCount) {
        resultCount.textContent =
          "0 products";
      }

      showMessage(
        error.message ||
        "Shop products could not be loaded.",
        "error"
      );
    } finally {
      if (refreshButton) {
        refreshButton.disabled =
          false;

        refreshButton.textContent =
          "Refresh Shop";
      }
    }
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    async function () {
      var searchInput =
        getElement(
          "shop-search"
        );

      var categorySelect =
        getElement(
          "shop-category-filter"
        );

      var sortSelect =
        getElement(
          "shop-sort"
        );

      var refreshButton =
        getElement(
          "refresh-shop-button"
        );

      if (searchInput) {
        searchInput.addEventListener(
          "input",
          renderProducts
        );
      }

      if (categorySelect) {
        categorySelect.addEventListener(
          "change",
          renderProducts
        );
      }

      if (sortSelect) {
        sortSelect.addEventListener(
          "change",
          renderProducts
        );
      }

      if (refreshButton) {
        refreshButton.addEventListener(
          "click",
          loadProducts
        );
      }

      await loadStoreSettings();
      await loadProducts();
    }
  );

  // ==========================================================
  // OPTIONAL GLOBAL SUPPORT
  // ==========================================================

  window.loadShopProducts =
    loadProducts;

  window.renderShopProducts =
    renderProducts;
}());