// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADMIN DASHBOARD
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// ============================================================

const BACKEND_URL =
  window.MMC_BACKEND_URL ||
  window.location.origin;

const ADMIN_PRODUCTS_API =
  `${BACKEND_URL}/admin/products`;

// ============================================================
// AUTHENTICATION HELPERS
// ============================================================

function getAdminToken() {
  return localStorage.getItem(
    "adminToken"
  );
}

function getAdminHeaders() {
  return {
    Authorization:
      `Bearer ${getAdminToken()}`
  };
}

function redirectToLogin() {
  localStorage.removeItem(
    "adminToken"
  );

  localStorage.removeItem(
    "adminUser"
  );

  localStorage.removeItem(
    "MMC_ADMIN_TOKEN"
  );

  window.location.href =
    "admin-login.html";
}

function logoutAdmin() {
  redirectToLogin();
}

// ============================================================
// QUICK NAVIGATION
// ============================================================

function go(page) {
  if (!page) {
    return;
  }

  window.location.href = page;
}

// ============================================================
// READ SERVER RESPONSE
// ============================================================

async function readDashboardResponse(
  response
) {
  let data;

  try {
    data = await response.json();
  } catch (error) {
    data = {
      error:
        "The server returned an unexpected response."
    };
  }

  if (response.status === 401) {
    redirectToLogin();

    throw new Error(
      data.error ||
      "Your admin session expired. Please log in again."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Request failed with status ${response.status}.`
    );
  }

  return data;
}

// ============================================================
// VERIFY ADMIN SESSION
// ============================================================

async function verifyAdminSession() {
  const token = getAdminToken();

  if (!token) {
    redirectToLogin();
    return false;
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/me`,
      {
        method: "GET",
        headers: getAdminHeaders()
      }
    );

    const data =
      await readDashboardResponse(
        response
      );

    localStorage.setItem(
      "adminUser",
      JSON.stringify(
        data.admin || {}
      )
    );

    displayAdminInformation(
      data.admin || {}
    );

    return true;
  } catch (error) {
    console.error(
      "Admin session check failed:",
      error
    );

    return false;
  }
}

// ============================================================
// DISPLAY LOGGED-IN ADMIN
// ============================================================

function displayAdminInformation(
  admin
) {
  const usernameElement =
    document.getElementById(
      "admin-username"
    );

  const roleElement =
    document.getElementById(
      "admin-role"
    );

  if (usernameElement) {
    usernameElement.textContent =
      admin.username || "";
  }

  if (roleElement) {
    roleElement.textContent =
      formatRole(admin.role);
  }

  updateAdminManagementVisibility(
    admin.role
  );
}

