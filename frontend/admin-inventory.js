// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-inventory.js
// ADMINISTRATOR INVENTORY MANAGEMENT
//
// Backend: Express + Neon PostgreSQL
// Authentication: JWT
// Products: Base products and product variants
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var ADMIN_LOGIN_PAGE =
    "admin-login.html";

  var REQUEST_TIMEOUT_MILLISECONDS =
    15000;

  var inventoryProducts =
    [];

  var selectedInventoryProduct =
    null;

  var inventoryRequestActive =
    false;

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

    var savedBackendUrl =
      localStorage.getItem(
        "MMC_BACKEND_URL"
      );

    if (savedBackendUrl) {
      return removeTrailingSlashes(
        savedBackendUrl
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

  var ADMIN_ME_URL =
    BACKEND_URL +
    "/admin/me";

  var ADMIN_PRODUCTS_URL =
    BACKEND_URL +
    "/admin/products";

  var PRODUCTS_URL =
    BACKEND_URL +
    "/products";

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

  function setText(
    elementId,
    value
  ) {
    var element =
      getElement(
        elementId
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

  function setHidden(
    elementId,
    hidden
  ) {
    var element =
      getElement(
        elementId
      );

    if (element) {
      element.hidden =
        Boolean(hidden);
    }
  }

  function createOption(
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

  // ==========================================================
  // ADMINISTRATOR AUTHENTICATION
  // ==========================================================

  function getAdminToken() {
    return String(
      localStorage.getItem(
        "adminToken"
      ) ||
      localStorage.getItem(
        "MMC_ADMIN_TOKEN"
      ) ||
      ""
    ).trim();
  }

  function getAdminHeaders(
    includeJson
  ) {
    var headers = {
      Accept:
        "application/json",

      Authorization:
        "Bearer " +
        getAdminToken()
    };

    if (includeJson) {
      headers["Content-Type"] =
        "application/json";
    }

    return headers;
  }

  function clearAdminSession() {
    localStorage.removeItem(
      "adminToken"
    );

    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
    );

    localStorage.removeItem(
      "adminUser"
    );

    localStorage.removeItem(
      "admin_token"
    );

    localStorage.removeItem(
      "token"
    );
  }

  function redirectToAdminLogin() {
    clearAdminSession();

    window.location.replace(
      ADMIN_LOGIN_PAGE +
      "?return=" +
      encodeURIComponent(
        "admin-inventory.html"
      )
    );
  }

  function logoutAdmin() {
    redirectToAdminLogin();
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

    var timeoutId =
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
      "";

    try {
      responseText =
        await response.text();
    } catch (error) {
      responseText =
        "";
    }

    var data =
      {};

    if (responseText) {
      try {
        data =
          JSON.parse(
            responseText
          );
      } catch (error) {
        data = {
          error:
            responseText
        };
      }
    }

    if (
      response.status ===
      401
    ) {
      redirectToAdminLogin();

      throw new Error(
        getErrorMessage(
          data,
          "Your administrator session expired."
        )
      );
    }

    if (
      response.status ===
      403
    ) {
      throw new Error(
        getErrorMessage(
          data,
          "You do not have permission to manage inventory."
        )
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          (
            "The inventory request failed with status " +
            response.status +
            "."
          )
        )
      );
    }

    return data;
  }

  function getErrorMessage(
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
        return getErrorMessage(
          value.error,
          fallbackMessage
        );
      }
    }

    return fallbackMessage;
  }

  function getRequestErrorMessage(
    error,
    fallbackMessage
  ) {
    if (
      error &&
      error.name ===
        "AbortError"
    ) {
      return (
        "The inventory request took too long. " +
        "Check the backend connection and try again."
      );
    }

    if (
      error instanceof
        TypeError
    ) {
      return (
        "The inventory server could not be reached. " +
        "Make sure the backend is running and the backend URL is correct."
      );
    }

    return getErrorMessage(
      error,
      fallbackMessage
    );
  }

  async function requestJson(
    url,
    options
  ) {
    var response =
      await fetchWithTimeout(
        url,
        options
      );

    return readResponse(
      response
    );
  }

  // ==========================================================
  // MESSAGES
  // ==========================================================

  function showInventoryMessage(
    message,
    messageType
  ) {
    var messageElement =
      getElement(
        "inventory-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      String(message || "");

    messageElement.classList.remove(
      "inventory-error",
      "inventory-success",
      "inventory-information"
    );

    messageElement.removeAttribute(
      "role"
    );

    if (!message) {
      return;
    }

    if (
      messageType ===
      "success"
    ) {
      messageElement.classList.add(
        "inventory-success"
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
        "inventory-information"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else {
      messageElement.classList.add(
        "inventory-error"
      );

      messageElement.setAttribute(
        "role",
        "alert"
      );
    }
  }

  function clearInventoryMessage() {
    showInventoryMessage(
      "",
      "information"
    );
  }

  // ==========================================================
  // ADMINISTRATOR INFORMATION
  // ==========================================================

  function formatAdminRole(
    role
  ) {
    return String(
      role ||
      "Administrator"
    )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  function displayAdminInformation(
    administrator
  ) {
    var username =
      String(
        administrator.username ||
        administrator.name ||
        administrator.email ||
        "Administrator"
      );

    var role =
      formatAdminRole(
        administrator.role
      );

    [
      "admin-username",
      "admin-header-username"
    ].forEach(
      function (elementId) {
        setText(
          elementId,
          username
        );
      }
    );

    [
      "admin-role",
      "admin-header-role"
    ].forEach(
      function (elementId) {
        setText(
          elementId,
          role
        );
      }
    );
  }

  async function verifyAdminSession() {
    if (!getAdminToken()) {
      redirectToAdminLogin();

      return false;
    }

    try {
      var data =
        await requestJson(
          ADMIN_ME_URL,
          {
            method:
              "GET",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      var administrator =
        data.admin ||
        data.user ||
        data;

      if (
        !administrator ||
        typeof administrator !==
          "object"
      ) {
        throw new Error(
          "The administrator information was not returned."
        );
      }

      localStorage.setItem(
        "adminUser",
        JSON.stringify(
          administrator
        )
      );

      displayAdminInformation(
        administrator
      );

      return true;
    } catch (error) {
      console.error(
        "Administrator verification failed.",
        error
      );

      showInventoryMessage(
        getRequestErrorMessage(
          error,
          "The administrator session could not be verified."
        ),
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // PRODUCT NORMALIZATION
  // ==========================================================

  function normalizeWholeNumber(
    value,
    fallbackValue
  ) {
    var number =
      Number(value);

    if (
      !Number.isFinite(number)
    ) {
      number =
        Number(fallbackValue);

      if (
        !Number.isFinite(number)
      ) {
        number =
          0;
      }
    }

    return Math.max(
      0,
      Math.floor(number)
    );
  }

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

  function normalizeProduct(
    product
  ) {
    var source =
      product &&
      typeof product ===
        "object"
        ? product
        : {};

    var warningLevel =
      source.lowStockWarning;

    if (
      warningLevel ===
      undefined
    ) {
      warningLevel =
        source.low_stock_warning;
    }

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

      price:
        normalizeMoney(
          source.price
        ),

      category:
        String(
          source.category ||
          source.categoryName ||
          "General"
        ),

      categoryId:
        source.categoryId ||
        source.category_id ||
        null,

      categorySlug:
        String(
          source.categorySlug ||
          source.category_slug ||
          ""
        ),

      description:
        String(
          source.description ||
          ""
        ),

      image:
        String(
          source.image ||
          ""
        ),

      imagePublicId:
        String(
          source.imagePublicId ||
          source.image_public_id ||
          ""
        ),

      stock:
        normalizeWholeNumber(
          source.stock,
          0
        ),

      lowStockWarning:
        normalizeWholeNumber(
          warningLevel,
          5
        ),

      active:
        source.active !==
        false,

      variants:
        variants.map(
          function (
            variant,
            variantIndex
          ) {
            var variantSource =
              variant &&
              typeof variant ===
                "object"
                ? variant
                : {};

            return {
              index:
                variantIndex,

              id:
                String(
                  variantSource.id ||
                  variantSource._id ||
                  ""
                ),

              name:
                String(
                  variantSource.name ||
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
                  variantSource.sku ||
                  ""
                ),

              price:
                normalizeMoney(
                  variantSource.price
                ),

              stock:
                normalizeWholeNumber(
                  variantSource.stock,
                  0
                ),

              image:
                String(
                  variantSource.image ||
                  ""
                ),

              imagePublicId:
                String(
                  variantSource.imagePublicId ||
                  variantSource.image_public_id ||
                  ""
                )
            };
          }
        )
    };
  }

  function getProductList(
    data
  ) {
    if (
      Array.isArray(data)
    ) {
      return data;
    }

    if (
      data &&
      Array.isArray(
        data.products
      )
    ) {
      return data.products;
    }

    if (
      data &&
      data.data &&
      Array.isArray(
        data.data.products
      )
    ) {
      return data.data.products;
    }

    return [];
  }

  // ==========================================================
  // SELECTION HELPERS
  // ==========================================================

  function getProductSelect() {
    return getElement(
      "productSelect"
    );
  }

  function getVariantSelect() {
    return getElement(
      "variantSelect"
    );
  }

  function findProductById(
    productId
  ) {
    return (
      inventoryProducts.find(
        function (product) {
          return (
            product.id ===
            String(productId || "")
          );
        }
      ) ||
      null
    );
  }

  function findSelectedProduct() {
    var productSelect =
      getProductSelect();

    if (!productSelect) {
      return null;
    }

    return findProductById(
      productSelect.value
    );
  }

  function getSelectedVariantIndex() {
    var variantSelect =
      getVariantSelect();

    if (
      !variantSelect ||
      variantSelect.value ===
        ""
    ) {
      return null;
    }

    var variantIndex =
      Number(
        variantSelect.value
      );

    if (
      !Number.isInteger(
        variantIndex
      ) ||
      variantIndex < 0
    ) {
      return null;
    }

    return variantIndex;
  }

  function getSelectedVariant() {
    if (!selectedInventoryProduct) {
      return null;
    }

    var variantIndex =
      getSelectedVariantIndex();

    if (
      variantIndex ===
      null
    ) {
      return null;
    }

    return (
      selectedInventoryProduct
        .variants[
          variantIndex
        ] ||
      null
    );
  }

  function getCurrentStock() {
    var variant =
      getSelectedVariant();

    if (variant) {
      return normalizeWholeNumber(
        variant.stock,
        0
      );
    }

    if (selectedInventoryProduct) {
      return normalizeWholeNumber(
        selectedInventoryProduct.stock,
        0
      );
    }

    return 0;
  }

  // ==========================================================
  // BUTTON STATES
  // ==========================================================

  function setInventoryButtonsEnabled(
    enabled
  ) {
    [
      "increase-stock-button",
      "decrease-stock-button",
      "set-stock-button"
    ].forEach(
      function (elementId) {
        var button =
          getElement(
            elementId
          );

        if (button) {
          button.disabled =
            !enabled ||
            inventoryRequestActive;
        }
      }
    );
  }

  function setInventoryRequestLoading(
    isLoading,
    activeButton
  ) {
    inventoryRequestActive =
      Boolean(isLoading);

    [
      "increase-stock-button",
      "decrease-stock-button",
      "set-stock-button",
      "refresh-products-button"
    ].forEach(
      function (elementId) {
        var button =
          getElement(
            elementId
          );

        if (button) {
          button.disabled =
            isLoading ||
            (
              elementId !==
                "refresh-products-button" &&
              !selectedInventoryProduct
            );
        }
      }
    );

    if (activeButton) {
      activeButton.setAttribute(
        "aria-busy",
        isLoading
          ? "true"
          : "false"
      );
    }

    if (
      !isLoading &&
      selectedInventoryProduct
    ) {
      setInventoryButtonsEnabled(
        true
      );
    }
  }

  function restoreButtonText() {
    setText(
      "increase-stock-button",
      "Increase Stock"
    );

    setText(
      "decrease-stock-button",
      "Decrease Stock"
    );

    setText(
      "set-stock-button",
      "Set Exact Stock Amount"
    );
  }

  // ==========================================================
  // RESET INVENTORY SELECTION
  // ==========================================================

  function resetInventorySelection() {
    selectedInventoryProduct =
      null;

    var variantSelect =
      getVariantSelect();

    if (variantSelect) {
      variantSelect.replaceChildren(
        createOption(
          "",
          "Use Base Product Stock"
        )
      );

      variantSelect.disabled =
        true;
    }

    setHidden(
      "variant-field",
      true
    );

    setHidden(
      "selected-inventory-details",
      true
    );

    setHidden(
      "stock-display",
      true
    );

    setText(
      "inventory-product-name",
      "Not selected"
    );

    setText(
      "inventory-product-sku",
      "Not available"
    );

    setText(
      "inventory-product-category",
      "Not available"
    );

    setText(
      "inventory-type",
      "Base product"
    );

    setText(
      "current-stock-number",
      "0"
    );

    setText(
      "stock-warning-display",
      "Select a product to view its inventory."
    );

    setInventoryButtonsEnabled(
      false
    );
  }

  // ==========================================================
  // VARIANT OPTIONS
  // ==========================================================

  function buildVariantOptions() {
    var variantSelect =
      getVariantSelect();

    if (!variantSelect) {
      return;
    }

    variantSelect.replaceChildren(
      createOption(
        "",
        "Use Base Product Stock"
      )
    );

    if (
      !selectedInventoryProduct ||
      selectedInventoryProduct
        .variants.length ===
        0
    ) {
      variantSelect.disabled =
        true;

      setHidden(
        "variant-field",
        true
      );

      displaySelectedInventoryItem();

      return;
    }

    selectedInventoryProduct
      .variants
      .forEach(
        function (
          variant,
          variantIndex
        ) {
          variantSelect.appendChild(
            createOption(
              variantIndex,
              (
                variant.name +
                " | " +
                (
                  variant.sku ||
                  "No SKU"
                ) +
                " | Stock: " +
                variant.stock
              )
            )
          );
        }
      );

    variantSelect.disabled =
      false;

    setHidden(
      "variant-field",
      false
    );

    displaySelectedInventoryItem();
  }

  // ==========================================================
  // STOCK DISPLAY
  // ==========================================================

  function updateStockDisplay(
    stock,
    warningLevel
  ) {
    var stockElement =
      getElement(
        "current-stock-number"
      );

    var warningElement =
      getElement(
        "stock-warning-display"
      );

    if (!stockElement) {
      return;
    }

    stockElement.textContent =
      String(stock);

    stockElement.classList.remove(
      "stock-normal",
      "stock-low",
      "stock-empty"
    );

    if (stock <= 0) {
      stockElement.classList.add(
        "stock-empty"
      );

      if (warningElement) {
        warningElement.textContent =
          "This inventory item is out of stock.";
      }
    } else if (
      stock <=
      warningLevel
    ) {
      stockElement.classList.add(
        "stock-low"
      );

      if (warningElement) {
        warningElement.textContent =
          (
            "Low stock warning. " +
            "The warning level is " +
            warningLevel +
            "."
          );
      }
    } else {
      stockElement.classList.add(
        "stock-normal"
      );

      if (warningElement) {
        warningElement.textContent =
          (
            "Stock is above the warning level of " +
            warningLevel +
            "."
          );
      }
    }
  }

  function displaySelectedInventoryItem() {
    if (!selectedInventoryProduct) {
      resetInventorySelection();

      return;
    }

    var selectedVariant =
      getSelectedVariant();

    var displayedSku =
      selectedVariant
        ? selectedVariant.sku
        : selectedInventoryProduct.sku;

    var inventoryType =
      selectedVariant
        ? (
            "Variant: " +
            selectedVariant.name
          )
        : "Base product";

    var stock =
      selectedVariant
        ? selectedVariant.stock
        : selectedInventoryProduct.stock;

    setText(
      "inventory-product-name",
      selectedInventoryProduct.name
    );

    setText(
      "inventory-product-sku",
      displayedSku ||
      "No SKU"
    );

    setText(
      "inventory-product-category",
      selectedInventoryProduct.category ||
      "General"
    );

    setText(
      "inventory-type",
      inventoryType
    );

    setHidden(
      "selected-inventory-details",
      false
    );

    setHidden(
      "stock-display",
      false
    );

    updateStockDisplay(
      normalizeWholeNumber(
        stock,
        0
      ),
      selectedInventoryProduct
        .lowStockWarning
    );

    setInventoryButtonsEnabled(
      true
    );
  }

  // ==========================================================
  // SELECTION EVENTS
  // ==========================================================

  function handleProductSelection() {
    clearInventoryMessage();

    selectedInventoryProduct =
      findSelectedProduct();

    if (!selectedInventoryProduct) {
      resetInventorySelection();

      return;
    }

    buildVariantOptions();

    showInventoryMessage(
      (
        'Selected "' +
        selectedInventoryProduct.name +
        '".'
      ),
      "information"
    );
  }

  function handleVariantSelection() {
    if (!selectedInventoryProduct) {
      resetInventorySelection();

      return;
    }

    displaySelectedInventoryItem();

    var selectedVariant =
      getSelectedVariant();

    showInventoryMessage(
      selectedVariant
        ? (
            'Selected variant "' +
            selectedVariant.name +
            '".'
          )
        : "Selected base product inventory.",
      "information"
    );
  }

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  async function loadInventoryProducts(
    productIdToRestore,
    variantIndexToRestore
  ) {
    var productSelect =
      getProductSelect();

    var refreshButton =
      getElement(
        "refresh-products-button"
      );

    if (!productSelect) {
      showInventoryMessage(
        "The product selector could not be found.",
        "error"
      );

      return false;
    }

    productSelect.disabled =
      true;

    productSelect.replaceChildren(
      createOption(
        "",
        "Loading products..."
      )
    );

    if (refreshButton) {
      refreshButton.disabled =
        true;

      refreshButton.textContent =
        "Loading Products...";
    }

    showInventoryMessage(
      "Loading inventory products...",
      "information"
    );

    try {
      var data =
        await requestJson(
          ADMIN_PRODUCTS_URL,
          {
            method:
              "GET",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      inventoryProducts =
        getProductList(
          data
        )
          .map(
            normalizeProduct
          )
          .filter(
            function (product) {
              return Boolean(
                product.id
              );
            }
          )
          .sort(
            function (
              firstProduct,
              secondProduct
            ) {
              return firstProduct.name
                .localeCompare(
                  secondProduct.name
                );
            }
          );

      productSelect.replaceChildren();

      productSelect.appendChild(
        createOption(
          "",
          inventoryProducts.length > 0
            ? "Select a product"
            : "No products available"
        )
      );

      inventoryProducts.forEach(
        function (product) {
          productSelect.appendChild(
            createOption(
              product.id,
              (
                product.name +
                " | " +
                (
                  product.sku ||
                  "No SKU"
                ) +
                (
                  product.active
                    ? ""
                    : " | Inactive"
                )
              )
            )
          );
        }
      );

      productSelect.disabled =
        inventoryProducts.length ===
        0;

      resetInventorySelection();

      var restoredProduct =
        findProductById(
          productIdToRestore
        );

      if (restoredProduct) {
        productSelect.value =
          restoredProduct.id;

        selectedInventoryProduct =
          restoredProduct;

        buildVariantOptions();

        var variantSelect =
          getVariantSelect();

        if (
          variantSelect &&
          variantIndexToRestore !==
            null &&
          variantIndexToRestore !==
            undefined
        ) {
          var variantValue =
            String(
              variantIndexToRestore
            );

          var matchingOption =
            Array.prototype.find.call(
              variantSelect.options,
              function (option) {
                return (
                  option.value ===
                  variantValue
                );
              }
            );

          if (matchingOption) {
            variantSelect.value =
              variantValue;

            displaySelectedInventoryItem();
          }
        }
      }

      if (
        inventoryProducts.length ===
        0
      ) {
        showInventoryMessage(
          "No products are available for inventory management.",
          "information"
        );
      } else if (restoredProduct) {
        showInventoryMessage(
          "Inventory information refreshed.",
          "success"
        );
      } else {
        showInventoryMessage(
          "Select a product to manage its inventory.",
          "information"
        );
      }

      return true;
    } catch (error) {
      console.error(
        "Failed to load inventory products.",
        error
      );

      inventoryProducts =
        [];

      resetInventorySelection();

      productSelect.replaceChildren(
        createOption(
          "",
          "Failed to load products"
        )
      );

      productSelect.disabled =
        true;

      showInventoryMessage(
        getRequestErrorMessage(
          error,
          "The inventory products could not be loaded."
        ),
        "error"
      );

      return false;
    } finally {
      if (refreshButton) {
        refreshButton.disabled =
          false;

        refreshButton.textContent =
          "Refresh Products";
      }
    }
  }

  // ==========================================================
  // STOCK INPUT HELPERS
  // ==========================================================

  function getAdjustmentAmount() {
    var input =
      getElement(
        "stock-adjustment-amount"
      );

    var amount =
      Number(
        input
          ? input.value
          : 0
      );

    if (
      !Number.isInteger(amount) ||
      amount < 1
    ) {
      return null;
    }

    return amount;
  }

  function getExactStockAmount() {
    var input =
      getElement(
        "exact-stock-amount"
      );

    var inputValue =
      input
        ? input.value.trim()
        : "";

    if (!inputValue) {
      return null;
    }

    var amount =
      Number(inputValue);

    if (
      !Number.isInteger(amount) ||
      amount < 0
    ) {
      return null;
    }

    return amount;
  }

  // ==========================================================
  // UPDATE PAYLOAD
  // ==========================================================

  function createUpdatePayload(
    product,
    newStock,
    variantIndex
  ) {
    var variants =
      product.variants.map(
        function (variant) {
          return {
            id:
              variant.id ||
              undefined,

            name:
              variant.name,

            sku:
              variant.sku,

            price:
              variant.price,

            stock:
              variant.stock,

            image:
              variant.image,

            imagePublicId:
              variant.imagePublicId
          };
        }
      );

    if (
      variantIndex !==
        null &&
      variants[
        variantIndex
      ]
    ) {
      variants[
        variantIndex
      ].stock =
        newStock;
    }

    return {
      name:
        product.name,

      sku:
        product.sku,

      price:
        product.price,

      stock:
        variantIndex ===
          null
          ? newStock
          : product.stock,

      lowStockWarning:
        product.lowStockWarning,

      category:
        product.category,

      categoryId:
        product.categoryId,

      categorySlug:
        product.categorySlug,

      description:
        product.description,

      image:
        product.image,

      imagePublicId:
        product.imagePublicId,

      variants:
        variants,

      active:
        product.active
    };
  }

  // ==========================================================
  // SAVE INVENTORY
  // ==========================================================

  async function saveInventory(
    newStock,
    successMessage,
    activeButton
  ) {
    if (
      inventoryRequestActive ||
      !selectedInventoryProduct
    ) {
      return false;
    }

    if (
      !Number.isInteger(newStock) ||
      newStock < 0
    ) {
      showInventoryMessage(
        "The stock amount must be a whole number of 0 or higher.",
        "error"
      );

      return false;
    }

    var productId =
      selectedInventoryProduct.id;

    var variantIndex =
      getSelectedVariantIndex();

    var payload =
      createUpdatePayload(
        selectedInventoryProduct,
        newStock,
        variantIndex
      );

    setInventoryRequestLoading(
      true,
      activeButton
    );

    if (activeButton) {
      activeButton.textContent =
        "Saving...";
    }

    showInventoryMessage(
      "Saving inventory changes...",
      "information"
    );

    try {
      var data =
        await requestJson(
          PRODUCTS_URL +
          "/" +
          encodeURIComponent(
            productId
          ),
          {
            method:
              "PUT",

            headers:
              getAdminHeaders(
                true
              ),

            body:
              JSON.stringify(
                payload
              )
          }
        );

      if (
        variantIndex ===
        null
      ) {
        selectedInventoryProduct
          .stock =
          newStock;
      } else if (
        selectedInventoryProduct
          .variants[
            variantIndex
          ]
      ) {
        selectedInventoryProduct
          .variants[
            variantIndex
          ].stock =
          newStock;
      }

      displaySelectedInventoryItem();

      var exactInput =
        getElement(
          "exact-stock-amount"
        );

      if (exactInput) {
        exactInput.value =
          "";
      }

      showInventoryMessage(
        getErrorMessage(
          data.message,
          successMessage
        ),
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Inventory update failed.",
        error
      );

      showInventoryMessage(
        getRequestErrorMessage(
          error,
          "The inventory could not be updated."
        ),
        "error"
      );

      return false;
    } finally {
      setInventoryRequestLoading(
        false,
        activeButton
      );

      restoreButtonText();
    }
  }

  // ==========================================================
  // INVENTORY ACTIONS
  // ==========================================================

  async function increaseStock() {
    if (!selectedInventoryProduct) {
      showInventoryMessage(
        "Select a product or variant before increasing stock.",
        "error"
      );

      return;
    }

    var amount =
      getAdjustmentAmount();

    if (amount === null) {
      showInventoryMessage(
        "Enter a whole-number adjustment amount of 1 or higher.",
        "error"
      );

      return;
    }

    var newStock =
      getCurrentStock() +
      amount;

    await saveInventory(
      newStock,
      (
        "Stock increased by " +
        amount +
        ". The new stock amount is " +
        newStock +
        "."
      ),
      getElement(
        "increase-stock-button"
      )
    );
  }

  async function decreaseStock() {
    if (!selectedInventoryProduct) {
      showInventoryMessage(
        "Select a product or variant before decreasing stock.",
        "error"
      );

      return;
    }

    var amount =
      getAdjustmentAmount();

    if (amount === null) {
      showInventoryMessage(
        "Enter a whole-number adjustment amount of 1 or higher.",
        "error"
      );

      return;
    }

    var currentStock =
      getCurrentStock();

    if (amount > currentStock) {
      showInventoryMessage(
        (
          "Stock cannot be decreased by " +
          amount +
          " because only " +
          currentStock +
          " unit(s) are available."
        ),
        "error"
      );

      return;
    }

    var newStock =
      currentStock -
      amount;

    await saveInventory(
      newStock,
      (
        "Stock decreased by " +
        amount +
        ". The new stock amount is " +
        newStock +
        "."
      ),
      getElement(
        "decrease-stock-button"
      )
    );
  }

  async function setExactStock() {
    if (!selectedInventoryProduct) {
      showInventoryMessage(
        "Select a product or variant before setting stock.",
        "error"
      );

      return;
    }

    var amount =
      getExactStockAmount();

    if (amount === null) {
      showInventoryMessage(
        "Enter a whole-number stock amount of 0 or higher.",
        "error"
      );

      return;
    }

    await saveInventory(
      amount,
      (
        "The stock amount was set to " +
        amount +
        "."
      ),
      getElement(
        "set-stock-button"
      )
    );
  }

})();