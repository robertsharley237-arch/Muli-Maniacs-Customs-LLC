// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: routes/AdminRoutes.js
// ADMINISTRATOR AUTHENTICATION AND MANAGEMENT ROUTES
// NEON POSTGRESQL + JWT
// ============================================================

"use strict";

const crypto =
  require("crypto");

const express =
  require("express");

const jwt =
  require("jsonwebtoken");

const Admin =
  require("../models/Admin");

const requireAdmin =
  require("../middleware/requireAdmin");

const requireSuperAdmin =
  require("../middleware/requireSuperAdmin");

const router =
  express.Router();

// ============================================================
// JWT SETTINGS
// ============================================================

const JWT_ALGORITHM =
  "HS256";

const JWT_ISSUER =
  process.env.JWT_ISSUER ||
  "multi-maniacs-customs";

const JWT_AUDIENCE =
  process.env.JWT_AUDIENCE ||
  "multi-maniacs-customs-admin";

const JWT_EXPIRATION =
  process.env.JWT_EXPIRATION ||
  "8h";

// ============================================================
// GENERAL HELPERS
// ============================================================

function cleanText(
  value,
  maximumLength
) {
  return String(value || "")
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function cleanBoolean(
  value,
  fallbackValue
) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallbackValue;
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

  return fallbackValue;
}

// ============================================================
// JWT SECRET
// ============================================================

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    const error =
      new Error(
        "JWT_SECRET is not configured."
      );

    error.statusCode = 500;
    error.code =
      "JWT_SECRET_MISSING";

    throw error;
  }

  if (
    process.env.NODE_ENV ===
      "production" &&
    secret.length < 32
  ) {
    const error =
      new Error(
        "JWT_SECRET must contain at least 32 characters in production."
      );

    error.statusCode = 500;
    error.code =
      "JWT_SECRET_TOO_SHORT";

    throw error;
  }

  return secret;
}

// ============================================================
// CREATE ADMINISTRATOR TOKEN
// ============================================================

function createAdminToken(admin) {
  return jwt.sign(
    {
      adminId:
        admin.id,

      username:
        admin.username,

      role:
        admin.role
    },
    getJwtSecret(),
    {
      algorithm:
        JWT_ALGORITHM,

      expiresIn:
        JWT_EXPIRATION,

      issuer:
        JWT_ISSUER,

      audience:
        JWT_AUDIENCE,

      subject:
        String(admin.id)
    }
  );
}

// ============================================================
// SAFE SECRET COMPARISON
// ============================================================

function safeSecretMatches(
  suppliedValue,
  configuredValue
) {
  const supplied =
    Buffer.from(
      String(suppliedValue || ""),
      "utf8"
    );

  const configured =
    Buffer.from(
      String(configuredValue || ""),
      "utf8"
    );

  if (
    supplied.length !==
    configured.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    supplied,
    configured
  );
}

// ============================================================
// ERROR HANDLING
// ============================================================

function sendAdminError(
  response,
  error,
  fallbackMessage
) {
  console.error(
    fallbackMessage,
    error
  );

  if (
    error.code === "23505" ||
    error.code ===
      "DUPLICATE_USERNAME"
  ) {
    return response
      .status(409)
      .json({
        error:
          "An administrator with that username already exists.",

        code:
          "DUPLICATE_USERNAME"
      });
  }

  if (
    error.code === "22P02"
  ) {
    return response
      .status(400)
      .json({
        error:
          "The administrator ID is invalid.",

        code:
          "INVALID_ADMIN_ID"
      });
  }

  if (
    error.code ===
    "FINAL_ACTIVE_ADMIN"
  ) {
    return response
      .status(409)
      .json({
        error:
          error.message,

        code:
          error.code
      });
  }

  const statusCode =
    Number(
      error.statusCode
    ) || 500;

  return response
    .status(statusCode)
    .json({
      error:
        statusCode >= 500
          ? fallbackMessage
          : (
              error.message ||
              fallbackMessage
            ),

      code:
        error.code ||
        undefined,

      validationErrors:
        error.validationErrors ||
        undefined
    });
}

