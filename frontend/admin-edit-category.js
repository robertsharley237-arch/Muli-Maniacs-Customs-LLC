// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// EDIT CATEGORY ADMIN PAGE
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
let selectedCategory = null;

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
// CATEGORY HELPERS
// ============================================================

function normalizeCategory(category) {
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

    imagePublicId: String(
      category.imagePublicId ||
      category.image_public_id ||
      ""
    ),

    active:
      category.active !== false,

    displayOrder: Number(
      category.displayOrder ??
      category.display_order ??
      0
    ),

    createdAt:
      category.createdAt ||
      category.created_at ||
      null,

    updatedAt:
      category.updatedAt ||
      category.updated_at ||
      null
  };
}

function createCategorySlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSelectedCategoryId() {
  const categorySelect =
    document.getElementById(
      "category-to-edit"
    );

  return categorySelect
    ? categorySelect.value
    : "";
}

function findSelectedCategory() {
  const selectedId =
    getSelectedCategoryId();

  return (
    availableCategories.find(
      (category) =>
        category.id === selectedId
    ) || null
  );
}

// ============================================================
// LOAD CATEGORIES
// ============================================================

async function loadCategories(
  categoryIdToReselect = ""
) {
  const categorySelect =
    document.getElementById(
      "category-to-edit"
    );

  if (!categorySelect) {
    throw new Error(
      "The category dropdown could not be found."
    );
  }

  categorySelect.disabled = true;
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
    await readApiResponse(
      response
    );

  const categoryList =
    Array.isArray(data)
      ? data
      : Array.isArray(data.categories)
        ? data.categories
        : [];

  availableCategories =
    categoryList
      .map(normalizeCategory)
      .sort(
        (first, second) => {
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
        }
      );

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
    categoryIdToReselect &&
    availableCategories.some(
      (category) =>
        category.id ===
        categoryIdToReselect
    )
  ) {
    categorySelect.value =
      categoryIdToReselect;

    displaySelectedCategory();
  } else {
    hideEditForm();
  }

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
// LOAD PRODUCTS FOR ASSIGNED COUNT
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

function countProductsInCategory(
  category
) {
  if (!category) {
    return 0;
  }

  const categoryName =
    category.name
      .trim()
      .toLowerCase();

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

  selectedCategory =
    findSelectedCategory();

  if (!selectedCategory) {
    hideEditForm();
    return;
  }

  setInputValue(
    "edit-category-id",
    selectedCategory.id
  );

  setInputValue(
    "edit-category-name",
    selectedCategory.name
  );

  setInputValue(
    "edit-category-slug",
    selectedCategory.slug ||
    createCategorySlug(
      selectedCategory.name
    )
  );

  setInputValue(
    "edit-category-description",
    selectedCategory.description
  );

  setInputValue(
    "edit-category-image",
    selectedCategory.image
  );

  setInputValue(
    "edit-category-display-order",
    selectedCategory.displayOrder
  );

  setInputValue(
    "edit-category-product-count",
    countProductsInCategory(
      selectedCategory
    )
  );

  const activeCheckbox =
    document.getElementById(
      "edit-category-active"
    );

  if (activeCheckbox) {
    activeCheckbox.checked =
      selectedCategory.active;
  }

  updateImagePreview(
    selectedCategory.image
  );

  const editForm =
    document.getElementById(
      "edit-category-form"
    );

  if (editForm) {
    editForm.hidden = false;
  }
}

function hideEditForm() {
  selectedCategory = null;

  const editForm =
    document.getElementById(
      "edit-category-form"
    );

  if (editForm) {
    editForm.hidden = true;
    editForm.reset();
  }

  updateImagePreview("");
}

function setInputValue(
  elementId,
  value
) {
  const element =
    document.getElementById(
      elementId
    );

  if (element) {
    element.value =
      value ?? "";
  }
}

// ============================================================
// AUTOMATIC CATEGORY TAG
// ============================================================

