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
      function (variant) {
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
        function (variant) {
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
        function (variant) {
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
    if (product.image) {
      return product.image;
    }

    var variantWithImage =
      product.variants.find(
        function (variant) {
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
            : (
                availableCount +
                " variants available"
              ),

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
    } catch (error) {
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
        function (item) {
          return (
            String(
              item.productId ||
              item.id ||
              ""
            ) ===
              product.id &&
            (
              item.variantIndex ===
                null ||
              item.variantIndex ===
                undefined
            )
          );
        }
      );

    if (existingItem) {
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
        existingQuantity +
        1;
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

    var productUrl =
      "product.html?id=" +
      encodeURIComponent(
        product.id
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

    viewProductLink.href =
      productUrl;

    var addButton =
      createElement(
        "button",
        (
          "product-action " +
          "add-product-action"
        ),
        "Add to Cart"
      );

    addButton.type =
      "button";

    if (!storeOpen) {
      addButton.disabled =
        true;

      addButton.textContent =
        "Shop Closed";
    } else if (
      !isProductAvailable(
        product
      )
    ) {
      addButton.disabled =
        true;

      addButton.textContent =
        "Out of Stock";
    } else if (
      product.variants.length >
      0
    ) {
      addButton.textContent =
        "Choose Options";

      addButton.addEventListener(
        "click",
        function () {
          window.location.assign(
            productUrl
          );
        }
      );
    } else {
      addButton.addEventListener(
        "click",
        function () {
          try {
            addButton.disabled =
              true;

            addSimpleProductToCart(
              product
            );

            showMessage(
              product.name +
              " was added to your cart.",
              "success"
            );
          } catch (error) {
            showMessage(
              getErrorMessage(
                error,
                "The product could not be added."
              ),
              "error"
            );
          } finally {
            addButton.disabled =
              false;

            addButton.textContent =
              "Add to Cart";
          }
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

    var previousValue =
      categorySelect.value ||
      "all";

    var categories =
      [];

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

    categorySelect.replaceChildren();

    var allCategoriesOption =
      document.createElement(
        "option"
      );

    allCategoriesOption.value =
      "all";

    allCategoriesOption.textContent =
      "All Categories";

    categorySelect.appendChild(
      allCategoriesOption
    );

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

    categorySelect.value =
      categories.indexOf(
        previousValue
      ) >= 0
        ? previousValue
        : "all";
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
            product.sku,
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
            selectedCategory ===
              "all" ||
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
          return secondProduct.name
            .localeCompare(
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

        return firstProduct.name
          .localeCompare(
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

    var resultCount =
      getElement(
        "shop-result-count"
      );

    shopGrid.replaceChildren();

    shopGrid.setAttribute(
      "aria-busy",
      "false"
    );

    if (resultCount) {
      resultCount.textContent =
        filteredProducts.length === 1
          ? "1 product"
          : (
              filteredProducts.length +
              " products"
            );
    }

    if (
      filteredProducts.length ===
      0
    ) {
      shopGrid.appendChild(
        createElement(
          "p",
          "shop-empty",
          "No products match your filters."
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

      /*
       * Settings are optional. If the backend does not have a
       * public /settings route, the shop remains open.
       */

      if (!response.ok) {
        return;
      }

      var data =
        await readResponse(
          response
        );

      var settings =
        data.settings ||
        data;

      if (
        settings.storeOpen !==
        undefined
      ) {
        storeOpen =
          settings.storeOpen !==
          false;
      } else if (
        settings.store_open !==
        undefined
      ) {
        storeOpen =
          settings.store_open !==
          false;
      }

      if (closedNotice) {
        closedNotice.hidden =
          storeOpen;

        closedNotice.textContent =
          String(
            settings.closedStoreMessage ||
            settings.closed_store_message ||
            "The online shop is temporarily unavailable."
          );
      }
    } catch (error) {
      console.warn(
        "Shop settings could not be loaded.",
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
      shopGrid.setAttribute(
        "aria-busy",
        "true"
      );

      shopGrid.replaceChildren(
        createElement(
          "p",
          "shop-loading",
          "Loading shop products..."
        )
      );
    }

    if (refreshButton) {
      refreshButton.disabled =
        true;

      refreshButton.textContent =
        "Refreshing...";
    }

    try {
      var response =
        await fetchWithTimeout(
          PRODUCTS_URL,
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      var data =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data.error ||
            data.message ||
            data,
            "Products could not be loaded."
          )
        );
      }

      var productList =
        Array.isArray(data)
          ? data
          : (
              Array.isArray(
                data.products
              )
                ? data.products
                : []
            );

      shopProducts =
        productList
          .map(
            normalizeProduct
          )
          .filter(
            function (product) {
              return (
                product.id &&
                product.active
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
        "Shop products could not be loaded.",
        error
      );

      shopProducts =
        [];

      if (shopGrid) {
        shopGrid.setAttribute(
          "aria-busy",
          "false"
        );

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

      var errorMessage =
        error &&
        error.name ===
          "AbortError"
          ? "The product request took too long. Please try again."
          : getErrorMessage(
              error,
              "Shop products could not be loaded."
            );

      showMessage(
        errorMessage,
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
  // PAGE INITIALIZATION
  // ==========================================================

  async function initializeShop() {
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
        async function () {
          await loadStoreSettings();
          await loadProducts();
        }
      );
    }

    await loadStoreSettings();
    await loadProducts();

    console.log(
      "MMC shop initialized."
    );

    console.log(
      "MMC shop backend URL:",
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
      initializeShop
    );
  } else {
    initializeShop();
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.loadShopProducts =
    loadProducts;

  window.renderShopProducts =
    renderProducts;
}());