// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: models/Admin.js
// ADMINISTRATOR MODEL FOR NEON POSTGRESQL
// ============================================================

"use strict";

const bcrypt =
  require("bcryptjs");

const db =
  require("../db");

const ALLOWED_ADMIN_ROLES = [
  "admin",
  "super_admin"
];

const PASSWORD_HASH_ROUNDS = 12;

// ============================================================
// CLEAN TEXT
// ============================================================

function cleanText(
  value,
  maximumLength
) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(
      0,
      maximumLength
    );
}

// ============================================================
// NORMALIZE USERNAME
// ============================================================

function normalizeUsername(value) {
  return cleanText(
    value,
    100
  ).toLowerCase();
}

// ============================================================
// NORMALIZE ROLE
// ============================================================

function normalizeRole(
  value,
  fallbackRole
) {
  const role =
    String(
      value ||
      fallbackRole ||
      "admin"
    )
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, "_");

  if (
    ALLOWED_ADMIN_ROLES.includes(
      role
    )
  ) {
    return role;
  }

  return (
    fallbackRole ||
    "admin"
  );
}

// ============================================================
// CLEAN BOOLEAN
// ============================================================

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
// FORMAT ADMINISTRATOR RECORD
// ============================================================

function formatAdmin(
  row,
  includePasswordHash
) {
  if (!row) {
    return null;
  }

  const admin = {
    id:
      String(row.id),

    username:
      String(
        row.username || ""
      ),

    role:
      normalizeRole(
        row.role,
        "admin"
      ),

    active:
      row.active !== false,

    lastLoginAt:
      row.last_login_at ||
      null,

    createdAt:
      row.created_at ||
      null,

    updatedAt:
      row.updated_at ||
      null
  };

  if (
    includePasswordHash === true
  ) {
    admin.passwordHash =
      String(
        row.password_hash || ""
      );
  }

  return admin;
}

// ============================================================
// VALIDATE USERNAME
// ============================================================

function validateUsername(username) {
  if (username.length < 3) {
    return (
      "Administrator username must contain at least 3 characters."
    );
  }

  if (
    !/^[a-z0-9._-]+$/.test(
      username
    )
  ) {
    return (
      "Administrator username may contain only letters, " +
      "numbers, periods, underscores, and hyphens."
    );
  }

  return "";
}

// ============================================================
// VALIDATE PASSWORD
// ============================================================

function validatePassword(password) {
  const value =
    String(password || "");

  if (value.length < 12) {
    return (
      "Administrator password must contain at least 12 characters."
    );
  }

  if (!/[a-z]/.test(value)) {
    return (
      "Administrator password must contain a lowercase letter."
    );
  }

  if (!/[A-Z]/.test(value)) {
    return (
      "Administrator password must contain an uppercase letter."
    );
  }

  if (!/[0-9]/.test(value)) {
    return (
      "Administrator password must contain a number."
    );
  }

  if (
    !/[^A-Za-z0-9]/.test(
      value
    )
  ) {
    return (
      "Administrator password must contain a special character."
    );
  }

  return "";
}

// ============================================================
// CREATE MODEL ERROR
// ============================================================

function createModelError(
  message,
  statusCode,
  errorCode
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    errorCode;

  return error;
}

// ============================================================
// PASSWORD SECURITY
// ============================================================

async function hashPassword(password) {
  const validationError =
    validatePassword(
      password
    );

  if (validationError) {
    throw createModelError(
      validationError,
      400,
      "INVALID_PASSWORD"
    );
  }

  return bcrypt.hash(
    String(password),
    PASSWORD_HASH_ROUNDS
  );
}

async function comparePassword(
  password,
  passwordHash
) {
  if (
    !password ||
    !passwordHash
  ) {
    return false;
  }

  return bcrypt.compare(
    String(password),
    String(passwordHash)
  );
}

// ============================================================
// GET ADMINISTRATOR BY ID
// ============================================================

