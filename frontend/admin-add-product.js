// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-add-product.js
// ADD PRODUCT ADMIN PAGE
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// Uploads: Multer and Cloudinary
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var MAX_IMAGE_SIZE =
    10 * 1024 * 1024;

  var ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  var REQUEST_TIMEOUT_MS =
    15000;

  var productVariants =
    [];

  var uploadedImagePublicId =
    "";

  var localPreviewUrl =
    null;

  var savingProduct =
    false;

  var uploadingImage =
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

  var PRODUCTS_URL =
    BACKEND_URL +
    "/products";

  var UPLOAD_URL =
    BACKEND_URL +
    "/upload/image";

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

    var returnPage =
      encodeURIComponent(
        "admin-add-product.html"
      );

    window.location.replace(
      "admin-login.html?return=" +
      returnPage
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
  // MESSAGE DISPLAY
  // ==========================================================

  function showProductMessage(
    message,
    messageType
  ) {
    var messageElement =
      getElement(
        "product-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      String(message || "");

    messageElement.classList.remove(
      "product-error",
      "product-success",
      "product-information"
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
        "product-success"
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
        "product-information"
      );

      messageElement.setAttribute(
        "role",
        "status"
      );
    } else {
      messageElement.classList.add(
        "product-error"
      );

      messageElement.setAttribute(
        "role",
        "alert"
      );
    }
  }

  // ==========================================================
  // BUTTON STATES
  // ==========================================================

  function setButtonLoading(
    elementId,
    isLoading,
    loadingText,
    normalText
  ) {
    var button =
      getElement(
        elementId
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
        ? loadingText
        : normalText;
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

      var errorMessage =
        error &&
        error.name ===
          "AbortError"
          ? "The session check took too long. Please reload the page."
          : getErrorMessage(
              error,
              "Your administrator session could not be verified."
            );

      showProductMessage(
        errorMessage,
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // CATEGORY LOADING
  // ==========================================================

  async function loadProductCategories() {
    var categorySelect =
      getElement(
        "p-category"
      );

    if (!categorySelect) {
      return;
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

      var categories =
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

      categories =
        categories
          .filter(
            function (category) {
              return (
                category &&
                category.active !==
                  false
              );
            }
          )
          .sort(
            function (
              firstCategory,
              secondCategory
            ) {
              var firstOrder =
                Number(
                  firstCategory.sortOrder !==
                    undefined
                    ? firstCategory.sortOrder
                    : (
                        firstCategory.displayOrder !==
                          undefined
                          ? firstCategory.displayOrder
                          : (
                              firstCategory.display_order ||
                              0
                            )
                      )
                );

              var secondOrder =
                Number(
                  secondCategory.sortOrder !==
                    undefined
                    ? secondCategory.sortOrder
                    : (
                        secondCategory.displayOrder !==
                          undefined
                          ? secondCategory.displayOrder
                          : (
                              secondCategory.display_order ||
                              0
                            )
                      )
                );

              if (
                firstOrder !==
                secondOrder
              ) {
                return (
                  firstOrder -
                  secondOrder
                );
              }

              return String(
                firstCategory.name ||
                ""
              ).localeCompare(
                String(
                  secondCategory.name ||
                  ""
                )
              );
            }
          );

      categorySelect.replaceChildren();

      var defaultOption =
        document.createElement(
          "option"
        );

      defaultOption.value =
        "";

      defaultOption.textContent =
        categories.length > 0
          ? "Select a category"
          : "No categories available";

      categorySelect.appendChild(
        defaultOption
      );

      categories.forEach(
        function (category) {
          var option =
            document.createElement(
              "option"
            );

          option.value =
            String(
              category.name ||
              ""
            );

          option.textContent =
            String(
              category.name ||
              ""
            );

          option.dataset.categoryId =
            String(
              category.id ||
              category._id ||
              ""
            );

          option.dataset.categorySlug =
            String(
              category.slug ||
              ""
            );

          categorySelect.appendChild(
            option
          );
        }
      );

      categorySelect.disabled =
        categories.length ===
        0;

      if (
        categories.length ===
        0
      ) {
        showProductMessage(
          "No active categories exist yet. Create a category before assigning one.",
          "information"
        );
      }
    } catch (error) {
      console.error(
        "Product categories could not be loaded.",
        error
      );

      categorySelect.replaceChildren();

      var errorOption =
        document.createElement(
          "option"
        );

      errorOption.value =
        "";

      errorOption.textContent =
        "Categories unavailable";

      categorySelect.appendChild(
        errorOption
      );

      categorySelect.disabled =
        true;

      showProductMessage(
        getErrorMessage(
          error,
          "Product categories could not be loaded."
        ),
        "error"
      );
    }
  }

  // ==========================================================
  // GENERAL VALIDATION HELPERS
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

  function formatProductCurrency(
    value
  ) {
    var amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
      amount =
        0;
    }

    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          "USD"
      }
    ).format(
      amount
    );
  }

  // ==========================================================
  // VARIANT DATA
  // ==========================================================

  function getVariantFormData() {
    return {
      id:
        "variant-" +
        Date.now() +
        "-" +
        productVariants.length,

      name:
        getValue(
          "v-name"
        ),

      sku:
        getValue(
          "v-sku"
        ),

      price:
        Number(
          getValue(
            "v-price"
          )
        ),

      stock:
        Number(
          getValue(
            "v-stock"
          )
        ),

      image:
        getValue(
          "v-image"
        ),

      imagePublicId:
        ""
    };
  }

  function validateVariantData(
    variant,
    checkForDuplicateSku
  ) {
    if (!variant.name) {
      return "Variant name is required.";
    }

    if (
      variant.name.length >
      150
    ) {
      return "Variant name cannot exceed 150 characters.";
    }

    if (!variant.sku) {
      return "Variant SKU is required.";
    }

    if (
      variant.sku.length >
      100
    ) {
      return "Variant SKU cannot exceed 100 characters.";
    }

    if (
      !Number.isFinite(
        variant.price
      ) ||
      variant.price < 0
    ) {
      return "Variant price must be 0 or higher.";
    }

    if (
      !Number.isInteger(
        variant.stock
      ) ||
      variant.stock < 0
    ) {
      return "Variant stock must be a whole number of 0 or higher.";
    }

    if (
      variant.image &&
      !isValidWebAddress(
        variant.image
      )
    ) {
      return "Variant image must be a valid HTTP or HTTPS address.";
    }

    if (checkForDuplicateSku) {
      var duplicateSku =
        productVariants.some(
          function (existingVariant) {
            return (
              String(
                existingVariant.sku ||
                ""
              )
                .trim()
                .toLowerCase() ===
              variant.sku
                .trim()
                .toLowerCase()
            );
          }
        );

      if (duplicateSku) {
        return "A variant with that SKU already exists.";
      }
    }

    return "";
  }

  // ==========================================================
  // ADD VARIANT
  // ==========================================================

  function addVariant() {
    showProductMessage(
      "",
      "information"
    );

    var variant =
      getVariantFormData();

    var validationError =
      validateVariantData(
        variant,
        true
      );

    if (validationError) {
      showProductMessage(
        validationError,
        "error"
      );

      return;
    }

    productVariants.push(
      variant
    );

    clearVariantInputs();
    renderVariants();

    showProductMessage(
      "Variant added. Save the product to store it.",
      "information"
    );
  }

  function clearVariantInputs() {
    [
      "v-name",
      "v-sku",
      "v-price",
      "v-stock",
      "v-image"
    ].forEach(
      function (elementId) {
        var element =
          getElement(
            elementId
          );

        if (element) {
          element.value =
            "";
        }
      }
    );
  }

  // ==========================================================
  // RENDER VARIANTS
  // ==========================================================

  function renderVariants() {
    var variantList =
      getElement(
        "variantList"
      );

    if (!variantList) {
      return;
    }

    variantList.replaceChildren();

    productVariants.forEach(
      function (
        variant,
        variantIndex
      ) {
        var container =
          document.createElement(
            "article"
          );

        container.className =
          "variant-item";

        var information =
          document.createElement(
            "div"
          );

        var title =
          document.createElement(
            "h4"
          );

        title.textContent =
          variant.name;

        information.appendChild(
          title
        );

        var skuLine =
          document.createElement(
            "p"
          );

        skuLine.textContent =
          "SKU: " +
          variant.sku;

        information.appendChild(
          skuLine
        );

        var priceLine =
          document.createElement(
            "p"
          );

        priceLine.textContent =
          "Price: " +
          formatProductCurrency(
            variant.price
          );

        information.appendChild(
          priceLine
        );

        var stockLine =
          document.createElement(
            "p"
          );

        stockLine.textContent =
          "Stock: " +
          variant.stock;

        information.appendChild(
          stockLine
        );

        if (variant.image) {
          var imageLine =
            document.createElement(
              "p"
            );

          imageLine.textContent =
            "Custom variant image added";

          information.appendChild(
            imageLine
          );
        }

        var removeButton =
          document.createElement(
            "button"
          );

        removeButton.type =
          "button";

        removeButton.className =
          "remove-variant-button";

        removeButton.textContent =
          "Remove Variant";

        removeButton.addEventListener(
          "click",
          function () {
            deleteVariant(
              variantIndex
            );
          }
        );

        container.appendChild(
          information
        );

        container.appendChild(
          removeButton
        );

        variantList.appendChild(
          container
        );
      }
    );
  }

  function deleteVariant(
    variantIndex
  ) {
    var variant =
      productVariants[
        variantIndex
      ];

    if (!variant) {
      return;
    }

    var confirmed =
      window.confirm(
        'Remove the variant "' +
        variant.name +
        '"?'
      );

    if (!confirmed) {
      return;
    }

    productVariants.splice(
      variantIndex,
      1
    );

    renderVariants();

    showProductMessage(
      "Variant removed.",
      "information"
    );
  }

  // ==========================================================
  // SELECTED IMAGE
  // ==========================================================

  function getSelectedProductImage() {
    var fileInput =
      getElement(
        "p-image-file"
      );

    if (
      !fileInput ||
      !fileInput.files ||
      fileInput.files.length ===
        0
    ) {
      return null;
    }

    return fileInput.files[0];
  }

  function validateProductImage(
    imageFile
  ) {
    if (!imageFile) {
      return "Select an image before uploading.";
    }

    if (
      ALLOWED_IMAGE_TYPES.indexOf(
        imageFile.type
      ) ===
      -1
    ) {
      return "Please upload a JPG, PNG, WEBP, or GIF image.";
    }

    if (
      imageFile.size >
      MAX_IMAGE_SIZE
    ) {
      return "The product image must be 10 MB or smaller.";
    }

    return "";
  }

  // ==========================================================
  // IMAGE PREVIEW
  // ==========================================================

  function revokeLocalPreviewUrl() {
    if (!localPreviewUrl) {
      return;
    }

    URL.revokeObjectURL(
      localPreviewUrl
    );

    localPreviewUrl =
      null;
  }

  function showProductImagePreview(
    imageUrl
  ) {
    var previewContainer =
      getElement(
        "product-preview-container"
      );

    var previewImage =
      getElement(
        "p-preview"
      );

    if (
      !previewContainer ||
      !previewImage
    ) {
      return;
    }

    if (!imageUrl) {
      previewContainer.hidden =
        true;

      previewImage.removeAttribute(
        "src"
      );

      return;
    }

    previewImage.onerror =
      function () {
        previewContainer.hidden =
          true;

        previewImage.removeAttribute(
          "src"
        );

        showProductMessage(
          "The product image preview could not be loaded.",
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

  function previewSelectedProductImage() {
    var imageFile =
      getSelectedProductImage();

    revokeLocalPreviewUrl();

    if (!imageFile) {
      return;
    }

    var validationError =
      validateProductImage(
        imageFile
      );

    if (validationError) {
      var fileInput =
        getElement(
          "p-image-file"
        );

      if (fileInput) {
        fileInput.value =
          "";
      }

      showProductMessage(
        validationError,
        "error"
      );

      return;
    }

    localPreviewUrl =
      URL.createObjectURL(
        imageFile
      );

    showProductImagePreview(
      localPreviewUrl
    );
  }

  function previewManualImageUrl() {
    var imageUrl =
      getValue(
        "p-image"
      );

    if (!imageUrl) {
      showProductImagePreview(
        ""
      );

      return;
    }

    if (
      isValidWebAddress(
        imageUrl
      )
    ) {
      showProductImagePreview(
        imageUrl
      );
    }
  }

  // ==========================================================
  // CLOUDINARY IMAGE UPLOAD
  // ==========================================================

  async function uploadProductImage() {
    if (uploadingImage) {
      return;
    }

    var imageFile =
      getSelectedProductImage();

    var validationError =
      validateProductImage(
        imageFile
      );

    if (validationError) {
      showProductMessage(
        validationError,
        "error"
      );

      return;
    }

    var formData =
      new FormData();

    formData.append(
      "image",
      imageFile
    );

    uploadingImage =
      true;

    setButtonLoading(
      "upload-product-image-button",
      true,
      "Uploading Image...",
      "Upload Image"
    );

    showProductMessage(
      "Uploading product image...",
      "information"
    );

    try {
      var responseData =
        await requestJson(
          UPLOAD_URL,
          {
            method:
              "POST",

            headers:
              getAdminHeaders(
                false
              ),

            body:
              formData
          }
        );

      var imageUrl =
        String(
          responseData.url ||
          responseData.secure_url ||
          (
            responseData.image &&
            responseData.image.url
          ) ||
          ""
        );

      if (!imageUrl) {
        throw new Error(
          "Cloudinary did not provide an image address."
        );
      }

      var imageUrlInput =
        getElement(
          "p-image"
        );

      if (imageUrlInput) {
        imageUrlInput.value =
          imageUrl;
      }

      uploadedImagePublicId =
        String(
          responseData.public_id ||
          responseData.publicId ||
          (
            responseData.image &&
            responseData.image.public_id
          ) ||
          ""
        );

      revokeLocalPreviewUrl();

      showProductImagePreview(
        imageUrl
      );

      showProductMessage(
        "Product image uploaded successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Product image upload failed.",
        error
      );

      var errorMessage =
        error &&
        error.name ===
          "AbortError"
          ? "The image upload took too long. Please try again."
          : getErrorMessage(
              error,
              "The product image could not be uploaded."
            );

      showProductMessage(
        errorMessage,
        "error"
      );
    } finally {
      uploadingImage =
        false;

      setButtonLoading(
        "upload-product-image-button",
        false,
        "Uploading Image...",
        "Upload Image"
      );
    }
  }

  // ==========================================================
  // SELECTED CATEGORY
  // ==========================================================

  function getSelectedCategoryData() {
    var categorySelect =
      getElement(
        "p-category"
      );

    if (
      !categorySelect ||
      categorySelect.selectedIndex <
        0
    ) {
      return {
        category:
          "General",

        categoryId:
          null,

        categorySlug:
          ""
      };
    }

    var selectedOption =
      categorySelect.options[
        categorySelect.selectedIndex
      ];

    if (
      !selectedOption ||
      !selectedOption.value
    ) {
      return {
        category:
          "General",

        categoryId:
          null,

        categorySlug:
          ""
      };
    }

    return {
      category:
        selectedOption.value,

      categoryId:
        selectedOption.dataset
          .categoryId ||
        null,

      categorySlug:
        selectedOption.dataset
          .categorySlug ||
        ""
    };
  }

  // ==========================================================
  // PRODUCT DATA
  // ==========================================================

  function getProductFormData() {
    var categoryData =
      getSelectedCategoryData();

    var activeCheckbox =
      getElement(
        "p-active"
      );

    return {
      name:
        getValue(
          "p-name"
        ),

      sku:
        getValue(
          "p-sku"
        ),

      price:
        Number(
          getValue(
            "p-price"
          )
        ),

      stock:
        Number(
          getValue(
            "p-stock"
          ) ||
          0
        ),

      lowStockWarning:
        Number(
          getValue(
            "p-low-stock-warning"
          ) ||
          5
        ),

      category:
        categoryData.category,

      categoryId:
        categoryData.categoryId,

      categorySlug:
        categoryData.categorySlug,

      description:
        getValue(
          "p-description"
        ),

      image:
        getValue(
          "p-image"
        ),

      imagePublicId:
        uploadedImagePublicId,

      variants:
        productVariants.map(
          function (variant) {
            return Object.assign(
              {},
              variant
            );
          }
        ),

      active:
        activeCheckbox
          ? activeCheckbox.checked
          : true
    };
  }

  // ==========================================================
  // PRODUCT VALIDATION
  // ==========================================================

  function validateProductData(
    product
  ) {
    if (
      product.name.length <
        2 ||
      product.name.length >
        200
    ) {
      return "Product name must contain 2 to 200 characters.";
    }

    if (
      product.sku.length <
        2 ||
      product.sku.length >
        100
    ) {
      return "Product SKU must contain 2 to 100 characters.";
    }

    if (
      !Number.isFinite(
        product.price
      ) ||
      product.price < 0
    ) {
      return "Product price must be 0 or higher.";
    }

    if (
      !Number.isInteger(
        product.stock
      ) ||
      product.stock < 0
    ) {
      return "Product stock must be a whole number of 0 or higher.";
    }

    if (
      !Number.isInteger(
        product.lowStockWarning
      ) ||
      product.lowStockWarning <
        0
    ) {
      return "Low stock warning must be a whole number of 0 or higher.";
    }

    if (
      product.description.length >
      5000
    ) {
      return "Product description cannot exceed 5,000 characters.";
    }

    if (
      !product.image ||
      !isValidWebAddress(
        product.image
      )
    ) {
      return "Enter or upload a valid product image URL before saving.";
    }

    var variantSkuSet =
      {};

    for (
      var index = 0;
      index <
      product.variants.length;
      index += 1
    ) {
      var variant =
        product.variants[
          index
        ];

      var variantError =
        validateVariantData(
          variant,
          false
        );

      if (variantError) {
        return variantError;
      }

      var normalizedSku =
        variant.sku
          .trim()
          .toLowerCase();

      if (
        variantSkuSet[
          normalizedSku
        ]
      ) {
        return "Variant SKUs must be unique.";
      }

      variantSkuSet[
        normalizedSku
      ] =
        true;
    }

    return "";
  }

  // ==========================================================
  // DESCRIPTION CHARACTER COUNT
  // ==========================================================

  function updateDescriptionCount() {
    var descriptionInput =
      getElement(
        "p-description"
      );

    var counter =
      getElement(
        "p-description-count"
      );

    if (
      descriptionInput &&
      counter
    ) {
      counter.textContent =
        descriptionInput.value.length +
        " of 5,000 characters";
    }
  }

  // ==========================================================
  // RESET PRODUCT FORM
  // ==========================================================

  function resetProductForm() {
    var productForm =
      getElement(
        "add-product-form"
      );

    if (productForm) {
      productForm.reset();
    }

    var stockInput =
      getElement(
        "p-stock"
      );

    var lowStockInput =
      getElement(
        "p-low-stock-warning"
      );

    var activeCheckbox =
      getElement(
        "p-active"
      );

    if (stockInput) {
      stockInput.value =
        "0";
    }

    if (lowStockInput) {
      lowStockInput.value =
        "5";
    }

    if (activeCheckbox) {
      activeCheckbox.checked =
        true;
    }

    productVariants =
      [];

    uploadedImagePublicId =
      "";

    revokeLocalPreviewUrl();

    showProductImagePreview(
      ""
    );

    renderVariants();
    updateDescriptionCount();
  }

  // ==========================================================
  // SAVE PRODUCT
  // ==========================================================

  async function saveProduct(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    if (savingProduct) {
      return;
    }

    var product =
      getProductFormData();

    var validationError =
      validateProductData(
        product
      );

    if (validationError) {
      showProductMessage(
        validationError,
        "error"
      );

      return;
    }

    savingProduct =
      true;

    setButtonLoading(
      "save-product-button",
      true,
      "Saving Product...",
      "Save Product"
    );

    showProductMessage(
      "Saving product...",
      "information"
    );

    try {
      var responseData =
        await requestJson(
          PRODUCTS_URL,
          {
            method:
              "POST",

            headers:
              getAdminHeaders(
                true
              ),

            body:
              JSON.stringify(
                product
              )
          }
        );

      resetProductForm();

      showProductMessage(
        getErrorMessage(
          responseData.message,
          (
            'The product "' +
            product.name +
            '" was created successfully.'
          )
        ),
        "success"
      );

      window.setTimeout(
        function () {
          window.location.href =
            "admin-products.html";
        },
        900
      );
    } catch (error) {
      console.error(
        "Product creation failed.",
        error
      );

      var errorMessage =
        error &&
        error.name ===
          "AbortError"
          ? "The product request took too long. Please try again."
          : error instanceof
              TypeError
            ? (
                "The product server could not be reached. " +
                "Check the backend URL and try again."
              )
            : getErrorMessage(
                error,
                "The product could not be created."
              );

      showProductMessage(
        errorMessage,
        "error"
      );
    } finally {
      savingProduct =
        false;

      setButtonLoading(
        "save-product-button",
        false,
        "Saving Product...",
        "Save Product"
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

    var productForm =
      getElement(
        "add-product-form"
      );

    var addVariantButton =
      getElement(
        "add-variant-button"
      );

    var uploadImageButton =
      getElement(
        "upload-product-image-button"
      );

    var imageFileInput =
      getElement(
        "p-image-file"
      );

    var imageUrlInput =
      getElement(
        "p-image"
      );

    var descriptionInput =
      getElement(
        "p-description"
      );

    if (productForm) {
      productForm.addEventListener(
        "submit",
        saveProduct
      );
    }

    if (addVariantButton) {
      addVariantButton.addEventListener(
        "click",
        addVariant
      );
    }

    if (uploadImageButton) {
      uploadImageButton.addEventListener(
        "click",
        uploadProductImage
      );
    }

    if (imageFileInput) {
      imageFileInput.addEventListener(
        "change",
        previewSelectedProductImage
      );
    }

    if (imageUrlInput) {
      imageUrlInput.addEventListener(
        "input",
        previewManualImageUrl
      );

      imageUrlInput.addEventListener(
        "blur",
        previewManualImageUrl
      );
    }

    if (descriptionInput) {
      descriptionInput.addEventListener(
        "input",
        updateDescriptionCount
      );
    }

    connectLogoutButtons();
    renderVariants();
    updateDescriptionCount();

    await loadProductCategories();

    console.log(
      "MMC Add Product page initialized."
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

  window.addEventListener(
    "beforeunload",
    revokeLocalPreviewUrl
  );

  // ==========================================================
  // GLOBAL SUPPORT
  // ==========================================================

  window.addVariant =
    addVariant;

  window.deleteVariant =
    deleteVariant;

  window.renderVariants =
    renderVariants;

  window.uploadProductImage =
    uploadProductImage;

  window.saveProduct =
    saveProduct;

  window.resetProductForm =
    resetProductForm;

  window.logoutAdmin =
    logoutAdmin;
}());