function updateSlugFromName() {
  const nameInput =
    document.getElementById(
      "edit-category-name"
    );

  const slugInput =
    document.getElementById(
      "edit-category-slug"
    );

  if (!nameInput || !slugInput) {
    return;
  }

  if (
    !slugInput.dataset.manuallyEdited ||
    slugInput.value.trim() === ""
  ) {
    slugInput.value =
      createCategorySlug(
        nameInput.value
      );
  }
}

function markSlugAsManuallyEdited() {
  const slugInput =
    document.getElementById(
      "edit-category-slug"
    );

  if (!slugInput) {
    return;
  }

  slugInput.dataset.manuallyEdited =
    slugInput.value.trim()
      ? "true"
      : "";
}

function cleanSlugInput() {
  const slugInput =
    document.getElementById(
      "edit-category-slug"
    );

  if (!slugInput) {
    return;
  }

  slugInput.value =
    createCategorySlug(
      slugInput.value
    );
}

// ============================================================
// CATEGORY IMAGE PREVIEW
// ============================================================

function updateImagePreview(
  imageUrl
) {
  const previewContainer =
    document.getElementById(
      "category-image-preview-container"
    );

  const previewImage =
    document.getElementById(
      "category-image-preview"
    );

  if (
    !previewContainer ||
    !previewImage
  ) {
    return;
  }

  const cleanImageUrl =
    String(imageUrl || "").trim();

  if (!cleanImageUrl) {
    previewContainer.hidden = true;
    previewImage.removeAttribute(
      "src"
    );

    return;
  }

  previewImage.src =
    cleanImageUrl;

  previewImage.alt =
    "Category image preview";

  previewContainer.hidden = false;

  previewImage.onerror = () => {
    previewContainer.hidden = true;

    previewImage.removeAttribute(
      "src"
    );
  };
}

function handleImageUrlChange() {
  const imageInput =
    document.getElementById(
      "edit-category-image"
    );

  updateImagePreview(
    imageInput
      ? imageInput.value
      : ""
  );
}

// ============================================================
// FORM VALIDATION
// ============================================================

function getCategoryFormData() {
  const id =
    document.getElementById(
      "edit-category-id"
    )?.value || "";

  const name =
    document.getElementById(
      "edit-category-name"
    )?.value.trim() || "";

  const slug =
    createCategorySlug(
      document.getElementById(
        "edit-category-slug"
      )?.value || ""
    );

  const description =
    document.getElementById(
      "edit-category-description"
    )?.value.trim() || "";

  const image =
    document.getElementById(
      "edit-category-image"
    )?.value.trim() || "";

  const displayOrder = Number(
    document.getElementById(
      "edit-category-display-order"
    )?.value || 0
  );

  const activeCheckbox =
    document.getElementById(
      "edit-category-active"
    );

  const active =
    activeCheckbox
      ? activeCheckbox.checked
      : true;

  return {
    id,
    name,
    slug,
    description,
    image,
    displayOrder,
    active
  };
}

function validateCategoryData(
  categoryData
) {
  if (!categoryData.id) {
    return "Please select a category.";
  }

  if (
    categoryData.name.length < 2
  ) {
    return "Category name must contain at least 2 characters.";
  }

  if (
    categoryData.slug.length < 2
  ) {
    return "Category tag must contain at least 2 characters.";
  }

  if (
    !Number.isInteger(
      categoryData.displayOrder
    ) ||
    categoryData.displayOrder < 0
  ) {
    return "Display order must be a whole number of 0 or higher.";
  }

  if (
    categoryData.description.length >
    1000
  ) {
    return "Category description cannot exceed 1,000 characters.";
  }

  if (
    categoryData.image &&
    !isValidWebAddress(
      categoryData.image
    )
  ) {
    return "Category image must be a valid web address.";
  }

  const duplicateName =
    availableCategories.some(
      (category) =>
        category.id !==
          categoryData.id &&
        category.name
          .trim()
          .toLowerCase() ===
        categoryData.name
          .trim()
          .toLowerCase()
    );

  if (duplicateName) {
    return "Another category already uses that name.";
  }

  const duplicateSlug =
    availableCategories.some(
      (category) =>
        category.id !==
          categoryData.id &&
        category.slug
          .trim()
          .toLowerCase() ===
        categoryData.slug
          .trim()
          .toLowerCase()
    );

  if (duplicateSlug) {
    return "Another category already uses that tag.";
  }

  return "";
}

