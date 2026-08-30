// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-edit-category.js
// EDIT CATEGORY ADMIN PAGE
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

  var availableCategories =
    [];

  var availableProducts =
    [];

  var selectedCategory =
    null;

  var slugWasManuallyEdited =
    false;

  var updateInProgress =
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

  function setInputValue(
    elementId,
    value
  ) {
    var element =
      getElement(
        elementId
      );

    if (!element) {
      return;
    }

    element.value =
      value === undefined ||
      value === null
        ? ""
        : String(value);
  }

  function setText(
    elementId,
    value
  ) {
    var element =
      getElement(
        elementId
      );

    if (!element) {
      return;
    }

    element.textContent =
      value === undefined ||
      value === null
        ? ""
        : String(value);
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

  var ADMIN_PRODUCTS_URL =
    BACKEND_URL +
    "/admin/products";

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
    var headers = {
      Accept:
        "application/json",

      Authorization:
        "Bearer " +
        getAdminToken()
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
      "MMC_ADMIN_TOKEN"
    );

    localStorage.removeItem(
      "adminUser"
    );
  }

  function redirectToAdminLogin() {
    clearSavedAdminLogin();

    window.location.replace(
      "admin-login.html?return=" +
      encodeURIComponent(
        "admin-edit-category.html"
      )
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

    var timeoutIdentifier =
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
          options || {},
          {
            signal:
              controller.signal
          }
        )
      );
    } finally {
      window.clearTimeout(
        timeoutIdentifier
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
    administrator
  ) {
    var username =
      String(
        administrator.username ||
        administrator.name ||
        administrator.email ||
        "Administrator"
      );

    var role =
      formatAdminRole(
        administrator.role
      );

    [
      "admin-username",
      "admin-header-username"
    ].forEach(
      function (elementId) {
        setText(
          elementId,
          username
        );
      }
    );

    [
      "admin-role",
      "admin-header-role"
    ].forEach(
      function (elementId) {
        setText(
          elementId,
          role
        );
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

      var administrator =
        responseData.admin ||
        responseData.user ||
        responseData;

      localStorage.setItem(
        "adminUser",
        JSON.stringify(
          administrator
        )
      );

      displayAdminInformation(
        administrator
      );

      return true;
    } catch (error) {
      console.error(
        "Administrator session verification failed.",
        error
      );

      showCategoryMessage(
        getRequestErrorMessage(
          error,
          "Your administrator session could not be verified."
        ),
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // REQUEST ERROR MESSAGE
  // ==========================================================

  function getRequestErrorMessage(
    error,
    fallbackMessage
  ) {
    if (
      error &&
      error.name ===
        "AbortError"
    ) {
      return (
        "The server request took too long. " +
        "Please try again."
      );
    }

    if (
      error instanceof
      TypeError
    ) {
      return (
        "The server could not be reached. " +
        "Check the backend URL and try again."
      );
    }

    return getErrorMessage(
      error,
      fallbackMessage
    );
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
  // CATEGORY NORMALIZATION
  // ==========================================================

  function normalizeCategory(
    category
  ) {
    var source =
      category &&
      typeof category ===
        "object"
        ? category
        : {};

    var displayOrder =
      source.sortOrder;

    if (
      displayOrder ===
      undefined
    ) {
      displayOrder =
        source.displayOrder;
    }

    if (
      displayOrder ===
      undefined
    ) {
      displayOrder =
        source.display_order;
    }

    displayOrder =
      Number(
        displayOrder
      );

    if (
      !Number.isFinite(
        displayOrder
      ) ||
      displayOrder < 0
    ) {
      displayOrder =
        0;
    }

    return {
      id:
        String(
          source.id ||
          source._id ||
          ""
        ),

      name:
        String(
          source.name ||
          ""
        ),

      slug:
        String(
          source.slug ||
          ""
        ),

      description:
        String(
          source.description ||
          ""
        ),

      image:
        String(
          source.image ||
          ""
        ),

      imagePublicId:
        String(
          source.imagePublicId ||
          source.image_public_id ||
          ""
        ),

      color:
        normalizeColor(
          source.color
        ),

      active:
        source.active !==
        false,

      featured:
        source.featured ===
        true,

      displayOrder:
        Math.floor(
          displayOrder
        ),

      createdAt:
        source.createdAt ||
        source.created_at ||
        null,

      updatedAt:
        source.updatedAt ||
        source.updated_at ||
        null
    };
  }

  function normalizeColor(
    value
  ) {
    var color =
      String(
        value ||
        "#ff1493"
      ).trim();

    if (
      /^#[0-9a-fA-F]{6}$/.test(
        color
      )
    ) {
      return color;
    }

    return "#ff1493";
  }

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

  // ==========================================================
  // PRODUCT LIST
  // ==========================================================

  function getProductList(
    responseData
  ) {
    if (
      Array.isArray(
        responseData
      )
    ) {
      return responseData;
    }

    if (
      responseData &&
      Array.isArray(
        responseData.products
      )
    ) {
      return responseData.products;
    }

    if (
      responseData &&
      responseData.data &&
      Array.isArray(
        responseData.data.products
      )
    ) {
      return responseData.data.products;
    }

    return [];
  }

  async function loadProducts() {
    try {
      var responseData =
        await requestJson(
          ADMIN_PRODUCTS_URL,
          {
            method:
              "GET",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      availableProducts =
        getProductList(
          responseData
        );
    } catch (error) {
      console.error(
        "Products could not be loaded.",
        error
      );

      availableProducts =
        [];
    }
  }

  function countProductsInCategory(
    category
  ) {
    if (!category) {
      return 0;
    }

    var categoryId =
      String(
        category.id ||
        ""
      );

    var categoryName =
      String(
        category.name ||
        ""
      )
        .trim()
        .toLowerCase();

    var categorySlug =
      String(
        category.slug ||
        ""
      )
        .trim()
        .toLowerCase();

    return availableProducts.filter(
      function (product) {
        var productCategoryId =
          String(
            product.categoryId ||
            product.category_id ||
            ""
          );

        var productCategoryName =
          String(
            product.category ||
            product.categoryName ||
            ""
          )
            .trim()
            .toLowerCase();

        var productCategorySlug =
          String(
            product.categorySlug ||
            product.category_slug ||
            ""
          )
            .trim()
            .toLowerCase();

        return (
          (
            categoryId &&
            productCategoryId ===
              categoryId
          ) ||
          (
            categoryName &&
            productCategoryName ===
              categoryName
          ) ||
          (
            categorySlug &&
            productCategorySlug ===
              categorySlug
          )
        );
      }
    ).length;
  }

  // ==========================================================
  // SELECTED CATEGORY
  // ==========================================================

  function getSelectedCategoryId() {
    var categorySelect =
      getElement(
        "category-to-edit"
      );

    if (!categorySelect) {
      return "";
    }

    return categorySelect.value;
  }

  function findSelectedCategory() {
    var selectedCategoryId =
      getSelectedCategoryId();

    return (
      availableCategories.find(
        function (category) {
          return (
            category.id ===
            selectedCategoryId
          );
        }
      ) ||
      null
    );
  }

  // ==========================================================
  // CATEGORY DROPDOWN
  // ==========================================================

  function populateCategorySelect(
    categoryIdToReselect
  ) {
    var categorySelect =
      getElement(
        "category-to-edit"
      );

    if (!categorySelect) {
      return;
    }

    categorySelect.replaceChildren();

    var defaultOption =
      document.createElement(
        "option"
      );

    defaultOption.value =
      "";

    defaultOption.textContent =
      availableCategories.length > 0
        ? "Select a category to edit"
        : "No categories available";

    categorySelect.appendChild(
      defaultOption
    );

    availableCategories.forEach(
      function (category) {
        var option =
          document.createElement(
            "option"
          );

        option.value =
          category.id;

        option.textContent =
          category.active
            ? category.name
            : (
                category.name +
                " (Inactive)"
              );

        categorySelect.appendChild(
          option
        );
      }
    );

    categorySelect.disabled =
      availableCategories.length ===
      0;

    if (
      categoryIdToReselect &&
      availableCategories.some(
        function (category) {
          return (
            category.id ===
            categoryIdToReselect
          );
        }
      )
    ) {
      categorySelect.value =
        categoryIdToReselect;
    }
  }

  // ==========================================================
  // LOAD CATEGORIES
  // ==========================================================

  async function loadCategories(
    categoryIdToReselect
  ) {
    var categorySelect =
      getElement(
        "category-to-edit"
      );

    var refreshButton =
      getElement(
        "refresh-categories-button"
      );

    if (!categorySelect) {
      showCategoryMessage(
        "The category dropdown could not be found.",
        "error"
      );

      return false;
    }

    categorySelect.disabled =
      true;

    categorySelect.replaceChildren();

    var loadingOption =
      document.createElement(
        "option"
      );

    loadingOption.value =
      "";

    loadingOption.textContent =
      "Loading categories...";

    categorySelect.appendChild(
      loadingOption
    );

    if (refreshButton) {
      refreshButton.disabled =
        true;

      refreshButton.textContent =
        "Loading Categories...";
    }

    hideEditForm();

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

      var categoryList =
        Array.isArray(
          responseData
        )
          ? responseData
          : (
              Array.isArray(
                responseData.categories
              )
                ? responseData.categories
                : []
            );

      availableCategories =
        categoryList
          .map(
            normalizeCategory
          )
          .filter(
            function (category) {
              return Boolean(
                category.id
              );
            }
          )
          .sort(
            function (
              firstCategory,
              secondCategory
            ) {
              if (
                firstCategory.displayOrder !==
                secondCategory.displayOrder
              ) {
                return (
                  firstCategory.displayOrder -
                  secondCategory.displayOrder
                );
              }

              return firstCategory.name
                .localeCompare(
                  secondCategory.name
                );
            }
          );

      populateCategorySelect(
        categoryIdToReselect ||
        ""
      );

      if (
        categoryIdToReselect
      ) {
        selectedCategory =
          findSelectedCategory();

        if (selectedCategory) {
          displaySelectedCategory();
        }
      }

      if (
        availableCategories.length ===
        0
      ) {
        showCategoryMessage(
          "No categories have been created yet.",
          "information"
        );
      } else if (
        !categoryIdToReselect
      ) {
        showCategoryMessage(
          "Select the category you want to edit.",
          "information"
        );
      }

      return true;
    } catch (error) {
      console.error(
        "Categories could not be loaded.",
        error
      );

      availableCategories =
        [];

      populateCategorySelect(
        ""
      );

      showCategoryMessage(
        getRequestErrorMessage(
          error,
          "The categories could not be loaded."
        ),
        "error"
      );

      return false;
    } finally {
      if (refreshButton) {
        refreshButton.disabled =
          false;

        refreshButton.textContent =
          "Refresh Categories";
      }
    }
  }

  // ==========================================================
  // DESCRIPTION CHARACTER COUNT
  // ==========================================================

  function updateDescriptionCount() {
    var descriptionInput =
      getElement(
        "edit-category-description"
      );

    var counter =
      getElement(
        "edit-category-description-count"
      );

    if (
      !descriptionInput ||
      !counter
    ) {
      return;
    }

    counter.textContent =
      descriptionInput.value.length +
      " of 1,000 characters";
  }

  // ==========================================================
  // CATEGORY IMAGE PREVIEW
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

  function hideImagePreview() {
    var previewContainer =
      getElement(
        "category-image-preview-container"
      );

    var previewImage =
      getElement(
        "category-image-preview"
      );

    if (previewContainer) {
      previewContainer.hidden =
        true;
    }

    if (previewImage) {
      previewImage.removeAttribute(
        "src"
      );
    }
  }

  function updateImagePreview(
    suppliedImageUrl
  ) {
    var previewContainer =
      getElement(
        "category-image-preview-container"
      );

    var previewImage =
      getElement(
        "category-image-preview"
      );

    var imageUrl =
      String(
        suppliedImageUrl !==
          undefined
          ? suppliedImageUrl
          : getValue(
              "edit-category-image"
            )
      ).trim();

    if (
      !previewContainer ||
      !previewImage ||
      !imageUrl ||
      !isValidWebAddress(
        imageUrl
      )
    ) {
      hideImagePreview();

      return;
    }

    previewImage.onload =
      function () {
        previewContainer.hidden =
          false;
      };

    previewImage.onerror =
      function () {
        hideImagePreview();

        showCategoryMessage(
          "The category image preview could not be loaded.",
          "error"
        );
      };

    previewImage.alt =
      "Category image preview";

    previewImage.src =
      imageUrl;
  }

  // ==========================================================
  // DISPLAY CATEGORY
  // ==========================================================

  function displaySelectedCategory() {
    selectedCategory =
      findSelectedCategory();

    if (!selectedCategory) {
      hideEditForm();

      showCategoryMessage(
        "Select the category you want to edit.",
        "information"
      );

      return;
    }

    slugWasManuallyEdited =
      false;

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

    setInputValue(
      "edit-category-color",
      selectedCategory.color
    );

    var activeCheckbox =
      getElement(
        "edit-category-active"
      );

    var featuredCheckbox =
      getElement(
        "edit-category-featured"
      );

    if (activeCheckbox) {
      activeCheckbox.checked =
        selectedCategory.active;
    }

    if (featuredCheckbox) {
      featuredCheckbox.checked =
        selectedCategory.featured;
    }

    var editForm =
      getElement(
        "edit-category-form"
      );

    if (editForm) {
      editForm.hidden =
        false;
    }

    updateDescriptionCount();

    updateImagePreview(
      selectedCategory.image
    );

    showCategoryMessage(
      (
        'Editing the category "' +
        selectedCategory.name +
        '".'
      ),
      "information"
    );
  }

  function hideEditForm() {
    selectedCategory =
      null;

    slugWasManuallyEdited =
      false;

    var editForm =
      getElement(
        "edit-category-form"
      );

    if (editForm) {
      editForm.hidden =
        true;

      editForm.reset();
    }

    setInputValue(
      "edit-category-id",
      ""
    );

    setInputValue(
      "edit-category-product-count",
      "0"
    );

    setInputValue(
      "edit-category-color",
      "#ff1493"
    );

    hideImagePreview();
    updateDescriptionCount();
    setUpdateButtonLoading(false);
  }

  // ==========================================================
  // AUTOMATIC CATEGORY TAG
  // ==========================================================

  function updateSlugFromName() {
    var nameInput =
      getElement(
        "edit-category-name"
      );

    var slugInput =
      getElement(
        "edit-category-slug"
      );

    if (
      !nameInput ||
      !slugInput
    ) {
      return;
    }

    if (
      !slugWasManuallyEdited ||
      !slugInput.value.trim()
    ) {
      slugInput.value =
        createCategorySlug(
          nameInput.value
        );
    }
  }

  function markSlugAsManuallyEdited() {
    var slugInput =
      getElement(
        "edit-category-slug"
      );

    if (!slugInput) {
      return;
    }

    slugWasManuallyEdited =
      Boolean(
        slugInput.value.trim()
      );
  }

  function cleanSlugInput() {
    var slugInput =
      getElement(
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

  // ==========================================================
  // CATEGORY FORM DATA
  // ==========================================================

  function getCategoryFormData() {
    var activeCheckbox =
      getElement(
        "edit-category-active"
      );

    var featuredCheckbox =
      getElement(
        "edit-category-featured"
      );

    var displayOrder =
      Number(
        getValue(
          "edit-category-display-order"
        ) ||
        0
      );

    return {
      id:
        getValue(
          "edit-category-id"
        ),

      name:
        getValue(
          "edit-category-name"
        ),

      slug:
        createCategorySlug(
          getValue(
            "edit-category-slug"
          )
        ),

      description:
        getValue(
          "edit-category-description"
        ),

      image:
        getValue(
          "edit-category-image"
        ),

      imagePublicId:
        selectedCategory
          ? selectedCategory.imagePublicId
          : "",

      displayOrder:
        displayOrder,

      sortOrder:
        displayOrder,

      color:
        normalizeColor(
          getValue(
            "edit-category-color"
          )
        ),

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
  // CATEGORY VALIDATION
  // ==========================================================

  function categoryNameExists(
    categoryData
  ) {
    var normalizedName =
      categoryData.name
        .trim()
        .toLowerCase();

    return availableCategories.some(
      function (category) {
        return (
          category.id !==
            categoryData.id &&
          category.name
            .trim()
            .toLowerCase() ===
            normalizedName
        );
      }
    );
  }

  function categorySlugExists(
    categoryData
  ) {
    var normalizedSlug =
      categoryData.slug
        .trim()
        .toLowerCase();

    return availableCategories.some(
      function (category) {
        return (
          category.id !==
            categoryData.id &&
          category.slug
            .trim()
            .toLowerCase() ===
            normalizedSlug
        );
      }
    );
  }

  function validateCategoryData(
    categoryData
  ) {
    if (!categoryData.id) {
      return "Select a category before saving changes.";
    }

    if (
      categoryData.name.length <
        2 ||
      categoryData.name.length >
        100
    ) {
      return "Category name must contain 2 to 100 characters.";
    }

    if (
      categoryData.slug.length <
        2 ||
      categoryData.slug.length >
        100
    ) {
      return "Category tag must contain 2 to 100 characters.";
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        categoryData.slug
      )
    ) {
      return (
        "Category tag may contain lowercase letters, " +
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
        categoryData.displayOrder
      ) ||
      categoryData.displayOrder <
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
        categoryData
      )
    ) {
      return "Another category already uses that name.";
    }

    if (
      categorySlugExists(
        categoryData
      )
    ) {
      return "Another category already uses that tag.";
    }

    return "";
  }

  // ==========================================================
  // UPDATE BUTTON
  // ==========================================================

  function setUpdateButtonLoading(
    isLoading
  ) {
    var updateButton =
      getElement(
        "update-category-button"
      );

    if (!updateButton) {
      return;
    }

    updateButton.disabled =
      Boolean(
        isLoading
      );

    updateButton.setAttribute(
      "aria-busy",
      isLoading
        ? "true"
        : "false"
    );

    updateButton.textContent =
      isLoading
        ? "Saving Changes..."
        : "Save Category Changes";
  }

  // ==========================================================
  // SAVE CATEGORY CHANGES
  // ==========================================================

  async function saveCategoryChanges(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    if (updateInProgress) {
      return;
    }

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

    updateInProgress =
      true;

    setUpdateButtonLoading(
      true
    );

    showCategoryMessage(
      "Saving category changes...",
      "information"
    );

    try {
      var responseData =
        await requestJson(
          CATEGORIES_URL +
          "/" +
          encodeURIComponent(
            categoryData.id
          ),
          {
            method:
              "PUT",

            headers:
              getAdminHeaders(
                true
              ),

            body:
              JSON.stringify({
                name:
                  categoryData.name,

                slug:
                  categoryData.slug,

                description:
                  categoryData.description,

                image:
                  categoryData.image,

                imagePublicId:
                  categoryData.imagePublicId,

                displayOrder:
                  categoryData.displayOrder,

                sortOrder:
                  categoryData.sortOrder,

                color:
                  categoryData.color,

                active:
                  categoryData.active,

                featured:
                  categoryData.featured
              })
          }
        );

      var updatedCategory =
        normalizeCategory(
          responseData.category ||
          responseData
        );

      var categoryId =
        updatedCategory.id ||
        categoryData.id;

      await loadProducts();

      await loadCategories(
        categoryId
      );

      showCategoryMessage(
        getErrorMessage(
          responseData.message,
          (
            'The category "' +
            categoryData.name +
            '" was updated successfully.'
          )
        ),
        "success"
      );
    } catch (error) {
      console.error(
        "Category update failed.",
        error
      );

      showCategoryMessage(
        getRequestErrorMessage(
          error,
          "The category could not be updated."
        ),
        "error"
      );
    } finally {
      updateInProgress =
        false;

      setUpdateButtonLoading(
        false
      );
    }
  }

  // ==========================================================
  // RESET FORM TO SAVED VALUES
  // ==========================================================

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
    connectLogoutButtons();

    var validSession =
      await verifyAdminSession();

    if (!validSession) {
      return;
    }

    var categorySelect =
      getElement(
        "category-to-edit"
      );

    var editForm =
      getElement(
        "edit-category-form"
      );

    var nameInput =
      getElement(
        "edit-category-name"
      );

    var slugInput =
      getElement(
        "edit-category-slug"
      );

    var imageInput =
      getElement(
        "edit-category-image"
      );

    var descriptionInput =
      getElement(
        "edit-category-description"
      );

    var refreshButton =
      getElement(
        "refresh-categories-button"
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
        function () {
          updateImagePreview();
        }
      );

      imageInput.addEventListener(
        "blur",
        function () {
          updateImagePreview();
        }
      );
    }

    if (descriptionInput) {
      descriptionInput.addEventListener(
        "input",
        updateDescriptionCount
      );
    }

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        async function () {
          showCategoryMessage(
            "Refreshing categories...",
            "information"
          );

          await Promise.all([
            loadProducts(),
            loadCategories("")
          ]);
        }
      );
    }

    updateDescriptionCount();
    hideImagePreview();

    showCategoryMessage(
      "Loading categories...",
      "information"
    );

    await loadProducts();
    await loadCategories("");

    console.log(
      "MMC Edit Category page initialized."
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

  window.saveCategoryChanges =
    saveCategoryChanges;

  window.loadCategories =
    loadCategories;

  window.resetCategoryForm =
    resetCategoryForm;

  window.logoutAdmin =
    logoutAdmin;
}());