// ============================================================
// PUBLIC: ADMINISTRATOR LOGIN
//
// POST /admin/login
//
// Body:
// {
//   "username": "admin",
//   "password": "StrongPassword123!"
// }
// ============================================================

router.post(
  "/admin/login",
  async function (
    request,
    response
  ) {
    try {
      const requestBody =
        request.body || {};

      const username =
        cleanText(
          requestBody.username,
          100
        );

      const password =
        String(
          requestBody.password ||
          ""
        );

      if (
        !username ||
        !password
      ) {
        return response
          .status(400)
          .json({
            error:
              "Username and password are required.",

            code:
              "ADMIN_CREDENTIALS_REQUIRED"
          });
      }

      const admin =
        await Admin
          .authenticateAdmin(
            username,
            password
          );

      if (!admin) {
        return response
          .status(401)
          .json({
            error:
              "The username or password is incorrect.",

            code:
              "INVALID_ADMIN_LOGIN"
          });
      }

      const token =
        createAdminToken(
          admin
        );

      return response.json({
        message:
          "Administrator login successful.",

        token:
          token,

        admin:
          admin,

        expiresIn:
          JWT_EXPIRATION
      });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "Administrator login failed."
      );
    }
  }
);

// ============================================================
// PUBLIC: CREATE FIRST SUPER ADMINISTRATOR
//
// POST /admin/bootstrap
//
// This route works only while the admins table is empty.
//
// Required header:
// x-bootstrap-key: configured ADMIN_BOOTSTRAP_KEY
// ============================================================

router.post(
  "/admin/bootstrap",
  async function (
    request,
    response
  ) {
    try {
      const existingAdminCount =
        await Admin.countAdmins();

      if (
        existingAdminCount > 0
      ) {
        return response
          .status(403)
          .json({
            error:
              "Administrator bootstrap is no longer available.",

            code:
              "ADMIN_BOOTSTRAP_DISABLED"
          });
      }

      const configuredKey =
        process.env
          .ADMIN_BOOTSTRAP_KEY;

      const providedKey =
        cleanText(
          request.headers[
            "x-bootstrap-key"
          ],
          500
        );

      if (!configuredKey) {
        return response
          .status(503)
          .json({
            error:
              "ADMIN_BOOTSTRAP_KEY is not configured.",

            code:
              "ADMIN_BOOTSTRAP_NOT_CONFIGURED"
          });
      }

      if (
        !providedKey ||
        !safeSecretMatches(
          providedKey,
          configuredKey
        )
      ) {
        return response
          .status(403)
          .json({
            error:
              "The administrator bootstrap key is invalid.",

            code:
              "INVALID_BOOTSTRAP_KEY"
          });
      }

      const requestBody =
        request.body || {};

      const admin =
        await Admin.createAdmin({
          username:
            requestBody.username,

          password:
            requestBody.password,

          role:
            "super_admin",

          active:
            true
        });

      const token =
        createAdminToken(
          admin
        );

      return response
        .status(201)
        .json({
          message:
            "The first super administrator was created successfully.",

          token:
            token,

          admin:
            admin,

          expiresIn:
            JWT_EXPIRATION
        });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "The first administrator could not be created."
      );
    }
  }
);

// ============================================================
// ADMIN: CURRENT ADMINISTRATOR
//
// GET /admin/me
// ============================================================

router.get(
  "/admin/me",
  requireAdmin,
  function (
    request,
    response
  ) {
    return response.json({
      admin:
        request.admin
    });
  }
);

// ============================================================
// ADMIN: REFRESH CURRENT TOKEN
//
// POST /admin/refresh
// ============================================================

router.post(
  "/admin/refresh",
  requireAdmin,
  function (
    request,
    response
  ) {
    try {
      const token =
        createAdminToken(
          request.admin
        );

      return response.json({
        message:
          "Administrator session refreshed successfully.",

        token:
          token,

        admin:
          request.admin,

        expiresIn:
          JWT_EXPIRATION
      });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "The administrator session could not be refreshed."
      );
    }
  }
);

// ============================================================
// ADMIN: LOGOUT
//
// POST /admin/logout
//
// JWTs are stateless. The browser must delete adminToken after
// this response. This endpoint confirms the logout request.
// ============================================================

