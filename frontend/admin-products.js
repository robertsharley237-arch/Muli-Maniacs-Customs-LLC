// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-products.js
// ADMINISTRATOR PRODUCT MANAGEMENT
//
// Hosting: Vercel
// Backend: Express
// Database: Neon PostgreSQL
// Authentication: JWT
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var REQUEST_TIMEOUT_MS = 15000;
  var MAX_PRODUCT_IMAGE_SIZE =
    10 * 1024 * 1024;

  var ALLOWED_PRODUCT_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  var products = [];
  var productRequestActive = false;

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getElement(elementId) {
    return document.getElementById(elementId);
  }

  function setText(elementId, value) {
    var element = getElement(elementId);

    if (!element) {
      return;
    }

    element.textContent =
      value === undefined || value === null
        ? ""
        : String(value);
  }

  function createElement(
    tagName,
    className,
    text
  ) {
    var element =
      document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (
      text !== undefined &&
      text !== null
    ) {
      element.textContent = String(text);
    }

    return element;
  }

  // ==========================================================
  // BACKEND URL
  // ==========================================================

  function removeTrailingSlashes(value) {
    return String(value || "")
      .trim()
      .replace(/\/+$/, "");
  }

  function getBackendUrl() {
    if (
      typeof window.MMC_BACKEND_URL === "string" &&
      window.MMC_BACKEND_URL.trim()
    ) {
      return removeTrailingSlashes(
        window.MMC_BACKEND_URL
      );
    }

    var savedBackendUrl =
      localStorage.getItem(
        "MMC_BACKEND_URL"
      );

    if (
      typeof savedBackendUrl === "string" &&
      savedBackendUrl.trim()
    ) {
      return removeTrailingSlashes(
        savedBackendUrl
      );
    }

    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://localhost:10000";
    }

    return removeTrailingSlashes(
      window.location.origin
    );
  }

  var BACKEND_URL = getBackendUrl();

  var ADMIN_PRODUCTS_URL =
    BACKEND_URL + "/admin/products";

  var DROPSHIPPING_URL =
    BACKEND_URL + "/admin/dropshipping";

  var dropshippingProviders = [];

  var selectedProviderId = "";

  var PRODUCTS_URL =
    BACKEND_URL + "/products";

  var PRODUCT_IMAGE_UPLOAD_URL =
    BACKEND_URL + "/upload/image";

  var ADMIN_SESSION_URL =
    BACKEND_URL + "/admin/me";

  // ==========================================================
  // ADMINISTRATOR AUTHENTICATION
  // ==========================================================

  function getAdminToken() {
    return String(
      localStorage.getItem("adminToken") ||
      localStorage.getItem("MMC_ADMIN_TOKEN") ||
      ""
    ).trim();
  }

  function getAdminHeaders(includeJson) {
    var headers = {
      Accept: "application/json",
      Authorization:
        "Bearer " + getAdminToken()
    };

    if (includeJson) {
      headers["Content-Type"] =
        "application/json";
    }

    return headers;
  }

  function clearAdminSession() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("MMC_ADMIN_TOKEN");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("token");
  }

  function redirectToAdminLogin() {
    clearAdminSession();

    window.location.replace(
      "admin-login.html?return=" +
      encodeURIComponent(
        "admin-products.html"
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
          options || {},
          {
            signal: controller.signal
          }
        )
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readResponse(response) {
    var responseText = "";

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
      return JSON.parse(responseText);
    } catch (error) {
      return {
        error: responseText
      };
    }
  }

  function getErrorMessage(
    value,
    fallbackMessage
  ) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      value &&
      typeof value === "object"
    ) {
      if (
        typeof value.message === "string" &&
        value.message.trim()
      ) {
        return value.message.trim();
      }

      if (value.error !== undefined) {
        return getErrorMessage(
          value.error,
          fallbackMessage
        );
      }

      if (value.errors !== undefined) {
        return getErrorMessage(
          value.errors,
          fallbackMessage
        );
      }
    }

    return fallbackMessage;
  }

  function getRequestErrorMessage(
    error,
    fallbackMessage
  ) {
    if (
      error &&
      error.name === "AbortError"
    ) {
      return (
        "The product request took too long. " +
        "Check the backend connection and try again."
      );
    }

    if (error instanceof TypeError) {
      return (
        "The product server could not be reached. " +
        "Check the backend URL and CORS settings."
      );
    }

    return getErrorMessage(
      error,
      fallbackMessage
    );
  }

  async function requestJson(url, options) {
    var response =
      await fetchWithTimeout(
        url,
        options
      );

    var data =
      await readResponse(response);

    if (response.status === 401) {
      redirectToAdminLogin();

      throw new Error(
        "Your administrator session expired."
      );
    }

    if (response.status === 403) {
      throw new Error(
        getErrorMessage(
          data,
          "You do not have permission to manage products."
        )
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "The product request failed with status " +
          response.status +
          "."
        )
      );
    }

    return data;
  }

  // ==========================================================
  // PAGE MESSAGES
  // ==========================================================

  function showMessage(
    message,
    messageType
  ) {
    var messageBox =
      getElement("products-message");

    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      String(message || "");

    messageBox.classList.remove(
      "products-error",
      "products-success",
      "products-information"
    );

    messageBox.removeAttribute("role");

    if (!message) {
      return;
    }

    if (messageType === "success") {
      messageBox.classList.add(
        "products-success"
      );

      messageBox.setAttribute(
        "role",
        "status"
      );
    } else if (
      messageType === "information"
    ) {
      messageBox.classList.add(
        "products-information"
      );

      messageBox.setAttribute(
        "role",
        "status"
      );
    } else {
      messageBox.classList.add(
        "products-error"
      );

      messageBox.setAttribute(
        "role",
        "alert"
      );
    }
  }

  // ==========================================================
  // ADMINISTRATOR INFORMATION
  // ==========================================================

  function formatAdminRole(role) {
    return String(role || "Administrator")
      .replace(/_/g, " ")
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
    var username = String(
      administrator.username ||
      administrator.name ||
      administrator.email ||
      "Administrator"
    );

    var role = formatAdminRole(
      administrator.role
    );

    [
      "admin-username",
      "admin-header-username"
    ].forEach(function (elementId) {
      setText(elementId, username);
    });

    [
      "admin-role",
      "admin-header-role"
    ].forEach(function (elementId) {
      setText(elementId, role);
    });
  }

  async function verifyAdmin() {
    if (!getAdminToken()) {
      redirectToAdminLogin();
      return false;
    }

    try {
      var data = await requestJson(
        ADMIN_SESSION_URL,
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var administrator =
        data.admin ||
        data.user ||
        data;

      if (
        !administrator ||
        typeof administrator !== "object"
      ) {
        throw new Error(
          "The administrator information was not returned."
        );
      }

      localStorage.setItem(
        "adminUser",
        JSON.stringify(administrator)
      );

      displayAdminInformation(
        administrator
      );

      return true;
    } catch (error) {
      console.error(
        "Administrator verification failed.",
        error
      );

      showMessage(
        getRequestErrorMessage(
          error,
          "The administrator session could not be verified."
        ),
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // PRODUCT NORMALIZATION
  // ==========================================================

  function normalizeMoney(value) {
    var amount = Number(value);

    if (!Number.isFinite(amount)) {
      return 0;
    }

    return Math.max(
      0,
      Math.round(amount * 100) / 100
    );
  }

  function normalizeWholeNumber(
    value,
    fallbackValue
  ) {
    var number = Number(value);

    if (!Number.isFinite(number)) {
      number = Number(fallbackValue);

      if (!Number.isFinite(number)) {
        number = 0;
      }
    }

    return Math.max(
      0,
      Math.floor(number)
    );
  }

  function normalizeVariant(variant) {
    var source =
      variant &&
      typeof variant === "object"
        ? variant
        : {};

    return {
      id: String(
        source.id ||
        source._id ||
        ""
      ),

      name: String(
        source.name || ""
      ),

      sku: String(
        source.sku || ""
      ),

      price: normalizeMoney(
        source.price
      ),

      stock: normalizeWholeNumber(
        source.stock,
        0
      ),

      image: String(
        source.image || ""
      ),

      imagePublicId: String(
        source.imagePublicId ||
        source.image_public_id ||
        ""
      ),

      supplierProvider: String(
        source.supplierProvider || ""
      ),

      supplierProductId: String(
        source.supplierProductId || ""
      ),

      supplierVariantId: String(
        source.supplierVariantId || ""
      )
    };
  }

  function normalizeProduct(product) {
    var source =
      product &&
      typeof product === "object"
        ? product
        : {};

    var warningLevel =
      source.lowStockWarning;

    if (warningLevel === undefined) {
      warningLevel =
        source.low_stock_warning;
    }

    return {
      id: String(
        source.id ||
        source._id ||
        ""
      ),

      name: String(
        source.name ||
        "Unnamed Product"
      ),

      sku: String(
        source.sku || ""
      ),

      price: normalizeMoney(
        source.price
      ),

      stock: normalizeWholeNumber(
        source.stock,
        0
      ),

      category: String(
        source.category ||
        source.categoryName ||
        "General"
      ),

      categoryId:
        source.categoryId ||
        source.category_id ||
        null,

      categorySlug: String(
        source.categorySlug ||
        source.category_slug ||
        ""
      ),

      description: String(
        source.description || ""
      ),

      image: String(
        source.image || ""
      ),

      imagePublicId: String(
        source.imagePublicId ||
        source.image_public_id ||
        ""
      ),

      images:
        Array.isArray(source.images)
          ? source.images.map(
              function (image) {
                return {
                  url: String(
                    image &&
                    typeof image === "object"
                      ? image.url ||
                        image.image ||
                        ""
                      : image || ""
                  ),
                  publicId: String(
                    image &&
                    typeof image === "object"
                      ? image.publicId ||
                        image.public_id ||
                        image.imagePublicId ||
                        image.image_public_id ||
                        ""
                      : ""
                  )
                };
              }
            ).filter(function (image) {
              return Boolean(image.url);
            })
          : [],

      active:
        source.active !== false,

      lowStockWarning:
        normalizeWholeNumber(
          warningLevel,
          5
        ),

      variants:
        Array.isArray(source.variants)
          ? source.variants.map(
              normalizeVariant
            )
          : []
    };
  }

  function getProductList(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (
      data &&
      Array.isArray(data.products)
    ) {
      return data.products;
    }

    if (
      data &&
      data.data &&
      Array.isArray(
        data.data.products
      )
    ) {
      return data.data.products;
    }

    return [];
  }

  // ==========================================================
  // PRODUCT HELPERS
  // ==========================================================

  function formatCurrency(value) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(
      Number(value) || 0
    );
  }

  function getTotalStock(product) {
    if (
      !product.variants ||
      product.variants.length === 0
    ) {
      return normalizeWholeNumber(
        product.stock,
        0
      );
    }

    return product.variants.reduce(
      function (total, variant) {
        return (
          total +
          normalizeWholeNumber(
            variant.stock,
            0
          )
        );
      },
      0
    );
  }

  function isOutOfStock(product) {
    return getTotalStock(product) === 0;
  }

  function isLowStock(product) {
    var totalStock =
      getTotalStock(product);

    return (
      totalStock > 0 &&
      totalStock <=
        product.lowStockWarning
    );
  }

  function getStockClass(product) {
    if (isOutOfStock(product)) {
      return "stock-empty";
    }

    if (isLowStock(product)) {
      return "stock-low";
    }

    return "stock-normal";
  }

  // ==========================================================
  // PRODUCT DETAILS
  // ==========================================================

  function createProductDetail(
    label,
    value,
    extraClass
  ) {
    var wrapper =
      createElement(
        "div",
        "product-detail"
      );

    var term =
      createElement(
        "dt",
        "",
        label
      );

    var description =
      createElement(
        "dd",
        extraClass || "",
        value
      );

    wrapper.appendChild(term);
    wrapper.appendChild(description);

    return wrapper;
  }

  // ==========================================================
  // PRODUCT PAGE NAVIGATION
  // ==========================================================

  function rememberProduct(productId) {
    localStorage.setItem(
      "MMC_EDIT_PRODUCT_ID",
      productId
    );
  }

  function openProductPage(
    productId,
    page
  ) {
    rememberProduct(productId);

    window.location.assign(
      page +
      "?id=" +
      encodeURIComponent(productId)
    );
  }

  function createSupplierDraftPriceForm(product) {
    var form =
      createElement(
        "form",
        "supplier-draft-price-form"
      );

    form.appendChild(
      createElement(
        "h3",
        "",
        "Set selling prices before publishing"
      )
    );

    var priceInputs = [];

    product.variants.forEach(
      function (variant, index) {
        var label =
          createElement(
            "label",
            "supplier-draft-price-row"
          );

        label.appendChild(
          createElement(
            "span",
            "",
            variant.name +
              " (" +
              variant.sku +
              ")"
          )
        );

        var input =
          createElement("input");

        input.type = "number";
        input.min = "0.01";
        input.step = "0.01";
        input.required = true;
        input.inputMode = "decimal";
        input.setAttribute(
          "aria-label",
          "Selling price for " +
            variant.name
        );

        label.appendChild(input);
        form.appendChild(label);

        priceInputs.push({
          input: input,
          variant: variant,
          index: index
        });
      }
    );

    var submitButton =
      createElement(
        "button",
        "",
        "Save Prices and Publish"
      );

    submitButton.type = "submit";
    form.appendChild(submitButton);

    form.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        var updatedVariants =
          product.variants.map(
            function (variant) {
              return Object.assign(
                {},
                variant
              );
            }
          );

        for (
          var index = 0;
          index < priceInputs.length;
          index += 1
        ) {
          var price =
            Number(
              priceInputs[index]
                .input.value
            );

          if (
            !Number.isFinite(price) ||
            price <= 0
          ) {
            showMessage(
              "Enter a selling price greater than zero for every variant.",
              "error"
            );
            return;
          }

          updatedVariants[
            priceInputs[index].index
          ].price =
            Math.round(price * 100) / 100;
        }

        var prices =
          updatedVariants.map(
            function (variant) {
              return variant.price;
            }
          );

        submitButton.disabled = true;
        submitButton.textContent =
          "Saving Prices...";

        try {
          await requestJson(
            PRODUCTS_URL +
              "/" +
              encodeURIComponent(product.id),
            {
              method: "PUT",
              headers:
                getAdminHeaders(true),
              body: JSON.stringify({
                price: Math.min.apply(
                  null,
                  prices
                ),
                variants:
                  updatedVariants,
                active: true
              })
            }
          );

          var productsReloaded =
            await loadProducts();

          showMessage(
            productsReloaded
              ? "Variant prices saved and the product is now published."
              : "Variant prices were saved and the product published, but the product list did not reload. Use Refresh Products to see the changes.",
            productsReloaded
              ? "success"
              : "error"
          );
        } catch (error) {
          console.error(
            "CJ draft pricing failed.",
            error
          );

          showMessage(
            getRequestErrorMessage(
              error,
              "The CJ draft could not be priced and published."
            ),
            "error"
          );

          submitButton.disabled = false;
          submitButton.textContent =
            "Save Prices and Publish";
        }
      }
    );

    return form;
  }

  // ==========================================================
  // PRODUCT CARD
  // ==========================================================

  function createProductCard(product) {
    var card =
      createElement(
        "article",
        "product-card"
      );

    card.dataset.productId =
      product.id;

    var imageContainer =
      createElement(
        "div",
        "product-image-container"
      );

    if (product.image) {
      var image =
        document.createElement("img");

      image.className =
        "product-image";

      image.src = product.image;

      image.alt =
        product.name +
        " product image";

      image.loading = "lazy";

      image.addEventListener(
        "error",
        function () {
          imageContainer.replaceChildren(
            createElement(
              "div",
              "product-image-placeholder",
              "Product image unavailable"
            )
          );
        }
      );

      imageContainer.appendChild(image);
    } else {
      imageContainer.appendChild(
        createElement(
          "div",
          "product-image-placeholder",
          "No product image"
        )
      );
    }

    var content =
      createElement(
        "div",
        "product-card-content"
      );

    var headingRow =
      createElement(
        "div",
        "product-card-heading"
      );

    headingRow.appendChild(
      createElement(
        "h2",
        "",
        product.name
      )
    );

    headingRow.appendChild(
      createElement(
        "span",
        "product-status " +
        (
          product.active
            ? "status-active"
            : "status-hidden"
        ),
        product.active
          ? "Active"
          : "Hidden"
      )
    );

    var details =
      createElement(
        "dl",
        "product-details-list"
      );

    details.appendChild(
      createProductDetail(
        "SKU",
        product.sku || "No SKU"
      )
    );

    details.appendChild(
      createProductDetail(
        "Price",
        formatCurrency(product.price)
      )
    );

    details.appendChild(
      createProductDetail(
        "Category",
        product.category
      )
    );

    details.appendChild(
      createProductDetail(
        "Total Stock",
        getTotalStock(product),
        getStockClass(product)
      )
    );

    details.appendChild(
      createProductDetail(
        "Variants",
        product.variants.length
      )
    );

    details.appendChild(
      createProductDetail(
        "Warning Level",
        product.lowStockWarning
      )
    );

    content.appendChild(headingRow);
    content.appendChild(details);

    content.appendChild(
      createProductImageUpload(product)
    );

    var supplierProviderId =
      product.variants.length > 0
        ? product.variants[0].supplierProvider
        : "";

    var hasSupplierProduct =
      Boolean(
        supplierProviderId &&
        product.variants.length > 0
      ) &&
      product.variants.every(
        function (variant) {
          return Boolean(
            variant.supplierProvider ===
              supplierProviderId &&
            variant.supplierProductId &&
            variant.supplierVariantId
          );
        }
      );

    if (
      hasSupplierProduct &&
      !product.active
    ) {
      content.appendChild(
        createSupplierDraftPriceForm(product)
      );
    }

    if (hasSupplierProduct) {
      var syncStockActions =
        createElement(
          "div",
          "product-card-actions"
        );

      var syncStockButton =
        createElement(
          "button",
          "product-card-button",
          "Sync Provider Stock"
        );

      syncStockButton.type = "button";
      syncStockButton.addEventListener(
        "click",
        function () {
          syncSupplierProductStock(
            product.id,
            supplierProviderId,
            syncStockButton
          );
        }
      );

      syncStockActions.appendChild(
        syncStockButton
      );
      content.appendChild(syncStockActions);
    }

    if (product.description) {
      content.appendChild(
        createElement(
          "p",
          "product-description",
          product.description
        )
      );
    }

    var actions =
      createElement(
        "div",
        "product-card-actions"
      );

    var editButton =
      createElement(
        "button",
        "product-card-button",
        "Edit"
      );

    var inventoryButton =
      createElement(
        "button",
        "product-card-button inventory-card-button",
        "Inventory"
      );

    var deleteButton =
      createElement(
        "button",
        "product-card-button delete-card-button",
        "Delete"
      );

    editButton.type = "button";
    inventoryButton.type = "button";
    deleteButton.type = "button";

    editButton.addEventListener(
      "click",
      function () {
        openProductPage(
          product.id,
          "admin-edit-product.html"
        );
      }
    );

    inventoryButton.addEventListener(
      "click",
      function () {
        openProductPage(
          product.id,
          "admin-inventory.html"
        );
      }
    );

    deleteButton.addEventListener(
      "click",
      function () {
        openProductPage(
          product.id,
          "admin-delete-product.html"
        );
      }
    );

    actions.appendChild(editButton);
    actions.appendChild(inventoryButton);
    actions.appendChild(deleteButton);

    content.appendChild(actions);
    card.appendChild(imageContainer);
    card.appendChild(content);

    return card;
  }

  function createProductImageUpload(product) {
    var uploadSection =
      createElement(
        "div",
        "product-image-upload"
      );

    var label =
      createElement(
        "label",
        "",
        "Choose your own product photo"
      );

    var fileInput =
      createElement("input");

    fileInput.type = "file";
    fileInput.accept =
      ALLOWED_PRODUCT_IMAGE_TYPES.join(",");

    var uploadButton =
      createElement(
        "button",
        "product-card-button",
        "Upload and Use Photo"
      );

    uploadButton.type = "button";
    uploadButton.disabled = true;

    fileInput.addEventListener(
      "change",
      function () {
        uploadButton.disabled =
          !fileInput.files ||
          fileInput.files.length === 0;
      }
    );

    uploadButton.addEventListener(
      "click",
      function () {
        uploadProductCardImage(
          product,
          fileInput,
          uploadButton
        );
      }
    );

    var galleryLabel =
      createElement(
        "label",
        "",
        "Add photos to this product"
      );

    var galleryFileInput =
      createElement("input");

    galleryFileInput.type = "file";
    galleryFileInput.multiple = true;
    galleryFileInput.accept =
      ALLOWED_PRODUCT_IMAGE_TYPES.join(",");

    var galleryUploadButton =
      createElement(
        "button",
        "product-card-button",
        "Add Photos to Gallery"
      );

    galleryUploadButton.type = "button";
    galleryUploadButton.disabled = true;

    galleryFileInput.addEventListener(
      "change",
      function () {
        galleryUploadButton.disabled =
          !galleryFileInput.files ||
          galleryFileInput.files.length === 0;
      }
    );

    galleryUploadButton.addEventListener(
      "click",
      function () {
        uploadProductCardImage(
          product,
          galleryFileInput,
          galleryUploadButton,
          true
        );
      }
    );

    galleryLabel.appendChild(
      galleryFileInput
    );

    label.appendChild(fileInput);
    uploadSection.appendChild(label);
    uploadSection.appendChild(uploadButton);
    uploadSection.appendChild(galleryLabel);
    uploadSection.appendChild(galleryUploadButton);

    uploadSection.appendChild(
      createElement(
        "p",
        "product-image-upload-help",
        "JPG, PNG, WEBP, or GIF; 10 MB maximum."
      )
    );

    return uploadSection;
  }

  async function uploadProductCardImage(
    product,
    fileInput,
    uploadButton,
    appendToGallery
  ) {
    var imageFiles =
      fileInput.files
        ? Array.prototype.slice.call(
            fileInput.files
          )
        : [];

    if (imageFiles.length === 0) {
      showMessage(
        "Choose one or more image files before uploading.",
        "error"
      );
      return;
    }

    var validationError = "";

    imageFiles.some(function (imageFile) {
      if (
        !ALLOWED_PRODUCT_IMAGE_TYPES.includes(
          imageFile.type
        )
      ) {
        validationError =
          "Choose JPG, PNG, WEBP, or GIF photos.";
      } else if (
        imageFile.size >
        MAX_PRODUCT_IMAGE_SIZE
      ) {
        validationError =
          "Each product photo must be 10 MB or smaller.";
      }

      return Boolean(validationError);
    });

    if (validationError) {
      showMessage(validationError, "error");
      return;
    }

    var originalButtonText =
      uploadButton.textContent;

    uploadButton.disabled = true;
    uploadButton.textContent =
      "Uploading Photos...";

    try {
      var uploadedImages = [];

      for (
        var index = 0;
        index < imageFiles.length;
        index += 1
      ) {
        var formData =
          new FormData();

        formData.append(
          "image",
          imageFiles[index]
        );

        var uploadResult =
          await requestJson(
            PRODUCT_IMAGE_UPLOAD_URL,
            {
              method: "POST",
              headers:
                getAdminHeaders(false),
              body: formData
            }
          );

        var imageUrl =
          String(
            uploadResult.url ||
            uploadResult.secure_url ||
            ""
          ).trim();

        if (!imageUrl) {
          throw new Error(
            "The image service did not return a photo URL."
          );
        }

        var parsedImageUrl =
          new URL(imageUrl);

        if (
          parsedImageUrl.protocol !== "https:"
        ) {
          throw new Error(
            "The image service returned an insecure photo URL."
          );
        }

        uploadedImages.push({
          url: imageUrl,
          publicId: String(
            uploadResult.publicId ||
            uploadResult.public_id ||
            ""
          ).trim()
        });
      }

      var existingImages =
        product.images.length > 0
          ? product.images
          : product.image
            ? [{
                url: product.image,
                publicId:
                  product.imagePublicId || ""
              }]
            : [];

      var nextImages =
        appendToGallery
          ? existingImages.concat(uploadedImages)
          : uploadedImages.concat(
              existingImages.slice(1)
            );

      await requestJson(
        ADMIN_PRODUCTS_URL +
          "/" +
          encodeURIComponent(product.id),
        {
          method: "PUT",
          headers:
            getAdminHeaders(true),
          body: JSON.stringify({
            image:
              nextImages[0]
                ? nextImages[0].url
                : "",
            imagePublicId:
              nextImages[0]
                ? nextImages[0].publicId
                : "",
            images:
              nextImages
          })
        }
      );

      fileInput.value = "";

      var productsReloaded =
        await loadProducts();

      showMessage(
        productsReloaded
          ? (
              appendToGallery
                ? "Photos were added to "
                : "Your main photo was replaced for "
            ) +
            product.name +
            "."
          : (
              appendToGallery
                ? "Photos were added to "
                : "Your main photo was replaced for "
            ) +
            product.name +
            ", but the product list did not reload. Use Refresh Products to see it.",
        productsReloaded
          ? "success"
          : "error"
      );
    } catch (error) {
      console.error(
        "Product photo upload or save failed.",
        error
      );

      showMessage(
        getRequestErrorMessage(
          error,
          "Your product photo could not be uploaded and saved."
        ),
        "error"
      );
    } finally {
      fileInput.value = "";
      uploadButton.disabled =
        !fileInput.files ||
        fileInput.files.length === 0;
      uploadButton.textContent =
        originalButtonText;
    }
  }

  async function syncSupplierProductStock(
    productId,
    providerId,
    syncButton
  ) {
    syncButton.disabled = true;
    syncButton.textContent = "Syncing Provider Stock...";

    try {
      await requestJson(
        DROPSHIPPING_URL +
          "/" +
          encodeURIComponent(providerId) +
          "/products" +
          "/" +
          encodeURIComponent(productId) +
          "/sync-stock",
        {
          method: "POST",
          headers:
            getAdminHeaders(false)
        }
      );

      var productsReloaded =
        await loadProducts();

      showMessage(
        productsReloaded
          ? "Provider stock was refreshed."
          : "Provider stock was refreshed, but the product list did not reload. Use Refresh Products to see the changes.",
        productsReloaded
          ? "success"
          : "error"
      );
    } catch (error) {
      console.error(
        "Provider stock sync failed.",
        error
      );

      showMessage(
        getRequestErrorMessage(
          error,
          "Provider stock could not be refreshed."
        ),
        "error"
      );

      syncButton.disabled = false;
      syncButton.textContent =
        "Sync Provider Stock";
    }
  }

  // ==========================================================
  // FILTER PRODUCTS
  // ==========================================================

  function getFilteredProducts() {
    var searchBox =
      getElement("searchBox");

    var statusFilter =
      getElement(
        "product-status-filter"
      );

    var searchQuery =
      searchBox
        ? searchBox.value
            .trim()
            .toLowerCase()
        : "";

    var selectedFilter =
      statusFilter
        ? statusFilter.value
        : "all";

    return products.filter(
      function (product) {
        var variantText =
          product.variants
            .map(function (variant) {
              return [
                variant.name,
                variant.sku
              ].join(" ");
            })
            .join(" ");

        var searchableText = [
          product.name,
          product.sku,
          product.category,
          product.categorySlug,
          product.description,
          variantText
        ]
          .join(" ")
          .toLowerCase();

        var searchMatches =
          !searchQuery ||
          searchableText.indexOf(
            searchQuery
          ) >= 0;

        var statusMatches = true;

        if (selectedFilter === "active") {
          statusMatches = product.active;
        } else if (
          selectedFilter === "hidden"
        ) {
          statusMatches = !product.active;
        } else if (
          selectedFilter === "low-stock"
        ) {
          statusMatches =
            isLowStock(product);
        } else if (
          selectedFilter ===
          "out-of-stock"
        ) {
          statusMatches =
            isOutOfStock(product);
        }

        return (
          searchMatches &&
          statusMatches
        );
      }
    );
  }

  // ==========================================================
  // DISPLAY PRODUCTS
  // ==========================================================

  function displayProducts() {
    var productList =
      getElement("productList");

    if (!productList) {
      return;
    }

    var filteredProducts =
      getFilteredProducts();

    productList.replaceChildren();

    productList.setAttribute(
      "aria-busy",
      "false"
    );

    if (
      filteredProducts.length === 0
    ) {
      var emptyMessage =
        products.length > 0
          ? "No products match the selected search and status filters."
          : "No products were found.";

      productList.appendChild(
        createElement(
          "p",
          "product-list-empty",
          emptyMessage
        )
      );

      return;
    }

    filteredProducts.forEach(
      function (product) {
        productList.appendChild(
          createProductCard(product)
        );
      }
    );
  }

  // ==========================================================
  // PRODUCT SUMMARY
  // ==========================================================

  function updateProductSummary() {
    var summary = {
      total: products.length,
      active: 0,
      hidden: 0,
      lowStock: 0,
      outOfStock: 0,
      variants: 0
    };

    products.forEach(
      function (product) {
        if (product.active) {
          summary.active += 1;
        } else {
          summary.hidden += 1;
        }

        if (isLowStock(product)) {
          summary.lowStock += 1;
        }

        if (isOutOfStock(product)) {
          summary.outOfStock += 1;
        }

        summary.variants +=
          product.variants.length;
      }
    );

    setText(
      "total-products",
      summary.total
    );

    setText(
      "active-products",
      summary.active
    );

    setText(
      "hidden-products",
      summary.hidden
    );

    setText(
      "low-stock-products",
      summary.lowStock
    );

    setText(
      "out-of-stock-products",
      summary.outOfStock
    );

    setText(
      "total-product-variants",
      summary.variants
    );
  }

  // ==========================================================
  // REFRESH BUTTON
  // ==========================================================

  function setRefreshButtonLoading(
    loading
  ) {
    var refreshButton =
      getElement(
        "refresh-products-button"
      );

    if (!refreshButton) {
      return;
    }

    refreshButton.disabled =
      Boolean(loading);

    refreshButton.setAttribute(
      "aria-busy",
      loading ? "true" : "false"
    );

    refreshButton.textContent =
      loading
        ? "Refreshing Products..."
        : "Refresh Products";
  }

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  async function loadProducts() {
    if (productRequestActive) {
      return false;
    }

    var productList =
      getElement("productList");

    productRequestActive = true;

    setRefreshButtonLoading(true);

    showMessage(
      "Loading products...",
      "information"
    );

    if (productList) {
      productList.setAttribute(
        "aria-busy",
        "true"
      );

      productList.replaceChildren(
        createElement(
          "p",
          "product-list-loading",
          "Loading products..."
        )
      );
    }

    try {
      var data = await requestJson(
        ADMIN_PRODUCTS_URL,
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      products =
        getProductList(data)
          .map(normalizeProduct)
          .filter(function (product) {
            return Boolean(product.id);
          })
          .sort(function (
            firstProduct,
            secondProduct
          ) {
            return firstProduct.name
              .localeCompare(
                secondProduct.name
              );
          });

      updateProductSummary();
      displayProducts();

      showMessage(
        products.length === 1
          ? "1 product loaded."
          : products.length +
            " products loaded.",
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Products could not be loaded.",
        error
      );

      products = [];

      updateProductSummary();

      if (productList) {
        productList.setAttribute(
          "aria-busy",
          "false"
        );

        productList.replaceChildren(
          createElement(
            "p",
            "product-list-empty",
            "Products could not be loaded."
          )
        );
      }

      showMessage(
        getRequestErrorMessage(
          error,
          "Products could not be loaded."
        ),
        "error"
      );

      return false;
    } finally {
      productRequestActive = false;
      setRefreshButtonLoading(false);
    }
  }

  function getProviderProductResults(data) {
    return Array.isArray(data.products)
      ? data.products
      : [];
  }

  function getSafeProviderImageUrl(value) {
    try {
      var imageUrl =
        new URL(String(value || ""));

      return imageUrl.protocol === "https:"
        ? imageUrl.toString()
        : "";
    } catch (error) {
      return "";
    }
  }

  function renderProviderProducts(providerProducts) {
    var results =
      getElement("provider-import-results");

    if (!results) {
      return;
    }

    results.replaceChildren();

    if (!providerProducts.length) {
      results.appendChild(
        createElement(
          "p",
          "product-list-empty",
          "No provider products matched your search."
        )
      );
      return;
    }

    providerProducts.forEach(function (product) {
      var productId =
        String(product.id || "");

      if (!productId) {
        return;
      }

      var card =
        createElement(
          "article",
          "provider-import-card"
        );

      var imageUrl =
        getSafeProviderImageUrl(
          product.image
        );

      if (imageUrl) {
        var image =
          createElement("img");

        image.src = imageUrl;
        image.alt = "";
        image.loading = "lazy";
        card.appendChild(image);
      }

      card.appendChild(
        createElement(
          "h3",
          "",
          product.name ||
          "Provider product"
        )
      );

      card.appendChild(
        createElement(
          "p",
          "",
          "Provider SKU: " +
            String(product.sku || "Unavailable")
        )
      );

      var sourcePrice =
        Number(
          product.referencePrice
        );

      if (
        Number.isFinite(sourcePrice) &&
        sourcePrice > 0
      ) {
        card.appendChild(
          createElement(
            "p",
            "",
            "Provider reference price: $" +
              sourcePrice.toFixed(2)
          )
        );
      }

      var importButton =
        createElement(
          "button",
          "",
          "Import Hidden Draft"
        );

      importButton.type = "button";
      importButton.addEventListener(
        "click",
        function () {
          importProviderProduct(
            productId,
            importButton
          );
        }
      );

      card.appendChild(importButton);
      results.appendChild(card);
    });
  }

  async function loadDropshippingProviders() {
    var providerSelect =
      getElement("provider-select");

    if (!providerSelect) {
      return false;
    }

    try {
      var data =
        await requestJson(
          DROPSHIPPING_URL +
            "/providers",
          {
            method: "GET",
            headers:
              getAdminHeaders(false)
          }
        );

      dropshippingProviders =
        Array.isArray(data.providers)
          ? data.providers
          : [];

      providerSelect.replaceChildren();

      dropshippingProviders.forEach(
        function (provider) {
          var option =
            createElement(
              "option",
              "",
              provider.name
            );

          option.value = provider.id;
          providerSelect.appendChild(option);
        }
      );

      selectedProviderId =
        dropshippingProviders.length
          ? dropshippingProviders[0].id
          : "";

      providerSelect.disabled =
        !selectedProviderId;

      var searchButton =
        getElement("provider-search-button");

      if (searchButton) {
        searchButton.disabled =
          !selectedProviderId;
      }

      if (!selectedProviderId) {
        showMessage(
          "No dropshipping providers are configured.",
          "error"
        );
      }

      return Boolean(selectedProviderId);
    } catch (error) {
      console.error(
        "Dropshipping providers could not be loaded.",
        error
      );

      showMessage(
        getRequestErrorMessage(
          error,
          "Dropshipping providers could not be loaded."
        ),
        "error"
      );

      return false;
    }
  }

  async function searchProviderProducts(event) {
    event.preventDefault();

    var searchInput =
      getElement("provider-product-search");

    var searchButton =
      getElement("provider-search-button");

    var results =
      getElement("provider-import-results");

    var keyword =
      String(
        searchInput &&
        searchInput.value ||
        ""
      ).trim();

    if (keyword.length < 2) {
      showMessage(
        "Enter at least two characters to search a provider catalog.",
        "error"
      );
      return;
    }

    selectedProviderId =
      String(
        getElement("provider-select").value ||
        ""
      );

    if (!selectedProviderId) {
      showMessage(
        "Select a dropshipping provider first.",
        "error"
      );
      return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Searching...";

    if (results) {
      results.replaceChildren(
        createElement(
          "p",
          "product-list-loading",
          "Searching provider catalog..."
        )
      );
    }

    try {
      var data =
        await requestJson(
          DROPSHIPPING_URL +
            "/" +
            encodeURIComponent(selectedProviderId) +
            "/products" +
            "?search=" +
            encodeURIComponent(keyword),
          {
            method: "GET",
            headers:
              getAdminHeaders(false)
          }
        );

      renderProviderProducts(
        getProviderProductResults(data)
      );

      showMessage(
        "Provider catalog search completed.",
        "success"
      );
    } catch (error) {
      console.error(
        "Provider product search failed.",
        error
      );

      if (results) {
        results.replaceChildren();
      }

      showMessage(
        getRequestErrorMessage(
          error,
          "Provider products could not be searched."
        ),
        "error"
      );
    } finally {
      searchButton.disabled = false;
      searchButton.textContent = "Search Provider";
    }
  }

  async function importProviderProduct(
    productId,
    importButton
  ) {
    importButton.disabled = true;
    importButton.textContent = "Importing...";

    try {
      var data =
        await requestJson(
          DROPSHIPPING_URL +
            "/" +
            encodeURIComponent(selectedProviderId) +
            "/products" +
            "/" +
            encodeURIComponent(productId) +
            "/import",
          {
            method: "POST",
            headers:
              getAdminHeaders(false)
          }
        );

      var productsReloaded =
        await loadProducts();

      importButton.textContent = "Imported";

      if (!productsReloaded) {
        showMessage(
          "Provider product imported, but the catalog list did not refresh. Use Refresh Products to reload it.",
          "error"
        );
        return;
      }

      showMessage(
        getErrorMessage(
          data.message,
          "Provider product imported as a hidden draft."
        ),
        "success"
      );
    } catch (error) {
      console.error(
        "Provider product import failed.",
        error
      );

      showMessage(
        getRequestErrorMessage(
          error,
          "The provider product could not be imported."
        ),
        "error"
      );

      importButton.disabled = false;
      importButton.textContent =
        "Import Hidden Draft";
    }
  }

  // ==========================================================
  // OPTIONAL DIRECT DELETE SUPPORT
  // ==========================================================

  async function deleteProduct(
    productId,
    productName,
    deleteButton
  ) {
    var confirmed =
      window.confirm(
        'Permanently delete the product "' +
        productName +
        '"?'
      );

    if (!confirmed) {
      return false;
    }

    if (deleteButton) {
      deleteButton.disabled = true;
      deleteButton.textContent =
        "Deleting...";
    }

    try {
      var data = await requestJson(
        PRODUCTS_URL +
        "/" +
        encodeURIComponent(productId),
        {
          method: "DELETE",
          headers:
            getAdminHeaders(false)
        }
      );

      products = products.filter(
        function (product) {
          return product.id !== productId;
        }
      );

      updateProductSummary();
      displayProducts();

      showMessage(
        getErrorMessage(
          data.message,
          "Product deleted successfully."
        ),
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Product deletion failed.",
        error
      );

      showMessage(
        getRequestErrorMessage(
          error,
          "The product could not be deleted."
        ),
        "error"
      );

      if (deleteButton) {
        deleteButton.disabled = false;
        deleteButton.textContent =
          "Delete";
      }

      return false;
    }
  }

  // ==========================================================
  // EVENT CONNECTIONS
  // ==========================================================

  function connectLogoutButtons() {
    [
      "admin-logout-button",
      "admin-navigation-logout-button"
    ].forEach(function (elementId) {
      var button = getElement(elementId);

      if (button) {
        button.addEventListener(
          "click",
          logoutAdmin
        );
      }
    });
  }

  function connectProductControls() {
    var providerImportForm =
      getElement("provider-import-form");

    var providerSelect =
      getElement("provider-select");

    var searchBox =
      getElement("searchBox");

    var statusFilter =
      getElement(
        "product-status-filter"
      );

    var refreshButton =
      getElement(
        "refresh-products-button"
      );

    if (searchBox) {
      searchBox.addEventListener(
        "input",
        displayProducts
      );
    }

    if (statusFilter) {
      statusFilter.addEventListener(
        "change",
        displayProducts
      );
    }

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        loadProducts
      );
    }

    if (providerImportForm) {
      providerImportForm.addEventListener(
        "submit",
        searchProviderProducts
      );
    }

    if (providerSelect) {
      providerSelect.addEventListener(
        "change",
        function () {
          selectedProviderId =
            String(providerSelect.value || "");
        }
      );
    }
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  async function initializePage() {
    connectLogoutButtons();
    connectProductControls();
    updateProductSummary();

    var validAdmin =
      await verifyAdmin();

    if (!validAdmin) {
      return;
    }

    await loadDropshippingProviders();
    await loadProducts();

    console.log(
      "MMC Product Management page initialized."
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializePage
    );
  } else {
    initializePage();
  }

  // ==========================================================
  // OPTIONAL INLINE SUPPORT
  // ==========================================================

  window.loadProducts = loadProducts;
  window.filterProducts = displayProducts;
  window.displayProducts = displayProducts;
  window.deleteProduct = deleteProduct;
  window.logoutAdmin = logoutAdmin;
}());