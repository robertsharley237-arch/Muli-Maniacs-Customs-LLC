// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADD CATEGORY ADMIN PAGE
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// ============================================================

(function () {
  "use strict";

  var ADD_CATEGORY_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var ADD_CATEGORY_API =
    ADD_CATEGORY_BACKEND_URL +
    "/categories";

  var existingCategories = [];

  var categorySlugWasEdited =
    false;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getCategoryElement(
    elementId
  ) {
    return document.getElementById(
      elementId
    );
  }

  function getCategoryValue(
    elementId
  ) {
    var element =
      getCategoryElement(
        elementId
      );

    if (!element) {
      return "";
    }

    return String(
      element.value || ""
    ).trim();
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
    includeContentType
  ) {
    var headers = {
      Authorization:
        "Bearer " +
        getAdminToken()
    };

    if (
      includeContentType !== false
    ) {
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

  function redirectToAdminLogin() {
    clearSavedAdminLogin();

    window.location.href =
      "admin-login.html";
  }

  function logoutAdmin() {
    redirectToAdminLogin();
  }

  async function verifyAdminSession() {
    var token =
      getAdminToken();

    if (!token) {
      redirectToAdminLogin();
      return false;
    }

    try {
      var response = await fetch(
        ADD_CATEGORY_BACKEND_URL +
        "/admin/me",
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readCategoryResponse(
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

  // ==========================================================
  // ADMIN INFORMATION
  // ==========================================================

  function displayAdminInformation(
    admin
  ) {
    var usernameElement =
      getCategoryElement(
        "admin-username"
      );

    var roleElement =
      getCategoryElement(
        "admin-role"
      );

    if (usernameElement) {
      usernameElement.textContent =
        admin.username || "";
    }

    if (roleElement) {
      roleElement.textContent =
        formatAdminRole(
          admin.role
        );
    }
  }

  function formatAdminRole(role) {
    if (!role) {
      return "";
    }

    return String(role)
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readCategoryResponse(
    response
  ) {
    var data;

    try {
      data =
        await response.json();
    } catch (error) {
      data = {
        error:
          "The server returned an unexpected response."
      };
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
        "You do not have permission to perform this action."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "The request failed with status " +
        response.status +
        "."
      );
    }

    return data;
  }

  // ==========================================================
  // MESSAGE DISPLAY
  // ==========================================================

  function showCategoryMessage(
    message,
    messageType
  ) {
    var messageElement =
      getCategoryElement(
        "category-message"
      );

    if (!messageElement) {
      if (messageType === "error") {
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

    if (messageType === "error") {
      messageElement.classList.add(
        "category-error"
      );
    } else if (
      messageType === "success"
    ) {
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
    var messageElement =
      getCategoryElement(
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

  // ==========================================================
  // SUBMIT BUTTON
  // ==========================================================

  function setCategoryButtonLoading(
    isLoading
  ) {
    var submitButton =
      getCategoryElement(
        "add-category-button"
      );

    if (!submitButton) {
      return;
    }

    submitButton.disabled =
      isLoading;

    submitButton.textContent =
      isLoading
        ? "Creating Category..."
        : "Create Category";
  }

  // ==========================================================
  // CATEGORY TAG
  // ==========================================================

  function createCategorySlug(
    value
  ) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );
  }

  function updateCategorySlug() {
    var nameInput =
      getCategoryElement(
        "category-name"
      );

    var slugInput =
      getCategoryElement(
        "category-slug"
      );

    if (
      !nameInput ||
      !slugInput
    ) {
      return;
    }

    if (
      !categorySlugWasEdited ||
      !slugInput.value.trim()
    ) {
      slugInput.value =
        createCategorySlug(
          nameInput.value
        );
    }
  }

  function markCategorySlugEdited() {
    var slugInput =
      getCategoryElement(
        "category-slug"
      );

    if (!slugInput) {
      return;
    }

    categorySlugWasEdited =
      Boolean(
        slugInput.value.trim()
      );
  }

  function cleanCategorySlug() {
    var slugInput =
      getCategoryElement(
        "category-slug"
      );

    if (!slugInput) {
      return;
    }

    slugInput.value =
      createCategorySlug(
        slugInput.value
      );
  }

  // ==========================================================
  // IMAGE PREVIEW
  // ==========================================================

  function updateCategoryImagePreview() {
    var imageUrl =
      getCategoryValue(
        "category-image"
      );

    var previewContainer =
      getCategoryElement(
        "category-image-preview-container"
      );

    var previewImage =
      getCategoryElement(
        "category-image-preview"
      );

    if (
      !previewContainer ||
      !previewImage
    ) {
      return;
    }

    if (!imageUrl) {
      previewContainer.hidden = true;

      previewImage.removeAttribute(
        "src"
      );

      return;
    }

    if (!isValidWebAddress(imageUrl)) {
      previewContainer.hidden = true;

      previewImage.removeAttribute(
        "src"
      );

      return;
    }

    previewImage.src =
      imageUrl;

    previewImage.alt =
      "Category image preview";

    previewContainer.hidden = false;

    previewImage.onerror =
      function () {
        previewContainer.hidden = true;

        previewImage.removeAttribute(
          "src"
        );

        showCategoryMessage(
          "The category image could not be loaded from that address.",
          "error"
        );
      };
  }

  function isValidWebAddress(
    value
  ) {
    try {
      var address =
        new URL(value);

      return (
        address.protocol ===
          "http:" ||
        address.protocol ===
          "https:"
      );
    } catch (error) {
      return false;
    }
  }

  // ==========================================================
  // LOAD EXISTING CATEGORIES
  // ==========================================================

  async function loadExistingCategories() {
    try {
      var response = await fetch(
        ADD_CATEGORY_API,
        {
          method: "GET"
        }
      );

      var data =
        await readCategoryResponse(
          response
        );

      if (Array.isArray(data)) {
        existingCategories = data;
      } else if (
        data &&
        Array.isArray(
          data.categories
        )
      ) {
        existingCategories =
          data.categories;
      } else {
        existingCategories = [];
      }
    } catch (error) {
      console.error(
        "Existing categories could not be loaded:",
        error
      );

      existingCategories = [];

      showCategoryMessage(
        error.message ||
        "Existing categories could not be loaded.",
        "error"
      );
    }
  }

  // ==========================================================
  // CATEGORY FORM DATA
  // ==========================================================

  function getCategoryFormData() {
    var activeCheckbox =
      getCategoryElement(
        "category-active"
      );

    return {
      name:
        getCategoryValue(
          "category-name"
        ),

      slug:
        createCategorySlug(
          getCategoryValue(
            "category-slug"
          )
        ),

      description:
        getCategoryValue(
          "category-description"
        ),

      image:
        getCategoryValue(
          "category-image"
        ),

      displayOrder:
        Number(
          getCategoryValue(
            "category-display-order"
          ) || 0
        ),

      active:
        activeCheckbox
          ? activeCheckbox.checked
          : true
    };
  }

  // ==========================================================
  // DUPLICATE CHECKS
  // ==========================================================

  function categoryNameExists(
    categoryName
  ) {
    var normalizedName =
      String(categoryName)
        .trim()
        .toLowerCase();

    return existingCategories.some(
      function (category) {
        return (
          String(
            category.name || ""
          )
            .trim()
            .toLowerCase() ===
          normalizedName
        );
      }
    );
  }

  function categorySlugExists(
    categorySlug
  ) {
    var normalizedSlug =
      String(categorySlug)
        .trim()
        .toLowerCase();

    return existingCategories.some(
      function (category) {
        return (
          String(
            category.slug || ""
          )
            .trim()
            .toLowerCase() ===
          normalizedSlug
        );
      }
    );
  }

  // ==========================================================
  // FORM VALIDATION
  // ==========================================================

  function validateCategoryData(
    categoryData
  ) {
    if (
      categoryData.name.length < 2
    ) {
      return (
        "Category name must contain at least 2 characters."
      );
    }

    if (
      categoryData.name.length > 100
    ) {
      return (
        "Category name cannot exceed 100 characters."
      );
    }

    if (
      categoryData.slug.length < 2
    ) {
      return (
        "Category tag must contain at least 2 characters."
      );
    }

    if (
      categoryData.slug.length > 100
    ) {
      return (
        "Category tag cannot exceed 100 characters."
      );
    }

    if (
      categoryData.description.length >
      1000
    ) {
      return (
        "Category description cannot exceed 1,000 characters."
      );
    }

    if (
      !Number.isInteger(
        categoryData.displayOrder
      ) ||
      categoryData.displayOrder < 0
    ) {
      return (
        "Display order must be a whole number of 0 or higher."
      );
    }

    if (
      categoryData.image &&
      !isValidWebAddress(
        categoryData.image
      )
    ) {
      return (
        "Category image must be a valid web address."
      );
    }

    if (
      categoryNameExists(
        categoryData.name
      )
    ) {
      return (
        "A category with that name already exists."
      );
    }

    if (
      categorySlugExists(
        categoryData.slug
      )
    ) {
      return (
        "A category with that tag already exists."
      );
    }

    return "";
  }

  // ==========================================================
  // CREATE CATEGORY
  // ==========================================================

  async function addCategory(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    clearCategoryMessage();

    var categoryData =
      getCategoryFormData();

    var validationError =
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

    try {
      setCategoryButtonLoading(
        true
      );

      showCategoryMessage(
        "Creating category...",
        "information"
      );

      var response = await fetch(
        ADD_CATEGORY_API,
        {
          method: "POST",

          headers:
            getAdminHeaders(true),

          body: JSON.stringify(
            categoryData
          )
        }
      );

      var data =
        await readCategoryResponse(
          response
        );

      var createdCategory =
        data.category || data;

      showCategoryMessage(
        data.message ||
        (
          'The category "' +
          categoryData.name +
          '" was created successfully.'
        ),
        "success"
      );

      if (
        createdCategory &&
        createdCategory.name
      ) {
        existingCategories.push(
          createdCategory
        );
      }

      resetCategoryForm();
    } catch (error) {
      console.error(
        "Category creation failed:",
        error
      );

      showCategoryMessage(
        error.message ||
        "The category could not be created.",
        "error"
      );
    } finally {
      setCategoryButtonLoading(
        false
      );
    }
  }

  // ==========================================================
  // RESET FORM
  // ==========================================================

  function resetCategoryForm() {
    var categoryForm =
      getCategoryElement(
        "add-category-form"
      );

    if (categoryForm) {
      categoryForm.reset();
    }

    var displayOrderInput =
      getCategoryElement(
        "category-display-order"
      );

    var activeCheckbox =
      getCategoryElement(
        "category-active"
      );

    if (displayOrderInput) {
      displayOrderInput.value =
        "0";
    }

    if (activeCheckbox) {
      activeCheckbox.checked =
        true;
    }

    categorySlugWasEdited =
      false;

    updateCategoryImagePreview();
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    async function () {
      var validSession =
        await verifyAdminSession();

      if (!validSession) {
        return;
      }

      var categoryForm =
        getCategoryElement(
          "add-category-form"
        );

      var nameInput =
        getCategoryElement(
          "category-name"
        );

      var slugInput =
        getCategoryElement(
          "category-slug"
        );

      var imageInput =
        getCategoryElement(
          "category-image"
        );

      var logoutButton =
        getCategoryElement(
          "admin-logout-button"
        );

      if (categoryForm) {
        categoryForm.addEventListener(
          "submit",
          addCategory
        );
      }

      if (nameInput) {
        nameInput.addEventListener(
          "input",
          updateCategorySlug
        );
      }

      if (slugInput) {
        slugInput.addEventListener(
          "input",
          markCategorySlugEdited
        );

        slugInput.addEventListener(
          "blur",
          cleanCategorySlug
        );
      }

      if (imageInput) {
        imageInput.addEventListener(
          "input",
          updateCategoryImagePreview
        );
      }

      if (logoutButton) {
        logoutButton.addEventListener(
          "click",
          logoutAdmin
        );
      }

      await loadExistingCategories();
    }
  );

  // ==========================================================
  // OPTIONAL INLINE HTML SUPPORT
  // ==========================================================

  window.addCategory =
    addCategory;

  window.resetCategoryForm =
    resetCategoryForm;

  window.logoutAdmin =
    logoutAdmin;
})();