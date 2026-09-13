// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: config.js
// SHARED FRONTEND CONFIGURATION
//
// Frontend: Vercel
// Backend: Vercel
// Database: Neon PostgreSQL
//
// IMPORTANT:
// This file is public. Never place passwords, database
// connection strings, JWT secrets, Stripe secrets, Cloudinary
// secrets, or email passwords in this file.
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // BACKEND URLS
  // ==========================================================

  /*
   * Production backend requirements:
   *
   * 1. Include https://
   * 2. Do not include a trailing slash
   * 3. Do not include an endpoint such as /health
   */

  var PRODUCTION_BACKEND_URL =
    "https://multi-maniacscustoms-backend.vercel.app";

  /*
   * Local backend used while developing the website locally.
   */

  var LOCAL_BACKEND_URL =
    "http://localhost:10000";

  // ==========================================================
  // STORAGE KEYS
  // ==========================================================

  var STORAGE_KEYS = {
    cart:
      "cart",

    adminToken:
      "adminToken",

    adminUser:
      "adminUser",

    backendOverride:
      "MMC_BACKEND_URL",

    selectedProduct:
      "MMC_EDIT_PRODUCT_ID"
  };

  // ==========================================================
  // URL HELPERS
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

  function isValidHttpUrl(
    value
  ) {
    try {
      var parsedUrl =
        new URL(
          String(value || "")
        );

      return (
        parsedUrl.protocol ===
          "http:" ||
        parsedUrl.protocol ===
          "https:"
      );
    } catch (error) {
      return false;
    }
  }

  function normalizeApiPath(
    path
  ) {
    var normalizedPath =
      String(path || "")
        .trim();

    if (!normalizedPath) {
      return "";
    }

    if (
      normalizedPath.charAt(0) !==
      "/"
    ) {
      normalizedPath =
        "/" +
        normalizedPath;
    }

    return normalizedPath;
  }

  // ==========================================================
  // LOCAL DEVELOPMENT CHECK
  // ==========================================================

  function isLocalWebsite() {
    var hostname =
      String(
        window.location.hostname ||
        ""
      ).toLowerCase();

    return (
      hostname ===
        "localhost" ||
      hostname ===
        "127.0.0.1" ||
      hostname ===
        "::1" ||
      hostname ===
        "[::1]"
    );
  }

  // ==========================================================
  // SAVED BACKEND OVERRIDE
  // ==========================================================

  function getSavedBackendOverride() {
    try {
      var savedUrl =
        localStorage.getItem(
          STORAGE_KEYS.backendOverride
        );

      if (
        savedUrl &&
        isValidHttpUrl(
          savedUrl
        )
      ) {
        return removeTrailingSlashes(
          savedUrl
        );
      }

      if (savedUrl) {
        console.warn(
          "The saved MMC backend URL is invalid and will be ignored."
        );
      }
    } catch (error) {
      console.warn(
        "The saved MMC backend URL could not be read.",
        error
      );
    }

    return "";
  }

  // ==========================================================
  // SELECT BACKEND URL
  // ==========================================================

  function getDefaultBackendUrl() {
    if (isLocalWebsite()) {
      return removeTrailingSlashes(
        LOCAL_BACKEND_URL
      );
    }

    return removeTrailingSlashes(
      PRODUCTION_BACKEND_URL
    );
  }

  function getBackendUrl() {
    var savedOverride =
      getSavedBackendOverride();

    if (savedOverride) {
      return savedOverride;
    }

    return getDefaultBackendUrl();
  }

  // ==========================================================
  // CREATE API URL
  // ==========================================================

  function createApiUrl(
    path
  ) {
    var backendUrl =
      removeTrailingSlashes(
        window.MMC_BACKEND_URL ||
        getBackendUrl()
      );

    var normalizedPath =
      normalizeApiPath(
        path
      );

    if (!normalizedPath) {
      return backendUrl;
    }

    return (
      backendUrl +
      normalizedPath
    );
  }

  // ==========================================================
  // BACKEND OVERRIDE CONTROLS
  // ==========================================================

  function setBackendUrlOverride(
    value
  ) {
    var cleanedUrl =
      removeTrailingSlashes(
        value
      );

    if (
      !isValidHttpUrl(
        cleanedUrl
      )
    ) {
      throw new Error(
        "A valid HTTP or HTTPS backend URL is required."
      );
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.backendOverride,
        cleanedUrl
      );
    } catch (error) {
      console.error(
        "The backend URL override could not be saved.",
        error
      );

      return false;
    }

    window.MMC_BACKEND_URL =
      cleanedUrl;

    if (
      window.MMC_CONFIG &&
      typeof window.MMC_CONFIG ===
        "object"
    ) {
      window.MMC_CONFIG.backendUrl =
        cleanedUrl;

      window.MMC_CONFIG.environment =
        "override";
    }

    return true;
  }

  function clearBackendUrlOverride() {
    try {
      localStorage.removeItem(
        STORAGE_KEYS.backendOverride
      );
    } catch (error) {
      console.warn(
        "The backend URL override could not be removed.",
        error
      );
    }

    var restoredUrl =
      getDefaultBackendUrl();

    window.MMC_BACKEND_URL =
      restoredUrl;

    if (
      window.MMC_CONFIG &&
      typeof window.MMC_CONFIG ===
        "object"
    ) {
      window.MMC_CONFIG.backendUrl =
        restoredUrl;

      window.MMC_CONFIG.environment =
        isLocalWebsite()
          ? "development"
          : "production";
    }

    return restoredUrl;
  }

  // ==========================================================
  // PUBLIC WEBSITE PAGE ROUTES
  // ==========================================================

  var PUBLIC_PAGE_ROUTES = {
    home:
      "index.html",

    about:
      "about.html",

    services:
      "services.html",

    gallery:
      "gallery.html",

    shop:
      "shop.html",

    product:
      "product.html",

    cart:
      "cart.html",

    checkout:
      "checkout.html",

    contact:
      "contact.html",

    clientIntake:
      "client-intake.html"
  };

  // ==========================================================
  // ADMINISTRATOR PAGE ROUTES
  // ==========================================================

  var ADMIN_PAGE_ROUTES = {
    login:
      "admin-login.html",

    dashboard:
      "admin-dashboard.html",

    products:
      "admin-products.html",

    addProduct:
      "admin-add-product.html",

    editProduct:
      "admin-edit-product.html",

    deleteProduct:
      "admin-delete-product.html",

    categories:
      "admin-categories.html",

    addCategory:
      "admin-add-category.html",

    editCategory:
      "admin-edit-category.html",

    deleteCategory:
      "admin-delete-category.html",

    inventory:
      "admin-inventory.html",

    orders:
      "admin-orders.html",

    intake:
      "admin-intake.html",

    settings:
      "admin-settings.html",

    users:
      "admin-users.html"
  };

  // ==========================================================
  // COMBINED PAGE ROUTES
  // ==========================================================

  var PAGE_ROUTES = {
    home:
      PUBLIC_PAGE_ROUTES.home,

    about:
      PUBLIC_PAGE_ROUTES.about,

    services:
      PUBLIC_PAGE_ROUTES.services,

    gallery:
      PUBLIC_PAGE_ROUTES.gallery,

    shop:
      PUBLIC_PAGE_ROUTES.shop,

    product:
      PUBLIC_PAGE_ROUTES.product,

    cart:
      PUBLIC_PAGE_ROUTES.cart,

    checkout:
      PUBLIC_PAGE_ROUTES.checkout,

    contact:
      PUBLIC_PAGE_ROUTES.contact,

    clientIntake:
      PUBLIC_PAGE_ROUTES.clientIntake,

    adminLogin:
      ADMIN_PAGE_ROUTES.login,

    adminDashboard:
      ADMIN_PAGE_ROUTES.dashboard,

    adminProducts:
      ADMIN_PAGE_ROUTES.products,

    adminAddProduct:
      ADMIN_PAGE_ROUTES.addProduct,

    adminEditProduct:
      ADMIN_PAGE_ROUTES.editProduct,

    adminDeleteProduct:
      ADMIN_PAGE_ROUTES.deleteProduct,

    adminCategories:
      ADMIN_PAGE_ROUTES.categories,

    adminAddCategory:
      ADMIN_PAGE_ROUTES.addCategory,

    adminEditCategory:
      ADMIN_PAGE_ROUTES.editCategory,

    adminDeleteCategory:
      ADMIN_PAGE_ROUTES.deleteCategory,

    adminInventory:
      ADMIN_PAGE_ROUTES.inventory,

    adminOrders:
      ADMIN_PAGE_ROUTES.orders,

    adminIntake:
      ADMIN_PAGE_ROUTES.intake,

    adminSettings:
      ADMIN_PAGE_ROUTES.settings,

    adminUsers:
      ADMIN_PAGE_ROUTES.users
  };

  // ==========================================================
  // PUBLIC API ROUTES
  // ==========================================================

  var PUBLIC_API_ROUTES = {
    health:
      "/health",

    products:
      "/products",

    categories:
      "/categories",

    settings:
      "/settings",

    clientIntakes:
      "/intakes",

    checkout:
      "/checkout",

    createCheckoutSession:
      "/checkout/create-session",

    uploadImage:
      "/upload/image"
  };

  // ==========================================================
  // ADMINISTRATOR API ROUTES
  // ==========================================================

  var ADMIN_API_ROUTES = {
    login:
      "/admin/login",

    session:
      "/admin/me",

    products:
      "/admin/products",

    productSummary:
      "/admin/products/summary",

    categories:
      "/admin/categories",

    inventory:
      "/admin/inventory",

    orders:
      "/admin/orders",

    intakes:
      "/admin/intakes",

    settings:
      "/admin/settings",

    systemStatus:
      "/admin/system-status",

    users:
      "/admin/users"
  };

  // ==========================================================
  // COMBINED API ROUTES
  // ==========================================================

  var API_ROUTES = {
    health:
      PUBLIC_API_ROUTES.health,

    products:
      PUBLIC_API_ROUTES.products,

    categories:
      PUBLIC_API_ROUTES.categories,

    settings:
      PUBLIC_API_ROUTES.settings,

    clientIntakes:
      PUBLIC_API_ROUTES.clientIntakes,

    checkout:
      PUBLIC_API_ROUTES.checkout,

    createCheckoutSession:
      PUBLIC_API_ROUTES
        .createCheckoutSession,

    uploadImage:
      PUBLIC_API_ROUTES.uploadImage,

    adminLogin:
      ADMIN_API_ROUTES.login,

    adminSession:
      ADMIN_API_ROUTES.session,

    adminProducts:
      ADMIN_API_ROUTES.products,

    adminProductSummary:
      ADMIN_API_ROUTES.productSummary,

    adminCategories:
      ADMIN_API_ROUTES.categories,

    adminInventory:
      ADMIN_API_ROUTES.inventory,

    adminOrders:
      ADMIN_API_ROUTES.orders,

    adminIntakes:
      ADMIN_API_ROUTES.intakes,

    adminSettings:
      ADMIN_API_ROUTES.settings,

    adminSystemStatus:
      ADMIN_API_ROUTES.systemStatus,

    adminUsers:
      ADMIN_API_ROUTES.users
  };

  // ==========================================================
  // ROUTE BUILDERS
  // ==========================================================

  function createProductApiUrl(
    productId
  ) {
    return createApiUrl(
      API_ROUTES.products +
      "/" +
      encodeURIComponent(
        String(productId || "")
      )
    );
  }

  function createAdminProductApiUrl(
    productId
  ) {
    return createApiUrl(
      API_ROUTES.adminProducts +
      "/" +
      encodeURIComponent(
        String(productId || "")
      )
    );
  }

  function createAdminOrderApiUrl(
    orderId
  ) {
    return createApiUrl(
      API_ROUTES.adminOrders +
      "/" +
      encodeURIComponent(
        String(orderId || "")
      )
    );
  }

  function createAdminOrderStatusApiUrl(
    orderId
  ) {
    return (
      createAdminOrderApiUrl(
        orderId
      ) +
      "/status"
    );
  }

  function createAdminIntakeApiUrl(
    intakeId
  ) {
    return createApiUrl(
      API_ROUTES.adminIntakes +
      "/" +
      encodeURIComponent(
        String(intakeId || "")
      )
    );
  }

  function createAdminIntakeStatusApiUrl(
    intakeId
  ) {
    return (
      createAdminIntakeApiUrl(
        intakeId
      ) +
      "/status"
    );
  }

  function createAdminCategoryApiUrl(
    categoryId
  ) {
    return createApiUrl(
      API_ROUTES.adminCategories +
      "/" +
      encodeURIComponent(
        String(categoryId || "")
      )
    );
  }

  function createAdminUserApiUrl(
    administratorId
  ) {
    return createApiUrl(
      API_ROUTES.adminUsers +
      "/" +
      encodeURIComponent(
        String(
          administratorId ||
          ""
        )
      )
    );
  }

  // ==========================================================
  // CREATE PUBLIC CONFIGURATION
  // ==========================================================

  var selectedBackendUrl =
    getBackendUrl();

  window.MMC_BACKEND_URL =
    selectedBackendUrl;

  window.MMC_CONFIG = {
    applicationName:
      "Multi-Maniacs Customs LLC",

    environment:
      isLocalWebsite()
        ? "development"
        : "production",

    backendUrl:
      selectedBackendUrl,

    productionBackendUrl:
      PRODUCTION_BACKEND_URL,

    localBackendUrl:
      LOCAL_BACKEND_URL,

    storageKeys:
      STORAGE_KEYS,

    pages:
      PAGE_ROUTES,

    publicPages:
      PUBLIC_PAGE_ROUTES,

    adminPages:
      ADMIN_PAGE_ROUTES,

    api:
      API_ROUTES,

    publicApi:
      PUBLIC_API_ROUTES,

    adminApi:
      ADMIN_API_ROUTES,

    createApiUrl:
      createApiUrl,

    createProductApiUrl:
      createProductApiUrl,

    createAdminProductApiUrl:
      createAdminProductApiUrl,

    createAdminOrderApiUrl:
      createAdminOrderApiUrl,

    createAdminOrderStatusApiUrl:
      createAdminOrderStatusApiUrl,

    createAdminIntakeApiUrl:
      createAdminIntakeApiUrl,

    createAdminIntakeStatusApiUrl:
      createAdminIntakeStatusApiUrl,

    createAdminCategoryApiUrl:
      createAdminCategoryApiUrl,

    createAdminUserApiUrl:
      createAdminUserApiUrl,

    setBackendUrlOverride:
      setBackendUrlOverride,

    clearBackendUrlOverride:
      clearBackendUrlOverride,

    isLocalWebsite:
      isLocalWebsite
  };

  // ==========================================================
  // CONFIGURATION CHECK
  // ==========================================================

  if (
    !isValidHttpUrl(
      selectedBackendUrl
    )
  ) {
    console.error(
      "The MMC backend URL in config.js is invalid."
    );
  } else {
    console.log(
      "MMC frontend configuration loaded."
    );

    console.log(
      "MMC environment:",
      window.MMC_CONFIG.environment
    );

    console.log(
      "MMC backend URL:",
      selectedBackendUrl
    );
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.createMmcApiUrl =
    createApiUrl;

  window.setMmcBackendUrl =
    setBackendUrlOverride;

  window.clearMmcBackendUrl =
    clearBackendUrlOverride;
}());