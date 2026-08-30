// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-delete-product.js
// DELETE PRODUCT ADMIN PAGE
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var REQUEST_TIMEOUT_MS =
    15000;

  var availableProducts =
    [];

  var selectedProduct =
    null;

  var deleteInProgress =
    false;

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
      String(
        value === undefined ||
        value === null
          ? ""
          : value
      );
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

  var ADMIN_PRODUCTS_URL =
    BACKEND_URL +
    "/admin/products";

  var PRODUCTS_URL =
    BACKEND_URL +
    "/products";

  var ADMIN_SESSION_URL =
    BACKEND_URL +
    "/admin/me";

  // ==========================================================
  // ADMIN AUTHENTICATION
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
    includeContentType
  ) {
    var headers = {
      Accept:
        "application/json",

      Authorization:
        "Bearer " +
        getAdminToken()
    };

    if (
      includeContentType !==
      false
    ) {
      headers["Content-Type"] =
        "application/json";
    }

    return headers;
  }

  function clearSavedAdminLogin() {
    localStorage.removeItem(
      "adminToken"
    );

    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
    );

    localStorage.removeItem(
      "adminUser"
    );
  }

  function redirectToAdminLogin() {
    clearSavedAdminLogin();

    window.location.replace(
      "admin-login.html?return=" +
      encodeURIComponent(
        "admin-delete-product.html"
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

    var timeoutIdentifier =
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
        timeoutIdentifier
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
      return {
        error:
          "The server response could not be read."
      };
    }

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

  async function requestJson(
    url,
    options
  ) {
    var response =
      await fetchWithTimeout(
        url,
        options
      );

    var responseData =
      await readResponse(
        response
      );

    if (
      response.status ===
      401
    ) {
      redirectToAdminLogin();

      throw new Error(
        "Your administrator session expired."
      );
    }

    if (
      response.status ===
      403
    ) {
      throw new Error(
        getErrorMessage(
          responseData,
          "You do not have permission to delete products."
        )
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          responseData,
          (
            "The request failed with status " +
            response.status +
            "."
          )
        )
      );
    }

    return responseData;
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
      var responseData =
        await requestJson(
          ADMIN_SESSION_URL,
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
        responseData.admin ||
        responseData.user ||
        responseData;

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
        "Administrator session verification failed.",
        error
      );

      var errorMessage;

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        errorMessage =
          "The administrator session check took too long. Please reload the page.";
      } else {
        errorMessage =
          getErrorMessage(
            error,
            "Your administrator session could not be verified."
          );
      }

      showProductMessage(
        errorMessage,
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // MESSAGE DISPLAY
  // ==========================================================

  function showProductMessage(
    message,
    messageType
  ) {
    var messageElement =
      getElement(
        "product-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      String(message || "");

    messageElement.classList.remove(
      "product-error",
      "product-success",
      "product-information-message"
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
        "product-success"
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
        "product-information-message"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else {
      messageElement.classList.add(
        "product-error"
      );

      messageElement.setAttribute(
        "role",
        "alert"
      );
    }
  }

  // ==========================================================
  // PRODUCT NORMALIZATION
  // ==========================================================

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

      price:
        Math.max(
          0,
          Number(
            source.price
          ) ||
          0
        ),

      image:
        String(
          source.image ||
          ""
        ),

      category:
        String(
          source.category ||
          source.categoryName ||
          "General"
        ),

      description:
        String(
          source.description ||
          ""
        ),

      stock:
        Math.max(
          0,
          Number(
            source.stock
          ) ||
          0
        ),

      variants:
        variants,

      active:
        source.active !==
        false
    };
  }

  function getProductList(
    responseData
  ) {
    if (
      Array.isArray(
        responseData
      )
    ) {
      return responseData;
    }

    if (
      responseData &&
      Array.isArray(
        responseData.products
      )
    ) {
      return responseData.products;
    }

    if (
      responseData &&
      responseData.data &&
      Array.isArray(
        responseData.data.products
      )
    ) {
      return responseData.data.products;
    }

    return [];
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
      Number(value) ||
      0
    );
  }

  // ==========================================================
  // SELECTED PRODUCT
  // ==========================================================

  function getSelectedProduct() {
    var productSelect =
      getElement(
        "product-to-delete"
      );

    var selectedProductId =
      productSelect
        ? productSelect.value
        : "";

    return (
      availableProducts.find(
        function (product) {
          return (
            product.id ===
            selectedProductId
          );
        }
      ) ||
      null
    );
  }

  // ==========================================================
  // DELETE BUTTON STATE
  // ==========================================================

  function setDeleteButtonState() {
    var deleteButton =
      getElement(
        "delete-product-button"
      );

    var confirmationInput =
      getElement(
        "product-confirmation"
      );

    var confirmationMatches =
      Boolean(
        selectedProduct &&
        confirmationInput &&
        confirmationInput.value.trim() ===
          selectedProduct.name.trim()
      );

    if (!deleteButton) {
      return;
    }

    deleteButton.disabled =
      deleteInProgress ||
      !selectedProduct ||
      !confirmationMatches;

    deleteButton.textContent =
      deleteInProgress
        ? "Deleting Product..."
        : "Permanently Delete Product";

    deleteButton.setAttribute(
      "aria-busy",
      deleteInProgress
        ? "true"
        : "false"
    );
  }

  // ==========================================================
  // PRODUCT IMAGE
  // ==========================================================

  function clearProductImage() {
    var productImage =
      getElement(
        "selected-product-image"
      );

    var placeholder =
      getElement(
        "selected-product-image-placeholder"
      );

    if (productImage) {
      productImage.hidden =
        true;

      productImage.removeAttribute(
        "src"
      );
    }

    if (placeholder) {
      placeholder.hidden =
        false;
    }
  }

  function displayProductImage(
    product
  ) {
    var productImage =
      getElement(
        "selected-product-image"
      );

    var placeholder =
      getElement(
        "selected-product-image-placeholder"
      );

    if (
      !productImage ||
      !product.image
    ) {
      clearProductImage();

      return;
    }

    productImage.onload =
      function () {
        productImage.hidden =
          false;

        if (placeholder) {
          placeholder.hidden =
            true;
        }
      };

    productImage.onerror =
      function () {
        clearProductImage();
      };

    productImage.alt =
      product.name +
      " product image";

    productImage.src =
      product.image;
  }

  // ==========================================================
  // PRODUCT DETAILS
  // ==========================================================

  function clearProductDetails() {
    selectedProduct =
      null;

    var detailsSection =
      getElement(
        "selected-product-details"
      );

    var confirmationInput =
      getElement(
        "product-confirmation"
      );

    if (detailsSection) {
      detailsSection.hidden =
        true;
    }

    if (confirmationInput) {
      confirmationInput.value =
        "";
    }

    setText(
      "selected-product-name",
      "No product selected"
    );

    setText(
      "selected-product-sku",
      "Not available"
    );

    setText(
      "selected-product-price",
      "$0.00"
    );

    setText(
      "selected-product-category",
      "General"
    );

    setText(
      "selected-product-stock",
      "0"
    );

    setText(
      "selected-product-variant-count",
      "0"
    );

    setText(
      "selected-product-status",
      "Unknown"
    );

    setText(
      "selected-product-description",
      "No product description provided."
    );

    setText(
      "confirmation-product-name",
      "shown above"
    );

    clearProductImage();
    setDeleteButtonState();
  }

  function displaySelectedProduct() {
    selectedProduct =
      getSelectedProduct();

    showProductMessage(
      "",
      "information"
    );

    if (!selectedProduct) {
      clearProductDetails();

      return;
    }

    var detailsSection =
      getElement(
        "selected-product-details"
      );

    var confirmationInput =
      getElement(
        "product-confirmation"
      );

    setText(
      "selected-product-name",
      selectedProduct.name
    );

    setText(
      "selected-product-sku",
      selectedProduct.sku ||
      "No SKU"
    );

    setText(
      "selected-product-price",
      formatCurrency(
        selectedProduct.price
      )
    );

    setText(
      "selected-product-category",
      selectedProduct.category ||
      "General"
    );

    setText(
      "selected-product-stock",
      selectedProduct.stock
    );

    setText(
      "selected-product-variant-count",
      selectedProduct.variants.length
    );

    setText(
      "selected-product-status",
      selectedProduct.active
        ? "Active"
        : "Inactive"
    );

    setText(
      "selected-product-description",
      selectedProduct.description ||
      "No product description provided."
    );

    setText(
      "confirmation-product-name",
      selectedProduct.name
    );

    displayProductImage(
      selectedProduct
    );

    if (confirmationInput) {
      confirmationInput.value =
        "";

      confirmationInput.focus();
    }

    if (detailsSection) {
      detailsSection.hidden =
        false;
    }

    showProductMessage(
      "Type the exact product name to enable permanent deletion.",
      "information"
    );

    setDeleteButtonState();
  }

  // ==========================================================
  // PRODUCT DROPDOWN
  // ==========================================================

  function populateProductSelect() {
    var productSelect =
      getElement(
        "product-to-delete"
      );

    if (!productSelect) {
      return;
    }

    productSelect.replaceChildren();

    var defaultOption =
      document.createElement(
        "option"
      );

    defaultOption.value =
      "";

    defaultOption.textContent =
      availableProducts.length > 0
        ? "Select a product to delete"
        : "No products available";

    productSelect.appendChild(
      defaultOption
    );

    availableProducts.forEach(
      function (product) {
        var option =
          document.createElement(
            "option"
          );

        option.value =
          product.id;

        option.textContent =
          product.name +
          (
            product.sku
              ? (
                  " | " +
                  product.sku
                )
              : ""
          ) +
          " | " +
          formatCurrency(
            product.price
          );

        productSelect.appendChild(
          option
        );
      }
    );

    productSelect.disabled =
      availableProducts.length ===
      0;
  }

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  async function loadProducts() {
    var productSelect =
      getElement(
        "product-to-delete"
      );

    var refreshButton =
      getElement(
        "refresh-products-button"
      );

    if (productSelect) {
      productSelect.disabled =
        true;

      productSelect.replaceChildren();

      var loadingOption =
        document.createElement(
          "option"
        );

      loadingOption.value =
        "";

      loadingOption.textContent =
        "Loading products...";

      productSelect.appendChild(
        loadingOption
      );
    }

    if (refreshButton) {
      refreshButton.disabled =
        true;

      refreshButton.textContent =
        "Loading Products...";
    }

    clearProductDetails();

    showProductMessage(
      "Loading products...",
      "information"
    );

    try {
      var responseData =
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

      availableProducts =
        getProductList(
          responseData
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

      populateProductSelect();

      showProductMessage(
        availableProducts.length > 0
          ? "Select the product you want to delete."
          : "No products are available to delete.",
        "information"
      );
    } catch (error) {
      console.error(
        "Products could not be loaded.",
        error
      );

      availableProducts =
        [];

      populateProductSelect();

      var errorMessage;

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        errorMessage =
          "The product request took too long. Please try again.";
      } else if (
        error instanceof
        TypeError
      ) {
        errorMessage =
          "The product server could not be reached. " +
          "Check the backend URL and try again.";
      } else {
        errorMessage =
          getErrorMessage(
            error,
            "The products could not be loaded."
          );
      }

      showProductMessage(
        errorMessage,
        "error"
      );
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
  // DELETE PRODUCT
  // ==========================================================

  async function deleteProduct(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    if (
      deleteInProgress ||
      !selectedProduct
    ) {
      return;
    }

    var confirmationInput =
      getElement(
        "product-confirmation"
      );

    var productId =
      selectedProduct.id;

    var productName =
      selectedProduct.name.trim();

    if (
      !confirmationInput ||
      confirmationInput.value.trim() !==
        productName
    ) {
      showProductMessage(
        "Type the product name exactly before deleting it.",
        "error"
      );

      setDeleteButtonState();

      return;
    }

    var confirmed =
      window.confirm(
        'Permanently delete the product "' +
        productName +
        '"?'
      );

    if (!confirmed) {
      return;
    }

    deleteInProgress =
      true;

    setDeleteButtonState();

    showProductMessage(
      "Deleting product...",
      "information"
    );

    try {
      var responseData =
        await requestJson(
          PRODUCTS_URL +
          "/" +
          encodeURIComponent(
            productId
          ),
          {
            method:
              "DELETE",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      availableProducts =
        availableProducts.filter(
          function (product) {
            return (
              product.id !==
              productId
            );
          }
        );

      populateProductSelect();
      clearProductDetails();

      showProductMessage(
        getErrorMessage(
          responseData.message,
          (
            'The product "' +
            productName +
            '" was deleted successfully.'
          )
        ),
        "success"
      );
    } catch (error) {
      console.error(
        "Product deletion failed.",
        error
      );

      var errorMessage;

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        errorMessage =
          "The delete request took too long. Please try again.";
      } else if (
        error instanceof
        TypeError
      ) {
        errorMessage =
          "The product server could not be reached. " +
          "Check the backend URL and try again.";
      } else {
        errorMessage =
          getErrorMessage(
            error,
            "The product could not be deleted."
          );
      }

      showProductMessage(
        errorMessage,
        "error"
      );
    } finally {
      deleteInProgress =
        false;

      setDeleteButtonState();
    }
  }

  // ==========================================================
  // LOGOUT BUTTONS
  // ==========================================================

  function connectLogoutButtons() {
    [
      "admin-logout-button",
      "admin-navigation-logout-button"
    ].forEach(
      function (elementId) {
        var button =
          getElement(
            elementId
          );

        if (button) {
          button.addEventListener(
            "click",
            logoutAdmin
          );
        }
      }
    );
  }

  // ==========================================================
  // PAGE INITIALIZATION
  // ==========================================================

  async function initializePage() {
    connectLogoutButtons();

    var validSession =
      await verifyAdminSession();

    if (!validSession) {
      return;
    }

    var deleteForm =
      getElement(
        "delete-product-form"
      );

    var productSelect =
      getElement(
        "product-to-delete"
      );

    var confirmationInput =
      getElement(
        "product-confirmation"
      );

    var refreshButton =
      getElement(
        "refresh-products-button"
      );

    if (deleteForm) {
      deleteForm.addEventListener(
        "submit",
        deleteProduct
      );
    }

    if (productSelect) {
      productSelect.addEventListener(
        "change",
        displaySelectedProduct
      );
    }

    if (confirmationInput) {
      confirmationInput.addEventListener(
        "input",
        setDeleteButtonState
      );
    }

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        loadProducts
      );
    }

    setDeleteButtonState();

    await loadProducts();

    console.log(
      "MMC Delete Product page initialized."
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
      initializePage
    );
  } else {
    initializePage();
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.loadProducts =
    loadProducts;

  window.deleteProduct =
    deleteProduct;

  window.logoutAdmin =
    logoutAdmin;
}());