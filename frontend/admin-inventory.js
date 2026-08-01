const BACKEND_URL = "https://multi-maniacs-customs-backend.onrender.com";

let currentProduct = null;

// Load products into dropdown
async function loadProducts() {
  const res = await fetch(`${BACKEND_URL}/products`);
  const products = await res.json();

  const select = document.getElementById("productSelect");
  select.innerHTML = '<option value="">Select a product...</option>';

  products.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p._id;
    opt.textContent = `${p.name} - $${p.price}`;
    select.appendChild(opt);
  });
}

// When product selected, show stock
document.getElementById("productSelect").addEventListener("change", async function () {
  const id = this.value;
  if (!id) return;

  const res = await fetch(`${BACKEND_URL}/products/${id}`);
  currentProduct = await res.json();

  updateStockDisplay();
});

// Update stock display with warnings
function updateStockDisplay() {
  const stock = currentProduct.stock;
  const display = document.getElementById("stockDisplay");

  if (stock === 0) {
    display.innerHTML = `<span class="danger">OUT OF STOCK</span>`;
  } else if (stock <= 5) {
    display.innerHTML = `<span class="warning">Low Stock: ${stock}</span>`;
  } else {
    display.innerHTML = `Stock: ${stock}`;
  }
}

// Increase stock
async function increaseStock() {
  if (!currentProduct) return;

  const newStock = currentProduct.stock + 1;
  await updateStock(newStock);
}

// Decrease stock
async function decreaseStock() {
  if (!currentProduct) return;

  const newStock = Math.max(0, currentProduct.stock - 1);
  await updateStock(newStock);
}

// Send stock update to backend
async function updateStock(newStock) {
  const res = await fetch(`${BACKEND_URL}/products/${currentProduct._id}/stock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock: newStock })
  });

  const data = await res.json();
  document.getElementById("message").innerText = data.message || data.error;

  currentProduct.stock = newStock;
  updateStockDisplay();
}

// Init
document.addEventListener("DOMContentLoaded", loadProducts);
