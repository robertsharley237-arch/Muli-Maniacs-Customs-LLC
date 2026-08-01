// admin-products.js
const token = localStorage.getItem("MMC_ADMIN_TOKEN");
if (!token) window.location.href = "admin-login.html";

let allProducts = [];

// ===============================
// Load Products From Backend
// ===============================
async function loadProducts() {
    try {
        const res = await fetch("/products", {
            headers: {
                "Authorization": token
            }
        });

        allProducts = await res.json();
        displayProducts(allProducts);

    } catch (err) {
        console.error("Error loading products:", err);
        document.getElementById("productList").innerHTML =
            "<p style='color:red;'>Failed to load products.</p>";
    }
}

// ===============================
// Display Products
// ===============================
function displayProducts(products) {
    const container = document.getElementById("productList");
    container.innerHTML = "";

    if (products.length === 0) {
        container.innerHTML = "<p>No products found.</p>";
        return;
    }

    products.forEach(p => {
        const box = document.createElement("div");
        box.className = "section";
        box.style.marginBottom = "20px";

        box.innerHTML = `
            <h3>${p.name}</h3>
            <p><strong>SKU:</strong> ${p.sku}</p>
            <p><strong>Price:</strong> $${p.price}</p>
            <p><strong>Stock:</strong> ${p.stock}</p>
            <p><strong>Category:</strong> ${p.category}</p>
            <p><strong>Status:</strong> ${p.active ? "Active" : "Inactive"}</p>

            <button onclick="editProduct('${p._id}')">✏️ Edit</button>
            <button onclick="deleteProduct('${p._id}')" class="danger">🗑️ Delete</button>
        `;

        container.appendChild(box);
    });
}

// ===============================
// Search / Filter Products
// ===============================
function filterProducts() {
    const query = document.getElementById("searchBox").value.toLowerCase();

    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );

    displayProducts(filtered);
}

// ===============================
// Edit Product
// ===============================
function editProduct(id) {
    localStorage.setItem("MMC_EDIT_PRODUCT_ID", id);
    navigate("admin-product");
}

// ===============================
// Delete Product
// ===============================
async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        await fetch(`/products/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": token
            }
        });

        alert("Product deleted.");
        loadProducts();

    } catch (err) {
        console.error("Delete error:", err);
        alert("Failed to delete product.");
    }
}

// ===============================
// Init
// ===============================
document.addEventListener("DOMContentLoaded", loadProducts);
