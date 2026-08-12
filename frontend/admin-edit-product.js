// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-edit-product.js
// EDIT PRODUCT ADMIN PAGE
// Vercel + Neon PostgreSQL
// JWT authentication
// Multer + Cloudinary uploads
// ============================================================

(function () {
  "use strict";

  var BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var ADMIN_PRODUCTS_API =
    BACKEND_URL +
    "/admin/products";

  var PRODUCTS_API =
    BACKEND_URL +
    "/products";

  var CATEGORIES_API =
    BACKEND_URL +
    "/categories";

  var UPLOAD_API =
    BACKEND_URL +
    "/upload/image";

  var MAX_IMAGE_SIZE =
    10 * 1024 * 1024;

  var ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  var availableProducts = [];
  var selectedProduct = null;
  var editedVariants = [];
  var editedImagePublicId = "";
  var localPreviewUrl = null;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getElement(elementId) {
    return document.getElementById(
      elementId
    );
  }

  function getValue(elementId) {
    var target =
      getElement(elementId);

    if (!target) {
      return "";
    }

    return String(
      target.value || ""
    ).trim();
  }

  function setValue(
    elementId,
    value
  ) {
    var target =
      getElement(elementId);

    if (!target) {
      return;
    }

    if (
      value === null ||
      value === undefined
    ) {
      target.value = "";
    } else {
      target.value =
        String(value);
    }
  }

  function createTextElement(
    tagName,
    text
  ) {
    var element =
      document.createElement(
        tagName
      );

    element.textContent =
      text;

    return element;
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
        BACKEND_URL +
        "/admin/me",
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readApiResponse(
          response
        );

      var admin =
        data.admin || {};

      localStorage.setItem(
        "adminUser",
        JSON.stringify(admin)
      );

      var usernameElement =
        getElement(
          "admin-username"
        );

      var roleElement =
        getElement(
          "admin-role"
        );

      if (usernameElement) {
        usernameElement.textContent =
          admin.username || "";
      }

      if (roleElement) {
        roleElement.textContent =
          formatAdminRole(
            admin.role
          );
      }

      return true;
    } catch (error) {
      console.error(
        "Administrator verification failed:",
        error
      );

      showProductMessage(
        error.message ||
        "The administrator session could not be verified.",
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // API RESPONSE
  // ==========================================================

  async function readApiResponse(
    response
  ) {
    var data;

    try {
      data =
        await response.json();
    } catch (error) {
      data = {
        error:
          "The server returned an unexpected response."
      };
    }

    if (response.status === 401) {
      redirectToAdminLogin();

      throw new Error(
        data.error ||
        "The administrator session expired."
      );
    }

    if (response.status === 403) {
      throw new Error(
        data.error ||
        "You do not have permission to perform this action."
      );
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
  // PAGE MESSAGES
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
      if (
        messageType === "error" &&
        message
      ) {
        window.alert(message);
      }

      return;
    }

    messageElement.textContent =
      message || "";

    messageElement.classList.remove(
      "product-error",
      "product-success",
      "product-information",
      "product-success-message",
      "product-information-message"
    );

    if (messageType === "error") {
      messageElement.classList.add(
        "product-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageElement.classList.add(
        "product-success"
      );
    } else {
      messageElement.classList.add(
        "product-information"
      );
    }
  }

  function clearProductMessage() {
    showProductMessage(
      "",
      "information"
    );
  }

  // ==========================================================
  // DATA NORMALIZATION
  // ==========================================================

  function normalizeVariants(
    variants
  ) {
    if (!Array.isArray(variants)) {
      return [];
    }

    return variants.map(
      function (
        variant,
        variantIndex
      ) {
        return {
          id: String(
            variant.id ||
            variant._id ||
            (
              "variant-" +
              Date.now() +
              "-" +
              variantIndex
            )
          ),

          name: String(
            variant.name || ""
          ),

          sku: String(
            variant.sku || ""
          ),

          price: Math.max(
            0,
            Number(
              variant.price || 0
            )
          ),

          stock: Math.max(
            0,
            Math.floor(
              Number(
                variant.stock || 0
              )
            )
          ),

          image: String(
            variant.image || ""
          ),

          imagePublicId: String(
            variant.imagePublicId ||
            variant.image_public_id ||
            ""
          )
        };
      }
    );
  }

  function normalizeProduct(product) {
    var lowStockWarning =
      product.lowStockWarning;

    if (
      lowStockWarning === undefined
    ) {
      lowStockWarning =
        product.low_stock_warning;
    }

    return {
      id: String(
        product.id ||
        product._id ||
        ""
      ),

      name: String(
        product.name || ""
      ),

      sku: String(
        product.sku || ""
      ),

      price: Math.max(
        0,
        Number(
          product.price || 0
        )
      ),

      stock: Math.max(
        0,
        Math.floor(
          Number(
            product.stock || 0
          )
        )
      ),

      lowStockWarning: Math.max(
        0,
        Math.floor(
          Number(
            lowStockWarning === undefined
              ? 5
              : lowStockWarning
          )
        )
      ),

      category: String(
        product.category ||
        "General"
      ),

      categoryId:
        product.categoryId ||
        product.category_id ||
        null,

      categorySlug: String(
        product.categorySlug ||
        product.category_slug ||
        ""
      ),

      description: String(
        product.description || ""
      ),

      image: String(
        product.image || ""
      ),

      imagePublicId: String(
        product.imagePublicId ||
        product.image_public_id ||
        ""
      ),

      variants:
        normalizeVariants(
          product.variants
        ),

      active:
        product.active !== false
    };
  }

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
  // REQUESTED PRODUCT
  // ==========================================================

  function getRequestedProductId() {
    var urlParameters =
      new URLSearchParams(
        window.location.search
      );

    return (
      urlParameters.get("id") ||
      localStorage.getItem(
        "MMC_EDIT_PRODUCT_ID"
      ) ||
      ""
    );
  }

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  async function loadProducts(
    productIdToSelect
  ) {
    var productSelect =
      getElement(
        "productSelect"
      );

    if (!productSelect) {
      return;
    }

    productSelect.disabled =
      true;

    productSelect.innerHTML =
      '<option value="">Loading products...</option>';
  }

})();