router.post(
  "/admin/logout",
  requireAdmin,
  function (
    request,
    response
  ) {
    return response.json({
      message:
        "Administrator logout successful."
    });
  }
);

// ============================================================
// ADMIN: CHANGE OWN PASSWORD
//
// PATCH /admin/password
//
// Body:
// {
//   "currentPassword": "OldPassword123!",
//   "newPassword": "NewPassword123!"
// }
// ============================================================

router.patch(
  "/admin/password",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const requestBody =
        request.body || {};

      const currentPassword =
        String(
          requestBody
            .currentPassword ||
          ""
        );

      const newPassword =
        String(
          requestBody
            .newPassword ||
          ""
        );

      if (
        !currentPassword ||
        !newPassword
      ) {
        return response
          .status(400)
          .json({
            error:
              "Current password and new password are required.",

            code:
              "PASSWORDS_REQUIRED"
          });
      }

      if (
        currentPassword ===
        newPassword
      ) {
        return response
          .status(400)
          .json({
            error:
              "The new password must be different from the current password.",

            code:
              "PASSWORD_UNCHANGED"
          });
      }

      const storedAdmin =
        await Admin.getAdminById(
          request.admin.id,
          true
        );

      if (!storedAdmin) {
        return response
          .status(404)
          .json({
            error:
              "Administrator account not found.",

            code:
              "ADMIN_NOT_FOUND"
          });
      }

      const passwordMatches =
        await Admin.comparePassword(
          currentPassword,
          storedAdmin.passwordHash
        );

      if (!passwordMatches) {
        return response
          .status(401)
          .json({
            error:
              "The current password is incorrect.",

            code:
              "CURRENT_PASSWORD_INCORRECT"
          });
      }

      const admin =
        await Admin
          .updateAdminPassword(
            request.admin.id,
            newPassword
          );

      return response.json({
        message:
          "Administrator password updated successfully.",

        admin:
          admin
      });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "The administrator password could not be updated."
      );
    }
  }
);

// ============================================================
// SUPER ADMIN: CREATE ADMINISTRATOR
//
// POST /admin/register
// ============================================================

router.post(
  "/admin/register",
  requireSuperAdmin,
  async function (
    request,
    response
  ) {
    try {
      const requestBody =
        request.body || {};

      const admin =
        await Admin.createAdmin({
          username:
            requestBody.username,

          password:
            requestBody.password,

          role:
            requestBody.role ||
            "admin",

          active:
            cleanBoolean(
              requestBody.active,
              true
            )
        });

      return response
        .status(201)
        .json({
          message:
            "Administrator created successfully.",

          admin:
            admin
        });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "The administrator could not be created."
      );
    }
  }
);

// ============================================================
// SUPER ADMIN: GET ALL ADMINISTRATORS
//
// GET /admin/users
// ============================================================

router.get(
  "/admin/users",
  requireSuperAdmin,
  async function (
    request,
    response
  ) {
    try {
      const admins =
        await Admin.getAllAdmins();

      return response.json({
        admins:
          admins
      });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "Administrators could not be loaded."
      );
    }
  }
);

// ============================================================
// SUPER ADMIN: GET ADMINISTRATOR SUMMARY
//
// GET /admin/users/summary
//
// This route must appear before /admin/users/:id.
// ============================================================

router.get(
  "/admin/users/summary",
  requireSuperAdmin,
  async function (
    request,
    response
  ) {
    try {
      const totalAdmins =
        await Admin.countAdmins();

      const activeAdmins =
        await Admin
          .countActiveAdmins();

      return response.json({
        summary: {
          totalAdmins:
            totalAdmins,

          activeAdmins:
            activeAdmins,

          inactiveAdmins:
            Math.max(
              0,
              totalAdmins -
              activeAdmins
            )
        }
      });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "Administrator totals could not be loaded."
      );
    }
  }
);

// ============================================================
// SUPER ADMIN: GET ADMINISTRATOR BY ID
//
// GET /admin/users/:id
// ============================================================

router.get(
  "/admin/users/:id",
  requireSuperAdmin,
  async function (
    request,
    response
  ) {
    try {
      const admin =
        await Admin.getAdminById(
          request.params.id,
          false
        );

      if (!admin) {
        return response
          .status(404)
          .json({
            error:
              "Administrator not found.",

            code:
              "ADMIN_NOT_FOUND"
          });
      }

      return response.json({
        admin:
          admin
      });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "The administrator could not be loaded."
      );
    }
  }
);

