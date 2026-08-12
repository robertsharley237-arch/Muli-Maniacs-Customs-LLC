// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// SETTINGS CONTROLLER
// NEON POSTGRESQL
// ============================================================

"use strict";

const db = require("../db");

// ============================================================
// DEFAULT SETTINGS
// ============================================================

const DEFAULT_SETTINGS = {
  storeName: "Multi-Maniacs Customs LLC",
  contactPhone1: "",
  contactPhone2: "",
  contactEmail: "",
  businessLocation: "Essie, Kentucky",
  taxRate: 0,
  storeOpen: true,
  closedStoreMessage:
    "The online shop is temporarily unavailable. Please contact MMC for assistance.",
  defaultStock: 0,
  defaultLowStockWarning: 5,
  autoActivateProducts: true
};

// ============================================================
// CONVERT NEON ROW TO FRONTEND FORMAT
// ============================================================

function formatSettings(row) {
  if (!row) {
    return {
      ...DEFAULT_SETTINGS
    };
  }

  return {
    id:
      row.id,

    storeName:
      row.store_name ||
      DEFAULT_SETTINGS.storeName,

    contactPhone1:
      row.contact_phone_1 || "",

    contactPhone2:
      row.contact_phone_2 || "",

    contactEmail:
      row.contact_email || "",

    businessLocation:
      row.business_location ||
      DEFAULT_SETTINGS.businessLocation,

    taxRate:
      Number(row.tax_rate || 0),

    storeOpen:
      row.store_open !== false,

    closedStoreMessage:
      row.closed_store_message ||
      DEFAULT_SETTINGS.closedStoreMessage,

    defaultStock:
      Number(row.default_stock || 0),

    defaultLowStockWarning:
      Number(
        row.default_low_stock_warning ===
          null ||
        row.default_low_stock_warning ===
          undefined
          ? DEFAULT_SETTINGS
              .defaultLowStockWarning
          : row.default_low_stock_warning
      ),

    autoActivateProducts:
      row.auto_activate_products !== false,

    createdAt:
      row.created_at || null,

    updatedAt:
      row.updated_at || null
  };
}

// ============================================================
// CLEAN TEXT
// ============================================================

function cleanText(
  value,
  fallback,
  maximumLength
) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return String(value)
    .trim()
    .slice(
      0,
      maximumLength
    );
}

// ============================================================
// CLEAN NUMBER
// ============================================================

function cleanNumber(
  value,
  fallback,
  minimum,
  maximum
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      number
    )
  );
}

// ============================================================
// CLEAN WHOLE NUMBER
// ============================================================

function cleanWholeNumber(
  value,
  fallback,
  minimum,
  maximum
) {
  const number =
    cleanNumber(
      value,
      fallback,
      minimum,
      maximum
    );

  return Math.floor(number);
}

// ============================================================
// CLEAN BOOLEAN
// ============================================================

function cleanBoolean(
  value,
  fallback
) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

// ============================================================
// VALIDATE EMAIL
// ============================================================

