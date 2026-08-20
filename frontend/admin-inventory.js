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

  var ADMIN_DASHBOARD_PAGE =
    "admin-dashboard.html";

  var ADMIN_TOKEN_KEY =
    "adminToken";

  var ADMIN_USER_KEY =
    "adminUser";

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
    if (window.MMC_BACKEND_URL) {
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
      return (
        window.location.protocol +
        "//" +
        window.location.hostname +
        ":10000"
      );
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

  function getInventoryElement(
    elementId
  ) {
    return document.getElementById(
      elementId
    );
  }

  function getFirstAvailableElement(
    elementIds
  ) {
    var selectedElement =
      null;

    elementIds.some(
      function (elementId) {
        var element =
          getInventoryElement(
            elementId
          );

        if (element) {
          selectedElement =
            element;

          return true;
        }

        return false;
      }
    );

    return selectedElement;
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

    target.textContent =
      value === undefined ||
      value === null
        ? ""
        : String(value);
  }

  function setElementHidden(
    elementId,
    hidden
  ) {
    var element =
      getInventoryElement(
        elementId
      );

    if (!element) {
      return;
    }

    element.hidden =
      hidden;
  }

  // ==========================================================
  // ADMINISTRATOR AUTHENTICATION
  // ==========================================================

  function getAdminToken() {
    return localStorage.getItem(
      ADMIN_TOKEN_KEY
    );
  }

  function getAdminHeaders(
    includeJson
  ) {
    var token =
      getAdminToken();

    var headers = {
      Accept:
        "application/json"
    };

    if (token) {
      headers.Authorization =
        "Bearer " +
        token;
    }

    if (includeJson) {
      headers["Content-Type"] =
        "application/json";
    }

    return headers;
  }

  function clearAdminSession() {
    localStorage.removeItem(
      ADMIN_TOKEN_KEY
    );

    localStorage.removeItem(
      ADMIN_USER_KEY
    );

    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
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
      ADMIN_LOGIN_PAGE
    );
  }

  function logoutAdmin() {
    clearAdminSession();

    window.location.assign(
      ADMIN_LOGIN_PAGE
    );
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

    var requestOptions =
      Object.assign(
        {},
        options || {},
        {
          signal:
            controller.signal
        }
      );

    try {
      return await fetch(
        url,
        requestOptions
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

  async function readInventoryResponse(
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

    var data = {};

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
      response.status === 401
    ) {
      redirectToAdminLogin();

      throw new Error(
        data.error ||
        "Your administrator session is invalid. Please log in again."
      );
    }

    if (
      response.status === 403
    ) {
      throw new Error(
        data.error ||
        "You do not have permission to manage inventory."
      );
    }

    if (!response.ok) {
      var requestError =
        new Error(
          data.error ||
          data.message ||
          (
            "The inventory request failed with status " +
            response.status +
            "."
          )
        );

      requestError.code =
        data.code ||
        "INVENTORY_REQUEST_FAILED";

      throw requestError;
    }

    return data;
  }

  function getInventoryErrorMessage(
    error
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

    return (
      error &&
      error.message
        ? error.message
        : "The inventory request could not be completed."
    );
  }

  // ==========================================================
  // MESSAGES
  // ==========================================================

  function showInventoryMessage(
    message,
    messageType
  ) {
    var messageBox =
      getFirstAvailableElement([
        "inventory-message",
        "inventoryMessage"
      ]);

    var normalizedMessage =
      String(message || "");

    if (!messageBox) {
      if (
        messageType ===
        "error"
      ) {
        console.error(
          normalizedMessage
        );
      } else {
        console.log(
          normalizedMessage
        );
      }

      return;
    }

    messageBox.textContent =
      normalizedMessage;

    messageBox.classList.remove(
      "inventory-error",
      "inventory-success",
      "inventory-information"
    );

    if (
      messageType ===
      "error"
    ) {
      messageBox.classList.add(
        "inventory-error"
      );

      messageBox.setAttribute(
        "role",
        "alert"
      );
    } else if (
      messageType ===
      "success"
    ) {
      messageBox.classList.add(
        "inventory-success"
      );

      messageBox.setAttribute(
        "role",
        "status"
      );
    } else {
      messageBox.classList.add(
        "inventory-information"
      );

      messageBox.setAttribute(
        "role",
        "status"
      );
    }
  }

  function clearInventoryMessage() {
    var messageBox =
      getFirstAvailableElement([
        "inventory-message",
        "inventoryMessage"
      ]);

    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      "";

    messageBox.classList.remove(
      "inventory-error",
      "inventory-success",
      "inventory-information"
    );

    messageBox.removeAttribute(
      "role"
    );
  }

  // ==========================================================
  // ADMINISTRATOR INFORMATION
  // ==========================================================

  function formatAdminRole(role) {
    return String(role || "")
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

  async function verifyAdminSession() {
    if (!getAdminToken()) {
      redirectToAdminLogin();

      return false;
    }

    try {
      var response =
        await fetchWithTimeout(
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

      var data =
        await readInventoryResponse(
          response
        );

      var admin =
        data.admin || {};

      if (
        !admin ||
        !admin.id
      ) {
        redirectToAdminLogin();

        return false;
      }

      localStorage.setItem(
        ADMIN_USER_KEY,
        JSON.stringify(
          admin
        )
      );

      setInventoryText(
        "admin-username",
        admin.username ||
        "Administrator"
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
        getInventoryErrorMessage(
          error
        ),
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // PRODUCT DATA NORMALIZATION
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
        Number(
          fallbackValue || 0
        );
    }

    return Math.max(
      0,
      Math.floor(number)
    );
  }

  function normalizeInventoryProduct(
    product
  ) {
    var sourceProduct =
      product || {};

    var warningLevel =
      sourceProduct
        .lowStockWarning;

    if (
      warningLevel === undefined
    ) {
      warningLevel =
        sourceProduct
          .low_stock_warning;
    }

    var rawVariants =
      Array.isArray(
        sourceProduct.variants
      )
        ? sourceProduct.variants
        : [];

    return {
      id:
        String(
          sourceProduct.id ||
          sourceProduct._id ||
          ""
        ),

      name:
        String(
          sourceProduct.name ||
          "Unnamed Product"
        ),

      sku:
        String(
          sourceProduct.sku ||
          ""
        ),

      category:
        String(
          sourceProduct.category ||
          "General"
        ),

      stock:
        normalizeWholeNumber(
          sourceProduct.stock,
          0
        ),

      lowStockWarning:
        normalizeWholeNumber(
          warningLevel,
          5
        ),

      active:
        sourceProduct.active !==
        false,

      variants:
        rawVariants.map(
          function (
            variant,
            variantIndex
          ) {
            var sourceVariant =
              variant || {};

            return {
              index:
                variantIndex,

              id:
                String(
                  sourceVariant.id ||
                  sourceVariant._id ||
                  ""
                ),

              name:
                String(
                  sourceVariant.name ||
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
                  sourceVariant.sku ||
                  ""
                ),

              stock:
                normalizeWholeNumber(
                  sourceVariant.stock,
                  0
                )
            };
          }
        )
    };
  }

  // ==========================================================
  // PRODUCT SELECT
  // ==========================================================

  function getProductSelect() {
    return getFirstAvailableElement([
      "productSelect",
      "product-select"
    ]);
  }

  function getVariantSelect() {
    return getFirstAvailableElement([
      "variantSelect",
      "variant-select"
    ]);
  }

  function createSelectOption(
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
  // LOAD PRODUCTS
  // ==========================================================

  async function loadInventoryProducts(
    productIdToRestore,
    variantIndexToRestore
  ) {
    var productSelect =
      getProductSelect();

    if (!productSelect) {
      showInventoryMessage(
        "The product selector could not be found.",
        "error"
      );

      return;
    }

    productSelect.disabled =
      true;

    productSelect.replaceChildren(
      createSelectOption(
        "",
        "Loading products..."
      )
    );

    try {
      var response =
        await fetchWithTimeout(
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

      var data =
        await readInventoryResponse(
          response
        );

      var productList = [];

      if (Array.isArray(data)) {
        productList =
          data;
      } else if (
        data &&
        Array.isArray(
          data.products
        )
      ) {
        productList =
          data.products;
      }

      inventoryProducts =
        productList
          .map(
            normalizeInventoryProduct
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
              return firstProduct
                .name
                .localeCompare(
                  secondProduct.name
                );
            }
          );

      productSelect.replaceChildren();

      productSelect.appendChild(
        createSelectOption(
          "",
          inventoryProducts.length
            ? "Select a product..."
            : "No products available"
        )
      );

      inventoryProducts.forEach(
        function (product) {
          var statusText =
            product.active
              ? ""
              : " | Inactive";

          productSelect.appendChild(
            createSelectOption(
              product.id,
              product.name +
              " | " +
              (
                product.sku ||
                "No SKU"
              ) +
              statusText
            )
          );
        }
      );

      productSelect.disabled =
        inventoryProducts.length ===
        0;

      resetInventorySelection();

      if (
        productIdToRestore &&
        inventoryProducts.some(
          function (product) {
            return (
              product.id ===
              String(
                productIdToRestore
              )
            );
          }
        )
      ) {
        productSelect.value =
          String(
            productIdToRestore
          );

        selectedInventoryProduct =
          findSelectedProduct();

        buildVariantOptions();

        var variantSelect =
          getVariantSelect();

        if (
          variantSelect &&
          variantIndexToRestore !==
            null &&
          variantIndexToRestore !==
            undefined &&
          variantSelect.querySelector(
            "option[value='" +
              String(
                variantIndexToRestore
              ) +
              "']"
          )
        ) {
          variantSelect.value =
            String(
              variantIndexToRestore
            );
        }
      }
    } catch (error) {
      console.error(
        "Failed to load inventory products:",
        error
      );

      showInventoryMessage(
        getInventoryErrorMessage(
          error
        ),
        "error"
      );

      productSelect.replaceChildren(
        createSelectOption(
          "",
          "Failed to load products"
        )
      );

      productSelect.disabled =
        true;
    }
  }
})