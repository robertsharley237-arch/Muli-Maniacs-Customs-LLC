// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADMIN PRODUCT MANAGEMENT
// ============================================================

(function () {
  "use strict";

  var BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var ADMIN_PRODUCTS_URL =
    BACKEND_URL +
    "/admin/products";

  var PRODUCTS_URL =
    BACKEND_URL +
    "/products";

  var products = [];

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getElement(elementId) {
    return document.getElementById(
      elementId
    );
  }

  function createElement(
    tagName,
    className,
    text
  ) {
    var node =
      document.createElement(
        tagName
      );

    if (className) {
      node.className =
        className;
    }

    if (text !== undefined) {
      node.textContent =
        text;
    }

    return node;
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
    includeJson
  ) {
    var headers = {
      Authorization:
        "Bearer " +
        getAdminToken()
    };

    if (includeJson) {
      headers["Content-Type"] =
        "application/json";
    }

    return headers;
  }

  function clearAdminSession() {
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
    clearAdminSession();

    window.location.href =
      "admin-login.html";
  }

  function logoutAdmin() {
    redirectToAdminLogin();
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readResponse(
    response
  ) {
    var data;

    try {
      data =
        await response.json();
    } catch (error) {
      data = {};
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
        "You do not have permission to manage products."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        (
          "Request failed with status " +
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
      getElement(
        "products-message"
      );

    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      message || "";

    messageBox.classList.remove(
      "products-error",
      "products-success",
      "products-information"
    );

    if (messageType === "error") {
      messageBox.classList.add(
        "products-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageBox.classList.add(
        "products-success"
      );
    } else {
      messageBox.classList.add(
        "products-information"
      );
    }
  }

  function clearMessage() {
    showMessage(
      "",
      "information"
    );
  }

  // ==========================================================
  // VERIFY ADMINISTRATOR
  // ==========================================================

  function formatAdminRole(role) {
    return String(role || "")
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  async function verifyAdmin() {
    if (!getAdminToken()) {
      redirectToAdminLogin();
      return false;
    }

    try {
      var response = await fetch(
        BACKEND_URL +
        "/admin/me",
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readResponse(
          response
        );

      var admin =
        data.admin || {};

      localStorage.setItem(
        "adminUser",
        JSON.stringify(admin)
      );

      var usernameElement =
        getElement(
          "admin-username"
        );

      var roleElement =
        getElement(
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

      return true;
    } catch (error) {
      console.error(
        "Administrator verification failed:",
        error
      );

      showMessage(
        error.message ||
        "The administrator session could not be verified.",
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // NORMALIZE PRODUCT
  // ==========================================================

  function normalizeProduct(
    product
  ) {
    var warningLevel =
      product.lowStockWarning;

    if (
      warningLevel === undefined
    ) {
      warningLevel =
        product.low_stock_warning;
    }

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

      price: Math.max(
        0,
        Number(
          product.price || 0
        )
      ),

      stock: Math.max(
        0,
        Number(
          product.stock || 0
        )
      ),

      category: String(
        product.category ||
        "General"
      ),

      description: String(
        product.description || ""
      ),

      image: String(
        product.image || ""
      ),

      active:
        product.active !== false,

      lowStockWarning: Math.max(
        0,
        Number(
          warningLevel === undefined
            ? 5
            : warningLevel
        )
      ),

      variants:
        Array.isArray(
          product.variants
        )
          ? product.variants
          : []
    };
  }

  // ==========================================================
  // PRODUCT HELPERS
  // ==========================================================

  function formatCurrency(value) {
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

  function getTotalStock(product) {
    if (
      product.variants.length === 0
    ) {
      return product.stock;
    }

    return product.variants.reduce(
      function (total, variant) {
        return (
          total +
          Math.max(
            0,
            Number(
              variant.stock || 0
            )
          )
        );
      },
      0
    );
  }

  function isOutOfStock(product) {
    return (
      getTotalStock(product) === 0
    );
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
  // CREATE PRODUCT DETAILS
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
  // OPEN PRODUCT ADMIN PAGES
  // ==========================================================

  function rememberProductAndOpen(
    productId,
    page
  ) {
    localStorage.setItem(
      "MMC_EDIT_PRODUCT_ID",
      productId
    );

    window.location.href =
      page;
  }

  // ==========================================================
  // CREATE PRODUCT CARD
  // ==========================================================

  function createProductCard(
    product
  ) {
    var card =
      createElement(
        "article",
        "product-card"
      );

    var imageContainer =
      createElement(
        "div",
        "product-image-container"
      );

    if (product.image) {
      var image =
        document.createElement(
          "img"
        );

      image.className =
        "product-image";

      image.src =
        product.image;

      image.alt =
        product.name;

      image.loading =
        "lazy";

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

      imageContainer.appendChild(
        image
      );
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
        (
          "product-status " +
          (
            product.active
              ? "status-active"
              : "status-hidden"
          )
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
        product.sku ||
        "No SKU"
      )
    );

    details.appendChild(
      createProductDetail(
        "Price",
        formatCurrency(
          product.price
        )
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
        String(
          getTotalStock(product)
        ),
        getStockClass(product)
      )
    );

    details.appendChild(
      createProductDetail(
        "Variants",
        String(
          product.variants.length
        )
      )
    );

    details.appendChild(
      createProductDetail(
        "Warning Level",
        String(
          product.lowStockWarning
        )
      )
    );

    content.appendChild(
      headingRow
    );

    content.appendChild(
      details
    );

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
        (
          "product-card-button " +
          "inventory-card-button"
        ),
        "Inventory"
      );

    var deleteButton =
      createElement(
        "button",
        (
          "product-card-button " +
          "delete-card-button"
        ),
        "Delete"
      );

    editButton.type =
      "button";

    inventoryButton.type =
      "button";

    deleteButton.type =
      "button";

    editButton.addEventListener(
      "click",
      function () {
        rememberProductAndOpen(
          product.id,
          "admin-edit-product.html"
        );
      }
    );

    inventoryButton.addEventListener(
      "click",
      function () {
        rememberProductAndOpen(
          product.id,
          "admin-inventory.html"
        );
      }
    );

    deleteButton.addEventListener(
      "click",
      function () {
        deleteProduct(
          product.id,
          product.name,
          deleteButton
        );
      }
    );

    actions.appendChild(
      editButton
    );

    actions.appendChild(
      inventoryButton
    );

    actions.appendChild(
      deleteButton
    );

    content.appendChild(
      actions
    );

    card.appendChild(
      imageContainer
    );

    card.appendChild(
      content
    );

    return card;
  }

  // ==========================================================
  // FILTER PRODUCTS
  // ==========================================================

  function getFilteredProducts() {
    var searchBox =
      getElement(
        "searchBox"
      );

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
        var searchableText = [
          product.name,
          product.sku,
          product.category,
          product.description
        ]
          .join(" ")
          .toLowerCase();

        var searchMatches =
          !searchQuery ||
          searchableText.indexOf(
            searchQuery
          ) >= 0;

        var statusMatches =
          true;

        if (
          selectedFilter === "active"
        ) {
          statusMatches =
            product.active;
        } else if (
          selectedFilter === "hidden"
        ) {
          statusMatches =
            !product.active;
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
      getElement(
        "productList"
      );

    if (!productList) {
      return;
    }

    var filteredProducts =
      getFilteredProducts();

    productList.replaceChildren();

    if (
      filteredProducts.length === 0
    ) {
      var emptyMessage =
        products.length
          ? "No products match the selected filters."
          : "No products found.";

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
    var activeCount = 0;
    var lowStockCount = 0;
    var outOfStockCount = 0;

    products.forEach(
      function (product) {
        if (product.active) {
          activeCount += 1;
        }

        if (isLowStock(product)) {
          lowStockCount += 1;
        }

        if (isOutOfStock(product)) {
          outOfStockCount += 1;
        }
      }
    );

    var totalElement =
      getElement(
        "total-products"
      );

    var activeElement =
      getElement(
        "active-products"
      );

    var lowStockElement =
      getElement(
        "low-stock-products"
      );

    var outOfStockElement =
      getElement(
        "out-of-stock-products"
      );

    if (totalElement) {
      totalElement.textContent =
        String(products.length);
    }

    if (activeElement) {
      activeElement.textContent =
        String(activeCount);
    }

    if (lowStockElement) {
      lowStockElement.textContent =
        String(lowStockCount);
    }

    if (outOfStockElement) {
      outOfStockElement.textContent =
        String(outOfStockCount);
    }
  }

  // ==========================================================
  // LOAD PRODUCTS
  // ==========================================================

  async function loadProducts() {
    var productList =
      getElement(
        "productList"
      );

    var refreshButton =
      getElement(
        "refresh-products-button"
      );

    if (productList) {
      productList.replaceChildren(
        createElement(
          "p",
          "product-list-loading",
          "Loading products..."
        )
      );
    }

    try {
      if (refreshButton) {
        refreshButton.disabled =
          true;

        refreshButton.textContent =
          "Refreshing...";
      }

      var response = await fetch(
        ADMIN_PRODUCTS_URL,
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readResponse(
          response
        );

      var productData;

      if (Array.isArray(data)) {
        productData = data;
      } else if (
        data &&
        Array.isArray(data.products)
      ) {
        productData =
          data.products;
      } else {
        productData = [];
      }

      products =
        productData
          .map(normalizeProduct)
          .filter(
            function (product) {
              return product.id !== "";
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

      updateProductSummary();
      displayProducts();
      clearMessage();
    } catch (error) {
      console.error(
        "Products could not be loaded:",
        error
      );

      products = [];

      updateProductSummary();

      if (productList) {
        productList.replaceChildren(
          createElement(
            "p",
            "product-list-empty",
            "Products could not be loaded."
          )
        );
      }

      showMessage(
        error.message ||
        "Products could not be loaded.",
        "error"
      );
    } finally {
      if (refreshButton) {
        refreshButton.disabled =
          false;

        refreshButton.textContent =
          "Refresh Products";
      }
    }
  }

  // ==========================================================
  // DELETE PRODUCT
  // ==========================================================

  async function deleteProduct(
    productId,
    productName,
    deleteButton
  ) {
    var confirmed =
      window.confirm(
        (
          "Permanently delete the " +
          "product \"" +
          productName +
          "\"?"
        )
      );

    if (!confirmed) {
      return;
    }

    try {
      if (deleteButton) {
        deleteButton.disabled =
          true;

        deleteButton.textContent =
          "Deleting...";
      }

      var response = await fetch(
        PRODUCTS_URL +
        "/" +
        encodeURIComponent(
          productId
        ),
        {
          method: "DELETE",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readResponse(
          response
        );

      products =
        products.filter(
          function (product) {
            return (
              product.id !==
              productId
            );
          }
        );

      updateProductSummary();
      displayProducts();

      showMessage(
        data.message ||
        "Product deleted successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Product deletion failed:",
        error
      );

      showMessage(
        error.message ||
        "The product could not be deleted.",
        "error"
      );

      if (deleteButton) {
        deleteButton.disabled =
          false;

        deleteButton.textContent =
          "Delete";
      }
    }
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    async function () {
      var validAdmin =
        await verifyAdmin();

      if (!validAdmin) {
        return;
      }

      var searchBox =
        getElement(
          "searchBox"
        );

      var statusFilter =
        getElement(
          "product-status-filter"
        );

      var refreshButton =
        getElement(
          "refresh-products-button"
        );

      var logoutButton =
        getElement(
          "admin-logout-button"
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
  // OPTIONAL INLINE SUPPORT
  // ==========================================================

  window.loadProducts =
    loadProducts;

  window.filterProducts =
    displayProducts;

  window.deleteProduct =
    deleteProduct;

  window.logoutAdmin =
    logoutAdmin;
}());