function isValidEmail(email) {
  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

// ============================================================
// GET OR CREATE THE SINGLE SETTINGS RECORD
// ============================================================

async function getOrCreateSettings() {
  const existingResult =
    await db.query(
      `
        SELECT
          id,
          store_name,
          contact_phone_1,
          contact_phone_2,
          contact_email,
          business_location,
          tax_rate,
          store_open,
          closed_store_message,
          default_stock,
          default_low_stock_warning,
          auto_activate_products,
          created_at,
          updated_at
        FROM settings
        WHERE id = 1
        LIMIT 1
      `
    );

  if (
    existingResult.rows.length > 0
  ) {
    return existingResult.rows[0];
  }

  const insertResult =
    await db.query(
      `
        INSERT INTO settings (
          id,
          store_name,
          contact_phone_1,
          contact_phone_2,
          contact_email,
          business_location,
          tax_rate,
          store_open,
          closed_store_message,
          default_stock,
          default_low_stock_warning,
          auto_activate_products,
          created_at,
          updated_at
        )
        VALUES (
          1,
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          NOW(),
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          updated_at =
            settings.updated_at
        RETURNING
          id,
          store_name,
          contact_phone_1,
          contact_phone_2,
          contact_email,
          business_location,
          tax_rate,
          store_open,
          closed_store_message,
          default_stock,
          default_low_stock_warning,
          auto_activate_products,
          created_at,
          updated_at
      `,
      [
        DEFAULT_SETTINGS.storeName,
        DEFAULT_SETTINGS.contactPhone1,
        DEFAULT_SETTINGS.contactPhone2,
        DEFAULT_SETTINGS.contactEmail,
        DEFAULT_SETTINGS.businessLocation,
        DEFAULT_SETTINGS.taxRate,
        DEFAULT_SETTINGS.storeOpen,
        DEFAULT_SETTINGS
          .closedStoreMessage,
        DEFAULT_SETTINGS.defaultStock,
        DEFAULT_SETTINGS
          .defaultLowStockWarning,
        DEFAULT_SETTINGS
          .autoActivateProducts
      ]
    );

  return insertResult.rows[0];
}

// ============================================================
// PUBLIC SETTINGS
//
// Used by cart.js and other client-facing pages.
// Secret environment variables are never returned.
// ============================================================

async function getPublicSettings(
  request,
  response
) {
  try {
    const settingsRow =
      await getOrCreateSettings();

    const settings =
      formatSettings(
        settingsRow
      );

    response.json({
      settings: {
        storeName:
          settings.storeName,

        contactPhone1:
          settings.contactPhone1,

        contactPhone2:
          settings.contactPhone2,

        contactEmail:
          settings.contactEmail,

        businessLocation:
          settings.businessLocation,

        taxRate:
          settings.taxRate,

        storeOpen:
          settings.storeOpen,

        closedStoreMessage:
          settings.closedStoreMessage
      }
    });
  } catch (error) {
    console.error(
      "Public settings load error:",
      error
    );

    response.status(500).json({
      error:
        "Store settings could not be loaded."
    });
  }
}

// ============================================================
// ADMIN SETTINGS
//
// This route must use administrator authentication middleware.
// ============================================================

async function getSettings(
  request,
  response
) {
  try {
    const settingsRow =
      await getOrCreateSettings();

    response.json({
      settings:
        formatSettings(
          settingsRow
        )
    });
  } catch (error) {
    console.error(
      "Admin settings load error:",
      error
    );

    response.status(500).json({
      error:
        "Administrator settings could not be loaded."
    });
  }
}

// ============================================================
// UPDATE SETTINGS
//
// This route must use administrator authentication middleware.
// ============================================================

async function updateSettings(
  request,
  response
) {
  try {
    const existingRow =
      await getOrCreateSettings();

    const existingSettings =
      formatSettings(
        existingRow
      );

    const requestBody =
      request.body || {};

    const storeName =
      cleanText(
        requestBody.storeName,
        existingSettings.storeName,
        200
      );

    const contactPhone1 =
      cleanText(
        requestBody.contactPhone1,
        existingSettings.contactPhone1,
        30
      );

    const contactPhone2 =
      cleanText(
        requestBody.contactPhone2,
        existingSettings.contactPhone2,
        30
      );

    const contactEmail =
      cleanText(
        requestBody.contactEmail,
        existingSettings.contactEmail,
        254
      );

    const businessLocation =
      cleanText(
        requestBody.businessLocation,
        existingSettings
          .businessLocation,
        250
      );

    const taxRate =
      cleanNumber(
        requestBody.taxRate,
        existingSettings.taxRate,
        0,
        100
      );

    const storeOpen =
      cleanBoolean(
        requestBody.storeOpen,
        existingSettings.storeOpen
      );

    const closedStoreMessage =
      cleanText(
        requestBody
          .closedStoreMessage,
        existingSettings
          .closedStoreMessage,
        500
      );

    const defaultStock =
      cleanWholeNumber(
        requestBody.defaultStock,
        existingSettings.defaultStock,
        0,
        1000000
      );

    const defaultLowStockWarning =
      cleanWholeNumber(
        requestBody
          .defaultLowStockWarning,
        existingSettings
          .defaultLowStockWarning,
        0,
        1000000
      );

    const autoActivateProducts =
      cleanBoolean(
        requestBody
          .autoActivateProducts,
        existingSettings
          .autoActivateProducts
      );

    if (storeName.length < 2) {
      return response
        .status(400)
        .json({
          error:
            "Business name must contain at least 2 characters."
        });
    }

    if (
      contactEmail &&
      !isValidEmail(
        contactEmail
      )
    ) {
      return response
        .status(400)
        .json({
          error:
            "Enter a valid business email address."
        });
    }

    const updateResult =
      await db.query(
        `
          UPDATE settings
          SET
            store_name = $1,
            contact_phone_1 = $2,
            contact_phone_2 = $3,
            contact_email = $4,
            business_location = $5,
            tax_rate = $6,
            store_open = $7,
            closed_store_message = $8,
            default_stock = $9,
            default_low_stock_warning = $10,
            auto_activate_products = $11,
            updated_at = NOW()
          WHERE id = 1
          RETURNING
            id,
            store_name,
            contact_phone_1,
            contact_phone_2,
            contact_email,
            business_location,
            tax_rate,
            store_open,
            closed_store_message,
            default_stock,
            default_low_stock_warning,
            auto_activate_products,
            created_at,
            updated_at
        `,
        [
          storeName,
          contactPhone1,
          contactPhone2,
          contactEmail,
          businessLocation,
          taxRate,
          storeOpen,
          closedStoreMessage,
          defaultStock,
          defaultLowStockWarning,
          autoActivateProducts
        ]
      );

    response.json({
      message:
        "Settings updated successfully.",

      settings:
        formatSettings(
          updateResult.rows[0]
        )
    });
  } catch (error) {
    console.error(
      "Settings update error:",
      error
    );

    response.status(500).json({
      error:
        "Administrator settings could not be updated."
    });
  }
}

// ============================================================
// SYSTEM CONNECTION STATUS
//
// Returns only safe true-or-false connection information.
// Secret keys and credentials are never returned.
// ============================================================

async function getSystemStatus(
  request,
  response
) {
  let databaseConnected = false;

  try {
    await db.query(
      `
        SELECT
          1 AS connected
      `
    );

    databaseConnected = true;
  } catch (error) {
    console.error(
      "Neon database status check failed:",
      error
    );
  }

  response.json({
    status: {
      backendUrl:
        process.env
          .PUBLIC_BACKEND_URL ||
        process.env
          .BACKEND_URL ||
        "",

      databaseConnected:
        databaseConnected,

      stripeConfigured:
        Boolean(
          process.env
            .STRIPE_SECRET_KEY
        ),

      cloudinaryConfigured:
        Boolean(
          process.env
            .CLOUDINARY_CLOUD_NAME &&
          process.env
            .CLOUDINARY_API_KEY &&
          process.env
            .CLOUDINARY_API_SECRET
        )
    }
  });
}

// ============================================================
// EXPORT CONTROLLER FUNCTIONS
// ============================================================

module.exports = {
  getPublicSettings:
    getPublicSettings,

  getSettings:
    getSettings,

  updateSettings:
    updateSettings,

  getSystemStatus:
    getSystemStatus
};