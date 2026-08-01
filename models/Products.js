const BACKEND_URL = "https://multi-maniacs-customs-backend.onrender.com";

let product = null;

// Load single product + variants
async function loadProduct(productId) {
  try {
    const res = await fetch(`${BACKEND_URL}/products/${productId}`);
    product = await res.json();

    renderProduct();
    renderVariants();
  } catch (err) {
    console.error("Failed to load product:", err);
  }
}

// Render main product info
function renderProduct() {
  document.getElementById("productName").innerText = product.name;
  document.getElementById("productDescription").innerText = product.description;
  document.getElementById("productImage").src = product.image;
  document.getElementById("productPrice").innerText = `$${product.price}`;
}

// Render variant dropdown
function renderVariants() {
  const select = document.getElementById("variantSelect");
  select.innerHTML = '<option value="">Select a variant...</option>';

  product.variants.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v._id;
    opt.textContent = `${v.name} - $${v.price}`;
    select.appendChild(opt);
  });
}

// When variant selected
document.getElementById("variantSelect").addEventListener("change", function () {
  const variantId = this.value;
  if (!variantId) return;

  const variant = product.variants.find(v => v._id === variantId);

  // Update price
  document.getElementById("productPrice").innerText = `$${variant.price}`;

  // Update image if variant has one
  if (variant.image) {
    document.getElementById("productImage").src = variant.image;
  }

  // Update stock display
  const stockDisplay = document.getElementById("stockDisplay");
  if (variant.stock === 0) {
    stockDisplay.innerHTML = `<span style="color:red;">OUT OF STOCK</span>`;
  } else {
    stockDisplay.innerText = `In Stock: ${variant.stock}`;
  }
});

// Add to cart with variant
async function addToCart() {
  const variantId = document.getElementById("variantSelect").value;

  if (!variantId) {
    alert("Select a variant first.");
    return;
  }

  const variant = product.variants.find(v => v._id === variantId);

  if (variant.stock <= 0) {
    alert("This variant is out of stock.");
    return;
  }

  // Build cart item
  const item = {
    id: product._id,
    name: product.name,
    price: variant.price,
    sku: variant.sku,
    image: variant.image || product.image,
    variantId: variant._id,
    variantName: variant.name
  };

  // Load cart
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.push(item);
  localStorage.setItem("cart", JSON.stringify(cart));

  alert("Added to cart!");
}
