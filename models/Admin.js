// ============================================================
// MULTI-MANIACS CUSTOMS LLC - ADMIN DASHBOARD
// Vercel + Neon PostgreSQL + JWT + Multer + Cloudinary
// ============================================================

const BACKEND_URL = window.MMC_BACKEND_URL || window.location.origin;

const PRODUCTS_API = `${BACKEND_URL}/products`;
const ADMIN_PRODUCTS_API = `${BACKEND_URL}/admin/products`;
const UPLOAD_API = `${BACKEND_URL}/upload/image`;

let uploadedImagePublicId = "";

// ============================================================
// AUTHENTICATION HELPERS
// ============================================================

function getAdminToken() {
  return localStorage.getItem("adminToken");
}

function getAdminHeaders(includeContentType = true) {
  const headers = {
    Authorization: `Bearer ${getAdminToken()}`
  };

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function redirectToLogin() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  window.location.href = "admin-login.html";
}

function logoutAdmin() {
  redirectToLogin();
}

async function readApiResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch (error) {
    data = {
      error: "The server returned an unexpected response."
    };
  }

  if (response.status === 401) {
    redirectToLogin();

    throw new Error(
      data.error || "Your admin session expired. Please log in again."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed with status ${response.status}.`
    );
  }

  return data;
}

async function verifyAdminSession() {
  if (!getAdminToken()) {
    redirectToLogin();
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/admin/me`, {
      method: "GET",
      headers: getAdminHeaders(false)
    });

    const data = await readApiResponse(response);

    localStorage.setItem(
      "adminUser",
      JSON.stringify(data.admin)
    );

    displayLoggedInAdmin(data.admin);

    return true;
  } catch (error) {
    console.error(
      "Admin session verification failed:",
      error
    );

    return false;
  }
}

function displayLoggedInAdmin(admin) {
  const usernameElement =
    document.getElementById("admin-username");

  const roleElement =
    document.getElementById("admin-role");

  if (usernameElement) {
    usernameElement.textContent = admin.username;
  }

  if (roleElement) {
    roleElement.textContent = admin.role;
  }
}

// ============================================================
// GENERAL HELPERS
// ============================================================

function formatPrice(value) {
  const price = Number(value);

  return Number.isFinite(price)
    ? price.toFixed(2)
    : "0.00";
}

function getProductId(product) {
  return String(
    product.id ||
    product._id ||
    ""
  );
}

function createElement(tagName, options = {}) {
  const element =
    document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.id) {
    element.id = options.id;
  }

  if (options.type) {
    element.type = options.type;
  }

  if (options.placeholder) {
    element.placeholder = options.placeholder;
  }

  if (options.min !== undefined) {
    element.min = options.min;
  }

  if (options.step !== undefined) {
    element.step = options.step;
  }

  return element;
}

function appendInformationLine(
  container,
  label,
  value
) {
  const paragraph =
    document.createElement("p");

  const boldLabel =
    document.createElement("strong");

  boldLabel.textContent = `${label}: `;

  paragraph.appendChild(boldLabel);

  paragraph.appendChild(
    document.createTextNode(
      String(value ?? "")
    )
  );

  container.appendChild(paragraph);
}

function createLabeledInput(
  labelText,
  inputOptions
) {
  const wrapper = createElement("div", {
    className: "admin-field"
  });

  const label = createElement("label", {
    text: labelText
  });

  const input = createElement(
    "input",
    inputOptions
  );

  label.htmlFor = input.id;

  wrapper.appendChild(label);
  wrapper.appendChild(input);

  return {
    wrapper,
    input
  };
}

// ============================================================
// CLOUDINARY IMAGE UPLOAD
// ============================================================

