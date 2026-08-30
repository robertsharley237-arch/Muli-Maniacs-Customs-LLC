// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-add-category.js
// ADD CATEGORY ADMIN PAGE
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var REQUEST_TIMEOUT_MS =
    15000;

  var existingCategories =
    [];

  var categorySlugWasEdited =
    false;

  var submissionInProgress =
    false;

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

  function getValue(
    elementId
  ) {
    var element =
      getElement(
        elementId
      );

    if (!element) {
      return "";
    }

    return String(
      element.value ||
      ""
    ).trim();
  }

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

    if (
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1"
    ) {
      return "http://localhost:10000";
    }

    return removeTrailingSlashes(
      window.location.origin
    );
  }

  var BACKEND_URL =
    getBackendUrl();

  var CATEGORIES_URL =
    BACKEND_URL +
    "/categories";

  var ADMIN_SESSION_URL =
    BACKEND_URL +
    "/admin/me";

  // ==========================================================
  // ADMIN AUTHENTICATION
  // ==========================================================

  function getAdminToken() {
    return String(
      localStorage.getItem(
        "adminToken"
      ) ||
      localStorage.getItem(
        "MMC_ADMIN_TOKEN"
      ) ||
      ""
    ).trim();
  }

  function getAdminHeaders(
    includeContentType
  ) {
    var token =
      getAdminToken();

    var headers = {
      Accept:
        "application/json",

      Authorization:
        "Bearer " +
        token
    };

    if (
      includeContentType !==
      false
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

    var returnAddress =
      encodeURIComponent(
        window.location.pathname
          .split("/")
          .pop() ||
        "admin-add-category.html"
      );

    window.location.replace(
      "admin-login.html?return=" +
      returnAddress
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
  // SERVER RESPONSE
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
          responseText
      };
    }
  }

  function getErrorMessage(
    value,
    fallbackMessage
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {
      if (
        typeof value.message ===
          "string" &&
        value.message.trim()
      ) {
        return value.message.trim();
      }

      if (
        value.error !==
        undefined
      ) {
        return getErrorMessage(
          value.error,
          fallbackMessage
        );
      }
    }

    return fallbackMessage;
  }

  async function requestJson(
    url,
    options
  ) {
    var response =
      await fetchWithTimeout(
        url,
        options
      );

    var responseData =
      await readResponse(
        response
      );

    if (
      response.status ===
      401
    ) {
      redirectToAdminLogin();

      throw new Error(
        "Your administrator session expired."
      );
    }

    if (
      response.status ===
      403
    ) {
      throw new Error(
        getErrorMessage(
          responseData,
          "You do not have permission to perform this action."
        )
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          responseData,
          (
            "The request failed with status " +
            response.status +
            "."
          )
        )
      );
    }

    return responseData;
  }

  // ==========================================================
  // ADMIN INFORMATION
  // ==========================================================

  function formatAdminRole(
    role
  ) {
    return String(
      role ||
      "Administrator"
    )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  function displayAdminInformation(
    admin
  ) {
    var username =
      String(
        admin.username ||
        admin.name ||
        admin.email ||
        "Administrator"
      );

    var role =
      formatAdminRole(
        admin.role
      );

    [
      "admin-username",
      "admin-header-username"
    ].forEach(
      function (elementId) {
        var element =
          getElement(
            elementId
          );

        if (element) {
          element.textContent =
            username;
        }
      }
    );

    [
      "admin-role",
      "admin-header-role"
    ].forEach(
      function (elementId) {
        var element =
          getElement(
            elementId
          );

        if (element) {
          element.textContent =
            role;
        }
      }
    );
  }

  async function verifyAdminSession() {
    if (!getAdminToken()) {
      redirectToAdminLogin();

      return false;
    }

    try {
      var responseData =
        await requestJson(
          ADMIN_SESSION_URL,
          {
            method:
              "GET",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      var admin =
        responseData.admin ||
        responseData.user ||
        responseData;

      localStorage.setItem(
        "adminUser",
        JSON.stringify(
          admin
        )
      );

      displayAdminInformation(
        admin
      );

      return true;
    } catch (error) {
      console.error(
        "Administrator session verification failed.",
        error
      );

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        showCategoryMessage(
          "The session check took too long. Please reload the page.",
          "error"
        );
      } else {
        showCategoryMessage(
          getErrorMessage(
            error,
            "Your administrator session could not be verified."
          ),
          "error"
        );
      }

      return false;
    }
  }

  // ==========================================================
  // MESSAGE DISPLAY
  // ==========================================================

  function showCategoryMessage(
    message,
    messageType
  ) {
    var messageElement =
      getElement(
        "category-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      String(message || "");

    messageElement.classList.remove(
      "category-error",
      "category-success",
      "category-information"
    );

    messageElement.removeAttribute(
      "role"
    );

    if (!message) {
      return;
    }

    if (
      messageType ===
      "success"
    ) {
      messageElement.classList.add(
        "category-success"
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
        "category-information"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else {
      messageElement.classList.add(
        "category-error"
      );

      messageElement.setAttribute(
        "role",
        "alert"
      );
    }
  }

  // ==========================================================
  // SUBMIT BUTTON
  // ==========================================================

  function setCategoryButtonLoading(
    isLoading
  ) {
    var button =
      getElement(
        "add-category-button"
      );

    if (!button) {
      return;
    }

    button.disabled =
      Boolean(
        isLoading
      );

    button.setAttribute(
      "aria-busy",
      isLoading
        ? "true"
        : "false"
    );

    button.textContent =
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
      .replace(
        /['"]/g,
        ""
      )
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
      getElement(
        "category-name"
      );

    var slugInput =
      getElement(
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
      getElement(
        "category-slug"
      );

    if (slugInput) {
      categorySlugWasEdited =
        Boolean(
          slugInput.value.trim()
        );
    }
  }

  function cleanCategorySlug() {
    var slugInput =
      getElement(
        "category-slug"
      );

    if (slugInput) {
      slugInput.value =
        createCategorySlug(
          slugInput.value
        );
    }
  }

  // ==========================================================
  // IMAGE URL VALIDATION
  // ==========================================================

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
  // IMAGE PREVIEW
  // ==========================================================

  function getOrCreatePreviewImage(
    previewContainer
  ) {
    var previewImage =
      getElement(
        "category-image-preview"
      );

    if (
      !previewImage &&
      previewContainer
    ) {
      previewImage =
        document.createElement(
          "img"
        );

      previewImage.id =
        "category-image-preview";

      previewImage.className =
        "category-image-preview";

      previewImage.alt =
        "Category image preview";

      previewContainer.appendChild(
        previewImage
      );
    }

    return previewImage;
  }

  function updateCategoryImagePreview() {
    var imageUrl =
      getValue(
        "category-image"
      );

    var previewContainer =
      getElement(
        "category-image-preview-container"
      );

    var previewImage =
      getOrCreatePreviewImage(
        previewContainer
      );

    if (
      !previewContainer ||
      !previewImage ||
      !imageUrl ||
      !isValidWebAddress(
        imageUrl
      )
    ) {
      if (previewContainer) {
        previewContainer.hidden =
          true;
      }

      if (previewImage) {
        previewImage.removeAttribute(
          "src"
        );
      }

      return;
    }

    previewImage.onerror =
      function () {
        previewContainer.hidden =
          true;

        previewImage.removeAttribute(
          "src"
        );

        showCategoryMessage(
          "The category image could not be loaded from that address.",
          "error"
        );
      };

    previewImage.onload =
      function () {
        previewContainer.hidden =
          false;
      };

    previewImage.src =
      imageUrl;
  }

  // ==========================================================
  // DESCRIPTION CHARACTER COUNT
  // ==========================================================

  function updateDescriptionCount() {
    var descriptionInput =
      getElement(
        "category-description"
      );

    var counter =
      getElement(
        "category-description-count"
      );

    if (
      descriptionInput &&
      counter
    ) {
      counter.textContent =
        descriptionInput.value.length +
        " of 1,000 characters";
    }
  }

  // ==========================================================
  // LOAD EXISTING CATEGORIES
  // ==========================================================

  async function loadExistingCategories() {
    try {
      var responseData =
        await requestJson(
          CATEGORIES_URL,
          {
            method:
              "GET",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      if (
        Array.isArray(
          responseData
        )
      ) {
        existingCategories =
          responseData;
      } else if (
        responseData &&
        Array.isArray(
          responseData.categories
        )
      ) {
        existingCategories =
          responseData.categories;
      } else {
        existingCategories =
          [];
      }
    } catch (error) {
      console.error(
        "Existing categories could not be loaded.",
        error
      );

      existingCategories =
        [];

      showCategoryMessage(
        getErrorMessage(
          error,
          "Existing categories could not be loaded."
        ),
        "error"
      );
    }
  }

  // ==========================================================
  // CATEGORY FORM DATA
  // ==========================================================

  function getCategoryFormData() {
    var sortOrderInput =
      getElement(
        "category-sort-order"
      ) ||
      getElement(
        "category-display-order"
      );

    var activeCheckbox =
      getElement(
        "category-active"
      );

    var featuredCheckbox =
      getElement(
        "category-featured"
      );

    var sortOrder =
      sortOrderInput
        ? Number(
            sortOrderInput.value ||
            0
          )
        : 0;

    return {
      name:
        getValue(
          "category-name"
        ),

      slug:
        createCategorySlug(
          getValue(
            "category-slug"
          )
        ),

      description:
        getValue(
          "category-description"
        ),

      image:
        getValue(
          "category-image"
        ),

      sortOrder:
        sortOrder,

      displayOrder:
        sortOrder,

      color:
        getValue(
          "category-color"
        ) ||
        "#ff1493",

      active:
        activeCheckbox
          ? activeCheckbox.checked
          : true,

      featured:
        featuredCheckbox
          ? featuredCheckbox.checked
          : false
    };
  }

  // ==========================================================
  // DUPLICATE CHECKS
  // ==========================================================

  function categoryNameExists(
    categoryName
  ) {
    var normalizedName =
      String(
        categoryName ||
        ""
      )
        .trim()
        .toLowerCase();

    return existingCategories.some(
      function (category) {
        return (
          String(
            category.name ||
            ""
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
      String(
        categorySlug ||
        ""
      )
        .trim()
        .toLowerCase();

    return existingCategories.some(
      function (category) {
        return (
          String(
            category.slug ||
            ""
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
      categoryData.name.length <
      2
    ) {
      return "Category name must contain at least 2 characters.";
    }

    if (
      categoryData.name.length >
      100
    ) {
      return "Category name cannot exceed 100 characters.";
    }

    if (
      categoryData.slug.length <
      2
    ) {
      return "Category tag must contain at least 2 characters.";
    }

    if (
      categoryData.slug.length >
      100
    ) {
      return "Category tag cannot exceed 100 characters.";
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        categoryData.slug
      )
    ) {
      return (
        "Category tag may use lowercase letters, " +
        "numbers, and hyphens only."
      );
    }

    if (
      categoryData.description.length >
      1000
    ) {
      return "Category description cannot exceed 1,000 characters.";
    }

    if (
      !Number.isInteger(
        categoryData.sortOrder
      ) ||
      categoryData.sortOrder <
        0
    ) {
      return "Display order must be a whole number of 0 or higher.";
    }

    if (
      categoryData.image &&
      !isValidWebAddress(
        categoryData.image
      )
    ) {
      return "Category image must be a valid HTTP or HTTPS web address.";
    }

    if (
      !/^#[0-9a-fA-F]{6}$/.test(
        categoryData.color
      )
    ) {
      return "Category color must be a valid six-digit color value.";
    }

    if (
      categoryNameExists(
        categoryData.name
      )
    ) {
      return "A category with that name already exists.";
    }

    if (
      categorySlugExists(
        categoryData.slug
      )
    ) {
      return "A category with that tag already exists.";
    }

    return "";
  }

  // ==========================================================
  // RESET FORM
  // ==========================================================

  function resetCategoryForm() {
    var categoryForm =
      getElement(
        "add-category-form"
      );

    if (categoryForm) {
      categoryForm.reset();
    }

    var sortOrderInput =
      getElement(
        "category-sort-order"
      ) ||
      getElement(
        "category-display-order"
      );

    var colorInput =
      getElement(
        "category-color"
      );

    var activeCheckbox =
      getElement(
        "category-active"
      );

    if (sortOrderInput) {
      sortOrderInput.value =
        "0";
    }

    if (colorInput) {
      colorInput.value =
        "#ff1493";
    }

    if (activeCheckbox) {
      activeCheckbox.checked =
        true;
    }

    categorySlugWasEdited =
      false;

    updateDescriptionCount();
    updateCategoryImagePreview();
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

    if (submissionInProgress) {
      return;
    }

    showCategoryMessage(
      "",
      "information"
    );

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

    submissionInProgress =
      true;

    setCategoryButtonLoading(
      true
    );

    showCategoryMessage(
      "Creating category...",
      "information"
    );

    try {
      var responseData =
        await requestJson(
          CATEGORIES_URL,
          {
            method:
              "POST",

            headers:
              getAdminHeaders(
                true
              ),

            body:
              JSON.stringify(
                categoryData
              )
          }
        );

      var createdCategory =
        responseData.category ||
        responseData;

      if (
        createdCategory &&
        createdCategory.name
      ) {
        existingCategories.push(
          createdCategory
        );
      } else {
        existingCategories.push(
          categoryData
        );
      }

      resetCategoryForm();

      showCategoryMessage(
        getErrorMessage(
          responseData.message,
          (
            'The category "' +
            categoryData.name +
            '" was created successfully.'
          )
        ),
        "success"
      );
    } catch (error) {
      console.error(
        "Category creation failed.",
        error
      );

      var errorMessage;

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        errorMessage =
          "The category request took too long. Please try again.";
      } else if (
        error instanceof
        TypeError
      ) {
        errorMessage =
          "The category server could not be reached. " +
          "Check the backend URL and try again.";
      } else {
        errorMessage =
          getErrorMessage(
            error,
            "The category could not be created."
          );
      }

      showCategoryMessage(
        errorMessage,
        "error"
      );
    } finally {
      submissionInProgress =
        false;

      setCategoryButtonLoading(
        false
      );
    }
  }

  // ==========================================================
  // LOGOUT BUTTONS
  // ==========================================================

  function connectLogoutButtons() {
    [
      "admin-logout-button",
      "admin-navigation-logout-button"
    ].forEach(
      function (elementId) {
        var button =
          getElement(
            elementId
          );

        if (button) {
          button.addEventListener(
            "click",
            logoutAdmin
          );
        }
      }
    );
  }

  // ==========================================================
  // PAGE INITIALIZATION
  // ==========================================================

  async function initializePage() {
    var validSession =
      await verifyAdminSession();

    if (!validSession) {
      return;
    }

    var categoryForm =
      getElement(
        "add-category-form"
      );

    var nameInput =
      getElement(
        "category-name"
      );

    var slugInput =
      getElement(
        "category-slug"
      );

    var imageInput =
      getElement(
        "category-image"
      );

    var descriptionInput =
      getElement(
        "category-description"
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

      imageInput.addEventListener(
        "blur",
        updateCategoryImagePreview
      );
    }

    if (descriptionInput) {
      descriptionInput.addEventListener(
        "input",
        updateDescriptionCount
      );
    }

    connectLogoutButtons();
    updateDescriptionCount();
    updateCategoryImagePreview();

    await loadExistingCategories();

    console.log(
      "MMC Add Category page initialized."
    );
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
      initializePage
    );
  } else {
    initializePage();
  }

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.addCategory =
    addCategory;

  window.resetCategoryForm =
    resetCategoryForm;

  window.logoutAdmin =
    logoutAdmin;
}());