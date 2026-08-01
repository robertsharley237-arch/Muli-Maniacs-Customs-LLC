const API = "https://multi-maniacs-customs-backend.onrender.com";
const token = localStorage.getItem("MMC_ADMIN_TOKEN");

let variants = []; // store variants before saving product

// ================================
// ADD VARIANT
// ================================
function addVariant() {
    const name = document.getElementById("v-name").value;
    const sku = document.getElementById("v-sku").value;
    const price = Number(document.getElementById("v-price").value);
    const stock = Number(document.getElementById("v-stock").value);

    if (!name || !sku) return alert("Variant name and SKU required.");

    variants.push({ name, sku, price, stock });

    renderVariants();
}

// ================================
// RENDER VARIANTS
// ================================
function renderVariants() {
    const box = document.getElementById("variantList");
    box.innerHTML = "";

    variants.forEach((v, i) => {
        const div = document.createElement("div");
        div.className = "variant-box";

        div.innerHTML = `
            <strong>${v.name}</strong> (${v.sku})<br><br>
            Price: $${v.price}<br>
            Stock: ${v.stock}<br><br>

            <button class="danger" onclick="deleteVariant(${i})">Delete Variant</button>
        `;

        box.appendChild(div);
    });
}

function deleteVariant(i) {
    variants.splice(i, 1);
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
// SAVE PRODUCT  (FIXED ROUTE)
// ================================
async function saveProduct() {
    const product = {
        name: document.getElementById("p-name").value,
        sku: document.getElementById("p-sku").value,
        price: Number(document.getElementById("p-price").value),
        stock: Number(document.getElementById("p-stock").value),
        category: document.getElementById("p-category").value,
        description: document.getElementById("p-description").value,
        image: document.getElementById("p-image").value,
        variants: variants
    };

    const res = await fetch(`${API}/products/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify(product)
    });

    const data = await res.json();

    alert("Product added!");
    window.location.href = "admin-products.html";
}
