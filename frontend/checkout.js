// ================================
// CHECKOUT PAGE — FULL VARIANT SUPPORT
// ================================

// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Render checkout items
function renderCheckout() {
    const container = document.getElementById("checkout-items");
    const totalDisplay = document.getElementById("checkout-total");

    if (!container || !totalDisplay) return;

    container.innerHTML = "";
    let total = 0;

    cart.forEach(item => {
        const qty = item.quantity || 1;
        const itemTotal = item.price * qty;
        total += itemTotal;

        container.innerHTML += `
            <div class="checkout-row">
                <img src="${item.image}" class="checkout-img">

                <div class="checkout-info">
                    <p><b>${item.name}</b></p>

                    ${item.variantName ? `<p><b>Variant:</b> ${item.variantName}</p>` : ""}
                    ${item.sku ? `<p><b>SKU:</b> ${item.sku}</p>` : ""}

                    <p><b>Price:</b> $${item.price}</p>
                    <p><b>Qty:</b> ${qty}</p>
                    <p><b>Item Total:</b> $${itemTotal.toFixed(2)}</p>
                </div>
            </div>
        `;
    });

    totalDisplay.innerText = `Total: $${total.toFixed(2)}`;
}

document.addEventListener("DOMContentLoaded", renderCheckout);

// ================================
// CHECKOUT — SEND TO BACKEND (Render)
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
