// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADD PRODUCT ADMIN PAGE
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// Uploads: Multer + Cloudinary
// ============================================================

(function () {
  "use strict";

  var ADD_PRODUCT_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var ADD_PRODUCT_API =
    ADD_PRODUCT_BACKEND_URL +
    "/products";

  var ADD_PRODUCT_UPLOAD_API =
    ADD_PRODUCT_BACKEND_URL +
    "/upload/image";

  var ADD_PRODUCT_CATEGORIES_API =
    ADD_PRODUCT_BACKEND_URL +
    "/categories";

  var ADD_PRODUCT_MAX_IMAGE_SIZE =
    10 * 1024 * 1024;

  var ADD_PRODUCT_ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  var productVariants = [];

  var uploadedProductImagePublicId =
    "";

  var localProductPreviewUrl =
    null;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getProductElement(
    elementId
  ) {
    return document.getElementById(
      elementId
    );
  }

  function getProductValue(
    elementId
  ) {
    var element =
      getProductElement(
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
        ADD_PRODUCT_BACKEND_URL +
        "/admin/me",
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readProductResponse(
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

      showProductMessage(
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
      getProductElement(
        "admin-username"
      );

    var roleElement =
      getProductElement(
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
  // RESPONSE HANDLING
  // ==========================================================

  async function readProductResponse(
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
        (
          "The request failed with status " +
          response.status +
          "."
        )
      );
    }

    return data;
  }

  // ==========================================================
  // MESSAGE DISPLAY
  // ==========================================================

  function showProductMessage(
    message,
    messageType
  ) {
    var messageElement =
      getProductElement(
        "product-message"
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
      "product-error",
      "product-success",
      "product-information"
    );

    if (messageType === "error") {
      messageElement.classList.add(
        "product-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageElement.classList.add(
        "product-success"
      );
    } else {
      messageElement.classList.add(
        "product-information"
      );
    }
  }

  function clearProductMessage() {
    var messageElement =
      getProductElement(
        "product-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent = "";

    messageElement.classList.remove(
      "product-error",
      "product-success",
      "product-information"
    );
  }

  // ==========================================================
  // BUTTON STATUS
  // ==========================================================

  function setImageUploadLoading(
    isLoading
  ) {
    var uploadButton =
      getProductElement(
        "upload-product-image-button"
      );

    if (!uploadButton) {
      return;
    }

    uploadButton.disabled =
      isLoading;

    uploadButton.textContent =
      isLoading
        ? "Uploading Image..."
        : "Upload Image";
  }

  function setProductSaveLoading(
    isLoading
  ) {
    var saveButton =
      getProductElement(
        "save-product-button"
      );

    if (!saveButton) {
      return;
    }

    saveButton.disabled =
      isLoading;

    saveButton.textContent =
      isLoading
        ? "Saving Product..."
        : "Save Product";
  }

  // ==========================================================
  // CATEGORY LOADING
  // ==========================================================

  async function loadProductCategories() {
    var categorySelect =
      getProductElement(
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

    loadingOption.value = "";

    loadingOption.textContent =
      "Loading categories...";

    categorySelect.appendChild(
      loadingOption
    );

    try {
      var response = await fetch(
        ADD_PRODUCT_CATEGORIES_API,
        {
          method: "GET"
        }
      );

      var data =
        await readProductResponse(
          response
        );

      var categories;

      if (Array.isArray(data)) {
        categories = data;
      } else if (
        data &&
        Array.isArray(
          data.categories
        )
      ) {
        categories =
          data.categories;
      } else {
        categories = [];
      }

      categories = categories
        .filter(
          function (category) {
            return (
              category &&
              category.active !== false
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
                firstCategory.displayOrder !==
                  undefined
                  ? firstCategory.displayOrder
                  : firstCategory.display_order ||
                    0
              );

            var secondOrder =
              Number(
                secondCategory.displayOrder !==
                  undefined
                  ? secondCategory.displayOrder
                  : secondCategory.display_order ||
                    0
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
              firstCategory.name || ""
            ).localeCompare(
              String(
                secondCategory.name || ""
              )
            );
          }
        );

      categorySelect.replaceChildren();

      var defaultOption =
        document.createElement(
          "option"
        );

      defaultOption.value = "";

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
              category.name || ""
            );

          option.textContent =
            String(
              category.name || ""
            );

          option.setAttribute(
            "data-category-id",
            String(
              category.id ||
              category._id ||
              ""
            )
          );

          option.setAttribute(
            "data-category-slug",
            String(
              category.slug || ""
            )
          );

          categorySelect.appendChild(
            option
          );
        }
      );

      categorySelect.disabled =
        categories.length === 0;

      if (
        categories.length === 0
      ) {
        showProductMessage(
          "No active categories exist yet. Create a category before assigning one to this product.",
          "information"
        );
      }
    } catch (error) {
      console.error(
        "Categories could not be loaded:",
        error
      );

      categorySelect.replaceChildren();

      var errorOption =
        document.createElement(
          "option"
        );

      errorOption.value = "";

      errorOption.textContent =
        "Categories unavailable";

      categorySelect.appendChild(
        errorOption
      );

      categorySelect.disabled =
        true;

      showProductMessage(
        error.message ||
        "Product categories could not be loaded.",
        "error"
      );
    }
  }

  // ==========================================================
  // VARIANT VALIDATION
  // ==========================================================

  function validateVariantData(
    variant
  ) {
    if (
      variant.name.length < 1
    ) {
      return (
        "Variant name is required."
      );
    }

    if (
      variant.sku.length < 1
    ) {
      return (
        "Variant SKU is required."
      );
    }

    if (
      !Number.isFinite(
        variant.price
      ) ||
      variant.price < 0
    ) {
      return (
        "Variant price must be 0 or higher."
      );
    }

    if (
      !Number.isInteger(
        variant.stock
      ) ||
      variant.stock < 0
    ) {
      return (
        "Variant stock must be a whole number of 0 or higher."
      );
    }

    var duplicateSku =
      productVariants.some(
        function (
          existingVariant
        ) {
          return (
            String(
              existingVariant.sku || ""
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
      return (
        "A variant with that SKU already exists."
      );
    }

    return "";
  }

  // ==========================================================
  // ADD VARIANT
  // ==========================================================

  function addVariant() {
    clearProductMessage();

    var name =
      getProductValue(
        "v-name"
      );

    var sku =
      getProductValue(
        "v-sku"
      );

    var price =
      Number(
        getProductValue(
          "v-price"
        )
      );

    var stock =
      Number(
        getProductValue(
          "v-stock"
        )
      );

    var variant = {
      id:
        "variant-" +
        Date.now() +
        "-" +
        productVariants.length,

      name: name,
      sku: sku,
      price: price,
      stock: stock,
      image: "",
      imagePublicId: ""
    };

    var validationError =
      validateVariantData(
        variant
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
      "Variant added to the product. Save the product to store it in Neon.",
      "information"
    );
  }

  function clearVariantInputs() {
    var inputIds = [
      "v-name",
      "v-sku",
      "v-price",
      "v-stock"
    ];

    inputIds.forEach(
      function (elementId) {
        var element =
          getProductElement(
            elementId
          );

        if (element) {
          element.value = "";
        }
      }
    );
  }

  // ==========================================================
  // RENDER VARIANTS
  // ==========================================================

  function renderVariants() {
    var variantList =
      getProductElement(
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
        variantList.appendChild(
          createVariantDisplay(
            variant,
            variantIndex
          )
        );
      }
    );
  }

  function createVariantDisplay(
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

    var skuLine =
      document.createElement(
        "p"
      );

    skuLine.textContent =
      "SKU: " +
      variant.sku;

    var priceLine =
      document.createElement(
        "p"
      );

    priceLine.textContent =
      "Price: " +
      formatProductCurrency(
        variant.price
      );

    var stockLine =
      document.createElement(
        "p"
      );

    stockLine.textContent =
      "Stock: " +
      variant.stock;

    information.appendChild(
      title
    );

    information.appendChild(
      skuLine
    );

    information.appendChild(
      priceLine
    );

    information.appendChild(
      stockLine
    );

    var deleteButton =
      document.createElement(
        "button"
      );

    deleteButton.type =
      "button";

    deleteButton.className =
      "remove-variant-button";

    deleteButton.textContent =
      "Remove Variant";

    deleteButton.addEventListener(
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
      deleteButton
    );

    return container;
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

  function formatProductCurrency(
    value
  ) {
    var amount =
      Number(value);

    if (!Number.isFinite(amount)) {
      amount = 0;
    }

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(amount);
  }

  // ==========================================================
  // IMAGE VALIDATION
  // ==========================================================

  function getSelectedProductImage() {
    var fileInput =
      getProductElement(
        "p-image-file"
      );

    if (
      !fileInput ||
      !fileInput.files ||
      fileInput.files.length === 0
    ) {
      return null;
    }

    return fileInput.files[0];
  }

  function validateProductImage(
    imageFile
  ) {
    if (!imageFile) {
      return (
        "Select an image before uploading."
      );
    }

    if (
      ADD_PRODUCT_ALLOWED_IMAGE_TYPES.indexOf(
        imageFile.type
      ) === -1
    ) {
      return (
        "Please upload a JPG, PNG, WEBP, or GIF image."
      );
    }

    if (
      imageFile.size >
      ADD_PRODUCT_MAX_IMAGE_SIZE
    ) {
      return (
        "The product image must be 10 MB or smaller."
      );
    }

    return "";
  }

  // ==========================================================
  // CLOUDINARY IMAGE UPLOAD
  // ==========================================================

  async function uploadProductImage() {
    clearProductMessage();

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

    try {
      setImageUploadLoading(
        true
      );

      showProductMessage(
        "Uploading product image...",
        "information"
      );

      var response = await fetch(
        ADD_PRODUCT_UPLOAD_API,
        {
          method: "POST",

          headers:
            getAdminHeaders(false),

          body: formData
        }
      );

      var data =
        await readProductResponse(
          response
        );

      var imageUrl =
        data.url ||
        data.secure_url ||
        "";

      if (!imageUrl) {
        throw new Error(
          "Cloudinary did not provide an image address."
        );
      }

      var imageUrlInput =
        getProductElement(
          "p-image"
        );

      if (imageUrlInput) {
        imageUrlInput.value =
          imageUrl;
      }

      uploadedProductImagePublicId =
        data.public_id || "";

      showProductImagePreview(
        imageUrl
      );

      showProductMessage(
        "Product image uploaded successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Product image upload failed:",
        error
      );

      showProductMessage(
        error.message ||
        "The product image could not be uploaded.",
        "error"
      );
    } finally {
      setImageUploadLoading(
        false
      );
    }
  }

  // ==========================================================
  // IMAGE PREVIEW
  // ==========================================================

  function revokeLocalPreviewUrl() {
    if (!localProductPreviewUrl) {
      return;
    }

    URL.revokeObjectURL(
      localProductPreviewUrl
    );

    localProductPreviewUrl =
      null;
  }

  function showProductImagePreview(
    imageUrl
  ) {
    var previewContainer =
      getProductElement(
        "product-preview-container"
      );

    var previewImage =
      getProductElement(
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

    previewImage.src =
      imageUrl;

    previewImage.alt =
      "Product image preview";

    previewContainer.hidden =
      false;

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
        getProductElement(
          "p-image-file"
        );

      if (fileInput) {
        fileInput.value = "";
      }

      showProductMessage(
        validationError,
        "error"
      );

      return;
    }

    localProductPreviewUrl =
      URL.createObjectURL(
        imageFile
      );

    showProductImagePreview(
      localProductPreviewUrl
    );
  }

  function previewManualImageUrl() {
    var imageUrl =
      getProductValue(
        "p-image"
      );

    if (!imageUrl) {
      showProductImagePreview("");
      return;
    }

    showProductImagePreview(
      imageUrl
    );
  }

  // ==========================================================
  // PRODUCT DATA
  // ==========================================================

  function getSelectedCategoryData() {
    var categorySelect =
      getProductElement(
        "p-category"
      );

    if (
      !categorySelect ||
      categorySelect.selectedIndex < 0
    ) {
      return {
        category: "General",
        categoryId: null,
        categorySlug: ""
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
        category: "General",
        categoryId: null,
        categorySlug: ""
      };
    }

    return {
      category:
        selectedOption.value,

      categoryId:
        selectedOption.getAttribute(
          "data-category-id"
        ) || null,

      categorySlug:
        selectedOption.getAttribute(
          "data-category-slug"
        ) || ""
    };
  }

  function getProductFormData() {
    var categoryData =
      getSelectedCategoryData();

    var activeCheckbox =
      getProductElement(
        "p-active"
      );

    return {
      name:
        getProductValue(
          "p-name"
        ),

      sku:
        getProductValue(
          "p-sku"
        ),

      price:
        Number(
          getProductValue(
            "p-price"
          )
        ),

      stock:
        Number(
          getProductValue(
            "p-stock"
          ) || 0
        ),

      lowStockWarning:
        Number(
          getProductValue(
            "p-low-stock-warning"
          ) || 5
        ),

      category:
        categoryData.category,

      categoryId:
        categoryData.categoryId,

      categorySlug:
        categoryData.categorySlug,

      description:
        getProductValue(
          "p-description"
        ),

      image:
        getProductValue(
          "p-image"
        ),

      imagePublicId:
        uploadedProductImagePublicId,

      variants:
        productVariants.slice(),

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
      product.name.length < 2
    ) {
      return (
        "Product name must contain at least 2 characters."
      );
    }

    if (
      product.sku.length < 2
    ) {
      return (
        "Product SKU must contain at least 2 characters."
      );
    }

    if (
      !Number.isFinite(
        product.price
      ) ||
      product.price < 0
    ) {
      return (
        "Product price must be 0 or higher."
      );
    }

    if (
      !Number.isInteger(
        product.stock
      ) ||
      product.stock < 0
    ) {
      return (
        "Product stock must be a whole number of 0 or higher."
      );
    }

    if (
      !Number.isInteger(
        product.lowStockWarning
      ) ||
      product.lowStockWarning < 0
    ) {
      return (
        "Low stock warning must be a whole number of 0 or higher."
      );
    }

    if (!product.image) {
      return (
        "Upload a product image before saving the product."
      );
    }

    var variantSkuSet = {};

    for (
      var index = 0;
      index <
      product.variants.length;
      index += 1
    ) {
      var variant =
        product.variants[index];

      var variantError =
        validateSavedVariant(
          variant,
          variantSkuSet
        );

      if (variantError) {
        return variantError;
      }
    }

    return "";
  }

  function validateSavedVariant(
    variant,
    variantSkuSet
  ) {
    if (!variant.name) {
      return (
        "Every variant must have a name."
      );
    }

    if (!variant.sku) {
      return (
        "Every variant must have a SKU."
      );
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
      return (
        "Variant SKUs must be unique."
      );
    }

    variantSkuSet[
      normalizedSku
    ] = true;

    if (
      !Number.isFinite(
        Number(variant.price)
      ) ||
      Number(variant.price) < 0
    ) {
      return (
        "Every variant must have a valid price."
      );
    }

    if (
      !Number.isInteger(
        Number(variant.stock)
      ) ||
      Number(variant.stock) < 0
    ) {
      return (
        "Every variant must have a valid whole-number stock amount."
      );
    }

    return "";
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

    clearProductMessage();

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

    try {
      setProductSaveLoading(
        true
      );

      showProductMessage(
        "Saving product...",
        "information"
      );

      var response = await fetch(
        ADD_PRODUCT_API,
        {
          method: "POST",

          headers:
            getAdminHeaders(true),

          body: JSON.stringify(
            product
          )
        }
      );

      var data =
        await readProductResponse(
          response
        );

      showProductMessage(
        data.message ||
        (
          'The product "' +
          product.name +
          '" was created successfully.'
        ),
        "success"
      );

      resetProductForm();

      window.setTimeout(
        function () {
          window.location.href =
            "admin-products.html";
        },
        900
      );
    } catch (error) {
      console.error(
        "Product creation failed:",
        error
      );

      showProductMessage(
        error.message ||
        "The product could not be created.",
        "error"
      );
    } finally {
      setProductSaveLoading(
        false
      );
    }
  }

  // ==========================================================
  // RESET PRODUCT FORM
  // ==========================================================

  function resetProductForm() {
    var productForm =
      getProductElement(
        "add-product-form"
      );

    if (productForm) {
      productForm.reset();
    }

    var stockInput =
      getProductElement(
        "p-stock"
      );

    var lowStockInput =
      getProductElement(
        "p-low-stock-warning"
      );

    var activeCheckbox =
      getProductElement(
        "p-active"
      );

    if (stockInput) {
      stockInput.value = "0";
    }

    if (lowStockInput) {
      lowStockInput.value = "5";
    }

    if (activeCheckbox) {
      activeCheckbox.checked = true;
    }

    productVariants = [];

    uploadedProductImagePublicId =
      "";

    revokeLocalPreviewUrl();

    showProductImagePreview("");

    renderVariants();
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

      var productForm =
        getProductElement(
          "add-product-form"
        );

      var addVariantButton =
        getProductElement(
          "add-variant-button"
        );

      var uploadImageButton =
        getProductElement(
          "upload-product-image-button"
        );

      var imageFileInput =
        getProductElement(
          "p-image-file"
        );

      var imageUrlInput =
        getProductElement(
          "p-image"
        );

      var logoutButton =
        getProductElement(
          "admin-logout-button"
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
      }

      if (logoutButton) {
        logoutButton.addEventListener(
          "click",
          logoutAdmin
        );
      }

      renderVariants();

      await loadProductCategories();
    }
  );

  window.addEventListener(
    "beforeunload",
    revokeLocalPreviewUrl
  );

  // ==========================================================
  // OPTIONAL INLINE HTML SUPPORT
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

  window.logoutAdmin =
    logoutAdmin;
})();