async function uploadImage() {
  const fileInput =
    document.getElementById("p-image-file");

  const imageUrlInput =
    document.getElementById("p-image");

  const uploadButton =
    document.getElementById(
      "upload-image-button"
    );

  const file =
    fileInput &&
    fileInput.files &&
    fileInput.files[0];

  if (!file) {
    alert("Please select an image.");
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert(
      "Please select a valid image file."
    );

    return;
  }

  const formData = new FormData();

  formData.append("image", file);

  try {
    if (uploadButton) {
      uploadButton.disabled = true;
      uploadButton.textContent =
        "Uploading...";
    }

    const response = await fetch(
      UPLOAD_API,
      {
        method: "POST",
        headers: getAdminHeaders(false),
        body: formData
      }
    );

    const data =
      await readApiResponse(response);

    if (imageUrlInput) {
      imageUrlInput.value = data.url;
    }

    uploadedImagePublicId =
      data.public_id || "";

    alert(
      "Image uploaded successfully."
    );
  } catch (error) {
    console.error(
      "Image upload failed:",
      error
    );

    alert(
      error.message ||
      "Image upload failed."
    );
  } finally {
    if (uploadButton) {
      uploadButton.disabled = false;
      uploadButton.textContent =
        "Upload Image";
    }
  }
}

// ============================================================
// LOAD ADMIN PRODUCTS
// ============================================================

async function loadAdminProducts() {
  const container =
    document.getElementById(
      "admin-products"
    );

  if (!container) {
    return;
  }

  container.replaceChildren(
    createElement("p", {
      text: "Loading products..."
    })
  );

  try {
    const response = await fetch(
      ADMIN_PRODUCTS_API,
      {
        method: "GET",
        headers: getAdminHeaders(false)
      }
    );

    const products =
      await readApiResponse(response);

    container.replaceChildren();

    if (
      !Array.isArray(products) ||
      products.length === 0
    ) {
      container.appendChild(
        createElement("p", {
          text:
            "No products have been added yet."
        })
      );

      return;
    }

    products.forEach((product) => {
      container.appendChild(
        createProductCard(product)
      );
    });
  } catch (error) {
    console.error(
      "Failed to load products:",
      error
    );

    container.replaceChildren(
      createElement("p", {
        className: "admin-error",
        text:
          error.message ||
          "Failed to load products."
      })
    );
  }
}

// ============================================================
// CREATE PRODUCT CARD
// ============================================================

function createProductCard(product) {
  const productId =
    getProductId(product);

  const variants =
    Array.isArray(product.variants)
      ? product.variants
      : [];

  const card = createElement("section", {
    className: "admin-product"
  });

  card.dataset.productId = productId;

  card.appendChild(
    createElement("h3", {
      text:
        product.name ||
        "Unnamed Product"
    })
  );

  if (product.image) {
    const image =
      document.createElement("img");

    image.src = product.image;

    image.alt =
      product.name ||
      "Product image";

    image.className = "admin-img";
    image.loading = "lazy";

    image.addEventListener(
      "error",
      () => {
        image.remove();
      }
    );

    card.appendChild(image);
  }

  appendInformationLine(
    card,
    "SKU",
    product.sku || ""
  );

  appendInformationLine(
    card,
    "Price",
    `$${formatPrice(product.price)}`
  );

  appendInformationLine(
    card,
    "Stock",
    Number(product.stock || 0)
  );

  appendInformationLine(
    card,
    "Category",
    product.category || "General"
  );

  appendInformationLine(
    card,
    "Description",
    product.description || ""
  );

  card.appendChild(
    createElement("h4", {
      text: "Variants"
    })
  );

  const variantList =
    createElement("div", {
      className: "variant-list"
    });

  if (variants.length === 0) {
    variantList.appendChild(
      createElement("p", {
        text:
          "No variants have been added."
      })
    );
  } else {
    variants.forEach(
      (variant, index) => {
        variantList.appendChild(
          createVariantItem(
            productId,
            variant,
            index
          )
        );
      }
    );
  }

  card.appendChild(variantList);

  card.appendChild(
    createAddVariantSection(productId)
  );

  card.appendChild(
    createProductStockSection(productId)
  );

  const deleteButton =
    createElement("button", {
      className: "remove-btn",
      text: "Delete Product",
      type: "button"
    });

  deleteButton.addEventListener(
    "click",
    () => {
      deleteProduct(productId);
    }
  );

  card.appendChild(deleteButton);

  return card;
}

// ============================================================
// CREATE VARIANT ITEM
// ============================================================

