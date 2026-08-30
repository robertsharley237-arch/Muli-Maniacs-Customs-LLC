// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-delete-category.js
// DELETE CATEGORY ADMIN PAGE
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

  var deleteInProgress =
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
        "admin-delete-category.html"
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
          "The request failed with status " +
            response.status +
            "."
        )
      );
    }

    return responseData;
  }

  // ==========================================================
  // ADMINISTRATOR INFORMATION
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

      showDeleteCategoryMessage(
        getErrorMessage(
          error,
          "Your administrator session could not be verified."
        ),
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // STATUS MESSAGE
  // ==========================================================

  function showDeleteCategoryMessage(
    message,
    messageType
  ) {
    var messageElement =
      getElement(
        "delete-category-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      String(message || "");

    messageElement.classList.remove(
      "delete-category-error",
      "delete-category-success",
      "delete-category-information"
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
        "delete-category-success"
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
        "delete-category-information"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else {
      messageElement.classList.add(
        "delete-category-error"
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

      active:
        source.active !==
        false,

      displayOrder:
        Number(
          source.sortOrder !==
            undefined
            ? source.sortOrder
            : (
                source.displayOrder !==
                  undefined
                  ? source.displayOrder
                  : (
                      source.display_order ||
                      0
                    )
              )
        )
    };
  }

  function getCategoryId(
    category
  ) {
    return String(
      category &&
      category.id
        ? category.id
        : ""
    );
  }

  function getSelectedCategoryName() {
    if (!selectedCategory) {
      return "";
    }

    return String(
      selectedCategory.name ||
      ""
    ).trim();
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

  // ==========================================================
  // COUNT PRODUCTS IN CATEGORY
  // ==========================================================

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
  // DELETE BUTTON STATE
  // ==========================================================

  function setDeleteButtonState() {
    var deleteButton =
      getElement(
        "delete-category-button"
      );

    var confirmationInput =
      getElement(
        "category-confirmation"
      );

    var productCount =
      countProductsInCategory(
        selectedCategory
      );

    var confirmationMatches =
      Boolean(
        selectedCategory &&
        confirmationInput &&
        confirmationInput.value.trim() ===
          getSelectedCategoryName()
      );

    if (!deleteButton) {
      return;
    }

    deleteButton.disabled =
      deleteInProgress ||
      !selectedCategory ||
      !confirmationMatches ||
      productCount > 0;

    deleteButton.textContent =
      deleteInProgress
        ? "Deleting Category..."
        : "Permanently Delete Category";

    deleteButton.setAttribute(
      "aria-busy",
      deleteInProgress
        ? "true"
        : "false"
    );
  }

  // ==========================================================
  // CATEGORY DETAILS
  // ==========================================================

  function setTextContent(
    elementId,
    value
  ) {
    var element =
      getElement(
        elementId
      );

    if (element) {
      element.textContent =
        String(
          value ===
            undefined ||
          value ===
            null
            ? ""
            : value
        );
    }
  }

  function clearCategoryImage() {
    var image =
      getElement(
        "selected-category-image"
      );

    if (!image) {
      return;
    }

    image.hidden =
      true;

    image.removeAttribute(
      "src"
    );
  }

  function displayCategoryImage(
    category
  ) {
    var image =
      getElement(
        "selected-category-image"
      );

    if (!image) {
      return;
    }

    if (!category.image) {
      clearCategoryImage();

      return;
    }

    image.onerror =
      function () {
        clearCategoryImage();
      };

    image.onload =
      function () {
        image.hidden =
          false;
      };

    image.alt =
      category.name +
      " category";

    image.src =
      category.image;
  }

  function clearCategoryDetails() {
    selectedCategory =
      null;

    var detailsSection =
      getElement(
        "selected-category-details"
      );

    var confirmationInput =
      getElement(
        "category-confirmation"
      );

    if (detailsSection) {
      detailsSection.hidden =
        true;
    }

    if (confirmationInput) {
      confirmationInput.value =
        "";
    }

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
      "selected-category-status",
      ""
    );

    setTextContent(
      "selected-category-product-count",
      "0"
    );

    setTextContent(
      "confirmation-category-name",
      "shown above"
    );

    clearCategoryImage();
    setDeleteButtonState();
  }

  function displayCategoryDetails(
    category
  ) {
    selectedCategory =
      category;

    var detailsSection =
      getElement(
        "selected-category-details"
      );

    var confirmationInput =
      getElement(
        "category-confirmation"
      );

    var productCount =
      countProductsInCategory(
        category
      );

    setTextContent(
      "selected-category-name",
      category.name ||
      "Unnamed category"
    );

    setTextContent(
      "selected-category-slug",
      category.slug ||
      "No category tag"
    );

    setTextContent(
      "selected-category-description",
      category.description ||
      "No description provided."
    );

    setTextContent(
      "selected-category-status",
      category.active
        ? "Active"
        : "Inactive"
    );

    setTextContent(
      "selected-category-product-count",
      productCount
    );

    setTextContent(
      "confirmation-category-name",
      category.name ||
      ""
    );

    displayCategoryImage(
      category
    );

    if (confirmationInput) {
      confirmationInput.value =
        "";

      confirmationInput.focus();
    }

    if (detailsSection) {
      detailsSection.hidden =
        false;
    }

    if (
      productCount > 0
    ) {
      showDeleteCategoryMessage(
        (
          productCount +
          (
            productCount === 1
              ? " product is"
              : " products are"
          ) +
          " assigned to this category. " +
          "Move those products to another category before deleting it."
        ),
        "error"
      );
    } else {
      showDeleteCategoryMessage(
        "Type the exact category name to enable permanent deletion.",
        "information"
      );
    }

    setDeleteButtonState();
  }

  function handleCategorySelection() {
    var categorySelect =
      getElement(
        "category-select"
      );

    var selectedId =
      categorySelect
        ? categorySelect.value
        : "";

    var matchingCategory =
      availableCategories.find(
        function (category) {
          return (
            category.id ===
            selectedId
          );
        }
      );

    if (!matchingCategory) {
      clearCategoryDetails();

      showDeleteCategoryMessage(
        "Select the category you want to delete.",
        "information"
      );

      return;
    }

    displayCategoryDetails(
      matchingCategory
    );
  }

  // ==========================================================
  // CATEGORY SELECT
  // ==========================================================

  function populateCategorySelect() {
    var categorySelect =
      getElement(
        "category-select"
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
        ? "Select a category to delete"
        : "No categories available";

    categorySelect.appendChild(
      defaultOption
    );

    availableCategories
      .slice()
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

          return firstCategory.name.localeCompare(
            secondCategory.name
          );
        }
      )
      .forEach(
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
  }

  // ==========================================================
  // LOAD CATEGORIES
  // ==========================================================

  async function loadCategories() {
    var categorySelect =
      getElement(
        "category-select"
      );

    var refreshButton =
      getElement(
        "refresh-categories-button"
      );

    if (categorySelect) {
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
    }

    if (refreshButton) {
      refreshButton.disabled =
        true;

      refreshButton.textContent =
        "Loading Categories...";
    }

    clearCategoryDetails();

    showDeleteCategoryMessage(
      "Loading categories...",
      "information"
    );

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
          );

      populateCategorySelect();

      showDeleteCategoryMessage(
        availableCategories.length > 0
          ? "Select the category you want to delete."
          : "No categories are available to delete.",
        "information"
      );
    } catch (error) {
      console.error(
        "Categories could not be loaded.",
        error
      );

      availableCategories =
        [];

      populateCategorySelect();

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
            "Categories could not be loaded."
          );
      }

      showDeleteCategoryMessage(
        errorMessage,
        "error"
      );
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
  // DELETE CATEGORY
  // ==========================================================

  async function deleteCategory(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    if (
      deleteInProgress ||
      !selectedCategory
    ) {
      return;
    }

    var confirmationInput =
      getElement(
        "category-confirmation"
      );

    var categoryName =
      getSelectedCategoryName();

    var categoryId =
      getCategoryId(
        selectedCategory
      );

    var productCount =
      countProductsInCategory(
        selectedCategory
      );

    if (
      productCount > 0
    ) {
      showDeleteCategoryMessage(
        (
          "This category still has " +
          productCount +
          " assigned product(s). Move those products before deleting it."
        ),
        "error"
      );

      return;
    }

    if (
      !confirmationInput ||
      confirmationInput.value.trim() !==
        categoryName
    ) {
      showDeleteCategoryMessage(
        "Type the category name exactly before deleting it.",
        "error"
      );

      setDeleteButtonState();

      return;
    }

    var confirmed =
      window.confirm(
        'Permanently delete the category "' +
        categoryName +
        '"?'
      );

    if (!confirmed) {
      return;
    }

    deleteInProgress =
      true;

    setDeleteButtonState();

    showDeleteCategoryMessage(
      "Deleting category...",
      "information"
    );

    try {
      var responseData =
        await requestJson(
          CATEGORIES_URL +
          "/" +
          encodeURIComponent(
            categoryId
          ),
          {
            method:
              "DELETE",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      availableCategories =
        availableCategories.filter(
          function (category) {
            return (
              category.id !==
              categoryId
            );
          }
        );

      populateCategorySelect();
      clearCategoryDetails();

      showDeleteCategoryMessage(
        getErrorMessage(
          responseData.message,
          "The category \"" +
            categoryName +
            "\" was deleted successfully."
        ),
        "success"
      );
    } catch (error) {
      console.error(
        "Category deletion failed.",
        error
      );

      var errorMessage;

      if (
        error &&
        error.name ===
          "AbortError"
      ) {
        errorMessage =
          "The delete request took too long. Please try again.";
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
            "The category could not be deleted."
          );
      }

      showDeleteCategoryMessage(
        errorMessage,
        "error"
      );
    } finally {
      deleteInProgress =
        false;

      setDeleteButtonState();
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
    connectLogoutButtons();

    var validSession =
      await verifyAdminSession();

    if (!validSession) {
      return;
    }

    var deleteForm =
      getElement(
        "delete-category-form"
      );

    var categorySelect =
      getElement(
        "category-select"
      );

    var confirmationInput =
      getElement(
        "category-confirmation"
      );

    var refreshButton =
      getElement(
        "refresh-categories-button"
      );

    if (deleteForm) {
      deleteForm.addEventListener(
        "submit",
        deleteCategory
      );
    }

    if (categorySelect) {
      categorySelect.addEventListener(
        "change",
        handleCategorySelection
      );
    }

    if (confirmationInput) {
      confirmationInput.addEventListener(
        "input",
        setDeleteButtonState
      );
    }

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        async function () {
          await Promise.all([
            loadProducts(),
            loadCategories()
          ]);
        }
      );
    }

    setDeleteButtonState();

    await Promise.all([
      loadProducts(),
      loadCategories()
    ]);

    console.log(
      "MMC Delete Category page initialized."
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

  window.deleteCategory =
    deleteCategory;

  window.deleteSelectedCategory =
    deleteCategory;

  window.loadCategories =
    loadCategories;

  window.logoutAdmin =
    logoutAdmin;
}());