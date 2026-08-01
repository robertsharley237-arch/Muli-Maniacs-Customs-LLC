// ================================
// SHOP PAGE SCRIPT (FULL VARIANT SUPPORT)
// Loads products from backend + displays them
// ================================

// 1. Load products from your backend
async function loadProducts() {
    try {
        const res = await fetch("https://multi-maniacs-customs-backend.onrender.com/products");
        const products = await res.json();
        displayProducts(products);
    } catch (err) {
        console.error("Failed to load products:", err);
    }
}

// ================================
// 2. Display products on the page
// ================================
function displayProducts(products) {
    const grid = document.getElementById("productGrid");
    grid.innerHTML = "";

    products.forEach(p => {

        // -------------------------------
        // VARIANT PRICE RANGE SUPPORT
        // -------------------------------
        let priceDisplay = `$${p.price}`;

        if (p.variants && p.variants.length > 0) {
            const prices = p.variants.map(v => v.price);
            const min = Math.min(...prices);
            const max = Math.max(...prices);

            priceDisplay = min === max ? `$${min}` : `From $${min}`;
        }

        // -------------------------------
        // VARIANT IMAGE SUPPORT
        // -------------------------------
        let imageToShow = p.image;

        if (p.variants && p.variants.length > 0) {
            const firstVariantWithImage = p.variants.find(v => v.image);
            if (firstVariantWithImage) {
                imageToShow = firstVariantWithImage.image;
            }
        }

        // -------------------------------
        // PRODUCT CARD (MMC STYLE PRESERVED)
        // -------------------------------
        grid.innerHTML += `
            <div class="product-card" style="background:#fff; color:#000; padding:15px; margin:10px; border-radius:10px;">
                
                <img src="${imageToShow}" alt="${p.name}" style="width:100%; border-radius:10px;">

                <h3>${p.name}</h3>
                <p>${p.description}</p>

                <p><strong>${priceDisplay}</strong></p>

                <button onclick="viewProduct('${p._id}')">View Product</button>
            </div>
        `;
    });
}

// ================================
// 3. View product (go to product.html)
// ================================
function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// ================================
// 4. Add product to cart (simple products only)
// NOTE: Variant add-to-cart happens inside product.js
// ================================
function addToCart(productId) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: productId,
            quantity: 1
        });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart!");
}

// Load products when page opens
loadProducts();