function createVariantItem(
  productId,
  variant,
  variantIndex
) {
  const item = createElement("div", {
    className: "variant-item"
  });

  const information =
    createElement("p", {
      text:
        `${variant.name || "Unnamed Variant"} | ` +
        `SKU: ${variant.sku || ""} | ` +
        `Price: $${formatPrice(variant.price)} | ` +
        `Stock: ${Number(variant.stock || 0)}`
    });

  item.appendChild(information);

  const stockField =
    createLabeledInput(
      "New variant stock",
      {
        id:
          `v-stock-${productId}-` +
          `${variantIndex}`,
        type: "number",
        placeholder: "New Stock",
        min: "0",
        step: "1"
      }
    );

  const updateButton =
    createElement("button", {
      className: "btn-small",
      text: "Update Stock",
      type: "button"
    });

  updateButton.addEventListener(
    "click",
    () => {
      updateVariantStock(
        productId,
        variantIndex
      );
    }
  );

  const deleteButton =
    createElement("button", {
      className: "remove-btn-small",
      text: "Delete Variant",
      type: "button"
    });

  deleteButton.addEventListener(
    "click",
    () => {
      deleteVariant(
        productId,
        variantIndex
      );
    }
  );

  item.appendChild(stockField.wrapper);
  item.appendChild(updateButton);
  item.appendChild(deleteButton);

  return item;
}

// ============================================================
// CREATE ADD VARIANT SECTION
// ============================================================

function createAddVariantSection(
  productId
) {
  const section = createElement("div", {
    className: "add-variant-section"
  });

  section.appendChild(
    createElement("h4", {
      text: "Add Variant"
    })
  );

  const nameField =
    createLabeledInput(
      "Variant name",
      {
        id: `v-name-${productId}`,
        type: "text",
        placeholder:
          "Red, XL, Gloss"
      }
    );

  const skuField =
    createLabeledInput(
      "Variant SKU",
      {
        id: `v-sku-${productId}`,
        type: "text",
        placeholder:
          "MMC-001-RED"
      }
    );

  const priceField =
    createLabeledInput(
      "Variant price",
      {
        id: `v-price-${productId}`,
        type: "number",
        placeholder:
          "Variant Price",
        min: "0",
        step: "0.01"
      }
    );

  const stockField =
    createLabeledInput(
      "Variant stock",
      {
        id:
          `v-stock-new-${productId}`,
        type: "number",
        placeholder:
          "Variant Stock",
        min: "0",
        step: "1"
      }
    );

  const addButton =
    createElement("button", {
      className: "btn-small",
      text: "Add Variant",
      type: "button"
    });

  addButton.addEventListener(
    "click",
    () => {
      addVariant(productId);
    }
  );

  section.appendChild(
    nameField.wrapper
  );

  section.appendChild(
    skuField.wrapper
  );

  section.appendChild(
    priceField.wrapper
  );

  section.appendChild(
    stockField.wrapper
  );

  section.appendChild(addButton);

  return section;
}

// ============================================================
// CREATE PRODUCT STOCK SECTION
// ============================================================

function createProductStockSection(
  productId
) {
  const section = createElement("div", {
    className:
      "product-stock-section"
  });

  section.appendChild(
    createElement("h4", {
      text: "Update Product Stock"
    })
  );

  const stockField =
    createLabeledInput(
      "New product stock",
      {
        id: `p-stock-${productId}`,
        type: "number",
        placeholder: "New Stock",
        min: "0",
        step: "1"
      }
    );

  const updateButton =
    createElement("button", {
      className: "btn-small",
      text: "Update Stock",
      type: "button"
    });

  updateButton.addEventListener(
    "click",
    () => {
      updateProductStock(productId);
    }
  );

  section.appendChild(
    stockField.wrapper
  );

  section.appendChild(updateButton);

  return section;
}

// ============================================================
// ADD PRODUCT
// ============================================================

