// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// DELETE CATEGORY ADMIN PAGE
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// ============================================================

const BACKEND_URL =
  window.MMC_BACKEND_URL ||
  window.location.origin;

const CATEGORIES_API =
  `${BACKEND_URL}/categories`;

const ADMIN_PRODUCTS_API =
  `${BACKEND_URL}/admin/products`;

let availableCategories = [];
let availableProducts = [];

// ============================================================
// ADMIN AUTHENTICATION
// ============================================================

function getAdminToken() {
  return localStorage.getItem(
    "adminToken"
  );
}

function getAdminHeaders(
  includeContentType = true
) {
  const headers = {
    Authorization:
      `Bearer ${getAdminToken()}`
  };

  if (includeContentType) {
    headers["Content-Type"] =
      "application/json";
  }

  return headers;
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
// SERVER RESPONSE HELPER
// ============================================================

async function readApiResponse(
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
      "Your admin session expired."
    );
  }

  if (response.status === 403) {
    throw new Error(
      data.error ||
      "You do not have permission to perform this action."
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
        headers:
          getAdminHeaders(false)
      }
    );

    const data =
      await readApiResponse(
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
      "Admin session verification failed:",
      error
    );

    showCategoryMessage(
      error.message ||
      "Your administrator session could not be verified.",
      "error"
    );

    return false;
  }
}

// ============================================================
// DISPLAY ADMIN INFORMATION
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

// ============================================================
// MESSAGE DISPLAY
// ============================================================

function showCategoryMessage(
  message,
  type = "information"
) {
  const messageElement =
    document.getElementById(
      "category-message"
    );

  if (!messageElement) {
    if (type === "error") {
      alert(message);
    }

    return;
  }

  messageElement.textContent =
    message;

  messageElement.classList.remove(
    "category-error",
    "category-success",
    "category-information"
  );

  if (type === "error") {
    messageElement.classList.add(
      "category-error"
    );
  } else if (type === "success") {
    messageElement.classList.add(
      "category-success"
    );
  } else {
    messageElement.classList.add(
      "category-information"
    );
  }
}

function clearCategoryMessage() {
  const messageElement =
    document.getElementById(
      "category-message"
    );

  if (!messageElement) {
    return;
  }

  messageElement.textContent = "";

  messageElement.classList.remove(
    "category-error",
    "category-success",
    "category-information"
  );
}

// ============================================================
// NORMALIZE CATEGORY
// ============================================================

function normalizeCategory(
  category
) {
  return {
    id: String(
      category.id ||
      category._id ||
      ""
    ),

    name: String(
      category.name || ""
    ),

    slug: String(
      category.slug || ""
    ),

    description: String(
      category.description || ""
    ),

    image: String(
      category.image || ""
    ),

    active:
      category.active !== false,

    displayOrder: Number(
      category.displayOrder ??
      category.display_order ??
      0
    )
  };
}

// ============================================================
// LOAD CATEGORIES
// ============================================================

async function loadCategories() {
  const categorySelect =
    document.getElementById(
      "category-to-delete"
    );

  const deleteButton =
    document.getElementById(
      "delete-category-button"
    );

  if (!categorySelect) {
    throw new Error(
      "The category dropdown could not be found."
    );
  }

  categorySelect.disabled = true;

  if (deleteButton) {
    deleteButton.disabled = true;
  }

  categorySelect.replaceChildren();

  const loadingOption =
    document.createElement(
      "option"
    );

  loadingOption.value = "";

  loadingOption.textContent =
    "Loading categories...";

  categorySelect.appendChild(
    loadingOption
  );

  const response = await fetch(
    CATEGORIES_API,
    {
      method: "GET"
    }
  );

  const data =
    await readApiResponse(response);

  const categoryList =
    Array.isArray(data)
      ? data
      : Array.isArray(data.categories)
        ? data.categories
        : [];

  availableCategories =
    categoryList
      .map(normalizeCategory)
      .sort((first, second) => {
        if (
          first.displayOrder !==
          second.displayOrder
        ) {
          return (
            first.displayOrder -
            second.displayOrder
          );
        }

        return first.name.localeCompare(
          second.name
        );
      });

  categorySelect.replaceChildren();

  const defaultOption =
    document.createElement(
      "option"
    );

  defaultOption.value = "";

  defaultOption.textContent =
    availableCategories.length > 0
      ? "Select a category"
      : "No categories are available";

  categorySelect.appendChild(
    defaultOption
  );

  availableCategories.forEach(
    (category) => {
      const option =
        document.createElement(
          "option"
        );

      option.value = category.id;

      option.textContent =
        category.active
          ? category.name
          : `${category.name} (Hidden)`;

      categorySelect.appendChild(
        option
      );
    }
  );

  categorySelect.disabled =
    availableCategories.length === 0;

  if (
    availableCategories.length === 0
  ) {
    showCategoryMessage(
      "No categories have been created yet.",
      "information"
    );
  }
}

