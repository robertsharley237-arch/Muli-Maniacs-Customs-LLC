// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-login.js
// ADMINISTRATOR LOGIN
//
// Frontend: HTML + JavaScript
// Backend: Express + Neon PostgreSQL
// Authentication: JWT
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var ADMIN_DASHBOARD_PAGE =
    "admin-dashboard.html";

  var ADMIN_TOKEN_KEY =
    "adminToken";

  var ADMIN_USER_KEY =
    "adminUser";

  var LEGACY_TOKEN_KEYS = [
    "MMC_ADMIN_TOKEN",
    "admin_token",
    "token"
  ];

  var REQUEST_TIMEOUT_MILLISECONDS =
    15000;

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
    /*
     * Preferred option:
     *
     * Define window.MMC_BACKEND_URL in admin-login.html before
     * loading this file.
     */

    if (
      window.MMC_BACKEND_URL
    ) {
      return removeTrailingSlashes(
        window.MMC_BACKEND_URL
      );
    }

    /*
     * Optional saved backend URL.
     *
     * This is useful while working in GitHub Codespaces.
     */

    var savedBackendUrl =
      localStorage.getItem(
        "MMC_BACKEND_URL"
      );

    if (savedBackendUrl) {
      return removeTrailingSlashes(
        savedBackendUrl
      );
    }

    /*
     * During local development, the frontend normally runs on
     * port 3000 and the backend normally runs on port 10000.
     */

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

    /*
     * If frontend and backend are deployed together under one
     * domain, the current website origin is the correct value.
     */

    return removeTrailingSlashes(
      window.location.origin
    );
  }

  var BACKEND_URL =
    getBackendUrl();

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getElement(elementId) {
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
          getElement(
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

  function getLoginForm() {
    return getFirstAvailableElement([
      "admin-login-form",
      "adminLoginForm",
      "login-form",
      "loginForm"
    ]);
  }

  function getUsernameInput() {
    return getFirstAvailableElement([
      "adminUsername",
      "admin-username",
      "username"
    ]);
  }

  function getPasswordInput() {
    return getFirstAvailableElement([
      "adminPassword",
      "admin-password",
      "password"
    ]);
  }

  function getLoginButton() {
    return getFirstAvailableElement([
      "admin-login-button",
      "adminLoginButton",
      "login-button",
      "loginButton"
    ]);
  }

  function getLoginMessageElement() {
    return getFirstAvailableElement([
      "admin-login-message",
      "adminLoginMessage",
      "login-message",
      "loginMessage"
    ]);
  }

  // ==========================================================
  // MESSAGE DISPLAY
  // ==========================================================

  function clearLoginMessage() {
    var messageElement =
      getLoginMessageElement();

    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      "";

    messageElement.classList.remove(
      "login-error",
      "login-success",
      "login-information"
    );

    messageElement.removeAttribute(
      "role"
    );

    messageElement.removeAttribute(
      "aria-label"
    );
  }

  function showLoginMessage(
    message,
    messageType
  ) {
    var messageElement =
      getLoginMessageElement();

    var normalizedMessage =
      String(
        message ||
        ""
      );

    if (!messageElement) {
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

    messageElement.textContent =
      normalizedMessage;

    messageElement.classList.remove(
      "login-error",
      "login-success",
      "login-information"
    );

    if (
      messageType ===
      "success"
    ) {
      messageElement.classList.add(
        "login-success"
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
        "login-information"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else {
      messageElement.classList.add(
        "login-error"
      );

      messageElement.setAttribute(
        "role",
        "alert"
      );
    }

    messageElement.setAttribute(
      "aria-label",
      normalizedMessage
    );
  }

  // ==========================================================
  // LOGIN BUTTON STATE
  // ==========================================================

  function setLoginButtonLoading(
    button,
    loading
  ) {
    if (!button) {
      return;
    }

    if (
      !button.dataset
        .originalText
    ) {
      button.dataset.originalText =
        button.textContent.trim() ||
        "Log In";
    }

    button.disabled =
      loading;

    button.setAttribute(
      "aria-disabled",
      loading
        ? "true"
        : "false"
    );

    button.setAttribute(
      "aria-busy",
      loading
        ? "true"
        : "false"
    );

    button.textContent =
      loading
        ? "Logging In..."
        : button.dataset
            .originalText;
  }

  // ==========================================================
  // ADMINISTRATOR SESSION STORAGE
  // ==========================================================

  function clearSavedAdminLogin() {
    localStorage.removeItem(
      ADMIN_TOKEN_KEY
    );

    localStorage.removeItem(
      ADMIN_USER_KEY
    );

    LEGACY_TOKEN_KEYS.forEach(
      function (tokenKey) {
        localStorage.removeItem(
          tokenKey
        );
      }
    );
  }

  function saveAdminLogin(
    token,
    administrator
  ) {
    localStorage.setItem(
      ADMIN_TOKEN_KEY,
      token
    );

    localStorage.setItem(
      ADMIN_USER_KEY,
      JSON.stringify(
        administrator || {}
      )
    );

    LEGACY_TOKEN_KEYS.forEach(
      function (tokenKey) {
        localStorage.removeItem(
          tokenKey
        );
      }
    );
  }

  function getSavedAdminToken() {
    return localStorage.getItem(
      ADMIN_TOKEN_KEY
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
  // RESPONSE READER
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
          response.ok
            ? "The server returned an unexpected response."
            : responseText
      };
    }
  }

  // ==========================================================
  // ERROR MESSAGE HELPER
  // ==========================================================

  function getRequestErrorMessage(
    error
  ) {
    if (
      error &&
      error.name ===
        "AbortError"
    ) {
      return (
        "The login request took too long. " +
        "Make sure the backend is running and try again."
      );
    }

    if (
      error instanceof
      TypeError
    ) {
      return (
        "The login server could not be reached. " +
        "Check the backend URL, CORS settings, and server status."
      );
    }

    return (
      error &&
      error.message
        ? error.message
        : "Administrator login failed."
    );
  }

  // ==========================================================
  // REDIRECT TO DASHBOARD
  // ==========================================================

  function redirectToDashboard(
    delay
  ) {
    window.setTimeout(
      function () {
        window.location.assign(
          ADMIN_DASHBOARD_PAGE
        );
      },
      Number(delay || 0)
    );
  }

  // ==========================================================
  // ADMINISTRATOR LOGIN
  // ==========================================================

  async function adminLogin(event) {
    if (event) {
      event.preventDefault();
    }

    var usernameInput =
      getUsernameInput();

    var passwordInput =
      getPasswordInput();

    var loginButton =
      getLoginButton();

    if (!usernameInput) {
      showLoginMessage(
        "The username field could not be found on this page.",
        "error"
      );

      return;
    }

    if (!passwordInput) {
      showLoginMessage(
        "The password field could not be found on this page.",
        "error"
      );

      return;
    }

    var username =
      usernameInput.value
        .trim();

    var password =
      passwordInput.value;

    if (!username) {
      showLoginMessage(
        "Please enter your username.",
        "error"
      );

      usernameInput.focus();

      return;
    }

    if (!password) {
      showLoginMessage(
        "Please enter your password.",
        "error"
      );

      passwordInput.focus();

      return;
    }

    try {
      clearLoginMessage();

      setLoginButtonLoading(
        loginButton,
        true
      );

      var response =
        await fetchWithTimeout(
          BACKEND_URL +
          "/admin/login",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json"
            },

            body:
              JSON.stringify({
                username:
                  username,

                password:
                  password
              })
          }
        );

      var responseData =
        await readResponse(
          response
        );

      if (!response.ok) {
        var loginError =
          new Error(
            responseData.error ||
            "The username or password is incorrect."
          );

        loginError.code =
          responseData.code ||
          "ADMIN_LOGIN_FAILED";

        throw loginError;
      }

      if (!responseData.token) {
        throw new Error(
          "The backend did not provide an administrator token."
        );
      }

      if (!responseData.admin) {
        throw new Error(
          "The backend did not provide the administrator account information."
        );
      }

      saveAdminLogin(
        responseData.token,
        responseData.admin
      );

      passwordInput.value =
        "";

      showLoginMessage(
        "Login successful. Redirecting to the administrator dashboard...",
        "success"
      );

      redirectToDashboard(
        600
      );
    } catch (error) {
      console.error(
        "Administrator login error:",
        error
      );

      clearSavedAdminLogin();

      showLoginMessage(
        getRequestErrorMessage(
          error
        ),
        "error"
      );
    } finally {
      setLoginButtonLoading(
        loginButton,
        false
      );
    }
  }

  // ==========================================================
  // EXISTING SESSION CHECK
  // ==========================================================

  async function checkExistingAdminLogin() {
    var savedToken =
      getSavedAdminToken();

    if (!savedToken) {
      return;
    }

    showLoginMessage(
      "Checking your existing administrator session...",
      "information"
    );

    try {
      var response =
        await fetchWithTimeout(
          BACKEND_URL +
          "/admin/me",
          {
            method:
              "GET",

            headers: {
              Authorization:
                "Bearer " +
                savedToken,

              Accept:
                "application/json"
            }
          }
        );

      var responseData =
        await readResponse(
          response
        );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        clearSavedAdminLogin();

        clearLoginMessage();

        return;
      }

      if (!response.ok) {
        clearLoginMessage();

        return;
      }

      if (
        !responseData.admin
      ) {
        clearSavedAdminLogin();

        clearLoginMessage();

        return;
      }

      localStorage.setItem(
        ADMIN_USER_KEY,
        JSON.stringify(
          responseData.admin
        )
      );

      showLoginMessage(
        "An administrator session is already active. Redirecting...",
        "success"
      );

      redirectToDashboard(
        500
      );
    } catch (error) {
      console.warn(
        "Existing administrator session check failed:",
        error
      );

      /*
       * Do not remove the saved token for a temporary network
       * error. Only confirmed 401 or 403 responses erase it.
       */

      clearLoginMessage();
    }
  }

  // ==========================================================
  // BACKEND STATUS CHECK
  // ==========================================================

  async function checkBackendStatus() {
    try {
      var response =
        await fetchWithTimeout(
          BACKEND_URL +
          "/health",
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (!response.ok) {
        console.warn(
          "The MMC backend health check did not return a successful status."
        );

        return false;
      }

      return true;
    } catch (error) {
      console.warn(
        "The MMC backend health check could not be completed:",
        error
      );

      return false;
    }
  }

  // ==========================================================
  // PAGE INITIALIZATION
  // ==========================================================

  async function initializeAdminLogin() {
    var loginForm =
      getLoginForm();

    var loginButton =
      getLoginButton();

    var usernameInput =
      getUsernameInput();

    if (loginForm) {
      loginForm.addEventListener(
        "submit",
        adminLogin
      );
    } else if (loginButton) {
      /*
       * Fallback for older HTML files that do not use a form.
       */

      loginButton.addEventListener(
        "click",
        adminLogin
      );
    } else {
      console.error(
        "The administrator login form and login button could not be found."
      );

      return;
    }

    if (usernameInput) {
      usernameInput.focus();
    }

    console.log(
      "MMC administrator login initialized."
    );

    console.log(
      "Administrator backend URL:",
      BACKEND_URL
    );

    var backendAvailable =
      await checkBackendStatus();

    if (!backendAvailable) {
      showLoginMessage(
        "The backend could not be reached. You may still try to log in after confirming the backend is running.",
        "information"
      );
    }

    await checkExistingAdminLogin();
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
      initializeAdminLogin
    );
  } else {
    initializeAdminLogin();
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.adminLogin =
    adminLogin;

  window.clearSavedAdminLogin =
    clearSavedAdminLogin;

  window.checkExistingAdminLogin =
    checkExistingAdminLogin;
}());