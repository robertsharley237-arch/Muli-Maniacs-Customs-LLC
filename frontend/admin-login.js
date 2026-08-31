// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-login.js
// ADMINISTRATOR LOGIN
//
// Frontend hosting: Vercel
// Backend: Express on Vercel
// Database: Neon PostgreSQL
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

  var BACKEND_URL_STORAGE_KEY =
    "MMC_BACKEND_URL";

  var REQUEST_TIMEOUT_MILLISECONDS =
    15000;

  var LEGACY_TOKEN_KEYS = [
    "MMC_ADMIN_TOKEN",
    "admin_token",
    "token"
  ];

  var loginRequestActive =
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
    if (
      typeof window.MMC_BACKEND_URL ===
        "string" &&
      window.MMC_BACKEND_URL.trim()
    ) {
      return removeTrailingSlashes(
        window.MMC_BACKEND_URL
      );
    }

    var savedBackendUrl =
      localStorage.getItem(
        BACKEND_URL_STORAGE_KEY
      );

    if (
      typeof savedBackendUrl ===
        "string" &&
      savedBackendUrl.trim()
    ) {
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

  var ADMIN_LOGIN_URL =
    BACKEND_URL +
    "/admin/login";

  var ADMIN_SESSION_URL =
    BACKEND_URL +
    "/admin/me";

  var HEALTH_URL =
    BACKEND_URL +
    "/health";

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

  function getPasswordVisibilityButton() {
    return getFirstAvailableElement([
      "password-visibility-button",
      "passwordVisibilityButton",
      "show-password-button"
    ]);
  }

  // ==========================================================
  // ERROR MESSAGE NORMALIZATION
  // ==========================================================

  function normalizeErrorMessage(
    errorValue,
    fallbackMessage
  ) {
    var fallback =
      String(
        fallbackMessage ||
        ""
      ).trim();

    if (
      typeof errorValue ===
      "string"
    ) {
      return (
        errorValue.trim() ||
        fallback
      );
    }

    if (
      typeof errorValue ===
        "number" ||
      typeof errorValue ===
        "boolean"
    ) {
      return String(
        errorValue
      );
    }

    if (
      Array.isArray(
        errorValue
      )
    ) {
      var arrayMessages =
        errorValue
          .map(
            function (item) {
              return normalizeErrorMessage(
                item,
                ""
              );
            }
          )
          .filter(Boolean);

      return (
        arrayMessages.join(" ") ||
        fallback
      );
    }

    if (
      errorValue &&
      typeof errorValue ===
        "object"
    ) {
      if (
        typeof errorValue.message ===
          "string" &&
        errorValue.message.trim()
      ) {
        return errorValue.message.trim();
      }

      if (
        errorValue.error !==
        undefined
      ) {
        var nestedErrorMessage =
          normalizeErrorMessage(
            errorValue.error,
            ""
          );

        if (nestedErrorMessage) {
          return nestedErrorMessage;
        }
      }

      if (
        errorValue.validationErrors !==
        undefined
      ) {
        var validationMessage =
          normalizeErrorMessage(
            errorValue.validationErrors,
            ""
          );

        if (validationMessage) {
          return validationMessage;
        }
      }

      if (
        errorValue.errors !==
        undefined
      ) {
        var errorsMessage =
          normalizeErrorMessage(
            errorValue.errors,
            ""
          );

        if (errorsMessage) {
          return errorsMessage;
        }
      }

      var objectMessages =
        Object.keys(
          errorValue
        )
          .filter(
            function (key) {
              return (
                key !== "code" &&
                key !== "status" &&
                key !== "statusCode" &&
                key !== "stack"
              );
            }
          )
          .map(
            function (key) {
              return normalizeErrorMessage(
                errorValue[key],
                ""
              );
            }
          )
          .filter(Boolean);

      if (
        objectMessages.length >
        0
      ) {
        return objectMessages.join(
          " "
        );
      }
    }

    return fallback;
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
    var normalizedMessage =
      normalizeErrorMessage(
        message,
        ""
      );

    var messageElement =
      getLoginMessageElement();

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

    messageElement.removeAttribute(
      "role"
    );

    messageElement.removeAttribute(
      "aria-label"
    );

    if (!normalizedMessage) {
      return;
    }

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
  // LOGIN FORM STATE
  // ==========================================================

  function setLoginFormDisabled(
    disabled
  ) {
    var usernameInput =
      getUsernameInput();

    var passwordInput =
      getPasswordInput();

    if (usernameInput) {
      usernameInput.disabled =
        Boolean(disabled);
    }

    if (passwordInput) {
      passwordInput.disabled =
        Boolean(disabled);
    }
  }

  function setLoginButtonLoading(
    button,
    loading
  ) {
    if (!button) {
      return;
    }

    if (
      !button.dataset.originalText
    ) {
      button.dataset.originalText =
        button.textContent.trim() ||
        "Log In";
    }

    button.disabled =
      Boolean(loading);

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
        : button.dataset.originalText;
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
      String(token)
    );

    localStorage.setItem(
      ADMIN_USER_KEY,
      JSON.stringify(
        administrator ||
        {}
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
    return String(
      localStorage.getItem(
        ADMIN_TOKEN_KEY
      ) ||
      ""
    ).trim();
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

    try {
      return await fetch(
        url,
        Object.assign(
          {},
          options ||
          {},
          {
            signal:
              controller.signal
          }
        )
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
      var parsedResponse =
        JSON.parse(
          responseText
        );

      if (
        parsedResponse &&
        typeof parsedResponse ===
          "object"
      ) {
        return parsedResponse;
      }

      return {
        message:
          String(
            parsedResponse
          )
      };
    } catch (error) {
      return {
        error:
          responseText
      };
    }
  }

  // ==========================================================
  // REQUEST ERROR MESSAGE
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
        "Make sure the backend is available and try again."
      );
    }

    if (
      error instanceof
      TypeError
    ) {
      return (
        "The login server could not be reached. " +
        "Check the Vercel backend URL and CORS settings."
      );
    }

    return normalizeErrorMessage(
      error,
      "Administrator login failed."
    );
  }

  // ==========================================================
  // SAFE RETURN PAGE
  // ==========================================================

  function getReturnPage() {
    var urlParameters =
      new URLSearchParams(
        window.location.search
      );

    var requestedPage =
      String(
        urlParameters.get(
          "return"
        ) ||
        ""
      ).trim();

    if (!requestedPage) {
      return ADMIN_DASHBOARD_PAGE;
    }

    if (
      requestedPage.indexOf(
        "://"
      ) !==
        -1 ||
      requestedPage.indexOf(
        "//"
      ) ===
        0 ||
      requestedPage.indexOf(
        "\\"
      ) !==
        -1 ||
      requestedPage.indexOf(
        ".."
      ) !==
        -1
    ) {
      return ADMIN_DASHBOARD_PAGE;
    }

    if (
      !/^admin-[a-z0-9-]+\.html(?:\?.*)?$/i.test(
        requestedPage
      )
    ) {
      return ADMIN_DASHBOARD_PAGE;
    }

    return requestedPage;
  }

  // ==========================================================
  // DASHBOARD REDIRECTION
  // ==========================================================

  function redirectToDashboard(
    delay
  ) {
    var returnPage =
      getReturnPage();

    window.setTimeout(
      function () {
        window.location.assign(
          returnPage
        );
      },
      Number(delay || 0)
    );
  }

  // ==========================================================
  // PASSWORD VISIBILITY
  // ==========================================================

  function togglePasswordVisibility() {
    var passwordInput =
      getPasswordInput();

    var visibilityButton =
      getPasswordVisibilityButton();

    if (
      !passwordInput ||
      !visibilityButton
    ) {
      return;
    }

    var passwordIsVisible =
      passwordInput.type ===
      "text";

    passwordInput.type =
      passwordIsVisible
        ? "password"
        : "text";

    visibilityButton.textContent =
      passwordIsVisible
        ? "Show"
        : "Hide";

    visibilityButton.setAttribute(
      "aria-pressed",
      passwordIsVisible
        ? "false"
        : "true"
    );

    visibilityButton.setAttribute(
      "aria-label",
      passwordIsVisible
        ? "Show password"
        : "Hide password"
    );

    passwordInput.focus();
  }

  function configurePasswordVisibility() {
    var visibilityButton =
      getPasswordVisibilityButton();

    if (!visibilityButton) {
      return;
    }

    if (
      visibilityButton.dataset
        .visibilityConnected ===
      "true"
    ) {
      return;
    }

    visibilityButton.dataset
      .visibilityConnected =
      "true";

    visibilityButton.setAttribute(
      "aria-label",
      "Show password"
    );

    visibilityButton.addEventListener(
      "click",
      togglePasswordVisibility
    );
  }

  // ==========================================================
  // ADMINISTRATOR LOGIN
  // ==========================================================

  async function adminLogin(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    if (loginRequestActive) {
      return;
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
      usernameInput.value.trim();

    var password =
      passwordInput.value;

    if (!username) {
      showLoginMessage(
        "Please enter your administrator username.",
        "error"
      );

      usernameInput.focus();

      return;
    }

    if (username.length > 100) {
      showLoginMessage(
        "The administrator username cannot exceed 100 characters.",
        "error"
      );

      usernameInput.focus();

      return;
    }

    if (!password) {
      showLoginMessage(
        "Please enter your administrator password.",
        "error"
      );

      passwordInput.focus();

      return;
    }

    if (password.length > 250) {
      showLoginMessage(
        "The administrator password cannot exceed 250 characters.",
        "error"
      );

      passwordInput.focus();

      return;
    }

    loginRequestActive =
      true;

    clearLoginMessage();

    setLoginButtonLoading(
      loginButton,
      true
    );

    setLoginFormDisabled(
      true
    );

    try {
      var response =
        await fetchWithTimeout(
          ADMIN_LOGIN_URL,
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
        var loginErrorMessage =
          normalizeErrorMessage(
            responseData.error ||
            responseData.message ||
            responseData,
            (
              response.status ===
                401 ||
              response.status ===
                403
            )
              ? "The username or password is incorrect."
              : "Administrator login failed."
          );

        var loginError =
          new Error(
            loginErrorMessage
          );

        loginError.code =
          responseData.code ||
          "ADMIN_LOGIN_FAILED";

        loginError.status =
          response.status;

        throw loginError;
      }

      var token =
        String(
          responseData.token ||
          responseData.accessToken ||
          responseData.access_token ||
          ""
        ).trim();

      var administrator =
        responseData.admin ||
        responseData.user ||
        null;

      if (!token) {
        throw new Error(
          "The backend did not provide an administrator token."
        );
      }

      if (
        !administrator ||
        typeof administrator !==
          "object"
      ) {
        throw new Error(
          "The backend did not provide administrator account information."
        );
      }

      saveAdminLogin(
        token,
        administrator
      );

      passwordInput.value =
        "";

      showLoginMessage(
        "Login successful. Redirecting to the administrator system...",
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
      loginRequestActive =
        false;

      setLoginButtonLoading(
        loginButton,
        false
      );

      setLoginFormDisabled(
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
      return false;
    }

    showLoginMessage(
      "Checking your existing administrator session...",
      "information"
    );

    try {
      var response =
        await fetchWithTimeout(
          ADMIN_SESSION_URL,
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
        response.status ===
          401 ||
        response.status ===
          403
      ) {
        clearSavedAdminLogin();
        clearLoginMessage();

        return false;
      }

      if (!response.ok) {
        console.warn(
          "Administrator session check returned status:",
          response.status,
          responseData
        );

        clearLoginMessage();

        return false;
      }

      var administrator =
        responseData.admin ||
        responseData.user ||
        null;

      if (
        !administrator ||
        typeof administrator !==
          "object"
      ) {
        clearSavedAdminLogin();
        clearLoginMessage();

        return false;
      }

      localStorage.setItem(
        ADMIN_USER_KEY,
        JSON.stringify(
          administrator
        )
      );

      showLoginMessage(
        "An administrator session is already active. Redirecting...",
        "success"
      );

      redirectToDashboard(
        500
      );

      return true;
    } catch (error) {
      console.warn(
        "Existing administrator session check failed:",
        error
      );

      clearLoginMessage();

      return false;
    }
  }

  // ==========================================================
  // BACKEND STATUS CHECK
  // ==========================================================

  async function checkBackendStatus() {
    try {
      var response =
        await fetchWithTimeout(
          HEALTH_URL,
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
          "Backend health check returned status:",
          response.status
        );

        return false;
      }

      return true;
    } catch (error) {
      console.warn(
        "Backend health check failed:",
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

    configurePasswordVisibility();

    if (
      loginForm &&
      loginForm.dataset
        .loginConnected !==
        "true"
    ) {
      loginForm.dataset
        .loginConnected =
        "true";

      loginForm.addEventListener(
        "submit",
        adminLogin
      );
    } else if (
      !loginForm &&
      loginButton &&
      loginButton.dataset
        .loginConnected !==
        "true"
    ) {
      loginButton.dataset
        .loginConnected =
        "true";

      loginButton.addEventListener(
        "click",
        adminLogin
      );
    } else if (
      !loginForm &&
      !loginButton
    ) {
      console.error(
        "The administrator login form and login button could not be found."
      );

      return;
    }

    if (usernameInput) {
      usernameInput.focus();
    }

    if (
      !BACKEND_URL ||
      BACKEND_URL.indexOf(
        "YOUR-BACKEND-PROJECT"
      ) !==
        -1
    ) {
      showLoginMessage(
        "The Vercel backend URL has not been configured in config.js.",
        "error"
      );

      return;
    }

    console.log(
      "MMC administrator login initialized."
    );

    var backendAvailable =
      await checkBackendStatus();

    if (!backendAvailable) {
      showLoginMessage(
        "The backend health check could not be completed. You may still try to log in.",
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

  window.checkAdminBackendStatus =
    checkBackendStatus;

  window.toggleAdminPasswordVisibility =
    togglePasswordVisibility;
}());
``