// ============================================================
// LOAD PRODUCTS FOR CATEGORY COUNT
// ============================================================

async function loadProducts() {
  try {
    const response = await fetch(
      ADMIN_PRODUCTS_API,
      {
        method: "GET",
        headers:
          getAdminHeaders(false)
      }
    );

    const data =
      await readApiResponse(
        response
      );

    availableProducts =
      Array.isArray(data)
        ? data
        : [];
  } catch (error) {
    console.error(
      "Products could not be loaded:",
      error
    );

    availableProducts = [];
  }
}

// ============================================================
// FIND SELECTED CATEGORY
// ============================================================

function getSelectedCategory() {
  const categorySelect =
    document.getElementById(
      "category-to-delete"
    );

  if (!categorySelect) {
    return null;
  }

  const selectedId =
    categorySelect.value;

  return (
    availableCategories.find(
      (category) =>
        category.id === selectedId
    ) || null
  );
}

// ============================================================
// COUNT PRODUCTS ASSIGNED TO CATEGORY
// ============================================================

function countProductsInCategory(
  category
) {
  if (!category) {
    return 0;
  }

  return availableProducts.filter(
    (product) => {
      const productCategoryId =
        String(
          product.categoryId ||
          product.category_id ||
          ""
        );

      const productCategoryName =
        String(
          product.category || ""
        )
          .trim()
          .toLowerCase();

      const categoryName =
        category.name
          .trim()
          .toLowerCase();

      return (
        productCategoryId ===
          category.id ||
        productCategoryName ===
          categoryName
      );
    }
  ).length;
}

// ============================================================
// DISPLAY SELECTED CATEGORY
// ============================================================

function displaySelectedCategory() {
  clearCategoryMessage();

  const category =
    getSelectedCategory();

  const detailsSection =
    document.getElementById(
      "selected-category-details"
    );

  const confirmCheckbox =
    document.getElementById(
      "confirm-category-deletion"
    );

  if (confirmCheckbox) {
    confirmCheckbox.checked = false;
  }

  updateDeleteButtonState();

  if (!category) {
    if (detailsSection) {
      detailsSection.hidden = true;
    }

    clearCategoryDetails();
    return;
  }

  const productCount =
    countProductsInCategory(
      category
    );

  setTextContent(
    "selected-category-name",
    category.name
  );

  setTextContent(
    "selected-category-slug",
    category.slug ||
    "No tag assigned"
  );

  setTextContent(
    "selected-category-description",
    category.description ||
    "No description provided"
  );

  setTextContent(
    "selected-category-product-count",
    productCount
  );

  setTextContent(
    "selected-category-status",
    category.active
      ? "Active"
      : "Hidden"
  );

  displayCategoryImage(
    category
  );

  if (detailsSection) {
    detailsSection.hidden = false;
  }

  if (productCount > 0) {
    showCategoryMessage(
      `${productCount} product(s) are currently assigned to this category. The category cannot be safely deleted until those products are moved or the backend is configured to unassign them.`,
      "information"
    );
  }
}

function setTextContent(
  elementId,
  value
) {
  const element =
    document.getElementById(
      elementId
    );

  if (element) {
    element.textContent =
      String(value ?? "");
  }
}

function displayCategoryImage(
  category
) {
  const image =
    document.getElementById(
      "selected-category-image"
    );

  if (!image) {
    return;
  }

  if (!category.image) {
    image.hidden = true;
    image.removeAttribute("src");
    return;
  }

  image.src = category.image;

  image.alt =
    `${category.name} category`;

  image.hidden = false;

  image.onerror = () => {
    image.hidden = true;
    image.removeAttribute("src");
  };
}

function clearCategoryDetails() {
  setTextContent(
    "selected-category-name",
    ""
  );

  setTextContent(
    "selected-category-slug",
    ""
  );

  setTextContent(
    "selected-category-description",
    ""
  );

  setTextContent(
    "selected-category-product-count",
    "0"
  );

  setTextContent(
    "selected-category-status",
    ""
  );

  const image =
    document.getElementById(
      "selected-category-image"
    );

  if (image) {
    image.hidden = true;
    image.removeAttribute("src");
  }
}

