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
  // BACKEND URL
  // ==========================================================

  /*
   * Replace this URL only if your actual backend Vercel domain
   * is different.
   *
   * Requirements:
   * - Include https://
   * - Do not add a trailing slash
   * - Do not add /health, /products, or another endpoint
   */

  var PRODUCTION_BACKEND_URL =
    "https://multi-maniacs-customs-backend.vercel.app";

  /*
   * This address is used when testing the website locally.
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
      "MMC_BACKEND_URL"
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

  // ==========================================================
  // LOCAL DEVELOPMENT CHECK
  // ==========================================================

  function isLocalWebsite() {
    var hostname =
      window.location.hostname;

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    );
  }

  // ==========================================================
  // SAVED BACKEND OVERRIDE
  // ==========================================================

  function getSavedBackendOverride() {
    try {
      var savedUrl =
        localStorage.getItem(
          STORAGE_KEYS
            .backendOverride
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

  function getBackendUrl() {
    var savedOverride =
      getSavedBackendOverride();

    if (savedOverride) {
      return savedOverride;
    }

    if (isLocalWebsite()) {
      return removeTrailingSlashes(
        LOCAL_BACKEND_URL
      );
    }

    return removeTrailingSlashes(
      PRODUCTION_BACKEND_URL
    );
  }

  // ==========================================================
  // CREATE API URL
  // ==========================================================

  function createApiUrl(
    path
  ) {
    var normalizedPath =
      String(path || "")
        .trim();

    if (!normalizedPath) {
      return window.MMC_BACKEND_URL;
    }

    if (
      normalizedPath.charAt(0) !==
      "/"
    ) {
      normalizedPath =
        "/" +
        normalizedPath;
    }

    return (
      window.MMC_BACKEND_URL +
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
        STORAGE_KEYS
          .backendOverride,
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

    window.MMC_CONFIG.backendUrl =
      cleanedUrl;

    return true;
  }

  function clearBackendUrlOverride() {
    try {
      localStorage.removeItem(
        STORAGE_KEYS
          .backendOverride
      );
    } catch (error) {
      console.warn(
        "The backend URL override could not be removed.",
        error
      );
    }

    var restoredUrl =
      isLocalWebsite()
        ? removeTrailingSlashes(
            LOCAL_BACKEND_URL
          )
        : removeTrailingSlashes(
            PRODUCTION_BACKEND_URL
          );

    window.MMC_BACKEND_URL =
      restoredUrl;

    window.MMC_CONFIG.backendUrl =
      restoredUrl;

    return restoredUrl;
  }

  // ==========================================================
  // PAGE ROUTES
  // ==========================================================

  var PAGE_ROUTES = {
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
      "client-intake.html",

    adminLogin:
      "admin-login.html",

    adminDashboard:
      "admin-dashboard.html",

    adminProducts:
      "admin-products.html",

    adminAddProduct:
      "admin-add-product.html",

    adminEditProduct:
      "admin-edit-product.html",

    adminInventory:
      "admin-inventory.html",

    adminOrders:
      "admin-orders.html",

    adminIntake:
      "admin-intake.html",

    adminSettings:
      "admin-settings.html",

    adminAddCategory:
      "admin-add-category.html",

    adminEditCategory:
      "admin-edit-category.html",

    adminDeleteCategory:
      "admin-delete-category.html"
  };

  // ==========================================================
  // API ROUTES
  // ==========================================================

  var API_ROUTES = {
    health:
      "/health",

    products:
      "/products",

    adminLogin:
      "/admin/login",

    adminSession:
      "/admin/me",

    adminProducts:
      "/admin/products",

    adminProductSummary:
      "/admin/products/summary"
  };

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

    storageKeys:
      STORAGE_KEYS,

    pages:
      PAGE_ROUTES,

    api:
      API_ROUTES,

    createApiUrl:
      createApiUrl,

    setBackendUrlOverride:
      setBackendUrlOverride,

    clearBackendUrlOverride:
      clearBackendUrlOverride
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