async function addProduct(event) {
  if (event) {
    event.preventDefault();
  }

  const nameInput =
    document.getElementById("p-name");

  const skuInput =
    document.getElementById("p-sku");

  const priceInput =
    document.getElementById("p-price");

  const imageInput =
    document.getElementById("p-image");

  const stockInput =
    document.getElementById("p-stock");

  const categoryInput =
    document.getElementById(
      "p-category"
    );

  const descriptionInput =
    document.getElementById("p-desc");

  const name =
    nameInput
      ? nameInput.value.trim()
      : "";

  const sku =
    skuInput
      ? skuInput.value.trim()
      : "";

  const price = Number(
    priceInput
      ? priceInput.value
      : ""
  );

  const image =
    imageInput
      ? imageInput.value.trim()
      : "";

  const stock = Number(
    stockInput
      ? stockInput.value || 0
      : 0
  );

  const category =
    categoryInput &&
    categoryInput.value.trim()
      ? categoryInput.value.trim()
      : "General";

  const description =
    descriptionInput
      ? descriptionInput.value.trim()
      : "";

  if (!name) {
    alert(
      "Product name is required."
    );

    return;
  }

  if (!sku) {
    alert(
      "Product SKU is required."
    );

    return;
  }

  if (!image) {
    alert(
      "Upload a product image before adding the product."
    );

    return;
  }

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    alert(
      "Please enter a valid product price."
    );

    return;
  }

  if (
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    alert(
      "Please enter a valid whole-number stock amount."
    );

    return;
  }

  const product = {
    name,
    sku,
    price,
    image,
    imagePublicId:
      uploadedImagePublicId,
    stock,
    category,
    description,
    variants: [],
    lowStockWarning: 5,
    active: true
  };

  try {
    const response = await fetch(
      PRODUCTS_API,
      {
        method: "POST",
        headers: getAdminHeaders(true),
        body: JSON.stringify(product)
      }
    );

    await readApiResponse(response);

    alert(
      "Product added successfully."
    );

    clearAddProductForm();

    await loadAdminProducts();
  } catch (error) {
    console.error(
      "Add product failed:",
      error
    );

    alert(
      error.message ||
      "Failed to add product."
    );
  }
}

function clearAddProductForm() {
  const inputIds = [
    "p-name",
    "p-sku",
    "p-price",
    "p-image",
    "p-stock",
    "p-category",
    "p-desc",
    "p-image-file"
  ];

  inputIds.forEach((id) => {
    const element =
      document.getElementById(id);

    if (element) {
      element.value = "";
    }
  });

  uploadedImagePublicId = "";
}

// ============================================================
// UPDATE PRODUCT STOCK
// ============================================================

async function updateProductStock(
  productId
) {
  const stockInput =
    document.getElementById(
      `p-stock-${productId}`
    );

  const stock = Number(
    stockInput
      ? stockInput.value
      : ""
  );

  if (
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    alert(
      "Please enter a valid whole-number stock amount."
    );

    return;
  }

  try {
    const response = await fetch(
      `${PRODUCTS_API}/${productId}/stock`,
      {
        method: "PUT",
        headers: getAdminHeaders(true),
        body: JSON.stringify({
          stock
        })
      }
    );

    await readApiResponse(response);

    alert(
      "Product stock updated."
    );

    await loadAdminProducts();
  } catch (error) {
    console.error(
      "Product stock update failed:",
      error
    );

    alert(
      error.message ||
      "Failed to update product stock."
    );
  }
}

// ============================================================
// ADD VARIANT
// ============================================================

async function addVariant(productId) {
  const nameInput =
    document.getElementById(
      `v-name-${productId}`
    );

  const skuInput =
    document.getElementById(
      `v-sku-${productId}`
    );

  const priceInput =
    document.getElementById(
      `v-price-${productId}`
    );

  const stockInput =
    document.getElementById(
      `v-stock-new-${productId}`
    );

  const name =
    nameInput
      ? nameInput.value.trim()
      : "";

  const sku =
    skuInput
      ? skuInput.value.trim()
      : "";

  const price = Number(
    priceInput
      ? priceInput.value
      : ""
  );

  const stock = Number(
    stockInput
      ? stockInput.value
      : ""
  );

  if (!name) {
    alert(
      "Variant name is required."
    );

    return;
  }

  if (!sku) {
    alert(
      "Variant SKU is required."
    );

    return;
  }

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    alert(
      "Please enter a valid variant price."
    );

    return;
  }

  if (
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    alert(
      "Please enter a valid whole-number variant stock amount."
    );

    return;
  }

  const variant = {
    name,
    sku,
    price,
    stock,
    image: ""
  };

  try {
    const response = await fetch(
      `${PRODUCTS_API}/${productId}/variants`,
      {
        method: "POST",
        headers: getAdminHeaders(true),
        body: JSON.stringify(variant)
      }
    );

    await readApiResponse(response);

    alert(
      "Variant added successfully."
    );

    await loadAdminProducts();
  } catch (error) {
    console.error(
      "Add variant failed:",
      error
    );

    alert(
      error.message ||
      "Failed to add variant."
    );
  }
}