// ============================================================
// DELETE BUTTON STATE
// ============================================================

function updateDeleteButtonState() {
  const selectedCategory =
    getSelectedCategory();

  const confirmationCheckbox =
    document.getElementById(
      "confirm-category-deletion"
    );

  const deleteButton =
    document.getElementById(
      "delete-category-button"
    );

  if (!deleteButton) {
    return;
  }

  deleteButton.disabled =
    !selectedCategory ||
    !confirmationCheckbox ||
    !confirmationCheckbox.checked;
}

// ============================================================
// DELETE CATEGORY
// ============================================================

async function deleteSelectedCategory(
  event
) {
  if (event) {
    event.preventDefault();
  }

  clearCategoryMessage();

  const category =
    getSelectedCategory();

  const confirmationCheckbox =
    document.getElementById(
      "confirm-category-deletion"
    );

  const deleteButton =
    document.getElementById(
      "delete-category-button"
    );

  if (!category) {
    showCategoryMessage(
      "Please select a category to delete.",
      "error"
    );

    return;
  }

  if (
    !confirmationCheckbox ||
    !confirmationCheckbox.checked
  ) {
    showCategoryMessage(
      "Confirm that you understand the deletion cannot be undone.",
      "error"
    );

    return;
  }

  const assignedProductCount =
    countProductsInCategory(
      category
    );

  if (assignedProductCount > 0) {
    showCategoryMessage(
      `This category still has ${assignedProductCount} assigned product(s). Move the products to another category before deleting it.`,
      "error"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `Permanently delete the category "${category.name}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    if (deleteButton) {
      deleteButton.disabled = true;

      deleteButton.textContent =
        "Deleting Category...";
    }

    const response = await fetch(
      `${CATEGORIES_API}/${encodeURIComponent(category.id)}`,
      {
        method: "DELETE",
        headers:
          getAdminHeaders(false)
      }
    );

    const data =
      await readApiResponse(
        response
      );

    showCategoryMessage(
      data.message ||
      `The category "${category.name}" was deleted successfully.`,
      "success"
    );

    if (confirmationCheckbox) {
      confirmationCheckbox.checked =
        false;
    }

    clearCategoryDetails();

    const detailsSection =
      document.getElementById(
        "selected-category-details"
      );

    if (detailsSection) {
      detailsSection.hidden = true;
    }

    await loadCategories();
  } catch (error) {
    console.error(
      "Category deletion failed:",
      error
    );

    showCategoryMessage(
      error.message ||
      "The category could not be deleted.",
      "error"
    );
  } finally {
    if (deleteButton) {
      deleteButton.textContent =
        "Delete Selected Category";

      updateDeleteButtonState();
    }
  }
}

// ============================================================
// INITIAL PAGE LOAD
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    const validSession =
      await verifyAdminSession();

    if (!validSession) {
      return;
    }

    const categorySelect =
      document.getElementById(
        "category-to-delete"
      );

    const confirmationCheckbox =
      document.getElementById(
        "confirm-category-deletion"
      );

    const deleteForm =
      document.getElementById(
        "delete-category-form"
      );

    const logoutButton =
      document.getElementById(
        "admin-logout-button"
      );

    if (categorySelect) {
      categorySelect.addEventListener(
        "change",
        displaySelectedCategory
      );
    }

    if (confirmationCheckbox) {
      confirmationCheckbox.addEventListener(
        "change",
        updateDeleteButtonState
      );
    }

    if (deleteForm) {
      deleteForm.addEventListener(
        "submit",
        deleteSelectedCategory
      );
    }

    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        logoutAdmin
      );
    }

    try {
      showCategoryMessage(
        "Loading categories...",
        "information"
      );

      await Promise.all([
        loadCategories(),
        loadProducts()
      ]);

      clearCategoryMessage();
    } catch (error) {
      console.error(
        "Category page startup failed:",
        error
      );

      showCategoryMessage(
        error.message ||
        "The categories could not be loaded.",
        "error"
      );
    }
  }
);

// ============================================================
// SUPPORT EXISTING INLINE HTML
// ============================================================

window.deleteSelectedCategory =
  deleteSelectedCategory;

window.loadCategories =
  loadCategories;

window.logoutAdmin =
  logoutAdmin;