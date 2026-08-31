// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-settings.js
// ADMINISTRATOR SETTINGS MANAGEMENT
//
// Frontend: Vercel
// Backend: Express
// Database: Neon PostgreSQL
// Authentication: JWT
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var REQUEST_TIMEOUT_MS = 15000;

  var settingsRequestActive = false;
  var statusRequestActive = false;

  var DEFAULT_SETTINGS = {
    storeName: "Multi-Maniacs Customs LLC",
    contactPhone1: "",
    contactPhone2: "",
    contactEmail: "",
    businessLocation: "Essie, Kentucky",
    taxRate: 0,
    storeOpen: true,
    closedStoreMessage:
      "The online shop is temporarily unavailable. Please contact MMC for assistance.",
    defaultStock: 0,
    defaultLowStockWarning: 5,
    autoActivateProducts: true
  };

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getElement(elementId) {
    return document.getElementById(elementId);
  }

  function getValue(elementId) {
    var element = getElement(elementId);

    if (!element) {
      return "";
    }

    return String(element.value || "").trim();
  }

  function setValue(elementId, value) {
    var element = getElement(elementId);

    if (!element) {
      return;
    }

    element.value =
      value === undefined || value === null
        ? ""
        : String(value);
  }

  function setText(elementId, value) {
    var element = getElement(elementId);

    if (!element) {
      return;
    }

    element.textContent =
      value === undefined || value === null
        ? ""
        : String(value);
  }

  // ==========================================================
  // BACKEND URL
  // ==========================================================

  function removeTrailingSlashes(value) {
    return String(value || "")
      .trim()
      .replace(/\/+$/, "");
  }

  function getBackendUrl() {
    if (
      typeof window.MMC_BACKEND_URL === "string" &&
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

    if (
      typeof savedBackendUrl === "string" &&
      savedBackendUrl.trim()
    ) {
      return removeTrailingSlashes(
        savedBackendUrl
      );
    }

    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://localhost:10000";
    }

    return removeTrailingSlashes(
      window.location.origin
    );
  }

  var BACKEND_URL = getBackendUrl();

  var ADMIN_SETTINGS_URL =
    BACKEND_URL + "/admin/settings";

  var SYSTEM_STATUS_URL =
    BACKEND_URL + "/admin/system-status";

  var ADMIN_SESSION_URL =
    BACKEND_URL + "/admin/me";

  // ==========================================================
  // ADMINISTRATOR AUTHENTICATION
  // ==========================================================

  function getAdminToken() {
    return String(
      localStorage.getItem("adminToken") ||
      localStorage.getItem("MMC_ADMIN_TOKEN") ||
      ""
    ).trim();
  }

  function getAdminHeaders(includeJson) {
    var headers = {
      Accept: "application/json",
      Authorization:
        "Bearer " + getAdminToken()
    };

    if (includeJson) {
      headers["Content-Type"] =
        "application/json";
    }

    return headers;
  }

  function clearAdminSession() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("MMC_ADMIN_TOKEN");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("token");
  }

  function redirectToAdminLogin() {
    clearAdminSession();

    window.location.replace(
      "admin-login.html?return=" +
      encodeURIComponent(
        "admin-settings.html"
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
        REQUEST_TIMEOUT_MS
      );

    try {
      return await fetch(
        url,
        Object.assign(
          {},
          options || {},
          {
            signal: controller.signal
          }
        )
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readResponse(response) {
    var responseText = "";

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
      return JSON.parse(responseText);
    } catch (error) {
      return {
        error: responseText
      };
    }
  }

  function getErrorMessage(
    value,
    fallbackMessage
  ) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      value &&
      typeof value === "object"
    ) {
      if (
        typeof value.message === "string" &&
        value.message.trim()
      ) {
        return value.message.trim();
      }

      if (value.error !== undefined) {
        return getErrorMessage(
          value.error,
          fallbackMessage
        );
      }

      if (value.errors !== undefined) {
        return getErrorMessage(
          value.errors,
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
      error.name === "AbortError"
    ) {
      return (
        "The settings request took too long. " +
        "Check the backend connection and try again."
      );
    }

    if (error instanceof TypeError) {
      return (
        "The settings server could not be reached. " +
        "Check the backend URL and CORS settings."
      );
    }

    return getErrorMessage(
      error,
      fallbackMessage
    );
  }

  async function requestJson(url, options) {
    var response =
      await fetchWithTimeout(
        url,
        options
      );

    var data =
      await readResponse(response);

    if (response.status === 401) {
      redirectToAdminLogin();

      throw new Error(
        "Your administrator session expired."
      );
    }

    if (response.status === 403) {
      throw new Error(
        getErrorMessage(
          data,
          "You do not have permission to manage settings."
        )
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "The settings request failed with status " +
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
      getElement("settings-message");

    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      String(message || "");

    messageBox.classList.remove(
      "settings-error",
      "settings-success",
      "settings-information"
    );

    messageBox.removeAttribute("role");

    if (!message) {
      return;
    }

    if (messageType === "success") {
      messageBox.classList.add(
        "settings-success"
      );

      messageBox.setAttribute(
        "role",
        "status"
      );
    } else if (
      messageType === "information"
    ) {
      messageBox.classList.add(
        "settings-information"
      );

      messageBox.setAttribute(
        "role",
        "status"
      );
    } else {
      messageBox.classList.add(
        "settings-error"
      );

      messageBox.setAttribute(
        "role",
        "alert"
      );
    }
  }

  // ==========================================================
  // ADMINISTRATOR INFORMATION
  // ==========================================================

  function formatAdminRole(role) {
    return String(role || "Administrator")
      .replace(/_/g, " ")
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
    var username = String(
      administrator.username ||
      administrator.name ||
      administrator.email ||
      "Administrator"
    );

    var role = formatAdminRole(
      administrator.role
    );

    [
      "admin-username",
      "admin-header-username"
    ].forEach(function (elementId) {
      setText(elementId, username);
    });

    [
      "admin-role",
      "admin-header-role"
    ].forEach(function (elementId) {
      setText(elementId, role);
    });
  }

  async function verifyAdminSession() {
    if (!getAdminToken()) {
      redirectToAdminLogin();
      return false;
    }

    try {
      var data = await requestJson(
        ADMIN_SESSION_URL,
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var administrator =
        data.admin ||
        data.user ||
        data;

      if (
        !administrator ||
        typeof administrator !== "object"
      ) {
        throw new Error(
          "The administrator information was not returned."
        );
      }

      localStorage.setItem(
        "adminUser",
        JSON.stringify(administrator)
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

      showMessage(
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
  // FORM VALUE HELPERS
  // ==========================================================

  function getNumberValue(
    elementId,
    fallbackValue
  ) {
    var rawValue = getValue(elementId);
    var number = Number(rawValue);

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
    var element =
      getElement(elementId);

    if (!element) {
      return fallbackValue;
    }

    return element.value === "true";
  }

  function normalizeBoolean(
    value,
    fallbackValue
  ) {
    if (value === true) {
      return true;
    }

    if (value === false) {
      return false;
    }

    if (
      typeof value === "string"
    ) {
      var normalizedValue =
        value.trim().toLowerCase();

      if (normalizedValue === "true") {
        return true;
      }

      if (normalizedValue === "false") {
        return false;
      }
    }

    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return Boolean(fallbackValue);
  }

  function normalizeNumber(
    value,
    fallbackValue
  ) {
    var number = Number(value);

    if (!Number.isFinite(number)) {
      return fallbackValue;
    }

    return number;
  }

  function normalizeWholeNumber(
    value,
    fallbackValue
  ) {
    var number =
      normalizeNumber(
        value,
        fallbackValue
      );

    if (!Number.isFinite(number)) {
      number = 0;
    }

    return Math.max(
      0,
      Math.floor(number)
    );
  }

  // ==========================================================
  // NORMALIZE SETTINGS
  // ==========================================================

  function normalizeSettings(settings) {
    var source =
      settings &&
      typeof settings === "object"
        ? settings
        : {};

    var taxRate = source.taxRate;

    if (taxRate === undefined) {
      taxRate = source.tax_rate;
    }

    var defaultStock =
      source.defaultStock;

    if (defaultStock === undefined) {
      defaultStock =
        source.default_stock;
    }

    var lowStockWarning =
      source.defaultLowStockWarning;

    if (
      lowStockWarning === undefined
    ) {
      lowStockWarning =
        source.default_low_stock_warning;
    }

    var storeOpen =
      source.storeOpen;

    if (storeOpen === undefined) {
      storeOpen =
        source.store_open;
    }

    var autoActivate =
      source.autoActivateProducts;

    if (autoActivate === undefined) {
      autoActivate =
        source.auto_activate_products;
    }

    return {
      storeName: String(
        source.storeName ||
        source.store_name ||
        DEFAULT_SETTINGS.storeName
      ),

      contactPhone1: String(
        source.contactPhone1 ||
        source.contact_phone_1 ||
        DEFAULT_SETTINGS.contactPhone1
      ),

      contactPhone2: String(
        source.contactPhone2 ||
        source.contact_phone_2 ||
        DEFAULT_SETTINGS.contactPhone2
      ),

      contactEmail: String(
        source.contactEmail ||
        source.contact_email ||
        DEFAULT_SETTINGS.contactEmail
      ),

      businessLocation: String(
        source.businessLocation ||
        source.business_location ||
        DEFAULT_SETTINGS.businessLocation
      ),

      taxRate: Math.min(
        100,
        Math.max(
          0,
          normalizeNumber(
            taxRate,
            DEFAULT_SETTINGS.taxRate
          )
        )
      ),

      storeOpen: normalizeBoolean(
        storeOpen,
        DEFAULT_SETTINGS.storeOpen
      ),

      closedStoreMessage: String(
        source.closedStoreMessage ||
        source.closed_store_message ||
        DEFAULT_SETTINGS.closedStoreMessage
      ),

      defaultStock:
        normalizeWholeNumber(
          defaultStock,
          DEFAULT_SETTINGS.defaultStock
        ),

      defaultLowStockWarning:
        normalizeWholeNumber(
          lowStockWarning,
          DEFAULT_SETTINGS
            .defaultLowStockWarning
        ),

      autoActivateProducts:
        normalizeBoolean(
          autoActivate,
          DEFAULT_SETTINGS
            .autoActivateProducts
        )
    };
  }

  function getSettingsObject(data) {
    if (
      data &&
      data.settings &&
      typeof data.settings === "object"
    ) {
      return data.settings;
    }

    if (
      data &&
      data.data &&
      data.data.settings &&
      typeof data.data.settings === "object"
    ) {
      return data.data.settings;
    }

    if (
      data &&
      data.data &&
      typeof data.data === "object"
    ) {
      return data.data;
    }

    return data || {};
  }

  // ==========================================================
  // POPULATE SETTINGS FORM
  // ==========================================================

  function populateSettingsForm(settings) {
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

    updateClosedStoreMessageState();
  }

  // ==========================================================
  // SETTINGS PAYLOAD
  // ==========================================================

  function buildSettingsPayload() {
    return {
      storeName:
        getValue("storeName"),

      contactPhone1:
        getValue("contactPhone1"),

      contactPhone2:
        getValue("contactPhone2"),

      contactEmail:
        getValue("contactEmail"),

      businessLocation:
        getValue("businessLocation"),

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
  // VALIDATION
  // ==========================================================

  function isValidEmail(value) {
    var email =
      String(value || "").trim();

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    );
  }

  function validateSettings(settings) {
    if (
      settings.storeName.length < 2 ||
      settings.storeName.length > 200
    ) {
      return (
        "Business name must contain " +
        "2 to 200 characters."
      );
    }

    if (
      settings.contactPhone1.length > 30
    ) {
      return (
        "Primary phone cannot exceed " +
        "30 characters."
      );
    }

    if (
      settings.contactPhone2.length > 30
    ) {
      return (
        "Secondary phone cannot exceed " +
        "30 characters."
      );
    }

    if (!settings.contactEmail) {
      return "Business email is required.";
    }

    if (
      settings.contactEmail.length > 254 ||
      !isValidEmail(
        settings.contactEmail
      )
    ) {
      return (
        "Enter a valid business email " +
        "address."
      );
    }

    if (
      settings.businessLocation.length >
      250
    ) {
      return (
        "Business location cannot exceed " +
        "250 characters."
      );
    }

    if (
      !Number.isFinite(
        settings.taxRate
      ) ||
      settings.taxRate < 0 ||
      settings.taxRate > 100
    ) {
      return (
        "Tax rate must be a number " +
        "between 0 and 100."
      );
    }

    if (
      !settings.storeOpen &&
      !settings.closedStoreMessage
    ) {
      return (
        "Enter a closed-store message " +
        "when the online store is closed."
      );
    }

    if (
      settings.closedStoreMessage.length >
      500
    ) {
      return (
        "Closed-store message cannot " +
        "exceed 500 characters."
      );
    }

    if (
      !Number.isInteger(
        settings.defaultStock
      ) ||
      settings.defaultStock < 0
    ) {
      return (
        "Default product stock must be a " +
        "whole number of 0 or higher."
      );
    }

    if (
      !Number.isInteger(
        settings.defaultLowStockWarning
      ) ||
      settings.defaultLowStockWarning < 0
    ) {
      return (
        "Default low-stock warning must be " +
        "a whole number of 0 or higher."
      );
    }

    return "";
  }

  // ==========================================================
  // FORM STATE
  // ==========================================================

  function setSettingsFormDisabled(
    disabled
  ) {
    var form =
      getElement(
        "admin-settings-form"
      );

    if (!form) {
      return;
    }

    Array.prototype.forEach.call(
      form.elements,
      function (element) {
        element.disabled =
          Boolean(disabled);
      }
    );
  }

  function setSaveButtonLoading(
    loading
  ) {
    var button =
      getElement(
        "save-settings-button"
      );

    if (!button) {
      return;
    }

    button.disabled =
      Boolean(loading);

    button.setAttribute(
      "aria-busy",
      loading ? "true" : "false"
    );

    button.textContent =
      loading
        ? "Saving Settings..."
        : "Save Settings";
  }

  function updateClosedStoreMessageState() {
    var storeOpen =
      getBooleanValue(
        "storeOpen",
        true
      );

    var messageInput =
      getElement(
        "closedStoreMessage"
      );

    if (!messageInput) {
      return;
    }

    messageInput.required =
      !storeOpen;

    messageInput.setAttribute(
      "aria-required",
      storeOpen ? "false" : "true"
    );
  }

  // ==========================================================
  // LOAD SETTINGS
  // ==========================================================

  async function loadSettings() {
    if (settingsRequestActive) {
      return false;
    }

    settingsRequestActive = true;

    setSettingsFormDisabled(true);

    showMessage(
      "Loading administrator settings...",
      "information"
    );

    try {
      var data = await requestJson(
        ADMIN_SETTINGS_URL,
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      populateSettingsForm(
        getSettingsObject(data)
      );

      showMessage(
        "Administrator settings loaded.",
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Administrator settings could not be loaded.",
        error
      );

      populateSettingsForm(
        DEFAULT_SETTINGS
      );

      showMessage(
        getRequestErrorMessage(
          error,
          "Administrator settings could not be loaded."
        ),
        "error"
      );

      return false;
    } finally {
      settingsRequestActive = false;
      setSettingsFormDisabled(false);
      setSaveButtonLoading(false);
    }
  }

  // ==========================================================
  // SAVE SETTINGS
  // ==========================================================

  async function saveSettings(event) {
    if (event) {
      event.preventDefault();
    }

    if (settingsRequestActive) {
      return false;
    }

    var settings =
      buildSettingsPayload();

    var validationError =
      validateSettings(settings);

    if (validationError) {
      showMessage(
        validationError,
        "error"
      );

      return false;
    }

    settingsRequestActive = true;

    setSettingsFormDisabled(true);
    setSaveButtonLoading(true);

    showMessage(
      "Saving administrator settings...",
      "information"
    );

    try {
      var data = await requestJson(
        ADMIN_SETTINGS_URL,
        {
          method: "PUT",
          headers:
            getAdminHeaders(true),
          body:
            JSON.stringify(settings)
        }
      );

      var savedSettings =
        getSettingsObject(data);

      if (
        savedSettings &&
        typeof savedSettings === "object" &&
        Object.keys(savedSettings).length > 0
      ) {
        populateSettingsForm(
          Object.assign(
            {},
            settings,
            savedSettings
          )
        );
      } else {
        populateSettingsForm(settings);
      }

      showMessage(
        getErrorMessage(
          data.message,
          "Administrator settings were saved successfully."
        ),
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Administrator settings could not be saved.",
        error
      );

      showMessage(
        getRequestErrorMessage(
          error,
          "Administrator settings could not be saved."
        ),
        "error"
      );

      return false;
    } finally {
      settingsRequestActive = false;
      setSettingsFormDisabled(false);
      setSaveButtonLoading(false);
    }
  }

  // ==========================================================
  // SYSTEM CONNECTION STATUS
  // ==========================================================

  function normalizeConnectionStatus(value) {
    if (value === true) {
      return {
        available: true,
        text: "Connected"
      };
    }

    if (value === false) {
      return {
        available: false,
        text: "Unavailable"
      };
    }

    if (
      typeof value === "string"
    ) {
      var normalizedValue =
        value.trim().toLowerCase();

      var enabledStatuses = [
        "connected",
        "available",
        "enabled",
        "healthy",
        "online",
        "ok",
        "ready",
        "configured",
        "true"
      ];

      var unavailableStatuses = [
        "disconnected",
        "unavailable",
        "disabled",
        "unhealthy",
        "offline",
        "error",
        "not configured",
        "false"
      ];

      if (
        enabledStatuses.indexOf(
          normalizedValue
        ) !== -1
      ) {
        return {
          available: true,
          text: value
        };
      }

      if (
        unavailableStatuses.indexOf(
          normalizedValue
        ) !== -1
      ) {
        return {
          available: false,
          text: value
        };
      }

      return {
        available: null,
        text: value
      };
    }

    if (
      value &&
      typeof value === "object"
    ) {
      var availableValue =
        value.available;

      if (availableValue === undefined) {
        availableValue =
          value.connected;
      }

      if (availableValue === undefined) {
        availableValue =
          value.enabled;
      }

      if (availableValue === undefined) {
        availableValue =
          value.healthy;
      }

      var statusText =
        value.message ||
        value.status ||
        value.name ||
        "";

      return {
        available:
          availableValue === undefined
            ? null
            : Boolean(availableValue),

        text:
          String(
            statusText ||
            (
              availableValue
                ? "Connected"
                : "Unavailable"
            )
          )
      };
    }

    return {
      available: null,
      text: "Status unavailable"
    };
  }

  function setConnectionStatus(
    elementId,
    value
  ) {
    var element =
      getElement(elementId);

    if (!element) {
      return;
    }

    var status =
      normalizeConnectionStatus(value);

    element.textContent =
      status.text;

    element.classList.remove(
      "connection-enabled",
      "connection-unavailable"
    );

    if (status.available === true) {
      element.classList.add(
        "connection-enabled"
      );
    } else if (
      status.available === false
    ) {
      element.classList.add(
        "connection-unavailable"
      );
    }
  }

  function setSystemStatusLoading() {
    [
      "databaseStatus",
      "stripeStatus",
      "cloudinaryStatus"
    ].forEach(function (elementId) {
      var element = getElement(elementId);

      if (!element) {
        return;
      }

      element.textContent = "Checking...";

      element.classList.remove(
        "connection-enabled",
        "connection-unavailable"
      );
    });

    setText("backendURL", BACKEND_URL);
  }

  function getStatusValue(
    statusData,
    camelCaseKey,
    alternativeKeys
  ) {
    if (
      statusData[camelCaseKey] !==
      undefined
    ) {
      return statusData[camelCaseKey];
    }

    for (
      var index = 0;
      index < alternativeKeys.length;
      index += 1
    ) {
      var key = alternativeKeys[index];

      if (
        statusData[key] !== undefined
      ) {
        return statusData[key];
      }
    }

    return undefined;
  }

  async function loadSystemStatus() {
    if (statusRequestActive) {
      return false;
    }

    statusRequestActive = true;
    setSystemStatusLoading();

    try {
      var data = await requestJson(
        SYSTEM_STATUS_URL,
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var statusData =
        data.status ||
        data.services ||
        data.data ||
        data;

      if (
        !statusData ||
        typeof statusData !== "object"
      ) {
        statusData = {};
      }

      setText(
        "backendURL",
        statusData.backendUrl ||
        statusData.backendURL ||
        BACKEND_URL
      );

      setConnectionStatus(
        "databaseStatus",
        getStatusValue(
          statusData,
          "database",
          [
            "databaseStatus",
            "database_status",
            "neon",
            "neonDatabase"
          ]
        )
      );

      setConnectionStatus(
        "stripeStatus",
        getStatusValue(
          statusData,
          "stripe",
          [
            "stripeStatus",
            "stripe_status"
          ]
        )
      );

      setConnectionStatus(
        "cloudinaryStatus",
        getStatusValue(
          statusData,
          "cloudinary",
          [
            "cloudinaryStatus",
            "cloudinary_status"
          ]
        )
      );

      return true;
    } catch (error) {
      console.error(
        "System connection status could not be loaded.",
        error
      );

      setText("backendURL", BACKEND_URL);

      setConnectionStatus(
        "databaseStatus",
        {
          available: false,
          message: "Status unavailable"
        }
      );

      setConnectionStatus(
        "stripeStatus",
        {
          available: false,
          message: "Status unavailable"
        }
      );

      setConnectionStatus(
        "cloudinaryStatus",
        {
          available: false,
          message: "Status unavailable"
        }
      );

      return false;
    } finally {
      statusRequestActive = false;
    }
  }

  // ==========================================================
  // LOGOUT BUTTONS
  // ==========================================================

  function connectLogoutButtons() {
    [
      "admin-logout-button",
      "admin-navigation-logout-button"
    ].forEach(function (elementId) {
      var button = getElement(elementId);

      if (button) {
        button.addEventListener(
          "click",
          logoutAdmin
        );
      }
    });
  }

  // ==========================================================
  // SETTINGS CONTROLS
  // ==========================================================

  function connectSettingsControls() {
    var settingsForm =
      getElement(
        "admin-settings-form"
      );

    var storeOpenSelect =
      getElement("storeOpen");

    if (settingsForm) {
      settingsForm.addEventListener(
        "submit",
        saveSettings
      );
    }

    if (storeOpenSelect) {
      storeOpenSelect.addEventListener(
        "change",
        updateClosedStoreMessageState
      );
    }
  }

  // ==========================================================
  // PAGE INITIALIZATION
  // ==========================================================

  async function initializeSettingsPage() {
    connectLogoutButtons();
    connectSettingsControls();

    populateSettingsForm(
      DEFAULT_SETTINGS
    );

    setSystemStatusLoading();

    var validSession =
      await verifyAdminSession();

    if (!validSession) {
      return;
    }

    await Promise.all([
      loadSettings(),
      loadSystemStatus()
    ]);

    console.log(
      "MMC Administrator Settings page initialized."
    );
  }

  // ==========================================================
  // STARTUP
  // ==========================================================

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeSettingsPage
    );
  } else {
    initializeSettingsPage();
  }

  // ==========================================================
  // OPTIONAL INLINE SUPPORT
  // ==========================================================

})();