async function getAdminById(
  adminId,
  includePasswordHash
) {
  const result =
    await db.query(
      `
        SELECT
          id,
          username,
          password_hash,
          role,
          active,
          last_login_at,
          created_at,
          updated_at
        FROM admins
        WHERE id = $1
        LIMIT 1
      `,
      [
        adminId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatAdmin(
    result.rows[0],
    includePasswordHash
  );
}

// ============================================================
// GET ADMINISTRATOR BY USERNAME
// ============================================================

async function getAdminByUsername(
  username,
  includePasswordHash
) {
  const normalizedUsername =
    normalizeUsername(
      username
    );

  if (!normalizedUsername) {
    return null;
  }

  const result =
    await db.query(
      `
        SELECT
          id,
          username,
          password_hash,
          role,
          active,
          last_login_at,
          created_at,
          updated_at
        FROM admins
        WHERE
          LOWER(username) =
          LOWER($1)
        LIMIT 1
      `,
      [
        normalizedUsername
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatAdmin(
    result.rows[0],
    includePasswordHash
  );
}

// ============================================================
// GET ALL ADMINISTRATORS
// ============================================================

async function getAllAdmins() {
  const result =
    await db.query(
      `
        SELECT
          id,
          username,
          role,
          active,
          last_login_at,
          created_at,
          updated_at
        FROM admins
        ORDER BY
          username ASC
      `
    );

  return result.rows.map(
    function (row) {
      return formatAdmin(
        row,
        false
      );
    }
  );
}

// ============================================================
// CHECK USERNAME
// ============================================================

async function usernameExists(
  username,
  excludedAdminId
) {
  const normalizedUsername =
    normalizeUsername(
      username
    );

  if (!normalizedUsername) {
    return false;
  }

  const excludedId =
    excludedAdminId ||
    null;

  const result =
    await db.query(
      `
        SELECT id
        FROM admins
        WHERE
          LOWER(username) =
            LOWER($1)
          AND (
            $2::BIGINT IS NULL
            OR id <> $2
          )
        LIMIT 1
      `,
      [
        normalizedUsername,
        excludedId
      ]
    );

  return (
    result.rows.length > 0
  );
}

// ============================================================
// CREATE ADMINISTRATOR
// ============================================================

async function createAdmin(adminData) {
  const input =
    adminData || {};

  const username =
    normalizeUsername(
      input.username
    );

  const role =
    normalizeRole(
      input.role,
      "admin"
    );

  const active =
    cleanBoolean(
      input.active,
      true
    );

  const usernameError =
    validateUsername(
      username
    );

  if (usernameError) {
    throw createModelError(
      usernameError,
      400,
      "INVALID_USERNAME"
    );
  }

  if (
    await usernameExists(
      username
    )
  ) {
    throw createModelError(
      "An administrator with that username already exists.",
      409,
      "DUPLICATE_USERNAME"
    );
  }

  const passwordHash =
    await hashPassword(
      input.password
    );

  try {
    const result =
      await db.query(
        `
          INSERT INTO admins (
            username,
            password_hash,
            role,
            active,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            NOW(),
            NOW()
          )
          RETURNING
            id,
            username,
            role,
            active,
            last_login_at,
            created_at,
            updated_at
        `,
        [
          username,
          passwordHash,
          role,
          active
        ]
      );

    return formatAdmin(
      result.rows[0],
      false
    );
  } catch (error) {
    if (error.code === "23505") {
      throw createModelError(
        "An administrator with that username already exists.",
        409,
        "DUPLICATE_USERNAME"
      );
    }

    throw error;
  }
}

// ============================================================
// AUTHENTICATE ADMINISTRATOR
// ============================================================

async function authenticateAdmin(
  username,
  password
) {
  const admin =
    await getAdminByUsername(
      username,
      true
    );

  if (
    !admin ||
    !admin.active
  ) {
    return null;
  }

  const validPassword =
    await comparePassword(
      password,
      admin.passwordHash
    );

  if (!validPassword) {
    return null;
  }

  const updatedAdmin =
    await recordSuccessfulLogin(
      admin.id
    );

  delete admin.passwordHash;

  if (updatedAdmin) {
    admin.lastLoginAt =
      updatedAdmin.lastLoginAt;
  }

  return admin;
}

// ============================================================
// UPDATE ADMINISTRATOR
// ============================================================

async function updateAdmin(
  adminId,
  adminData
) {
  const currentAdmin =
    await getAdminById(
      adminId,
      false
    );

  if (!currentAdmin) {
    return null;
  }

  const input =
    adminData || {};

  const username =
    input.username === undefined
      ? currentAdmin.username
      : normalizeUsername(
          input.username
        );

  const role =
    input.role === undefined
      ? currentAdmin.role
      : normalizeRole(
          input.role,
          currentAdmin.role
        );

  const active =
    cleanBoolean(
      input.active,
      currentAdmin.active
    );

  const usernameError =
    validateUsername(
      username
    );

  if (usernameError) {
    throw createModelError(
      usernameError,
      400,
      "INVALID_USERNAME"
    );
  }

  if (
    await usernameExists(
      username,
      adminId
    )
  ) {
    throw createModelError(
      "An administrator with that username already exists.",
      409,
      "DUPLICATE_USERNAME"
    );
  }

  const result =
    await db.query(
      `
        UPDATE admins
        SET
          username = $1,
          role = $2,
          active = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING
          id,
          username,
          role,
          active,
          last_login_at,
          created_at,
          updated_at
      `,
      [
        username,
        role,
        active,
        adminId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatAdmin(
    result.rows[0],
    false
  );
}

// ============================================================
// UPDATE ADMINISTRATOR PASSWORD
// ============================================================

async function updateAdminPassword(
  adminId,
  newPassword
) {
  const passwordHash =
    await hashPassword(
      newPassword
    );

  const result =
    await db.query(
      `
        UPDATE admins
        SET
          password_hash = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id,
          username,
          role,
          active,
          last_login_at,
          created_at,
          updated_at
      `,
      [
        passwordHash,
        adminId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatAdmin(
    result.rows[0],
    false
  );
}

// ============================================================
// RECORD SUCCESSFUL LOGIN
// ============================================================

async function recordSuccessfulLogin(
  adminId
) {
  const result =
    await db.query(
      `
        UPDATE admins
        SET
          last_login_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          username,
          role,
          active,
          last_login_at,
          created_at,
          updated_at
      `,
      [
        adminId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatAdmin(
    result.rows[0],
    false
  );
}

// ============================================================
// COUNT ADMINISTRATORS
// ============================================================

async function countAdmins() {
  const result =
    await db.query(
      `
        SELECT
          COUNT(*)::INTEGER
            AS admin_count
        FROM admins
      `
    );

  return Number(
    result.rows[0]
      .admin_count || 0
  );
}

async function countActiveAdmins() {
  const result =
    await db.query(
      `
        SELECT
          COUNT(*)::INTEGER
            AS admin_count
        FROM admins
        WHERE active = TRUE
      `
    );

  return Number(
    result.rows[0]
      .admin_count || 0
  );
}

// ============================================================
// DELETE ADMINISTRATOR
// ============================================================

async function deleteAdmin(adminId) {
  const currentAdmin =
    await getAdminById(
      adminId,
      false
    );

  if (!currentAdmin) {
    return null;
  }

  const activeAdminCount =
    await countActiveAdmins();

  if (
    currentAdmin.active &&
    activeAdminCount <= 1
  ) {
    throw createModelError(
      "The final active administrator account cannot be deleted.",
      409,
      "FINAL_ACTIVE_ADMIN"
    );
  }

  const result =
    await db.query(
      `
        DELETE FROM admins
        WHERE id = $1
        RETURNING id
      `,
      [
        adminId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return currentAdmin;
}

// ============================================================
// EXPORT ADMINISTRATOR MODEL
// ============================================================

module.exports = {
  ALLOWED_ADMIN_ROLES:
    ALLOWED_ADMIN_ROLES,

  PASSWORD_HASH_ROUNDS:
    PASSWORD_HASH_ROUNDS,

  formatAdmin:
    formatAdmin,

  normalizeUsername:
    normalizeUsername,

  normalizeRole:
    normalizeRole,

  validateUsername:
    validateUsername,

  validatePassword:
    validatePassword,

  hashPassword:
    hashPassword,

  comparePassword:
    comparePassword,

  getAdminById:
    getAdminById,

  getAdminByUsername:
    getAdminByUsername,

  getAllAdmins:
    getAllAdmins,

  usernameExists:
    usernameExists,

  createAdmin:
    createAdmin,

  authenticateAdmin:
    authenticateAdmin,

  updateAdmin:
    updateAdmin,

  updateAdminPassword:
    updateAdminPassword,

  recordSuccessfulLogin:
    recordSuccessfulLogin,

  countAdmins:
    countAdmins,

  countActiveAdmins:
    countActiveAdmins,

  deleteAdmin:
    deleteAdmin
};
