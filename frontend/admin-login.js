const BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

const ADMIN_DASHBOARD_PAGE =
    "admin-dashboard.html";

async function adminLogin(event) {

    event.preventDefault();

    const username =
        document
        .getElementById("adminUsername")
        .value
        .trim();

    const password =
        document
        .getElementById("adminPassword")
        .value;

    const button =
        document.getElementById(
            "admin-login-button"
        );

    try {

        button.disabled = true;
        button.textContent = "Logging In...";

        showMessage("", false);

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
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Invalid username or password."
            );
        }

        if (!data.token) {
            throw new Error(
                "No authentication token received."
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

        showMessage(
            "Login successful.",
            false
        );

        window.location.href =
            ADMIN_DASHBOARD_PAGE;

    } catch (error) {

        console.error(error);

        showMessage(
            error.message ||
            "Login failed.",
            true
        );

    } finally {

        button.disabled = false;
        button.textContent = "Log In";

    }
}

function showMessage(
    message,
    isError
) {

    const element =
        document.getElementById(
            "admin-login-message"
        );

    element.textContent = message;

    element.className =
        isError
            ? "login-error"
            : "login-success";
}

async function checkExistingLogin() {

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
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        if (response.ok) {

            window.location.href =
                ADMIN_DASHBOARD_PAGE;

        } else {

            localStorage.removeItem(
                "adminToken"
            );

            localStorage.removeItem(
                "adminUser"
            );
        }

    } catch (error) {

        console.error(
            "Session check failed:",
            error
        );
    }
}

document.addEventListener(
    "DOMContentLoaded",
    () => {

        document
            .getElementById(
                "admin-login-form"
            )
            .addEventListener(
                "submit",
                adminLogin
            );

        checkExistingLogin();
    }
);