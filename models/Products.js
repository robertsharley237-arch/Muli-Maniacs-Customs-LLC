// Load products from MMC backend (with inventory + variants)
let products = [];

async function loadProducts() {
  try {
    const res = await fetch("https://multi-maniacs-customs-backend.onrender.com/products");
    products = await res.json();
  } catch (err) {
    console.error("Failed to load products:", err);
  }
}

// Call on page load
loadProducts();
