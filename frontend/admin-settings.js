// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADMIN SETTINGS MANAGEMENT
// ============================================================

(function () {
  "use strict";

  var SETTINGS_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var ADMIN_SETTINGS_URL =
    SETTINGS_BACKEND_URL +
    "/admin/settings";

  var SYSTEM_STATUS_URL =
    SETTINGS_BACKEND_URL +
    "/admin/system-status";

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
      value === undefined ||
      value === null
    ) {
      target.value = "";
    } else {
      target.value =
        String(value);
    }
  }

  function setText(
    elementId,
    value
  ) {
    var target =
      getElement(elementId);

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
        "You do not have permission to manage settings."
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
  // PAGE MESSAGES
  // ==========================================================

  function showMessage(
    message,
    messageType
  ) {
    var messageBox =
      getElement(
        "settings-message"
      );

    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      message || "";

    messageBox.classList.remove(
      "settings-error",
      "settings-success",
      "settings-information"
    );

    if (messageType === "error") {
      messageBox.classList.add(
        "settings-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageBox.classList.add(
        "settings-success"
      );
    } else {
      messageBox.classList.add(
        "settings-information"
      );
    }
  }

  function clearMessage() {
    showMessage(
      "",
      "information"
    );
  }

  // ==========================================================
  // VERIFY ADMINISTRATOR
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
        SETTINGS_BACKEND_URL +
        "/admin/me",
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readResponse(
          response
        );

      var admin =
        data.admin || {};

      localStorage.setItem(
        "adminUser",
        JSON.stringify(admin)
      );

      setText(
        "admin-username",
        admin.username || ""
      );

      setText(
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

      showMessage(
        error.message ||
        "The administrator session could not be verified.",
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // FORM VALUE HELPERS
  // ==========================================================

  function getNumberValue(
    elementId,
    fallbackValue
  ) {
    var rawValue =
      getValue(elementId);

    var number =
      Number(rawValue);

    if (!Number.isFinite(number)) {
      return fallbackValue;
    }

    return number;
  }

  function getWholeNumberValue(
    elementId,
    fallbackValue
  ) {
    var number =
      getNumberValue(
        elementId,
        fallbackValue
      );

    if (!Number.isInteger(number)) {
      return fallbackValue;
    }

    return number;
  }

  function getBooleanValue(
    elementId,
    fallbackValue
  ) {
    var target =
      getElement(elementId);

    if (!target) {
      return fallbackValue;
    }

    return (
      target.value === "true"
    );
  }

  // ==========================================================
  // NORMALIZE SETTINGS
  // ==========================================================

  function normalizeSettings(
    settings
  ) {
    var taxRate =
      settings.taxRate;

    if (taxRate === undefined) {
      taxRate =
        settings.tax_rate;
    }

    var defaultStock =
      settings.defaultStock;

    if (
      defaultStock === undefined
    ) {
      defaultStock =
        settings.default_stock;
    }

    var lowStockWarning =
      settings.defaultLowStockWarning;

    if (
      lowStockWarning === undefined
    ) {
      lowStockWarning =
        settings.default_low_stock_warning;
    }

    var storeOpen =
      settings.storeOpen;

    if (storeOpen === undefined) {
      storeOpen =
        settings.store_open;
    }

    var autoActivate =
      settings.autoActivateProducts;

    if (autoActivate === undefined) {
      autoActivate =
        settings.auto_activate_products;
    }

    return {
      storeName: String(
        settings.storeName ||
        settings.store_name ||
        "Multi-Maniacs Customs LLC"
      ),

      contactPhone1: String(
        settings.contactPhone1 ||
        settings.contact_phone_1 ||
        ""
      ),

      contactPhone2: String(
        settings.contactPhone2 ||
        settings.contact_phone_2 ||
        ""
      ),

      contactEmail: String(
        settings.contactEmail ||
        settings.contact_email ||
        ""
      ),

      businessLocation: String(
        settings.businessLocation ||
        settings.business_location ||
        ""
      ),

      taxRate: Number(
        taxRate !== undefined
          ? taxRate
          : 0
      ),

      storeOpen:
        storeOpen !== false,

      closedStoreMessage: String(
        settings.closedStoreMessage ||
        settings.closed_store_message ||
        ""
      ),

      defaultStock: Number(
        defaultStock !== undefined
          ? defaultStock
          : 0
      ),

      defaultLowStockWarning: Number(
        lowStockWarning !== undefined
          ? lowStockWarning
          : 5
      ),

      autoActivateProducts:
        autoActivate !== false
    };
  }

  // ==========================================================
  // POPULATE SETTINGS FORM
  // ==========================================================

  function populateSettingsForm(
    settings
  ) {
    var normalizedSettings =
      normalizeSettings(settings);

    setValue(
      "storeName",
      normalizedSettings.storeName
    );

    setValue(
      "contactPhone1",
      normalizedSettings.contactPhone1
    );

    setValue(
      "contactPhone2",
      normalizedSettings.contactPhone2
    );

    setValue(
      "contactEmail",
      normalizedSettings.contactEmail
    );

    setValue(
      "businessLocation",
      normalizedSettings.businessLocation
    );

    setValue(
      "taxRate",
      normalizedSettings.taxRate
    );

    setValue(
      "storeOpen",
      normalizedSettings.storeOpen
        ? "true"
        : "false"
    );

    setValue(
      "closedStoreMessage",
      normalizedSettings.closedStoreMessage
    );

    setValue(
      "defaultStock",
      normalizedSettings.defaultStock
    );

    setValue(
      "defaultLowStockWarning",
      normalizedSettings
        .defaultLowStockWarning
    );

    setValue(
      "autoActivateProducts",
      normalizedSettings
        .autoActivateProducts
        ? "true"
        : "false"
    );
  }

  // ==========================================================
  // BUILD SETTINGS PAYLOAD
  // ==========================================================

  function buildSettingsPayload() {
    return {
      storeName:
        getValue(
          "storeName"
        ),

      contactPhone1:
        getValue(
          "contactPhone1"
        ),

      contactPhone2:
        getValue(
          "contactPhone2"
        ),

      contactEmail:
        getValue(
          "contactEmail"
        ),

      businessLocation:
        getValue(
          "businessLocation"
        ),

      taxRate:
        getNumberValue(
          "taxRate",
          0
        ),

      storeOpen:
        getBooleanValue(
          "storeOpen",
          true
        ),

      closedStoreMessage:
        getValue(
          "closedStoreMessage"
        ),

      defaultStock:
        getWholeNumberValue(
          "defaultStock",
          0
        ),

      defaultLowStockWarning:
        getWholeNumberValue(
          "defaultLowStockWarning",
          5
        ),

      autoActivateProducts:
        getBooleanValue(
          "autoActivateProducts",
          true
        )
    };
  }

  // ==========================================================
  // VALIDATE SETTINGS
  // ==========================================================
})();