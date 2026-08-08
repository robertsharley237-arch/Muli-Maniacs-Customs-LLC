const BACKEND_URL = "https://multi-maniacscustoms.vercel.app";

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

// Delete selected product
async function deleteProduct() {
  const id = document.getElementById("productSelect").value;

  if (!id) {
    alert("Select a product first.");
    return;
  }

  const confirmDelete = confirm("Are you sure you want to delete this product?");
  if (!confirmDelete) return;

  const res = await fetch(`${BACKEND_URL}/products/${id}`, {
    method: "DELETE"
  });

  const data = await res.json();
  document.getElementById("message").innerText = data.message || data.error;

  // Reload dropdown after deletion
  loadProducts();
}

// Init
document.addEventListener("DOMContentLoaded", loadProducts);
