// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: navigation.js
// SHARED WEBSITE NAVIGATION SYSTEM
//
// Hosting: Vercel
// Authentication: JWT stored as adminToken
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // STORAGE KEYS
  // ==========================================================

  var ADMIN_TOKEN_STORAGE_KEY =
    "adminToken";

  var ADMIN_USER_STORAGE_KEY =
    "adminUser";

  // ==========================================================
  // PAGE ROUTES
  //
  // Filename capitalization must exactly match the files in
  // the frontend folder because Vercel is case-sensitive.
  // ==========================================================

  var MMC_PAGE_ROUTES = {
    home:
      "index.html",

    about:
      "about.html",

    services:
      "services.html",

    gallery:
      "gallery.html",

    shop:
      "shop.html",

    product:
      "product.html",

    cart:
      "cart.html",

    checkout:
      "checkout.html",

    contact:
      "contact.html",

    "client-intake":
      "client-intake.html",

    "admin-login":
      "admin-login.html",

    "admin-dashboard":
      "admin-dashboard.html",

    "admin-products":
      "admin-products.html",

    "admin-add-product":
      "admin-add-product.html",

    "admin-edit-product":
      "admin-edit-product.html",

    "admin-inventory":
      "admin-inventory.html",

    "admin-orders":
      "admin-orders.html",

    "admin-intake":
      "admin-intake.html",

    "admin-settings":
      "admin-settings.html",

    "admin-add-category":
      "admin-add-category.html",

    "admin-edit-category":
      "admin-edit-category.html",

    "admin-delete-category":
      "admin-delete-category.html"
  };

  // ==========================================================
  // PAGE NAME NORMALIZATION
  // ==========================================================

  function normalizePageName(
    page
  ) {
    return String(page || "")
      .trim()
      .toLowerCase();
  }

  // ==========================================================
  // GET PAGE ROUTE
  // ==========================================================

  function getPageRoute(
    page
  ) {
    var normalizedPage =
      normalizePageName(
        page
      );

    return (
      MMC_PAGE_ROUTES[
        normalizedPage
      ] ||
      null
    );
  }

  // ==========================================================
  // CHECK WHETHER ROUTE EXISTS
  // ==========================================================

  function routeExists(
    page
  ) {
    return Boolean(
      getPageRoute(
        page
      )
    );
  }

  // ==========================================================
  // NAVIGATE TO PAGE
  // ==========================================================

  function navigate(
    page
  ) {
    var normalizedPage =
      normalizePageName(
        page
      );

    var destination =
      getPageRoute(
        normalizedPage
      );

    if (!destination) {
      console.error(
        "MMC navigation error: page route was not found:",
        normalizedPage
      );

      return false;
    }

    window.location.assign(
      destination
    );

    return true;
  }

  // ==========================================================
  // ADMINISTRATOR SESSION
  // ==========================================================

  function getAdminToken() {
    return localStorage.getItem(
      ADMIN_TOKEN_STORAGE_KEY
    );
  }

  function hasAdminSession() {
    var token =
      getAdminToken();

    return Boolean(
      token &&
      String(token).trim()
    );
  }

  function clearAdminSession() {
    localStorage.removeItem(
      ADMIN_TOKEN_STORAGE_KEY
    );

    localStorage.removeItem(
      ADMIN_USER_STORAGE_KEY
    );

    /*
     * Remove token names left by older versions.
     */

    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
    );

    localStorage.removeItem(
      "admin_token"
    );

    localStorage.removeItem(
      "token"
    );
  }

  // ==========================================================
  // ADMINISTRATOR NAVIGATION
  //
  // If a token exists, open the dashboard.
  // Otherwise, open the login page.
  // ==========================================================

  function navigateToAdmin() {
    if (hasAdminSession()) {
      return navigate(
        "admin-dashboard"
      );
    }

    return navigate(
      "admin-login"
    );
  }

  // ==========================================================
  // ADMINISTRATOR LOGOUT
  // ==========================================================

  function logoutAdmin() {
    clearAdminSession();

    window.location.assign(
      MMC_PAGE_ROUTES[
        "admin-login"
      ]
    );
  }

  // ==========================================================
  // CONFIGURE ADMIN LINKS
  //
  // This updates normal Admin links without requiring inline
  // onclick attributes.
  // ==========================================================

  function configureAdminNavigation() {
    var adminLinks =
      document.querySelectorAll(
        "#admin-navigation-button, " +
        ".admin-navigation-button, " +
        "[data-admin-navigation]"
      );

    var destination =
      hasAdminSession()
        ? MMC_PAGE_ROUTES[
            "admin-dashboard"
          ]
        : MMC_PAGE_ROUTES[
            "admin-login"
          ];

    adminLinks.forEach(
      function (adminLink) {
        if (
          adminLink.tagName
            .toLowerCase() ===
          "a"
        ) {
          adminLink.setAttribute(
            "href",
            destination
          );

          return;
        }

        /*
         * Support older pages that still use an Admin button.
         */

        if (
          adminLink.dataset
            .navigationConnected ===
          "true"
        ) {
          return;
        }

        adminLink.dataset
          .navigationConnected =
          "true";

        adminLink.addEventListener(
          "click",
          navigateToAdmin
        );
      }
    );
  }

  // ==========================================================
  // CONFIGURE LOGOUT BUTTONS
  // ==========================================================

  function configureLogoutButtons() {
    var logoutButtons =
      document.querySelectorAll(
        "#admin-logout-button, " +
        "#logout-button, " +
        ".admin-logout-button, " +
        "[data-admin-logout]"
      );

    logoutButtons.forEach(
      function (logoutButton) {
        if (
          logoutButton.dataset
            .logoutConnected ===
          "true"
        ) {
          return;
        }

        logoutButton.dataset
          .logoutConnected =
          "true";

        logoutButton.addEventListener(
          "click",
          function (event) {
            event.preventDefault();

            logoutAdmin();
          }
        );
      }
    );
  }

  // ==========================================================
  // URL FILENAME
  // ==========================================================

  function getFilenameFromUrl(
    value
  ) {
    var normalizedValue =
      String(value || "")
        .trim();

    if (
      !normalizedValue ||
      normalizedValue.startsWith(
        "#"
      ) ||
      normalizedValue.startsWith(
        "mailto:"
      ) ||
      normalizedValue.startsWith(
        "tel:"
      ) ||
      normalizedValue.startsWith(
        "javascript:"
      )
    ) {
      return "";
    }

    try {
      var resolvedUrl =
        new URL(
          normalizedValue,
          window.location.href
        );

      return resolvedUrl.pathname
        .split("/")
        .pop()
        .toLowerCase();
    } catch (error) {
      return normalizedValue
        .split("?")[0]
        .split("#")[0]
        .split("/")
        .pop()
        .toLowerCase();
    }
  }

  // ==========================================================
  // HIGHLIGHT CURRENT PAGE
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
          getFilenameFromUrl(
            link.getAttribute(
              "href"
            )
          );

        if (!linkFilename) {
          return;
        }

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
  // DATA NAVIGATION CONTROLS
  //
  // Example:
  //
  // <button type="button" data-navigate="shop">
  //   Shop
  // </button>
  // ==========================================================

  function configureDataNavigation() {
    var navigationControls =
      document.querySelectorAll(
        "[data-navigate]"
      );

    navigationControls.forEach(
      function (control) {
        if (
          control.dataset
            .navigationConnected ===
          "true"
        ) {
          return;
        }

        var page =
          normalizePageName(
            control.dataset.navigate
          );

        if (!routeExists(page)) {
          console.warn(
            "MMC navigation route does not exist:",
            page
          );

          return;
        }

        control.dataset
          .navigationConnected =
          "true";

        control.addEventListener(
          "click",
          function (event) {
            event.preventDefault();

            navigate(
              page
            );
          }
        );
      }
    );
  }

  // ==========================================================
  // PAGE INITIALIZATION
  // ==========================================================

  function initializeNavigation() {
    configureAdminNavigation();
    configureLogoutButtons();
    configureDataNavigation();
    highlightCurrentPage();

    console.log(
      "MMC website navigation initialized."
    );
  }

  // ==========================================================
  // STARTUP
  // ==========================================================

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeNavigation
    );
  } else {
    initializeNavigation();
  }

  // ==========================================================
  // GLOBAL FUNCTIONS
  //
  // These remain available for existing pages that still call
  // the functions directly.
  // ==========================================================

  window.navigate =
    navigate;

  window.navigateToAdmin =
    navigateToAdmin;

  window.logoutAdmin =
    logoutAdmin;

  window.routeExists =
    routeExists;

  window.getPageRoute =
    getPageRoute;

  window.highlightCurrentPage =
    highlightCurrentPage;
}());
