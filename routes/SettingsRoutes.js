// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: routes/SettingsRoutes.js
// SETTINGS ROUTES FOR NEON POSTGRESQL
// ============================================================

"use strict";

const express =
  require("express");

const settingsController =
  require(
    "../controllers/settings-controller"
  );

const requireAdmin =
  require(
    "../middleware/requireAdmin"
  );

const router =
  express.Router();

// ============================================================
// VERIFY CONTROLLER EXPORTS
// ============================================================

if (
  typeof settingsController
    .getPublicSettings !==
  "function"
) {
  throw new Error(
    "settings-controller.js must export getPublicSettings."
  );
}

if (
  typeof settingsController
    .getSettings !==
  "function"
) {
  throw new Error(
    "settings-controller.js must export getSettings."
  );
}

if (
  typeof settingsController
    .updateSettings !==
  "function"
) {
  throw new Error(
    "settings-controller.js must export updateSettings."
  );
}

if (
  typeof settingsController
    .getSystemStatus !==
  "function"
) {
  throw new Error(
    "settings-controller.js must export getSystemStatus."
  );
}

// ============================================================
// PUBLIC: GET SAFE STORE SETTINGS
//
// GET /settings
//
// This route is public because shop.js and cart.js use it.
// It must never return passwords, database credentials,
// Stripe secret keys, Cloudinary secrets, or JWT secrets.
// ============================================================

router.get(
  "/settings",
  settingsController
    .getPublicSettings
);

// ============================================================
// ADMIN: GET COMPLETE ADMIN SETTINGS
//
// GET /admin/settings
// ============================================================

router.get(
  "/admin/settings",
  requireAdmin,
  settingsController
    .getSettings
);

// ============================================================
// ADMIN: UPDATE SETTINGS
//
// PUT /admin/settings
// ============================================================

router.put(
  "/admin/settings",
  requireAdmin,
  settingsController
    .updateSettings
);

// ============================================================
// ADMIN: PARTIAL SETTINGS UPDATE
//
// PATCH /admin/settings
//
// The current controller accepts partial request bodies, so
// PATCH can use the same updateSettings controller function.
// ============================================================

router.patch(
  "/admin/settings",
  requireAdmin,
  settingsController
    .updateSettings
);

// ============================================================
// ADMIN: SYSTEM CONNECTION STATUS
//
// GET /admin/system-status
//
// This returns safe configuration booleans only.
// It does not return secret credentials.
// ============================================================

router.get(
  "/admin/system-status",
  requireAdmin,
  settingsController
    .getSystemStatus
);

// ============================================================
// EXPORT SETTINGS ROUTER
// ============================================================

module.exports = router;