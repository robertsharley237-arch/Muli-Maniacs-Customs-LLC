// admin-settings.js

async function loadSettings() {
    const res = await fetch("/settings", {
        headers: { "Authorization": localStorage.getItem("MMC_ADMIN_TOKEN") }
    });

    const s = await res.json();

    document.getElementById("storeName").value = s.storeName;
    document.getElementById("contactPhone1").value = s.contactPhone1;
    document.getElementById("contactPhone2").value = s.contactPhone2;
    document.getElementById("contactEmail").value = s.contactEmail;

    document.getElementById("taxRate").value = s.taxRate;
    document.getElementById("storeOpen").value = s.storeOpen;

    document.getElementById("defaultStock").value = s.defaultStock;
    document.getElementById("autoActivateProducts").value = s.autoActivateProducts;

    document.getElementById("backendURL").innerText = s.backendURL;
    document.getElementById("stripePublicKey").innerText = s.stripePublicKey;
    document.getElementById("stripeSecretKey").innerText = s.stripeSecretKey;
    document.getElementById("cloudinaryKey").innerText = s.cloudinaryKey;
    document.getElementById("cloudinarySecret").innerText = s.cloudinarySecret;
}

async function saveSettings() {
    const body = {
        storeName: document.getElementById("storeName").value,
        contactPhone1: document.getElementById("contactPhone1").value,
        contactPhone2: document.getElementById("contactPhone2").value,
        contactEmail: document.getElementById("contactEmail").value,

        taxRate: parseFloat(document.getElementById("taxRate").value),
        storeOpen: document.getElementById("storeOpen").value === "true",

        defaultStock: parseInt(document.getElementById("defaultStock").value),
        autoActivateProducts: document.getElementById("autoActivateProducts").value === "true"
    };

    await fetch("/settings", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": localStorage.getItem("MMC_ADMIN_TOKEN")
        },
        body: JSON.stringify(body)
    });

    alert("Settings saved!");
}

document.addEventListener("DOMContentLoaded", loadSettings);
