// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-dashboard.js
// ADMINISTRATOR DASHBOARD
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

  var dashboardLoading =
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

  var ADMIN_SESSION_URL =
    BACKEND_URL +
    "/admin/me";

  var ADMIN_PRODUCTS_URL =
    BACKEND_URL +
    "/admin/products";

  // ==========================================================
  // AUTHENTICATION
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

  function getAdminHeaders() {
    return {
      Accept:
        "application/json",

      Authorization:
        "Bearer " +
        getAdminToken()
    };
  }

  function clearSavedAdminLogin() {
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

  function redirectToLogin() {
    clearSavedAdminLogin();

    window.location.replace(
      "admin-login.html?return=" +
      encodeURIComponent(
        "admin-dashboard.html"
      )
    );
  }

  function logoutAdmin() {
    redirectToLogin();
  }

  // ==========================================================
  // QUICK NAVIGATION
  // ==========================================================

  function go(
    page
  ) {
    if (!page) {
      return;
    }

    window.location.href =
      page;
  }

  function openProductManagement() {
    window.location.href =
      "admin-products.html";
  }

  function openSettings() {
    window.location.href =
      "admin-settings.html";
  }

  function openWebsite() {
    window.location.href =
      "index.html";
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

  async function readDashboardResponse(
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

    var responseData =
      {};

    if (responseText) {
      try {
        responseData =
          JSON.parse(
            responseText
          );
      } catch (error) {
        responseData = {
          error:
            responseText
        };
      }
    }

    if (
      response.status ===
      401
    ) {
      redirectToLogin();

      throw new Error(
        getErrorMessage(
          responseData,
          "Your administrator session expired. Please log in again."
        )
      );
    }

    if (
      response.status ===
      403
    ) {
      throw new Error(
        getErrorMessage(
          responseData,
          "You do not have permission to perform this action."
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

  // ==========================================================
  // DASHBOARD STATUS
  // ==========================================================

  function showDashboardStatus(
    message,
    messageType
  ) {
    var statusElement =
      getElement(
        "dashboard-status"
      );

    if (!statusElement) {
      return;
    }

    statusElement.textContent =
      String(message || "");

    statusElement.classList.remove(
      "dashboard-success",
      "dashboard-error",
      "dashboard-information",
      "admin-success",
      "admin-error",
      "admin-information"
    );

    statusElement.removeAttribute(
      "role"
    );

    if (!message) {
      return;
    }

    if (
      messageType ===
      "success"
    ) {
      statusElement.classList.add(
        "dashboard-success"
      );

      statusElement.setAttribute(
        "role",
        "status"
      );
    } else if (
      messageType ===
      "error"
    ) {
      statusElement.classList.add(
        "dashboard-error"
      );

      statusElement.setAttribute(
        "role",
        "alert"
      );
    } else {
      statusElement.classList.add(
        "dashboard-information"
      );

      statusElement.setAttribute(
        "role",
        "status"
      );
    }
  }

  // ==========================================================
  // ADMINISTRATOR INFORMATION
  // ==========================================================

  function formatRole(
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
    admin
  ) {
    var username =
      String(
        admin.username ||
        admin.name ||
        admin.email ||
        "Administrator"
      );

    var formattedRole =
      formatRole(
        admin.role
      );

    [
      "admin-username",
      "admin-header-username"
    ].forEach(
      function (elementId) {
        var element =
          getElement(
            elementId
          );

        if (element) {
          element.textContent =
            username;
        }
      }
    );

    [
      "admin-role",
      "admin-header-role"
    ].forEach(
      function (elementId) {
        var element =
          getElement(
            elementId
          );

        if (element) {
          element.textContent =
            formattedRole;
        }
      }
    );

    updateAdminManagementVisibility(
      admin.role
    );
  }

  function updateAdminManagementVisibility(
    role
  ) {
    var protectedElements =
      document.querySelectorAll(
        "[data-super-admin-only]"
      );

    var normalizedRole =
      String(role || "")
        .trim()
        .toLowerCase();

    var isSuperAdministrator =
      normalizedRole ===
        "super_admin" ||
      normalizedRole ===
        "super-admin" ||
      normalizedRole ===
        "super administrator";

    protectedElements.forEach(
      function (element) {
        element.hidden =
          !isSuperAdministrator;
      }
    );
  }

  // ==========================================================
  // VERIFY ADMINISTRATOR SESSION
  // ==========================================================

  async function verifyAdminSession() {
    var token =
      getAdminToken();

    if (!token) {
      redirectToLogin();

      return false;
    }

    try {
      var response =
        await fetchWithTimeout(
          ADMIN_SESSION_URL,
          {
            method:
              "GET",

            headers:
              getAdminHeaders()
          }
        );

      var responseData =
        await readDashboardResponse(
          response
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
        "Administrator session check failed.",
        error
      );

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        showDashboardStatus(
          "The administrator session check took too long. Please reload the page.",
          "error"
        );
      } else {
        showDashboardStatus(
          getErrorMessage(
            error,
            "Your administrator session could not be verified."
          ),
          "error"
        );
      }

      return false;
    }
  }

  // ==========================================================
  // UPDATE STATISTIC
  // ==========================================================

  function updateStat(
    elementId,
    value
  ) {
    var element =
      getElement(
        elementId
      );

    if (element) {
      element.textContent =
        String(value);
    }
  }

  function resetDashboardStatistics() {
    updateStat(
      "totalProducts",
      0
    );

    updateStat(
      "totalVariants",
      0
    );

    updateStat(
      "activeProducts",
      0
    );

    updateStat(
      "inactiveProducts",
      0
    );

    updateStat(
      "totalStock",
      0
    );

    updateStat(
      "lowStockProducts",
      0
    );

    updateStat(
      "outOfStockProducts",
      0
    );
  }

  // ==========================================================
  // PRODUCT DATA HELPERS
  // ==========================================================

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

    return null;
  }

  function getNonNegativeNumber(
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

  function getLowStockLimit(
    product
  ) {
    var warningValue =
      product.lowStockWarning;

    if (
      warningValue ===
      undefined
    ) {
      warningValue =
        product.low_stock_warning;
    }

    var limit =
      Number(
        warningValue
      );

    if (
      !Number.isFinite(limit) ||
      limit < 0
    ) {
      return 5;
    }

    return limit;
  }

  function isProductActive(
    product
  ) {
    if (
      product.active ===
      false
    ) {
      return false;
    }

    if (
      product.active ===
      0
    ) {
      return false;
    }

    if (
      String(
        product.active
      ).toLowerCase() ===
      "false"
    ) {
      return false;
    }

    return true;
  }

  // ==========================================================
  // CALCULATE DASHBOARD STATISTICS
  // ==========================================================

  function calculateDashboardStatistics(
    products
  ) {
    var statistics = {
      totalProducts:
        products.length,

      totalVariants:
        0,

      activeProducts:
        0,

      inactiveProducts:
        0,

      totalStock:
        0,

      lowStockProducts:
        0,

      outOfStockProducts:
        0
    };

    products.forEach(
      function (product) {
        if (
          !product ||
          typeof product !==
            "object"
        ) {
          return;
        }

        var variants =
          Array.isArray(
            product.variants
          )
            ? product.variants
            : [];

        statistics.totalVariants +=
          variants.length;

        if (
          isProductActive(
            product
          )
        ) {
          statistics.activeProducts +=
            1;
        } else {
          statistics.inactiveProducts +=
            1;
        }

        var lowStockLimit =
          getLowStockLimit(
            product
          );

        if (
          variants.length >
          0
        ) {
          var allVariantsOutOfStock =
            true;

          var hasLowStockVariant =
            false;

          variants.forEach(
            function (variant) {
              var variantStock =
                getNonNegativeNumber(
                  variant &&
                  variant.stock
                );

              statistics.totalStock +=
                variantStock;

              if (
                variantStock >
                0
              ) {
                allVariantsOutOfStock =
                  false;

                if (
                  variantStock <=
                  lowStockLimit
                ) {
                  hasLowStockVariant =
                    true;
                }
              }
            }
          );

          if (
            allVariantsOutOfStock
          ) {
            statistics.outOfStockProducts +=
              1;
          } else if (
            hasLowStockVariant
          ) {
            statistics.lowStockProducts +=
              1;
          }
        } else {
          var productStock =
            getNonNegativeNumber(
              product.stock
            );

          statistics.totalStock +=
            productStock;

          if (
            productStock <=
            0
          ) {
            statistics.outOfStockProducts +=
              1;
          } else if (
            productStock <=
            lowStockLimit
          ) {
            statistics.lowStockProducts +=
              1;
          }
        }
      }
    );

    statistics.totalStock =
      Math.floor(
        statistics.totalStock
      );

    return statistics;
  }

  function displayDashboardStatistics(
    statistics
  ) {
    updateStat(
      "totalProducts",
      statistics.totalProducts
    );

    updateStat(
      "totalVariants",
      statistics.totalVariants
    );

    updateStat(
      "activeProducts",
      statistics.activeProducts
    );

    updateStat(
      "inactiveProducts",
      statistics.inactiveProducts
    );

    updateStat(
      "totalStock",
      statistics.totalStock
    );

    updateStat(
      "lowStockProducts",
      statistics.lowStockProducts
    );

    updateStat(
      "outOfStockProducts",
      statistics.outOfStockProducts
    );
  }

  // ==========================================================
  // REFRESH BUTTON STATE
  // ==========================================================

  function setRefreshButtonLoading(
    isLoading
  ) {
    var refreshButton =
      getElement(
        "refresh-dashboard-button"
      );

    if (!refreshButton) {
      return;
    }

    refreshButton.disabled =
      Boolean(
        isLoading
      );

    refreshButton.setAttribute(
      "aria-busy",
      isLoading
        ? "true"
        : "false"
    );

    refreshButton.textContent =
      isLoading
        ? "Refreshing..."
        : "Refresh Dashboard";
  }

  // ==========================================================
  // LOAD DASHBOARD STATISTICS
  // ==========================================================

  async function loadStats() {
    if (dashboardLoading) {
      return false;
    }

    dashboardLoading =
      true;

    setRefreshButtonLoading(
      true
    );

    showDashboardStatus(
      "Loading dashboard...",
      "information"
    );

    try {
      var response =
        await fetchWithTimeout(
          ADMIN_PRODUCTS_URL,
          {
            method:
              "GET",

            headers:
              getAdminHeaders()
          }
        );

      var responseData =
        await readDashboardResponse(
          response
        );

      var products =
        getProductList(
          responseData
        );

      if (!products) {
        throw new Error(
          "The server did not return a valid product list."
        );
      }

      var statistics =
        calculateDashboardStatistics(
          products
        );

      displayDashboardStatistics(
        statistics
      );

      showDashboardStatus(
        "Dashboard updated successfully.",
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Dashboard statistics failed.",
        error
      );

      resetDashboardStatistics();

      var errorMessage;

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        errorMessage =
          "The dashboard request took too long. Please try again.";
      } else if (
        error instanceof
        TypeError
      ) {
        errorMessage =
          "The dashboard server could not be reached. " +
          "Check the backend URL and try again.";
      } else {
        errorMessage =
          getErrorMessage(
            error,
            "Unable to load the dashboard."
          );
      }

      showDashboardStatus(
        errorMessage,
        "error"
      );

      return false;
    } finally {
      dashboardLoading =
        false;

      setRefreshButtonLoading(
        false
      );
    }
  }

  // ==========================================================
  // REFRESH DASHBOARD
  // ==========================================================

  async function refreshDashboard() {
    await loadStats();
  }

  // ==========================================================
  // ADMINISTRATOR MANAGEMENT
  // ==========================================================

  function getSavedAdministrator() {
    var savedAdministrator =
      localStorage.getItem(
        "adminUser"
      );

    if (!savedAdministrator) {
      return null;
    }

    try {
      return JSON.parse(
        savedAdministrator
      );
    } catch (error) {
      console.error(
        "Could not read saved administrator information.",
        error
      );

      return null;
    }
  }

  function isSuperAdministrator(
    role
  ) {
    var normalizedRole =
      String(role || "")
        .trim()
        .toLowerCase();

    return (
      normalizedRole ===
        "super_admin" ||
      normalizedRole ===
        "super-admin" ||
      normalizedRole ===
        "super administrator"
    );
  }

  function openAdminManagement() {
    var administrator =
      getSavedAdministrator();

    if (
      !administrator ||
      !isSuperAdministrator(
        administrator.role
      )
    ) {
      showDashboardStatus(
        "Only a super administrator can manage administrator accounts.",
        "error"
      );

      return;
    }

    window.location.href =
      "admin-users.html";
  }

  // ==========================================================
  // CONNECT BUTTONS
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

  function connectDashboardButtons() {
    var refreshButton =
      getElement(
        "refresh-dashboard-button"
      );

    var manageProductsButton =
      getElement(
        "manage-products-button"
      );

    var manageAdminsButton =
      getElement(
        "manage-admins-button"
      );

    var manageSettingsButton =
      getElement(
        "manage-settings-button"
      );

    var viewWebsiteButton =
      getElement(
        "view-website-button"
      );

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        refreshDashboard
      );
    }

    if (manageProductsButton) {
      manageProductsButton.addEventListener(
        "click",
        openProductManagement
      );
    }

    if (manageAdminsButton) {
      manageAdminsButton.addEventListener(
        "click",
        openAdminManagement
      );
    }

    if (manageSettingsButton) {
      manageSettingsButton.addEventListener(
        "click",
        openSettings
      );
    }

    if (viewWebsiteButton) {
      viewWebsiteButton.addEventListener(
        "click",
        openWebsite
      );
    }
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  async function initializeDashboard() {
    connectLogoutButtons();
    connectDashboardButtons();

    var validSession =
      await verifyAdminSession();

    if (!validSession) {
      return;
    }

    await loadStats();

    console.log(
      "MMC administrator dashboard initialized."
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeDashboard
    );
  } else {
    initializeDashboard();
  }

  // ==========================================================
  // OPTIONAL INLINE HTML SUPPORT
  // ==========================================================

  window.go =
    go;

  window.loadStats =
    loadStats;

  window.refreshDashboard =
    refreshDashboard;

  window.logoutAdmin =
    logoutAdmin;

  window.openProductManagement =
    openProductManagement;

  window.openAdminManagement =
    openAdminManagement;

  window.openSettings =
    openSettings;

  window.openWebsite =
    openWebsite;
}());