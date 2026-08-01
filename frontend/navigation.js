function navigate(page) {
    // Normalize page names
    page = page.toLowerCase();

    // Map page names to actual HTML files
    const routes = {
        home: "index.html",
        about: "about.html",
        services: "services.html",
        shop: "shop.html",
        cart: "cart.html",
        contact: "contact.html",
        gallery: "gallery.html",
        "admin-dashboard": "admin-dashboard.html"
    };

    // If page exists, navigate
    if (routes[page]) {
        window.location.href = routes[page];
    } else {
        console.error("Navigation error: page not found →", page);
    }
}
