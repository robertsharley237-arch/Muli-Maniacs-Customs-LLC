const API = "https://multi-maniacs-customs-backend.onrender.com";
const token = localStorage.getItem("MMC_ADMIN_TOKEN");

let currentProduct = null;

// ================================
// GET PRODUCT ID FROM URL
// ================================
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

// Load product immediately
if (productId) {
    loadProduct(productId);
}

// ================================
// LOAD PRODUCT
// ================================
async function loadProduct(id) {
    try {
        const res = await fetch(`${API}/products/${id}`);
        currentProduct = await res.json();

        // Fill product fields
        document.getElementById("p-name").value = currentProduct.name;
        document.getElementById("p-sku").value = currentProduct.sku;
        document.getElementById("p-price").value = currentProduct.price;
        document.getElementById("p-stock").value = currentProduct.stock;
        document.getElementById("p-category").value = currentProduct.category;
        document.getElementById("p-description").value = currentProduct.description;
        document.getElementById("p-image").value = currentProduct.image;

        document.getElementById("p-preview").src = currentProduct.image;

        renderVariants();

    } catch (err) {
        console.error("Failed to load product:", err);
        alert("Error loading product.");
    }
}

// ================================
// RENDER VARIANTS
// ================================
function renderVariants() {
    const box = document.getElementById("variantList");
    box.innerHTML = "";

    if (!currentProduct.variants || currentProduct.variants.length === 0) {
        box.innerHTML = "<p>No variants yet.</p>";
        return;
    }

    currentProduct.variants.forEach((v, i) => {
        const div = document.createElement("div");
        div.className = "variant-box";

        div.innerHTML = `
            <strong>${v.name}</strong> (${v.sku})<br><br>

            Price:
            <input value="${v.price}" onchange="updateVariantPrice(${i}, this.value)">

            Stock:
            <input value="${v.stock}" onchange="updateVariantStock(${i}, this.value)">

            <button onclick="deleteVariant(${i})" class="danger">Delete Variant</button>
        `;

        box.appendChild(div);
    });
}

// ================================
// VARIANT FUNCTIONS
// ================================
function updateVariantPrice(i, val) {
    currentProduct.variants[i].price = Number(val);
}

function updateVariantStock(i, val) {
    currentProduct.variants[i].stock = Number(val);
}

function deleteVariant(i) {
    currentProduct.variants.splice(i, 1);
    renderVariants();
}

function addVariant() {
    const name = document.getElementById("v-name").value;
    const sku = document.getElementById("v-sku").value;
    const price = Number(document.getElementById("v-price").value);
    const stock = Number(document.getElementById("v-stock").value);

    if (!name || !sku) return alert("Name and SKU required");

    currentProduct.variants.push({ name, sku, price, stock });
    renderVariants();
}

// ================================
// CLOUDINARY UPLOAD
// ================================
async function uploadProductImage() {
    const file = document.getElementById("p-image-file").files[0];
    if (!file) return alert("Select an image first.");

    const base64 = await convertToBase64(file);

    const res = await fetch(`${API}/upload/image`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ image: base64 })
    });

    const data = await res.json();

    document.getElementById("p-image").value = data.url;
    document.getElementById("p-preview").src = data.url;

    alert("Image uploaded!");
}

function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
    });
}

// ================================
// SAVE PRODUCT
// ================================
async function saveProduct() {
    const updated = {
        name: document.getElementById("p-name").value,
        sku: document.getElementById("p-sku").value,
        price: Number(document.getElementById("p-price").value),
        stock: Number(document.getElementById("p-stock").value),
        category: document.getElementById("p-category").value,
        description: document.getElementById("p-description").value,
        image: document.getElementById("p-image").value,
        variants: currentProduct.variants
    };

    const res = await fetch(`${API}/products/${productId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify(updated)
    });

    await res.json();
    alert("Product saved!");
}

// ================================
// DELETE PRODUCT
// ================================
async function deleteProduct() {
    if (!confirm("Delete this product?")) return;

    await fetch(`${API}/products/${productId}`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    alert("Product deleted!");
    window.location.href = "admin-products.html";
}