// ============================================================
// UPDATE VARIANT STOCK
// ============================================================

async function updateVariantStock(
  productId,
  variantIndex
) {
  const stockInput =
    document.getElementById(
      `v-stock-${productId}-${variantIndex}`
    );

  const stock = Number(
    stockInput
      ? stockInput.value
      : ""
  );

  if (
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    alert(
      "Please enter a valid whole-number variant stock amount."
    );

    return;
  }

  try {
    const response = await fetch(
      `${PRODUCTS_API}/${productId}/stock`,
      {
        method: "PUT",
        headers: getAdminHeaders(true),
        body: JSON.stringify({
          stock,
          variantIndex
        })
      }
    );

    await readApiResponse(response);

    alert(
      "Variant stock updated."
    );

    await loadAdminProducts();
  } catch (error) {
    console.error(
      "Variant stock update failed:",
      error
    );

    alert(
      error.message ||
      "Failed to update variant stock."
    );
  }
}

// ============================================================
// DELETE VARIANT
// ============================================================

async function deleteVariant(
  productId,
  variantIndex
) {
  const confirmed =
    window.confirm(
      "Are you sure you want to delete this variant?"
    );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${PRODUCTS_API}/${productId}/variants/${variantIndex}`,
      {
        method: "DELETE",
        headers: getAdminHeaders(false)
      }
    );

    await readApiResponse(response);

    alert("Variant deleted.");

    await loadAdminProducts();
  } catch (error) {
    console.error(
      "Delete variant failed:",
      error
    );

    alert(
      error.message ||
      "Failed to delete variant."
    );
  }
}

// ============================================================
// DELETE PRODUCT
// ============================================================

async function deleteProduct(
  productId
) {
  const confirmed =
    window.confirm(
      "Are you sure you want to permanently delete this product?"
    );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${PRODUCTS_API}/${productId}`,
      {
        method: "DELETE",
        headers: getAdminHeaders(false)
      }
    );

    await readApiResponse(response);

    alert("Product deleted.");

    await loadAdminProducts();
  } catch (error) {
    console.error(
      "Delete product failed:",
      error
    );

    alert(
      error.message ||
      "Failed to delete product."
    );
  }
}

// ============================================================
// MULTI-ADMIN HELPERS
// Only a super admin can use these routes successfully.
// ============================================================

async function createAdminUser(
  username,
  password,
  role = "admin"
) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/register`,
      {
        method: "POST",
        headers: getAdminHeaders(true),
        body: JSON.stringify({
          username,
          password,
          role
        })
      }
    );

    const data =
      await readApiResponse(response);

    alert(
      "Administrator created successfully."
    );

    return data.admin;
  } catch (error) {
    console.error(
      "Create administrator failed:",
      error
    );

    alert(
      error.message ||
      "Failed to create administrator."
    );

    return null;
  }
}

async function loadAdminUsers() {
  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/users`,
      {
        method: "GET",
        headers: getAdminHeaders(false)
      }
    );

    return await readApiResponse(
      response
    );
  } catch (error) {
    console.error(
      "Load administrators failed:",
      error
    );

    return [];
  }
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

    await loadAdminProducts();

    const productForm =
      document.getElementById(
        "add-product-form"
      );

    if (productForm) {
      productForm.addEventListener(
        "submit",
        addProduct
      );
    }

    const uploadButton =
      document.getElementById(
        "upload-image-button"
      );

    if (uploadButton) {
      uploadButton.addEventListener(
        "click",
        uploadImage
      );
    }

    const logoutButton =
      document.getElementById(
        "admin-logout-button"
      );

    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        logoutAdmin
      );
    }
  }
);

// ============================================================
// SUPPORT EXISTING INLINE HTML BUTTONS
// ============================================================

window.uploadImage =
  uploadImage;

window.addProduct =
  addProduct;

window.updateProductStock =
  updateProductStock;

window.addVariant =
  addVariant;

window.updateVariantStock =
  updateVariantStock;

window.deleteVariant =
  deleteVariant;

window.deleteProduct =
  deleteProduct;

window.logoutAdmin =
  logoutAdmin;

window.createAdminUser =
  createAdminUser;

window.loadAdminUsers =
  loadAdminUsers;