function isValidWebAddress(value) {
  try {
    const url =
      new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch (error) {
    return false;
  }
}

// ============================================================
// SAVE CATEGORY CHANGES
// ============================================================

async function saveCategoryChanges(
  event
) {
  if (event) {
    event.preventDefault();
  }

  clearCategoryMessage();

  const categoryData =
    getCategoryFormData();

  const validationError =
    validateCategoryData(
      categoryData
    );

  if (validationError) {
    showCategoryMessage(
      validationError,
      "error"
    );

    return;
  }

  const updateButton =
    document.getElementById(
      "update-category-button"
    );

  try {
    if (updateButton) {
      updateButton.disabled = true;

      updateButton.textContent =
        "Saving Changes...";
    }

    const response = await fetch(
      `${CATEGORIES_API}/${encodeURIComponent(categoryData.id)}`,
      {
        method: "PUT",
        headers:
          getAdminHeaders(true),

        body: JSON.stringify({
          name:
            categoryData.name,

          slug:
            categoryData.slug,

          description:
            categoryData.description,

          image:
            categoryData.image,

          displayOrder:
            categoryData.displayOrder,

          active:
            categoryData.active
        })
      }
    );

    const data =
      await readApiResponse(
        response
      );

    const updatedCategory =
      normalizeCategory(
        data.category || data
      );

    showCategoryMessage(
      data.message ||
      `The category "${updatedCategory.name}" was updated successfully.`,
      "success"
    );

    await loadCategories(
      updatedCategory.id ||
      categoryData.id
    );
  } catch (error) {
    console.error(
      "Category update failed:",
      error
    );

    showCategoryMessage(
      error.message ||
      "The category could not be updated.",
      "error"
    );
  } finally {
    if (updateButton) {
      updateButton.disabled = false;

      updateButton.textContent =
        "Save Category Changes";
    }
  }
}

// ============================================================
// RESET FORM TO SAVED VALUES
// ============================================================

function resetCategoryForm() {
  if (!selectedCategory) {
    hideEditForm();
    return;
  }

  displaySelectedCategory();

  showCategoryMessage(
    "The form was reset to the currently saved category information.",
    "information"
  );
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

    const categorySelect =
      document.getElementById(
        "category-to-edit"
      );

    const editForm =
      document.getElementById(
        "edit-category-form"
      );

    const nameInput =
      document.getElementById(
        "edit-category-name"
      );

    const slugInput =
      document.getElementById(
        "edit-category-slug"
      );

    const imageInput =
      document.getElementById(
        "edit-category-image"
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

    if (editForm) {
      editForm.addEventListener(
        "submit",
        saveCategoryChanges
      );
    }

    if (nameInput) {
      nameInput.addEventListener(
        "input",
        updateSlugFromName
      );
    }

    if (slugInput) {
      slugInput.addEventListener(
        "input",
        markSlugAsManuallyEdited
      );

      slugInput.addEventListener(
        "blur",
        cleanSlugInput
      );
    }

    if (imageInput) {
      imageInput.addEventListener(
        "input",
        handleImageUrlChange
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
        "Category edit page startup failed:",
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

window.saveCategoryChanges =
  saveCategoryChanges;

window.loadCategories =
  loadCategories;

window.resetCategoryForm =
  resetCategoryForm;

window.logoutAdmin =
  logoutAdmin;