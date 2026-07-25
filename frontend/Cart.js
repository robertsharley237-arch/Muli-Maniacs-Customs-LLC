// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("MMC_CART")) || [];

// Save cart back to localStorage
function saveCart() {
    localStorage.setItem("MMC_CART", JSON.stringify(cart));
}

// Add item to cart
function addToCart(name, price) {
    const item = cart.find(i => i.name === name);

    if (item) {
        item.quantity += 1;
    } else {
        cart.push({
            name,
            price,
            quantity: 1
        });
    }

    saveCart();
    alert("Item added to cart!");
}

// Remove item from cart
function removeFromCart(name) {
    cart = cart.filter(item => item.name !== name);
    saveCart();
}

// Display cart items on cart.html
function displayCart() {
    const container = document.getElementById("cart-items");
    container.innerHTML = "";

    cart.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("cart-item");

        div.innerHTML = `
            <p>${item.name}</p>
            <p>$${item.price}</p>
            <p>Qty: ${item.quantity}</p>
            <button onclick="removeFromCart('${item.name}')">Remove</button>
        `;

        container.appendChild(div);
    });

    updateTotal();
}

// Update total price
function updateTotal() {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById("total").innerText = `$${total.toFixed(2)}`;
}

// Checkout button → sends cart to backend
async function checkout() {
    const response = await fetch("https://multi-maniacs-customs-backend.onrender.com/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart })   // IMPORTANT: must be "items"
    });

    const data = await response.json();

    if (data.url) {
        window.location.href = data.url; // Redirect to Stripe
    } else {
        alert("Checkout failed: " + data.error);
    }
}

// Load cart on page load
if (document.getElementById("cart-items")) {
    displayCart();
}
