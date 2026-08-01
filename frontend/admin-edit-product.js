const BACKEND_URL = "https://multi-maniacs-customs-backend.onrender.com";

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

// When product is selected, load its data into form
document.getElementById("productSelect").addEventListener("change", async function () {
  const id = this.value;
  if (!id) return;

  const res = await fetch(`${BACKEND_URL}/products/${id}`);
  const p = await res.json();

  document.getElementById("name").value = p.name || "";
  document.getElementById("price").value = p.price || "";
  document.getElementById("description").value = p.description || "";
  document.getElementById("category").value = p.category || "";
  document.getElementById("stock").value = p.stock || 0;
  document.getElementById("image").value = p.image || "";
  document.getElementById("active").checked = !!p.active;
});

// Save changes
async function saveProduct() {
  const id = document.getElementById("productSelect").value;
  if (!id) {
    alert("Select a product first.");
    return;
  }

  const updates = {
    name: document.getElementById("name").value,
    price: Number(document.getElementById("price").value),
    description: document.getElementById("description").value,
    category: document.getElementById("category").value,
    stock: Number(document.getElementById("stock").value),
    image: document.getElementById("image").value,
    active: document.getElementById("active").checked
  };

  const res = await fetch(`${BACKEND_URL}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  const data = await res.json();
  document.getElementById("message").innerText = data.message || data.error || "Saved.";
}

// Init
document.addEventListener("DOMContentLoaded", loadProducts);
