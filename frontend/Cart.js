// ================================
// CART + SAVE-FOR-LATER SYSTEM
// ================================

// Load cart + save-for-later from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let savedForLater = JSON.parse(localStorage.getItem("savedForLater")) || [];

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("savedForLater", JSON.stringify(savedForLater));
    updateCartBadge();
}

// ================================
// UPDATE CART BADGE
// ================================
function updateCartBadge() {
    const badge = document.getElementById("cart-count");
    if (badge) badge.textContent = cart.length;
}
updateCartBadge();

// ================================
// ADD TO CART (supports variants)
// ================================
async function addToCart(id, variantIndex = null) {
    try {
        const res = await fetch(`https://multi-maniacs-customs-backend.onrender.com/products/${id}`);
        const product = await res.json();

        let variant = null;

        if (variantIndex !== null && variantIndex !== undefined) {
            variant = product.variants[variantIndex];
        }

        if (variant && variant.stock <= 0) {
            alert("This variant is out of stock.");
            return;
        }

        cart.push({
            id: product._id,
            name: product.name,
            price: variant ? variant.price : product.price,
            sku: variant ? variant.sku : product.sku,
            image: product.image,
            variantIndex: variantIndex,
            variantName: variant ? variant.name : null
        });

        saveCart();
        alert("Added to cart!");
    } catch (err) {
        console.error("Add to cart failed:", err);
        alert("Error adding to cart.");
    }
}

// ================================
// REMOVE FROM CART
// ================================
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
}

// ================================
// SAVE FOR LATER
// ================================
function moveToSaved(index) {
    savedForLater.push(cart[index]);
    cart.splice(index, 1);
    saveCart();
    renderCart();
}

// ================================
// MOVE BACK TO CART
// ================================
function moveBackToCart(index) {
    cart.push(savedForLater[index]);
    savedForLater.splice(index, 1);
    saveCart();
    renderCart();
}

// ================================
// RENDER CART PAGE
// ================================
async function renderCart() {
    const cartContainer = document.getElementById("cart-items");
    const savedContainer = document.getElementById("saved-items");

    if (!cartContainer || !savedContainer) return;

    cartContainer.innerHTML = "";
    savedContainer.innerHTML = "";

    cart.forEach((item, index) => {
        cartContainer.innerHTML += `
            <div class="cart-row">
                <img src="${item.image}" class="cart-img">
                <div class="cart-info">
                    <p><b>${item.name}</b></p>
                    <p>${item.variantName ? item.variantName : ""}</p>
                    <p>$${item.price}</p>
                </div>
                <button onclick="removeFromCart(${index})" class="remove-btn-small">Remove</button>
                <button onclick="moveToSaved(${index})" class="btn-small">Save for later</button>
            </div>
        `;
    });

    savedForLater.forEach((item, index) => {
        savedContainer.innerHTML += `
            <div class="cart-row saved">
                <img src="${item.image}" class="cart-img">
                <div class="cart-info">
                    <p><b>${item.name}</b></p>
                    <p>${item.variantName ? item.variantName : ""}</p>
                    <p>$${item.price}</p>
                </div>
                <button onclick="moveBackToCart(${index})" class="btn-small">Move to cart</button>
            </div>
        `;
    });
}

document.addEventListener("DOMContentLoaded", renderCart);

// ================================
// CHECKOUT — USE RENDER BACKEND
// ================================
async function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    try {
        const response = await fetch("https://multi-maniacs-customs-backend.onrender.com/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cart })
        });

        const data = await response.json();

        if (data.url) {
            window.location.href = data.url;
        } else {
            alert("Checkout failed.");
        }
    } catch (err) {
        console.error("Checkout error:", err);
        alert("Checkout failed.");
    }
}
