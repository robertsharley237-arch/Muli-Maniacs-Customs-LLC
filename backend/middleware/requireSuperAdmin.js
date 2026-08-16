// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: middleware/requireSuperAdmin.js
// SUPER ADMINISTRATOR AUTHORIZATION
// ============================================================

"use strict";

const requireAdmin =
  require("./requireAdmin");

// ============================================================
// VERIFY SUPER ADMINISTRATOR ROLE
// ============================================================

function verifySuperAdminRole(
  request,
  response,
  next
) {
  if (!request.admin) {
    return response
      .status(401)
      .json({
        error:
          "Administrator authentication is required.",

        code:
          "ADMIN_AUTHENTICATION_REQUIRED"
      });
  }

  if (
    request.admin.role !==
    "super_admin"
  ) {
    return response
      .status(403)
      .json({
        error:
          "Super administrator permission is required for this action.",

        code:
          "SUPER_ADMIN_REQUIRED"
      });
  }

  return next();
}

// ============================================================
// REQUIRE SUPER ADMINISTRATOR
//
// This runs requireAdmin first. If authentication succeeds,
// verifySuperAdminRole checks the current Neon account role.
// ============================================================

function requireSuperAdmin(
  request,
  response,
  next
) {
  return requireAdmin(
    request,
    response,
    function () {
      return verifySuperAdminRole(
        request,
        response,
        next
      );
    }
  );
}

// ============================================================
// EXPORT MIDDLEWARE
// ============================================================

module.exports =
  requireSuperAdmin;

module.exports.requireSuperAdmin =
  requireSuperAdmin;

module.exports.verifySuperAdminRole =
  verifySuperAdminRole;