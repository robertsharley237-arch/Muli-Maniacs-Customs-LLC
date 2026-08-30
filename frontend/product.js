// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: product.js
// PUBLIC PRODUCT DETAILS PAGE
//
// Frontend: Vercel
// Backend: Express on Vercel
// Database: Neon PostgreSQL
// Cart: Browser localStorage
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var CART_STORAGE_KEY =
    "cart";

  var REQUEST_TIMEOUT_MILLISECONDS =
    15000;

  var currentProduct =
    null;

  var selectedVariant =
    null;

  // ==========================================================
  // ELEMENT HELPER
  // ==========================================================

  function getElement(
    elementId
  ) {
    return document.getElementById(
      elementId
    );
  }

  // ==========================================================
  // BACKEND URL
  // ==========================================================

  function removeTrailingSlashes(
    value
  ) {
    return String(value || "")
      .trim()
      .replace(
        /\/+$/,
        ""
      );
  }

  function getBackendUrl() {
    if (
      typeof window.MMC_BACKEND_URL ===
        "string" &&
      window.MMC_BACKEND_URL.trim()
    ) {
      return removeTrailingSlashes(
        window.MMC_BACKEND_URL
      );
    }

    if (
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1"
    ) {
      return "http://localhost:10000";
    }

    return removeTrailingSlashes(
      window.location.origin
    );
  }

  var BACKEND_URL =
    getBackendUrl();

  // ==========================================================
  // NUMBER HELPERS
  // ==========================================================

  function normalizeMoney(
    value
  ) {
    var amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.round(
        amount * 100
      ) / 100
    );
  }

  function normalizeWholeNumber(
    value
  ) {
    var number =
      Number(value);

    if (
      !Number.isFinite(number)
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.floor(number)
    );
  }

  function formatCurrency(
    value
  ) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          "USD"
      }
    ).format(
      normalizeMoney(value)
    );
  }

  // ==========================================================
  // PRODUCT ID
  // ==========================================================

  function getProductIdFromUrl() {
    var searchParameters =
      new URLSearchParams(
        window.location.search
      );

    return String(
      searchParameters.get("id") ||
      searchParameters.get(
        "productId"
      ) ||
      ""
    ).trim();
  }

  // ==========================================================
  // FETCH WITH TIMEOUT
  // ==========================================================

  async function fetchWithTimeout(
    url,
    options
  ) {
    var controller =
      new AbortController();

    var timeoutIdentifier =
      window.setTimeout(
        function () {
          controller.abort();
        },
        REQUEST_TIMEOUT_MILLISECONDS
      );

    try {
      return await fetch(
        url,
        Object.assign(
          {},
          options || {},
          {
            signal:
              controller.signal
          }
        )
      );
    } finally {
      window.clearTimeout(
        timeoutIdentifier
      );
    }
  }

  // ==========================================================
  // READ SERVER RESPONSE
  // ==========================================================

  async function readResponse(
    response
  ) {
    var responseText =
      "";

    try {
      responseText =
        await response.text();
    } catch (error) {
      return {
        error:
          "The server response could not be read."
      };
    }

    if (!responseText) {
      return {};
    }

    try {
      return JSON.parse(
        responseText
      );
    } catch (error) {
      return {
        error:
          responseText
      };
    }
  }

  function getErrorMessage(
    value,
    fallbackMessage
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {
      if (
        typeof value.message ===
          "string" &&
        value.message.trim()
      ) {
        return value.message.trim();
      }

      if (
        value.error !==
        undefined
      ) {
        return getErrorMessage(
          value.error,
          fallbackMessage
        );
      }
    }

    return fallbackMessage;
  }

  // ==========================================================
  // PRODUCT NORMALIZATION
  // ==========================================================

  function normalizeVariant(
    variant,
    variantIndex
  ) {
    var sourceVariant =
      variant &&
      typeof variant ===
        "object"
        ? variant
        : {};

    return {
      id:
        String(
          sourceVariant.id ||
          sourceVariant._id ||
          (
            "variant-" +
            variantIndex
          )
        ),

      index:
        variantIndex,

      name:
        String(
          sourceVariant.name ||
          (
            "Variant " +
            (variantIndex + 1)
          )
        ).trim(),

      price:
        normalizeMoney(
          sourceVariant.price
        )
    };
  }

})();