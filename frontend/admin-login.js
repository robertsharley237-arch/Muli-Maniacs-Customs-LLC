// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADMIN LOGIN
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// ============================================================

// This uses the current Vercel domain as the backend.
//
// If the backend is deployed to a separate Vercel project later,
// replace window.location.origin with that backend URL.
const BACKEND_URL =
  window.MMC_BACKEND_URL ||
  window.location.origin;

// The admin dashboard page that opens after a successful login.
const ADMIN_DASHBOARD_PAGE = "admin-dashboard.html";

// ============================================================
// ADMIN LOGIN
// ============================================================

async function adminLogin(event) {
  if (event) {
    event.preventDefault();
  }

  const usernameInput =
    document.getElementById(
      "adminUsername"
    );

  const passwordInput =
    document.getElementById(
      "adminPassword"
    );

  const loginButton =
    document.getElementById(
      "admin-login-button"
    );

  if (
    !usernameInput ||
    !passwordInput
  ) {
    showLoginMessage(
      "The username or password field could not be found.",
      true
    );

    return;
  }

  const username =
    usernameInput.value.trim();

  const password =
    passwordInput.value;

  if (!username) {
    showLoginMessage(
      "Please enter your username.",
      true
    );

    usernameInput.focus();
    return;
  }

  if (!password) {
    showLoginMessage(
      "Please enter your password.",
      true
    );

    passwordInput.focus();
    return;
  }

  try {
    setLoginButtonLoading(
      loginButton,
      true
    );

    clearLoginMessage();

    const response = await fetch(
      `${BACKEND_URL}/admin/login`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      }
    );

    const data =
      await readLoginResponse(response);

    if (!response.ok) {
      throw new Error(
        data.error ||
        "The username or password was not accepted."
      );
    }

    if (!data.token) {
      throw new Error(
        "The server did not provide an admin login token."
      );
    }

    // Save the token using the exact name required by admin.js.
    localStorage.setItem(
      "adminToken",
      data.token
    );

    // Save basic information about the logged-in admin.
    localStorage.setItem(
      "adminUser",
      JSON.stringify(
        data.admin || {}
      )
    );

    // Remove the old token name from the previous backend.
    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
    );

    showLoginMessage(
      "Login successful. Opening the admin dashboard...",
      false
    );

    window.location.href =
      ADMIN_DASHBOARD_PAGE;
  } catch (error) {
    console.error(
      "Admin login failed:",
      error
    );

    localStorage.removeItem(
      "adminToken"
    );

    localStorage.removeItem(
      "adminUser"
    );

    showLoginMessage(
      error.message ||
      "Login failed. Please try again.",
      true
    );
  } finally {
    setLoginButtonLoading(
      loginButton,
      false
    );
  }
}

// ============================================================
// READ SERVER RESPONSE
// ============================================================

async function readLoginResponse(
  response
) {
  try {
    return await response.json();
  } catch (error) {
    return {
      error:
        "The server returned an unexpected response."
    };
  }
}

// ============================================================
// LOGIN BUTTON STATUS
// ============================================================

function setLoginButtonLoading(
  loginButton,
  isLoading
) {
  if (!loginButton) {
    return;
  }

  loginButton.disabled =
    isLoading;

  loginButton.textContent =
    isLoading
      ? "Logging in..."
      : "Log In";
}

// ============================================================
// LOGIN MESSAGE
// ============================================================

function showLoginMessage(
  message,
  isError
) {
  const messageElement =
    document.getElementById(
      "admin-login-message"
    );

  if (!messageElement) {
    if (isError) {
      alert(message);
    }

    return;
  }

  messageElement.textContent =
    message;

  messageElement.classList.remove(
    "login-error",
    "login-success"
  );

  messageElement.classList.add(
    isError
      ? "login-error"
      : "login-success"
  );
}

function clearLoginMessage() {
  const messageElement =
    document.getElementById(
      "admin-login-message"
    );

  if (!messageElement) {
    return;
  }

  messageElement.textContent = "";

  messageElement.classList.remove(
    "login-error",
    "login-success"
  );
}

// ============================================================
// CHECK FOR AN EXISTING ADMIN LOGIN
// ============================================================

async function checkExistingAdminLogin() {
  const token =
    localStorage.getItem(
      "adminToken"
    );

  if (!token) {
    return;
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/me`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      clearSavedAdminLogin();
      return;
    }

    const data =
      await readLoginResponse(
        response
      );

    if (!data.admin) {
      clearSavedAdminLogin();
      return;
    }

    localStorage.setItem(
      "adminUser",
      JSON.stringify(data.admin)
    );

    window.location.href =
      ADMIN_DASHBOARD_PAGE;
  } catch (error) {
    console.error(
      "Existing admin session check failed:",
      error
    );

    // Do not redirect on a temporary network error.
    // The admin can still attempt a new login.
  }
}

// ============================================================
// CLEAR SAVED LOGIN
// ============================================================

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

// ============================================================
// ALLOW ENTER KEY LOGIN
// ============================================================

function handleLoginKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  const loginForm =
    document.getElementById(
      "admin-login-form"
    );

  if (!loginForm) {
    adminLogin(event);
  }
}

// ============================================================
// PAGE STARTUP
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const loginForm =
      document.getElementById(
        "admin-login-form"
      );

    const loginButton =
      document.getElementById(
        "admin-login-button"
      );

    const usernameInput =
      document.getElementById(
        "adminUsername"
      );

    const passwordInput =
      document.getElementById(
        "adminPassword"
      );

    if (loginForm) {
      loginForm.addEventListener(
        "submit",
        adminLogin
      );
    }

    // Only add a direct click handler when the button is not
    // already inside the login form.
    if (
      loginButton &&
      !loginForm
    ) {
      loginButton.addEventListener(
        "click",
        adminLogin
      );
    }

    if (usernameInput) {
      usernameInput.addEventListener(
        "keydown",
        handleLoginKeydown
      );
    }

    if (passwordInput) {
      passwordInput.addEventListener(
        "keydown",
        handleLoginKeydown
      );
    }

    checkExistingAdminLogin();
  }
);

// ============================================================
// SUPPORT EXISTING INLINE HTML
// ============================================================

window.adminLogin =
  adminLogin;

window.clearSavedAdminLogin =
  clearSavedAdminLogin;