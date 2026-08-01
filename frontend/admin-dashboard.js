const API = "https://multi-maniacs-customs-backend.onrender.com";
const token = localStorage.getItem("MMC_ADMIN_TOKEN");

// Quick navigation
function go(page) {
    window.location.href = page;
}

// Load dashboard stats
async function loadStats() {
    const res = await fetch(`${API}/products`);
    const products = await res.json();

    let totalProducts = products.length;
    let totalVariants = 0;
    let activeProducts = 0;

    products.forEach(p => {
        totalVariants += p.variants.length;
        if (p.active) activeProducts++;
    });

    document.getElementById("totalProducts").innerText = totalProducts;
    document.getElementById("totalVariants").innerText = totalVariants;
    document.getElementById("activeProducts").innerText = activeProducts;
}

loadStats();
