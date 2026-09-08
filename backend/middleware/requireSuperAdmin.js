// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: middleware/requireSuperAdmin.js
// SUPER ADMINISTRATOR AUTHORIZATION
// ============================================================

"use strict";

const requireAdmin =
  require("./requireAdmin");

  if (
  typeof requireAdmin !== "function"
) {
  throw new Error(
    "requireAdmin middleware failed to load correctly."
  );
}

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


  const adminRole =
    String(
      request.admin.role ||
      ""
    )
    .trim()
    .toLowerCase();



  if (
    adminRole !==
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
// Authentication runs first.
// If authentication succeeds,
// the current Neon account role is checked.
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
//
// Default export remains a function so Express receives
// middleware instead of an object.
// ============================================================

module.exports =
  requireSuperAdmin;


module.exports.requireSuperAdmin =
  requireSuperAdmin;


module.exports.verifySuperAdminRole =
  verifySuperAdminRole;