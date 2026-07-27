// ================================
// ADMIN DASHBOARD FOR MMC
// ================================

const API = "https://multi-maniacs-customs-backend.onrender.com/products";
const UPLOAD_API = "https://multi-maniacs-customs-backend.onrender.com/upload";

// ================================
// IMAGE UPLOAD (CLOUDINARY)
// ================================
async function uploadImage() {
    const fileInput = document.getElementById("p-image-file");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an image.");
        return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
        const res = await fetch(UPLOAD_API, {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        document.getElementById("p-image").value = data.url;

        alert("Image uploaded!");
    } catch (err) {
        console.error("Upload failed:", err);
        alert("Image upload failed.");
    }
}

// ================================
// LOAD PRODUCTS
// ================================
async function loadAdminProducts() {
    const res = await fetch(API);
    const products = await res.json();

    const container = document.getElementById("admin-products");
    container.innerHTML = "";

    products.forEach((p, index) => {
        container.innerHTML += `
            <div class="admin-product">
                <h3>${p.name}</h3>
                <img src="${p.image}" class="admin-img">
                <p><b>SKU:</b> ${p.sku}</p>
                <p><b>Price:</b> $${p.price}</p>
                <p><b>Stock:</b> ${p.stock}</p>
                <p><b>Category:</b> ${p.category}</p>
                <p><b>Description:</b> ${p.description}</p>

                <h4>Variants</h4>
                <div class="variant-list">
                    ${p.variants.map((v, i) => `
                        <div class="variant-item">
                            <p>${v.name} — $${v.price} — Stock: ${v.stock}</p>
                            <input id="v-stock-${p._id}-${i}" placeholder="New Stock">
                            <button onclick="updateVariantStock('${p._id}', ${i})" class="btn-small">Update</button>
                            <button onclick="deleteVariant('${p._id}', ${i})" class="remove-btn-small">Delete</button>
                        </div>
                    `).join("")}
                </div>

                <h4>Add Variant</h4>
                <input id="v-name-${p._id}" placeholder="Variant Name (Red, XL)">
                <input id="v-sku-${p._id}" placeholder="Variant SKU (MMC-001-RED)">
                <input id="v-price-${p._id}" placeholder="Variant Price">
                <input id="v-stock-new-${p._id}" placeholder="Variant Stock">
                <button onclick="addVariant('${p._id}')" class="btn-small">Add Variant</button>

                <h4>Update Product Stock</h4>
                <input id="p-stock-${p._id}" placeholder="New Stock">
                <button onclick="updateProductStock('${p._id}')" class="btn-small">Update Stock</button>

                <button onclick="deleteProduct('${p._id}')" class="remove-btn">Delete Product</button>
            </div>
        `;
    });
}

document.addEventListener("DOMContentLoaded", loadAdminProducts);

// ================================
// ADD PRODUCT
// ================================
async function addProduct() {
    const body = {
        name: document.getElementById("p-name").value,
        sku: document.getElementById("p-sku").value,
        price: Number(document.getElementById("p-price").value),
        image: document.getElementById("p-image").value,
        stock: Number(document.getElementById("p-stock").value),
        category: document.getElementById("p-category").value,
        description: document.getElementById("p-desc").value,
        variants: []
    };

    const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    alert("Product added!");
    loadAdminProducts();
}

// ================================
// UPDATE PRODUCT STOCK
// ================================
async function updateProductStock(id) {
    const stock = Number(document.getElementById(`p-stock-${id}`).value);

    await fetch(`${API}/${id}/stock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock })
    });

    alert("Stock updated!");
    loadAdminProducts();
}

// ================================
// ADD VARIANT
// ================================
async function addVariant(id) {
    const name = document.getElementById(`v-name-${id}`).value;
    const sku = document.getElementById(`v-sku-${id}`).value;
    const price = Number(document.getElementById(`v-price-${id}`).value);
    const stock = Number(document.getElementById(`v-stock-new-${id}`).value);

    const res = await fetch(`${API}/${id}`);
    const product = await res.json();

    product.variants.push({ name, sku, price, stock });

    await fetch(`${API}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
    });

    alert("Variant added!");
    loadAdminProducts();
}

// ================================
// UPDATE VARIANT STOCK
// ================================
async function updateVariantStock(id, variantIndex) {
    const stock = Number(document.getElementById(`v-stock-${id}-${variantIndex}`).value);

    await fetch(`${API}/${id}/stock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock, variantIndex })
    });

    alert("Variant stock updated!");
    loadAdminProducts();
}

// ================================
// DELETE VARIANT
// ================================
async function deleteVariant(id, variantIndex) {
    const res = await fetch(`${API}/${id}`);
    const product = await res.json();

    product.variants.splice(variantIndex, 1);

    await fetch(`${API}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
    });

    alert("Variant deleted!");
    loadAdminProducts();
}

// ================================
// DELETE PRODUCT
// ================================
async function deleteProduct(id) {
    await fetch(`${API}/${id}`, { method: "DELETE" });
    alert("Product deleted!");
    loadAdminProducts();
}
