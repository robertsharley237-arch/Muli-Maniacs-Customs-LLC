// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("MMC_CART")) || [];

// Save cart
function saveCart() {
    localStorage.setItem("MMC_CART", JSON.stringify(cart));
}

// Add item to cart
function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    alert(`${product.name} added to cart!`);
}

// Load products into shop page
window.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("shop-container");
    if (!container || !PRODUCTS) return;

    PRODUCTS.forEach(product => {
        const card = document.createElement("div");
        card.style.border = "1px solid #fff";
        card.style.padding = "15px";
        card.style.width = "250px";
        card.style.textAlign = "center";
        card.style.background = "rgba(0,0,0,0.7)";

        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" style="width:100%; height:auto; margin-bottom:10px;">
            <h3 style="color:#ff0000;">${product.name}</h3>
            <p style="color:#fff;">$${product.price.toFixed(2)}</p>
            <button style="background:#ff0000; color:#fff; padding:10px 20px; border:none; border-radius:6px; cursor:pointer;">
                Add to Cart
            </button>
        `;

        card.querySelector("button").addEventListener("click", () => addToCart(product));
        container.appendChild(card);
    });
});

// Load cart items into cart.html
function loadCartPage() {
    const container = document.getElementById("cart-items");
    const totalBox = document.getElementById("cart-total");

    container.innerHTML = "";

    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;

        const row = document.createElement("div");
        row.style.background = "rgba(0,0,0,0.7)";
        row.style.padding = "15px";
        row.style.margin = "10px auto";
        row.style.width = "80%";
        row.style.border = "1px solid #fff";

        row.innerHTML = `
            <h3 style="color:#ff0000;">${item.name}</h3>
            <p style="color:#fff;">Price: $${item.price.toFixed(2)}</p>
            <p style="color:#fff;">Quantity: ${item.quantity}</p>
            <button style="background:#ff0000; color:#fff; padding:8px 15px; border:none; border-radius:6px; cursor:pointer;">
                Remove One
            </button>
        `;

        row.querySelector("button").addEventListener("click", () => {
            item.quantity -= 1;
            if (item.quantity <= 0) {
                cart = cart.filter(i => i.id !== item.id);
            }
            saveCart();
            loadCartPage();
        });

        container.appendChild(row);
    });

    totalBox.innerHTML = `<h2 style="color:#ff0000;">Total: $${total.toFixed(2)}</h2>`;
}
