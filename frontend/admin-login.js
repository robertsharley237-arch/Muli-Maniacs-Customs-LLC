// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADMIN LOGIN
// VERCEL + NEON + JWT
// ============================================================

const BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

const ADMIN_DASHBOARD_PAGE =
    "admin-dashboard.html";

// ============================================================
// LOGIN
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
            await readLoginResponse(
                response
            );

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Invalid username or password."
            );
        }

        if (!data.token) {
            throw new Error(
                "Authentication token missing."
            );
        }

        localStorage.setItem(
            "adminToken",
            data.token
        );

        localStorage.setItem(
            "adminUser",
            JSON.stringify(
                data.admin || {}
            )
        );

        localStorage.removeItem(
            "MMC_ADMIN_TOKEN"
        );

        showLoginMessage(
            "Login successful. Redirecting...",
            false
        );

        setTimeout(() => {

            window.location.href =
                ADMIN_DASHBOARD_PAGE;

        }, 500);

    }
    catch (error) {

        console.error(
            "Admin Login Error:",
            error
        );

        clearSavedAdminLogin();

        showLoginMessage(
            error.message ||
            "Login failed.",
            true
        );
    }
    finally {

        setLoginButtonLoading(
            loginButton,
            false
        );
    }
}

// ============================================================
// RESPONSE READER
// ============================================================

async function readLoginResponse(
    response
) {

    try {

        return await response.json();

    }
    catch {

        return {
            error:
            "Unexpected server response."
        };
    }
}

// ============================================================
// BUTTON LOADING
// ============================================================

function setLoginButtonLoading(
    button,
    loading
) {

    if (!button) {
        return;
    }

    button.disabled = loading;

    button.textContent =
        loading
            ? "Logging In..."
            : "Log In";
}

// ============================================================
// MESSAGES
// ============================================================

function showLoginMessage(
    message,
    isError
) {

    const element =
        document.getElementById(
            "admin-login-message"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.classList.remove(
        "login-error",
        "login-success"
    );

    element.classList.add(
        isError
            ? "login-error"
            : "login-success"
    );
}

function clearLoginMessage() {

    const element =
        document.getElementById(
            "admin-login-message"
        );

    if (!element) {
        return;
    }

    element.textContent = "";

    element.classList.remove(
        "login-error",
        "login-success"
    );
}

// ============================================================
// TOKEN MANAGEMENT
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
// SESSION CHECK
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

        const response =
            await