function formatRole(role) {
  if (!role) {
    return "";
  }

  return String(role)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function updateAdminManagementVisibility(
  role
) {
  const protectedElements =
    document.querySelectorAll(
      "[data-super-admin-only]"
    );

  protectedElements.forEach(
    (element) => {
      element.hidden =
        role !== "super_admin";
    }
  );
}

// ============================================================
// UPDATE A DASHBOARD STATISTIC
// ============================================================

function updateStat(
  elementId,
  value
) {
  const element =
    document.getElementById(
      elementId
    );

  if (element) {
    element.textContent =
      String(value);
  }
}

// ============================================================
// LOAD DASHBOARD STATISTICS
// ============================================================

async function loadStats() {
  const statusElement =
    document.getElementById(
      "dashboard-status"
    );

  try {
    if (statusElement) {
      statusElement.textContent =
        "Loading dashboard...";
    }

    const response = await fetch(
      ADMIN_PRODUCTS_API,
      {
        method: "GET",
        headers: getAdminHeaders()
      }
    );

    const products =
      await readDashboardResponse(
        response
      );

    if (!Array.isArray(products)) {
      throw new Error(
        "The server did not return a valid product list."
      );
    }

    const totalProducts =
      products.length;

    let totalVariants = 0;
    let activeProducts = 0;
    let inactiveProducts = 0;
    let totalStock = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;

    products.forEach((product) => {
      const variants =
        Array.isArray(
          product.variants
        )
          ? product.variants
          : [];

      totalVariants +=
        variants.length;

      if (product.active) {
        activeProducts += 1;
      } else {
        inactiveProducts += 1;
      }

      const lowStockLimit =
        Number(
          product.lowStockWarning ||
          5
        );

      if (variants.length > 0) {
        variants.forEach(
          (variant) => {
            totalStock += Math.max(
              0,
              Number(
                variant.stock || 0
              )
            );
          }
        );

        const allVariantsOutOfStock =
          variants.every(
            (variant) =>
              Number(
                variant.stock || 0
              ) <= 0
          );

        const hasLowStockVariant =
          variants.some(
            (variant) => {
              const variantStock =
                Number(
                  variant.stock || 0
                );

              return (
                variantStock > 0 &&
                variantStock <=
                  lowStockLimit
              );
            }
          );

        if (allVariantsOutOfStock) {
          outOfStockProducts += 1;
        } else if (
          hasLowStockVariant
        ) {
          lowStockProducts += 1;
        }
      } else {
        const productStock =
          Math.max(
            0,
            Number(
              product.stock || 0
            )
          );

        totalStock += productStock;

        if (productStock <= 0) {
          outOfStockProducts += 1;
        } else if (
          productStock <=
          lowStockLimit
        ) {
          lowStockProducts += 1;
        }
      }
    });

    updateStat(
      "totalProducts",
      totalProducts
    );

    updateStat(
      "totalVariants",
      totalVariants
    );

    updateStat(
      "activeProducts",
      activeProducts
    );

    updateStat(
      "inactiveProducts",
      inactiveProducts
    );

    updateStat(
      "totalStock",
      totalStock
    );

    updateStat(
      "lowStockProducts",
      lowStockProducts
    );

    updateStat(
      "outOfStockProducts",
      outOfStockProducts
    );

    if (statusElement) {
      statusElement.textContent =
        "Dashboard updated.";
    }
  } catch (error) {
    console.error(
      "Dashboard statistics failed:",
      error
    );

    if (statusElement) {
      statusElement.textContent =
        error.message ||
        "Unable to load the dashboard.";
    }
  }
}
// ============================================================
// REFRESH DASHBOARD
// ============================================================

async function refreshDashboard() {
  const refreshButton =
    document.getElementById(
      "refresh-dashboard-button"
    );

  try {
    if (refreshButton) {
      refreshButton.disabled = true;

      refreshButton.textContent =
        "Refreshing...";
    }

    await loadStats();
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;

      refreshButton.textContent =
        "Refresh Dashboard";
    }
  }
}
// ============================================================
// OPEN PRODUCT MANAGEMENT
// ============================================================

function openProductManagement() {
  window.location.href =
    "admin.html";
}

// ============================================================
// OPEN ADMIN MANAGEMENT
// ============================================================

function openAdminManagement() {
  const savedAdmin =
    localStorage.getItem(
      "adminUser"
    );

  let admin = null;

  try {
    admin = savedAdmin
      ? JSON.parse(savedAdmin)
      : null;
  } catch (error) {
    console.error(
      "Could not read administrator information:",
      error
    );
  }

  if (
    !admin ||
    admin.role !== "super_admin"
  ) {
    alert(
      "Only a super administrator can manage administrator accounts."
    );

    return;
  }

  window.location.href =
    "admin-users.html";
}

// ============================================================
// OPEN SETTINGS
// ============================================================

function openSettings() {
  window.location.href =
    "admin-settings.html";
}

// ============================================================
// OPEN PUBLIC WEBSITE
// ============================================================

function openWebsite() {
  window.location.href =
    "index.html";
}

// ============================================================
// PAGE STARTUP
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    const validSession =
      await verifyAdminSession();

    if (!validSession) {
      return;
    }

    await loadStats();

    const logoutButton =
      document.getElementById(
        "admin-logout-button"
      );

    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        logoutAdmin
      );
    }

    const refreshButton =
      document.getElementById(
        "refresh-dashboard-button"
      );

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        refreshDashboard
      );
    }

    const productsButton =
      document.getElementById(
        "manage-products-button"
      );

    if (productsButton) {
      productsButton.addEventListener(
        "click",
        openProductManagement
      );
    }

    const administratorsButton =
      document.getElementById(
        "manage-admins-button"
      );

    if (administratorsButton) {
      administratorsButton.addEventListener(
        "click",
        openAdminManagement
      );
    }

    const settingsButton =
      document.getElementById(
        "manage-settings-button"
      );

    if (settingsButton) {
      settingsButton.addEventListener(
        "click",
        openSettings
      );
    }

    const websiteButton =
      document.getElementById(
        "view-website-button"
      );

    if (websiteButton) {
      websiteButton.addEventListener(
        "click",
        openWebsite
      );
    }
  }
);

// ============================================================
// SUPPORT EXISTING INLINE HTML BUTTONS
// ============================================================

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