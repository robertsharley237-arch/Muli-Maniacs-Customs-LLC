// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// WEBSITE NAVIGATION SYSTEM
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // PAGE ROUTES
  // Filenames and capitalization must match the real files.
  // ==========================================================

  var MMC_PAGE_ROUTES = {
    home: "index.html",
    about: "about.html",
    services: "services.html",
    shop: "shop.html",
    cart: "Cart.html",
    checkout: "checkout.html",
    contact: "contact.html",
    gallery: "gallery.html",
    "client-intake": "client-intake.html",
    "admin-login": "admin-login.html",
    "admin-dashboard": "admin-dashboard.html",
    "admin-products": "admin-products.html",
    "admin-add-product": "admin-add-product.html",
    "admin-edit-category": "admin-edit-category.html",
    "admin-delete-category": "admin-delete-category.html"
  };

  // ==========================================================
  // NORMALIZE PAGE NAME
  // ==========================================================

  function normalizePageName(page) {
    return String(page || "")
      .trim()
      .toLowerCase();
  }

  // ==========================================================
  // NAVIGATE TO A PAGE
  // ==========================================================

  function navigate(page) {
    var normalizedPage =
      normalizePageName(page);

    var destination =
      MMC_PAGE_ROUTES[normalizedPage];

    if (!destination) {
      console.error(
        "Navigation error: page not found:",
        normalizedPage
      );

      return false;
    }

    window.location.href =
      destination;

    return true;
  }

  // ==========================================================
  // CHECK WHETHER A ROUTE EXISTS
  // ==========================================================

  function routeExists(page) {
    var normalizedPage =
      normalizePageName(page);

    return Boolean(
      MMC_PAGE_ROUTES[normalizedPage]
    );
  }

  // ==========================================================
  // GET A ROUTE WITHOUT NAVIGATING
  // ==========================================================

  function getPageRoute(page) {
    var normalizedPage =
      normalizePageName(page);

    return (
      MMC_PAGE_ROUTES[normalizedPage] ||
      null
    );
  }

  // ==========================================================
  // ADMIN NAVIGATION
  // Opens the dashboard when logged in.
  // Opens the login page when not logged in.
  // ==========================================================

  function navigateToAdmin() {
    var adminToken =
      localStorage.getItem(
        "adminToken"
      );

    if (adminToken) {
      return navigate(
        "admin-dashboard"
      );
    }

    return navigate(
      "admin-login"
    );
  }

  // ==========================================================
  // HIGHLIGHT CURRENT PAGE LINKS
  // ==========================================================

  function highlightCurrentPage() {
    var currentFilename =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    if (!currentFilename) {
      currentFilename =
        "index.html";
    }

    var navigationLinks =
      document.querySelectorAll(
        "nav a[href]"
      );

    navigationLinks.forEach(
      function (link) {
        var linkFilename =
          String(
            link.getAttribute("href") ||
            ""
          )
            .split("/")
            .pop()
            .toLowerCase();

        var isCurrentPage =
          linkFilename ===
          currentFilename;

        if (isCurrentPage) {
          link.setAttribute(
            "aria-current",
            "page"
          );

          link.classList.add(
            "current-page"
          );
        } else {
          link.removeAttribute(
            "aria-current"
          );

          link.classList.remove(
            "current-page"
          );
        }
      }
    );
  }

  // ==========================================================
  // PAGE STARTUP
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      highlightCurrentPage();
    }
  );

  // ==========================================================
  // MAKE FUNCTIONS AVAILABLE TO HTML BUTTONS
  // ==========================================================

  window.navigate =
    navigate;

  window.navigateToAdmin =
    navigateToAdmin;

  window.routeExists =
    routeExists;

  window.getPageRoute =
    getPageRoute;
})();