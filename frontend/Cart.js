// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Save cart
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

// Add item to cart
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) {
        alert("Product not found.");
        return;
    }

    const existing = cart.find(item => item.id === id);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

    saveCart();
    alert(product.name + " added to cart!");
}

// Remove item
function removeItem(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
}

// Render cart items
function renderCart() {
    const container = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");

    if (!container || !totalEl) return;

    container.innerHTML = "";

    if (cart.length === 0) {
        container.innerHTML = "<p>Your cart is empty.</p>";
        totalEl.innerText = "Total: $0.00";
        return;
    }

    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;

        container.innerHTML += `
            <div class="cart-item card">
                <h3>${item.name}</h3>
                <p>Price: $${item.price.toFixed(2)}</p>
                <p>Quantity: ${item.quantity}</p>
                <button onclick="removeItem(${item.id})" class="btn">Remove</button>
            </div>
        `;
    });

    totalEl.innerText = "Total: $" + total.toFixed(2);
}

// Checkout
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
            alert("Checkout session failed.");
        }
    } catch (error) {
        console.error(error);
        alert("Error connecting to checkout.");
    }
}

// Auto-render cart on cart page
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("cart-items")) {
        renderCart();
    }
});
