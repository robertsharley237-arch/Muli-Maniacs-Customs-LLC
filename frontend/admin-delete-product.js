// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// DELETE PRODUCT ADMIN PAGE
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT multi-admin system
// ============================================================

(function () {
  "use strict";

  var DELETE_PRODUCT_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var DELETE_PRODUCT_ADMIN_API =
    DELETE_PRODUCT_BACKEND_URL +
    "/admin/products";

  var DELETE_PRODUCT_API =
    DELETE_PRODUCT_BACKEND_URL +
    "/products";

  var availableProducts = [];

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getDeleteProductElement(
    elementId
  ) {
    return document.getElementById(
      elementId
    );
  }

  function setDeleteProductText(
    elementId,
    value
  ) {
    var element =
      getDeleteProductElement(
        elementId
      );

    if (element) {
      element.textContent =
        String(
          value !== undefined &&
          value !== null
            ? value
            : ""
        );
    }
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
        DELETE_PRODUCT_BACKEND_URL +
        "/admin/me",
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readDeleteProductResponse(
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

      showDeleteProductMessage(
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
    setDeleteProductText(
      "admin-username",
      admin.username || ""
    );

    setDeleteProductText(
      "admin-role",
      formatAdminRole(
        admin.role
      )
    );
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

  async function readDeleteProductResponse(
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
        "You do not have permission to delete products."
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

  function showDeleteProductMessage(
    message,
    messageType
  ) {
    var messageElement =
      getDeleteProductElement(
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
      "product-information-message"
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
        "product-information-message"
      );
    }
  }

  function clearDeleteProductMessage() {
    var messageElement =
      getDeleteProductElement(
        "product-message"
      );

    if (!messageElement) {
      return;
    }

    messageElement.textContent = "";

    messageElement.classList.remove(
      "product-error",
      "product-success",
      "product-information-message"
    );
  }

  // ==========================================================
  // PRODUCT HELPERS
  // ==========================================================

  function normalizeProduct(product) {
    var variants =
      Array.isArray(
        product.variants
      )
        ? product.variants
        : [];

    return {
      id: String(
        product.id ||
        product._id ||
        ""
      ),

      name: String(
        product.name ||
        "Unnamed Product"
      ),

      sku: String(
        product.sku || ""
      ),

      price: Number(
        product.price || 0
      ),

      image: String(
        product.image || ""
      ),

      category: String(
        product.category ||
        "General"
      ),

      stock: Number(
        product.stock || 0
      ),

      variants: variants,

      active:
        product.active !== false
    };
  }

  function getSelectedProduct() {
    var productSelect =
      getDeleteProductElement(
        "productSelect"
      );

    if (!productSelect) {
      return null;
    }

    var selectedProductId =
      productSelect.value;

    return (
      availableProducts.find(
        function (product) {
          return (
            product.id ===
            selectedProductId
          );
        }
      ) ||
      null
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
  // LOAD PRODUCTS
  // ==========================================================

  async function loadProducts() {
    var productSelect =
      getDeleteProductElement(
        "productSelect"
      );

    var deleteButton =
      getDeleteProductElement(
        "delete-product-button"
      );

    if (!productSelect) {
      showDeleteProductMessage(
        "The product-selection dropdown could not be found.",
        "error"
      );

      return;
    }

    productSelect.disabled = true;

    if (deleteButton) {
      deleteButton.disabled = true;
    }

    productSelect.replaceChildren();

    var loadingOption =
      document.createElement(
        "option"
      );

    loadingOption.value = "";

    loadingOption.textContent =
      "Loading products...";

    productSelect.appendChild(
      loadingOption
    );

    try {
      var response = await fetch(
        DELETE_PRODUCT_ADMIN_API,
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readDeleteProductResponse(
          response
        );

      var productList =
        Array.isArray(data)
          ? data
          : Array.isArray(
              data.products
            )
            ? data.products
            : [];

      availableProducts =
        productList
          .map(normalizeProduct)
          .filter(
            function (product) {
              return Boolean(
                product.id
              );
            }
          )
          .sort(
            function (
              firstProduct,
              secondProduct
            ) {
              return firstProduct.name.localeCompare(
                secondProduct.name
              );
            }
          );

      productSelect.replaceChildren();

      var defaultOption =
        document.createElement(
          "option"
        );

      defaultOption.value = "";

      defaultOption.textContent =
        availableProducts.length > 0
          ? "Select a product..."
          : "No products are available";

      productSelect.appendChild(
        defaultOption
      );

      availableProducts.forEach(
        function (product) {
          var option =
            document.createElement(
              "option"
            );

          option.value =
            product.id;

          option.textContent =
            product.name +
            " | " +
            product.sku +
            " | " +
            formatProductCurrency(
              product.price
            );

          productSelect.appendChild(
            option
          );
        }
      );

      productSelect.disabled =
        availableProducts.length === 0;

      hideSelectedProductDetails();

      if (
        availableProducts.length === 0
      ) {
        showDeleteProductMessage(
          "No products are currently available to delete.",
          "information"
        );
      } else {
        clearDeleteProductMessage();
      }
    } catch (error) {
      console.error(
        "Products could not be loaded:",
        error
      );

      availableProducts = [];

      productSelect.replaceChildren();

      var errorOption =
        document.createElement(
          "option"
        );

      errorOption.value = "";

      errorOption.textContent =
        "Products unavailable";

      productSelect.appendChild(
        errorOption
      );

      productSelect.disabled = true;

      showDeleteProductMessage(
        error.message ||
        "The products could not be loaded.",
        "error"
      );
    }
  }

  // ==========================================================
  // SELECTED PRODUCT DETAILS
  // ==========================================================

  function displaySelectedProduct() {
    clearDeleteProductMessage();

    var product =
      getSelectedProduct();

    var confirmationCheckbox =
      getDeleteProductElement(
        "confirm-product-deletion"
      );

    if (confirmationCheckbox) {
      confirmationCheckbox.checked =
        false;
    }

    if (!product) {
      hideSelectedProductDetails();
      updateDeleteButtonState();
      return;
    }

    setDeleteProductText(
      "selected-product-name",
      product.name
    );

    setDeleteProductText(
      "selected-product-sku",
      product.sku ||
      "No SKU"
    );

    setDeleteProductText(
      "selected-product-price",
      formatProductCurrency(
        product.price
      )
    );

    setDeleteProductText(
      "selected-product-category",
      product.category ||
      "General"
    );

    setDeleteProductText(
      "selected-product-stock",
      product.stock
    );

    setDeleteProductText(
      "selected-product-variants",
      product.variants.length
    );

    setDeleteProductText(
      "selected-product-status",
      product.active
        ? "Active"
        : "Hidden"
    );

    displaySelectedProductImage(
      product
    );

    var detailsSection =
      getDeleteProductElement(
        "selected-product-details"
      );

    if (detailsSection) {
      detailsSection.hidden =
        false;
    }

    updateDeleteButtonState();
  }

  function displaySelectedProductImage(
    product
  ) {
    var productImage =
      getDeleteProductElement(
        "selected-product-image"
      );

    if (!productImage) {
      return;
    }

    if (!product.image) {
      productImage.hidden = true;

      productImage.removeAttribute(
        "src"
      );

      return;
    }

    productImage.src =
      product.image;

    productImage.alt =
      product.name +
      " product image";

    productImage.hidden = false;

    productImage.onerror =
      function () {
        productImage.hidden = true;

        productImage.removeAttribute(
          "src"
        );
      };
  }

  function hideSelectedProductDetails() {
    var detailsSection =
      getDeleteProductElement(
        "selected-product-details"
      );

    var productImage =
      getDeleteProductElement(
        "selected-product-image"
      );

    if (detailsSection) {
      detailsSection.hidden = true;
    }

    if (productImage) {
      productImage.hidden = true;

      productImage.removeAttribute(
        "src"
      );
    }

    setDeleteProductText(
      "selected-product-name",
      ""
    );

    setDeleteProductText(
      "selected-product-sku",
      ""
    );

    setDeleteProductText(
      "selected-product-price",
      ""
    );

    setDeleteProductText(
      "selected-product-category",
      ""
    );

    setDeleteProductText(
      "selected-product-stock",
      ""
    );

    setDeleteProductText(
      "selected-product-variants",
      ""
    );

    setDeleteProductText(
      "selected-product-status",
      ""
    );
  }

  // ==========================================================
  // DELETE BUTTON STATE
  // ==========================================================

  function updateDeleteButtonState() {
    var selectedProduct =
      getSelectedProduct();

    var confirmationCheckbox =
      getDeleteProductElement(
        "confirm-product-deletion"
      );

    var deleteButton =
      getDeleteProductElement(
        "delete-product-button"
      );

    if (!deleteButton) {
      return;
    }

    deleteButton.disabled =
      !selectedProduct ||
      !confirmationCheckbox ||
      !confirmationCheckbox.checked;
  }

  function setDeleteProductLoading(
    isLoading
  ) {
    var deleteButton =
      getDeleteProductElement(
        "delete-product-button"
      );

    if (!deleteButton) {
      return;
    }

    if (isLoading) {
      deleteButton.disabled = true;

      deleteButton.textContent =
        "Deleting Product...";
    } else {
      deleteButton.textContent =
        "Delete Selected Product";

      updateDeleteButtonState();
    }
  }

  // ==========================================================
  // DELETE PRODUCT
  // ==========================================================

  async function deleteProduct(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    clearDeleteProductMessage();

    var product =
      getSelectedProduct();

    var confirmationCheckbox =
      getDeleteProductElement(
        "confirm-product-deletion"
      );

    if (!product) {
      showDeleteProductMessage(
        "Select a product before deleting.",
        "error"
      );

      return;
    }

    if (
      !confirmationCheckbox ||
      !confirmationCheckbox.checked
    ) {
      showDeleteProductMessage(
        "Confirm that you understand the product deletion is permanent.",
        "error"
      );

      return;
    }

    var confirmed =
      window.confirm(
        'Permanently delete "' +
        product.name +
        '"?'
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleteProductLoading(
        true
      );

      showDeleteProductMessage(
        "Deleting product...",
        "information"
      );

      var response = await fetch(
        DELETE_PRODUCT_API +
        "/" +
        encodeURIComponent(
          product.id
        ),
        {
          method: "DELETE",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readDeleteProductResponse(
          response
        );

      showDeleteProductMessage(
        data.message ||
        (
          'The product "' +
          product.name +
          '" was deleted successfully.'
        ),
        "success"
      );

      if (confirmationCheckbox) {
        confirmationCheckbox.checked =
          false;
      }

      hideSelectedProductDetails();

      await loadProducts();
    } catch (error) {
      console.error(
        "Product deletion failed:",
        error
      );

      showDeleteProductMessage(
        error.message ||
        "The product could not be deleted.",
        "error"
      );
    } finally {
      setDeleteProductLoading(
        false
      );
    }
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

      var productSelect =
        getDeleteProductElement(
          "productSelect"
        );

      var confirmationCheckbox =
        getDeleteProductElement(
          "confirm-product-deletion"
        );

      var deleteForm =
        getDeleteProductElement(
          "delete-product-form"
        );

      var logoutButton =
        getDeleteProductElement(
          "admin-logout-button"
        );

      if (productSelect) {
        productSelect.addEventListener(
          "change",
          displaySelectedProduct
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
          deleteProduct
        );
      }

      if (logoutButton) {
        logoutButton.addEventListener(
          "click",
          logoutAdmin
        );
      }

      await loadProducts();
    }
  );

  // ==========================================================
  // OPTIONAL INLINE HTML SUPPORT
  // ==========================================================

  window.loadProducts =
    loadProducts;

  window.deleteProduct =
    deleteProduct;

  window.logoutAdmin =
    logoutAdmin;
})();