// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: cloudinary.js
// CLOUDINARY SERVER CONFIGURATION
// ============================================================

"use strict";

const cloudinary =
  require("cloudinary").v2;

// ============================================================
// REQUIRED ENVIRONMENT VARIABLES
// ============================================================

const cloudName =
  process.env
    .CLOUDINARY_CLOUD_NAME;

const apiKey =
  process.env
    .CLOUDINARY_API_KEY;

const apiSecret =
  process.env
    .CLOUDINARY_API_SECRET;

// ============================================================
// CONFIGURATION STATUS
// ============================================================

function isCloudinaryConfigured() {
  return Boolean(
    cloudName &&
    apiKey &&
    apiSecret
  );
}

// ============================================================
// CONFIGURE CLOUDINARY
// ============================================================

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name:
      cloudName,

    api_key:
      apiKey,

    api_secret:
      apiSecret,

    secure:
      true
  });
} else {
  console.warn(
    "Cloudinary is not fully configured. Image uploads will be unavailable."
  );
}

// ============================================================
// VERIFY CLOUDINARY CONFIGURATION
// ============================================================

function requireCloudinaryConfiguration() {
  if (!isCloudinaryConfigured()) {
    const error =
      new Error(
        "Cloudinary is not configured on the server."
      );

    error.statusCode = 503;

    error.code =
      "CLOUDINARY_NOT_CONFIGURED";

    throw error;
  }

  return true;
}

// ============================================================
// EXPORT CLOUDINARY
// ============================================================

module.exports =
  cloudinary;

module.exports.cloudinary =
  cloudinary;

module.exports.isCloudinaryConfigured =
  isCloudinaryConfigured;

module.exports.requireCloudinaryConfiguration =
  requireCloudinaryConfiguration;