// ============================================================
// SUPER ADMIN: UPDATE ADMINISTRATOR
//
// PUT /admin/users/:id
// ============================================================

router.put(
  "/admin/users/:id",
  requireSuperAdmin,
  async function (
    request,
    response
  ) {
    try {
      const targetAdminId =
        String(
          request.params.id
        );

      const requestBody =
        request.body || {};

      const isOwnAccount =
        targetAdminId ===
        String(
          request.admin.id
        );

      const requestedActive =
        cleanBoolean(
          requestBody.active,
          true
        );

      if (
        isOwnAccount &&
        requestBody.active !==
          undefined &&
        requestedActive === false
      ) {
        return response
          .status(409)
          .json({
            error:
              "You cannot deactivate your own administrator account.",

            code:
              "SELF_DEACTIVATION_NOT_ALLOWED"
          });
      }

      if (
        isOwnAccount &&
        requestBody.role !==
          undefined &&
        Admin.normalizeRole(
          requestBody.role,
          request.admin.role
        ) !==
          "super_admin"
      ) {
        return response
          .status(409)
          .json({
            error:
              "You cannot remove your own super administrator role.",

            code:
              "SELF_ROLE_DOWNGRADE_NOT_ALLOWED"
          });
      }

      const admin =
        await Admin.updateAdmin(
          targetAdminId,
          requestBody
        );

      if (!admin) {
        return response
          .status(404)
          .json({
            error:
              "Administrator not found.",

            code:
              "ADMIN_NOT_FOUND"
          });
      }

      return response.json({
        message:
          "Administrator updated successfully.",

        admin:
          admin
      });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "The administrator could not be updated."
      );
    }
  }
);

// ============================================================
// SUPER ADMIN: RESET ADMINISTRATOR PASSWORD
//
// PATCH /admin/users/:id/password
//
// Body:
// {
//   "newPassword": "NewPassword123!"
// }
// ============================================================

router.patch(
  "/admin/users/:id/password",
  requireSuperAdmin,
  async function (
    request,
    response
  ) {
    try {
      const newPassword =
        String(
          request.body &&
          request.body.newPassword
            ? request.body
                .newPassword
            : ""
        );

      if (!newPassword) {
        return response
          .status(400)
          .json({
            error:
              "A new administrator password is required.",

            code:
              "NEW_PASSWORD_REQUIRED"
          });
      }

      const admin =
        await Admin
          .updateAdminPassword(
            request.params.id,
            newPassword
          );

      if (!admin) {
        return response
          .status(404)
          .json({
            error:
              "Administrator not found.",

            code:
              "ADMIN_NOT_FOUND"
          });
      }

      return response.json({
        message:
          "Administrator password reset successfully.",

        admin:
          admin
      });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "The administrator password could not be reset."
      );
    }
  }
);

// ============================================================
// SUPER ADMIN: DELETE ADMINISTRATOR
//
// DELETE /admin/users/:id
// ============================================================

router.delete(
  "/admin/users/:id",
  requireSuperAdmin,
  async function (
    request,
    response
  ) {
    try {
      const targetAdminId =
        String(
          request.params.id
        );

      if (
        targetAdminId ===
        String(
          request.admin.id
        )
      ) {
        return response
          .status(409)
          .json({
            error:
              "You cannot delete your own administrator account.",

            code:
              "SELF_DELETION_NOT_ALLOWED"
          });
      }

      const admin =
        await Admin.deleteAdmin(
          targetAdminId
        );

      if (!admin) {
        return response
          .status(404)
          .json({
            error:
              "Administrator not found.",

            code:
              "ADMIN_NOT_FOUND"
          });
      }

      return response.json({
        message:
          "Administrator deleted successfully.",

        admin:
          admin
      });
    } catch (error) {
      return sendAdminError(
        response,
        error,
        "The administrator could not be deleted."
      );
    }
  }
);

// ============================================================
// EXPORT ADMINISTRATOR ROUTER
// ============================================================

module.exports = router;