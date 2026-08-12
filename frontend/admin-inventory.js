// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADMIN INVENTORY MANAGEMENT
// ============================================================

(function () {
  "use strict";

  var MMC_INVENTORY_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var MMC_ADMIN_PRODUCTS_URL =
    MMC_INVENTORY_BACKEND_URL +
    "/admin/products";

  var MMC_PRODUCTS_URL =
    MMC_INVENTORY_BACKEND_URL +
    "/products";

  var inventoryProducts = [];
  var selectedInventoryProduct = null;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getInventoryElement(
    elementId
  ) {
    return document.getElementById(
      elementId
    );
  }

  function setInventoryText(
    elementId,
    value
  ) {
    var target =
      getInventoryElement(
        elementId
      );

    if (!target) {
      return;
    }

    if (
      value === undefined ||
      value === null
    ) {
      target.textContent = "";
    } else {
      target.textContent =
        String(value);
    }
  }

  // ==========================================================
  // ADMIN AUTHENTICATION
  // ==========================================================

  function getAdminToken() {
    return localStorage.getItem(
      "adminToken"
    );
  }

  function getAdminHeaders(
    includeJson
  ) {
    var headers = {
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
      "adminUser"
    );

    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
    );
  }

  function redirectToAdminLogin() {
    clearAdminSession();

    window.location.href =
      "admin-login.html";
  }

  function logoutAdmin() {
    redirectToAdminLogin();
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readInventoryResponse(
    response
  ) {
    var data;

    try {
      data =
        await response.json();
    } catch (error) {
      data = {};
    }

    if (response.status === 401) {
      redirectToAdminLogin();

      throw new Error(
        data.error ||
        "Your administrator session expired."
      );
    }

    if (response.status === 403) {
      throw new Error(
        data.error ||
        "You do not have permission to manage inventory."
      );
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
  // MESSAGES
  // ==========================================================

  function showInventoryMessage(
    message,
    messageType
  ) {
    var messageBox =
      getInventoryElement(
        "inventory-message"
      );

    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      message || "";

    messageBox.classList.remove(
      "inventory-error",
      "inventory-success",
      "inventory-information"
    );

    if (messageType === "error") {
      messageBox.classList.add(
        "inventory-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageBox.classList.add(
        "inventory-success"
      );
    } else {
      messageBox.classList.add(
        "inventory-information"
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
  // VERIFY ADMIN
  // ==========================================================

  function formatAdminRole(role) {
    return String(role || "")
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  async function verifyAdminSession() {
    if (!getAdminToken()) {
      redirectToAdminLogin();
      return false;
    }

    try {
      var response = await fetch(
        MMC_INVENTORY_BACKEND_URL +
        "/admin/me",
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readInventoryResponse(
          response
        );

      var admin =
        data.admin || {};

      localStorage.setItem(
        "adminUser",
        JSON.stringify(admin)
      );

      setInventoryText(
        "admin-username",
        admin.username || ""
      );

      setInventoryText(
        "admin-role",
        formatAdminRole(
          admin.role
        )
      );

      return true;
    } catch (error) {
      console.error(
        "Administrator verification failed:",
        error
      );

      showInventoryMessage(
        error.message ||
        "The administrator session could not be verified.",
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // NORMALIZE PRODUCT DATA
  // ==========================================================

  function normalizeInventoryProduct(
    product
  ) {
    var warningLevel =
      product.lowStockWarning;

    if (
      warningLevel === undefined
    ) {
      warningLevel =
        product.low_stock_warning;
    }

    var rawVariants =
      Array.isArray(
        product.variants
      )
        ? product.variants
        : [];

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

      sku: String(
        product.sku || ""
      ),

      category: String(
        product.category ||
        "General"
      ),

      stock: Math.max(
        0,
        Number(
          product.stock || 0
        )
      ),

      lowStockWarning: Math.max(
        0,
        Number(
          warningLevel === undefined
            ? 5
            : warningLevel
        )
      ),

      variants:
        rawVariants.map(
          function (
            variant,
            variantIndex
          ) {
            return {
              index:
                variantIndex,

              id: String(
                variant.id ||
                variant._id ||
                ""
              ),

              name: String(
                variant.name ||
                (
                  "Variant " +
                  (
                    variantIndex +
                    1
                  )
                )
              ),

              sku: String(
                variant.sku || ""
              ),

              stock: Math.max(
                0,
                Number(
                  variant.stock || 0
                )
              )
            };
          }
        )
    };
  }

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  async function loadInventoryProducts() {
    var productSelect =
      getInventoryElement(
        "productSelect"
      );

    if (!productSelect) {
      return;
    }

    productSelect.disabled = true;

    productSelect.innerHTML =
      '<option value="">Loading products...</option>';

    try {
      var response = await fetch(
        MMC_ADMIN_PRODUCTS_URL,
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readInventoryResponse(
          response
        );

      var productList;

      if (Array.isArray(data)) {
        productList = data;
      } else if (
        data &&
        Array.isArray(data.products)
      ) {
        productList =
          data.products;
      } else {
        productList = [];
      }

      inventoryProducts =
        productList
          .map(
            normalizeInventoryProduct
          )
          .filter(
            function (product) {
              return product.id !== "";
            }
          )
          .sort(
            function (
              firstProduct,
              secondProduct
            ) {
              return firstProduct.name.localeCompare(
                secondProduct.name
              );
            }
          );

      productSelect.innerHTML = "";

      var defaultOption =
        document.createElement(
          "option"
        );

      defaultOption.value = "";

      defaultOption.textContent =
        inventoryProducts.length
          ? "Select a product..."
          : "No products available";

      productSelect.appendChild(
        defaultOption
      );

      inventoryProducts.forEach(
        function (product) {
          var option =
            document.createElement(
              "option"
            );

          option.value =
            product.id;

          option.textContent =
            product.name +
            " | " +
            (
              product.sku ||
              "No SKU"
            );

          productSelect.appendChild(
            option
          );
        }
      );

      productSelect.disabled =
        inventoryProducts.length === 0;

      resetInventorySelection();
    } catch (error) {
      console.error(
        "Product loading failed:",
        error
      );

      productSelect.innerHTML =
        '<option value="">Products unavailable</option>';

      productSelect.disabled = true;

      showInventoryMessage(
        error.message ||
        "Products could not be loaded.",
        "error"
      );
    }
  }

  // ==========================================================
  // PRODUCT SELECTION
  // ==========================================================

  function findSelectedProduct() {
    var productSelect =
      getInventoryElement(
        "productSelect"
      );

    var selectedId =
      productSelect
        ? productSelect.value
        : "";

    return (
      inventoryProducts.find(
        function (product) {
          return (
            product.id ===
            selectedId
          );
        }
      ) ||
      null
    );
  }

  function resetInventorySelection() {
    selectedInventoryProduct =
      null;

    var variantField =
      getInventoryElement(
        "variant-field"
      );

    var detailsSection =
      getInventoryElement(
        "selected-inventory-details"
      );

    var stockDisplay =
      getInventoryElement(
        "stock-display"
      );

    if (variantField) {
      variantField.hidden = true;
    }

    if (detailsSection) {
      detailsSection.hidden = true;
    }

    if (stockDisplay) {
      stockDisplay.hidden = true;
    }

    setActionButtonsDisabled(
      true
    );
  }

  function handleProductChange() {
    selectedInventoryProduct =
      findSelectedProduct();

    if (!selectedInventoryProduct) {
      resetInventorySelection();
      return;
    }

    buildVariantOptions();
    displayInventoryItem();
    clearInventoryMessage();
  }

  // ==========================================================
  // VARIANT SELECTION
  // ==========================================================

  function buildVariantOptions() {
    var variantField =
      getInventoryElement(
        "variant-field"
      );

    var variantSelect =
      getInventoryElement(
        "variantSelect"
      );

    if (
      !variantField ||
      !variantSelect
    ) {
      return;
    }

    variantSelect.innerHTML = "";

    var baseOption =
      document.createElement(
        "option"
      );

    baseOption.value = "";

    baseOption.textContent =
      "Use Base Product Stock";

    variantSelect.appendChild(
      baseOption
    );

    if (
      !selectedInventoryProduct ||
      selectedInventoryProduct
        .variants.length === 0
    ) {
      variantField.hidden = true;
      variantSelect.disabled = true;

      return;
    }

    selectedInventoryProduct
      .variants
      .forEach(
        function (variant) {
          var option =
            document.createElement(
              "option"
            );

          option.value =
            String(
              variant.index
            );

          option.textContent =
            variant.name +
            " | " +
            (
              variant.sku ||
              "No SKU"
            );

          variantSelect.appendChild(
            option
          );
        }
      );

    variantSelect.value = "";
    variantSelect.disabled = false;
    variantField.hidden = false;
  }

  function getSelectedVariant() {
    var variantSelect =
      getInventoryElement(
        "variantSelect"
      );

    if (
      !selectedInventoryProduct ||
      !variantSelect ||
      variantSelect.value === ""
    ) {
      return null;
    }

    var selectedIndex =
      Number(
        variantSelect.value
      );

    return (
      selectedInventoryProduct
        .variants
        .find(
          function (variant) {
            return (
              variant.index ===
              selectedIndex
            );
          }
        ) ||
      null
    );
  }

  function getCurrentInventoryItem() {
    if (!selectedInventoryProduct) {
      return null;
    }

    var selectedVariant =
      getSelectedVariant();

    return {
      product:
        selectedInventoryProduct,

      variant:
        selectedVariant,

      stock:
        selectedVariant
          ? selectedVariant.stock
          : selectedInventoryProduct.stock,

      sku:
        selectedVariant
          ? selectedVariant.sku
          : selectedInventoryProduct.sku,

      type:
        selectedVariant
          ? (
              "Variant: " +
              selectedVariant.name
            )
          : "Base product"
    };
  }

  // ==========================================================
  // INVENTORY DISPLAY
  // ==========================================================

  function displayInventoryItem() {
    var inventoryItem =
      getCurrentInventoryItem();

    if (!inventoryItem) {
      resetInventorySelection();
      return;
    }

    setInventoryText(
      "inventory-product-name",
      inventoryItem.product.name
    );

    setInventoryText(
      "inventory-product-sku",
      inventoryItem.sku ||
      "Not available"
    );

    setInventoryText(
      "inventory-product-category",
      inventoryItem.product.category
    );

    setInventoryText(
      "inventory-type",
      inventoryItem.type
    );

    setInventoryText(
      "current-stock-number",
      inventoryItem.stock
    );

    displayStockWarning(
      inventoryItem.stock,
      inventoryItem.product
        .lowStockWarning
    );

    var detailsSection =
      getInventoryElement(
        "selected-inventory-details"
      );

    var stockDisplay =
      getInventoryElement(
        "stock-display"
      );

    if (detailsSection) {
      detailsSection.hidden = false;
    }

    if (stockDisplay) {
      stockDisplay.hidden = false;
    }

    setActionButtonsDisabled(
      false
    );
  }

  function displayStockWarning(
    stock,
    warningLevel
  ) {
    var stockNumber =
      getInventoryElement(
        "current-stock-number"
      );

    var warningDisplay =
      getInventoryElement(
        "stock-warning-display"
      );

    if (
      !stockNumber ||
      !warningDisplay
    ) {
      return;
    }

    stockNumber.classList.remove(
      "stock-normal",
      "stock-low",
      "stock-empty"
    );

    if (stock === 0) {
      stockNumber.classList.add(
        "stock-empty"
      );

      warningDisplay.textContent =
        "Out of stock";
    } else if (
      stock <= warningLevel
    ) {
      stockNumber.classList.add(
        "stock-low"
      );

      warningDisplay.textContent =
        "Low stock. Warning level: " +
        warningLevel;
    } else {
      stockNumber.classList.add(
        "stock-normal"
      );

      warningDisplay.textContent =
        "Stock level is above the warning limit.";
    }
  }

  // ==========================================================
  // BUTTON STATUS
  // ==========================================================

  function setActionButtonsDisabled(
    disabled
  ) {
    var increaseButton =
      getInventoryElement(
        "increase-stock-button"
      );

    var decreaseButton =
      getInventoryElement(
        "decrease-stock-button"
      );

    var setButton =
      getInventoryElement(
        "set-stock-button"
      );

    if (increaseButton) {
      increaseButton.disabled =
        disabled;
    }

    if (decreaseButton) {
      decreaseButton.disabled =
        disabled;
    }

    if (setButton) {
      setButton.disabled =
        disabled;
    }
  }

  // ==========================================================
  // STOCK AMOUNTS
  // ==========================================================

  function getAdjustmentAmount() {
    var adjustmentInput =
      getInventoryElement(
        "stock-adjustment-amount"
      );

    var adjustmentAmount =
      Number(
        adjustmentInput
          ? adjustmentInput.value
          : 0
      );

    if (
      !Number.isInteger(
        adjustmentAmount
      ) ||
      adjustmentAmount < 1
    ) {
      showInventoryMessage(
        "Adjustment amount must be a whole number of 1 or higher.",
        "error"
      );

      return null;
    }

    return adjustmentAmount;
  }

  function increaseStock() {
    var inventoryItem =
      getCurrentInventoryItem();

    var adjustmentAmount =
      getAdjustmentAmount();

    if (
      !inventoryItem ||
      adjustmentAmount === null
    ) {
      return;
    }

    saveStock(
      inventoryItem.stock +
      adjustmentAmount
    );
  }

  function decreaseStock() {
    var inventoryItem =
      getCurrentInventoryItem();

    var adjustmentAmount =
      getAdjustmentAmount();

    if (
      !inventoryItem ||
      adjustmentAmount === null
    ) {
      return;
    }

    var newStock =
      inventoryItem.stock -
      adjustmentAmount;

    if (newStock < 0) {
      newStock = 0;
    }

    saveStock(newStock);
  }

  function setExactStock() {
    var exactInput =
      getInventoryElement(
        "exact-stock-amount"
      );

    var exactStock =
      Number(
        exactInput
          ? exactInput.value
          : -1
      );

    if (
      !Number.isInteger(
        exactStock
      ) ||
      exactStock < 0
    ) {
      showInventoryMessage(
        "Exact stock must be a whole number of 0 or higher.",
        "error"
      );

      return;
    }

    saveStock(exactStock);
  }

  // ==========================================================
  // INVENTORY ENDPOINT
  // ==========================================================

  function getStockEndpoint(
    inventoryItem
  ) {
    if (inventoryItem.variant) {
      return (
        MMC_PRODUCTS_URL +
        "/" +
        encodeURIComponent(
          inventoryItem.product.id
        ) +
        "/variants/" +
        encodeURIComponent(
          inventoryItem.variant.index
        ) +
        "/stock"
      );
    }

    return (
      MMC_PRODUCTS_URL +
      "/" +
      encodeURIComponent(
        inventoryItem.product.id
      ) +
      "/stock"
    );
  }

  // ==========================================================
  // SAVE STOCK
  // ==========================================================

  async function saveStock(
    newStock
  ) {
    var inventoryItem =
      getCurrentInventoryItem();

    if (!inventoryItem) {
      showInventoryMessage(
        "Select a product or variant first.",
        "error"
      );

      return;
    }

    if (
      !Number.isInteger(newStock) ||
      newStock < 0
    ) {
      showInventoryMessage(
        "Stock must be a whole number of 0 or higher.",
        "error"
      );

      return;
    }

    try {
      setActionButtonsDisabled(
        true
      );

      showInventoryMessage(
        "Updating inventory...",
        "information"
      );

      var response = await fetch(
        getStockEndpoint(
          inventoryItem
        ),
        {
          method: "PATCH",

          headers:
            getAdminHeaders(true),

          body: JSON.stringify({
            stock: newStock
          })
        }
      );

      var data =
        await readInventoryResponse(
          response
        );

      if (inventoryItem.variant) {
        inventoryItem.variant.stock =
          newStock;
      } else {
        inventoryItem.product.stock =
          newStock;
      }

      var exactInput =
        getInventoryElement(
          "exact-stock-amount"
        );

      if (exactInput) {
        exactInput.value = "";
      }

      displayInventoryItem();

      showInventoryMessage(
        data.message ||
        "Inventory updated successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Inventory update failed:",
        error
      );

      showInventoryMessage(
        error.message ||
        "Inventory could not be updated.",
        "error"
      );

      displayInventoryItem();
    }
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    async function () {
      var validAdmin =
        await verifyAdminSession();

      if (!validAdmin) {
        return;
      }

      var productSelect =
        getInventoryElement(
          "productSelect"
        );

      var variantSelect =
        getInventoryElement(
          "variantSelect"
        );

      var increaseButton =
        getInventoryElement(
          "increase-stock-button"
        );

      var decreaseButton =
        getInventoryElement(
          "decrease-stock-button"
        );
    }
  );