// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: models/ClientIntake.js
// CLIENT INTAKE MODEL FOR NEON POSTGRESQL
// ============================================================

"use strict";

const db = require("../db");

// ============================================================
// ALLOWED INTAKE STATUSES
// ============================================================

const ALLOWED_STATUSES = [
  "new",
  "contacted",
  "in_review",
  "approved",
  "closed"
];

// ============================================================
// TEXT CLEANING
// ============================================================

function cleanText(
  value,
  maximumLength
) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

function cleanLongText(
  value,
  maximumLength
) {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
}

// ============================================================
// STATUS NORMALIZATION
// ============================================================

function normalizeStatus(status) {
  const normalizedStatus =
    String(status || "new")
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, "_");

  if (
    !ALLOWED_STATUSES.includes(
      normalizedStatus
    )
  ) {
    return "new";
  }

  return normalizedStatus;
}

// ============================================================
// EMAIL VALIDATION
// ============================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "")
  );
}

// ============================================================
// DATABASE ROW FORMATTING
// ============================================================

function formatClientIntake(row) {
  if (!row) {
    return null;
  }

  return {
    id:
      String(row.id),

    name:
      String(row.name || ""),

    phone:
      String(row.phone || ""),

    email:
      String(row.email || ""),

    contactMethod:
      String(
        row.contact_method || ""
      ),

    projectType:
      String(
        row.project_type || ""
      ),

    description:
      String(
        row.description || ""
      ),

    budget:
      String(row.budget || ""),

    timeline:
      String(row.timeline || ""),

    location:
      String(row.location || ""),

    imageUrl:
      String(
        row.image_url || ""
      ),

    imagePublicId:
      String(
        row.image_public_id || ""
      ),

    status:
      normalizeStatus(
        row.status
      ),

    createdAt:
      row.created_at || null,

    updatedAt:
      row.updated_at || null
  };
}

// ============================================================
// NORMALIZE CLIENT INTAKE INPUT
// ============================================================

function normalizeClientIntakeInput(
  intakeData
) {
  const input =
    intakeData || {};

  return {
    name:
      cleanText(
        input.name,
        150
      ),

    phone:
      cleanText(
        input.phone,
        30
      ),

    email:
      cleanText(
        input.email,
        254
      ).toLowerCase(),

    contactMethod:
      cleanText(
        input.contactMethod ||
        input.contact_method,
        50
      ),

    projectType:
      cleanText(
        input.projectType ||
        input.project_type,
        150
      ),

    description:
      cleanLongText(
        input.description,
        5000
      ),

    budget:
      cleanText(
        input.budget,
        100
      ),

    timeline:
      cleanText(
        input.timeline,
        150
      ),

    location:
      cleanText(
        input.location,
        250
      ),

    imageUrl:
      cleanText(
        input.imageUrl ||
        input.image_url,
        2000
      ),

    imagePublicId:
      cleanText(
        input.imagePublicId ||
        input.image_public_id,
        500
      ),

    status:
      normalizeStatus(
        input.status
      )
  };
}

// ============================================================
// VALIDATE CLIENT INTAKE
// ============================================================

function validateClientIntake(
  intakeData
) {
  const errors = [];

  if (
    !intakeData.name ||
    intakeData.name.length < 2
  ) {
    errors.push(
      "Client name must contain at least 2 characters."
    );
  }

  if (
    !intakeData.email ||
    !isValidEmail(
      intakeData.email
    )
  ) {
    errors.push(
      "A valid client email address is required."
    );
  }

  if (
    !intakeData.projectType ||
    intakeData.projectType.length < 2
  ) {
    errors.push(
      "A project type is required."
    );
  }

  if (
    !intakeData.description ||
    intakeData.description.length < 10
  ) {
    errors.push(
      "The project description must contain at least 10 characters."
    );
  }

  return errors;
}

// ============================================================
// CREATE VALIDATION ERROR
// ============================================================

function createValidationError(
  validationErrors
) {
  const error =
    new Error(
      validationErrors.join(" ")
    );

  error.statusCode = 400;

  error.validationErrors =
    validationErrors;

  return error;
}

// ============================================================
// CREATE CLIENT INTAKE
// ============================================================

async function createClientIntake(
  intakeData
) {
  const intake =
    normalizeClientIntakeInput(
      intakeData
    );

  const validationErrors =
    validateClientIntake(
      intake
    );

  if (
    validationErrors.length > 0
  ) {
    throw createValidationError(
      validationErrors
    );
  }

  const result =
    await db.query(
      `
        INSERT INTO client_intakes (
          name,
          phone,
          email,
          contact_method,
          project_type,
          description,
          budget,
          timeline,
          location,
          image_url,
          image_public_id,
          status,
          created_at,
          updated_at
        )
        VALUES (
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
          $12,
          NOW(),
          NOW()
        )
        RETURNING
          id,
          name,
          phone,
          email,
          contact_method,
          project_type,
          description,
          budget,
          timeline,
          location,
          image_url,
          image_public_id,
          status,
          created_at,
          updated_at
      `,
      [
        intake.name,
        intake.phone,
        intake.email,
        intake.contactMethod,
        intake.projectType,
        intake.description,
        intake.budget,
        intake.timeline,
        intake.location,
        intake.imageUrl,
        intake.imagePublicId,
        intake.status
      ]
    );

  return formatClientIntake(
    result.rows[0]
  );
}

// ============================================================
// GET ALL CLIENT INTAKES
// ============================================================

async function getAllClientIntakes() {
  const result =
    await db.query(
      `
        SELECT
          id,
          name,
          phone,
          email,
          contact_method,
          project_type,
          description,
          budget,
          timeline,
          location,
          image_url,
          image_public_id,
          status,
          created_at,
          updated_at
        FROM client_intakes
        ORDER BY
          created_at DESC
      `
    );

  return result.rows.map(
    formatClientIntake
  );
}

// ============================================================
// GET CLIENT INTAKES BY STATUS
// ============================================================

async function getClientIntakesByStatus(
  status
) {
  const requestedStatus =
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, "_");

  if (
    !ALLOWED_STATUSES.includes(
      requestedStatus
    )
  ) {
    const error =
      new Error(
        "The selected client intake status is invalid."
      );

    error.statusCode = 400;

    throw error;
  }

  const result =
    await db.query(
      `
        SELECT
          id,
          name,
          phone,
          email,
          contact_method,
          project_type,
          description,
          budget,
          timeline,
          location,
          image_url,
          image_public_id,
          status,
          created_at,
          updated_at
        FROM client_intakes
        WHERE status = $1
        ORDER BY
          created_at DESC
      `,
      [
        requestedStatus
      ]
    );

  return result.rows.map(
    formatClientIntake
  );
}

// ============================================================
// GET CLIENT INTAKE BY ID
// ============================================================

async function getClientIntakeById(
  intakeId
) {
  const result =
    await db.query(
      `
        SELECT
          id,
          name,
          phone,
          email,
          contact_method,
          project_type,
          description,
          budget,
          timeline,
          location,
          image_url,
          image_public_id,
          status,
          created_at,
          updated_at
        FROM client_intakes
        WHERE id = $1
        LIMIT 1
      `,
      [
        intakeId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatClientIntake(
    result.rows[0]
  );
}

// ============================================================
// SEARCH CLIENT INTAKES
// ============================================================

async function searchClientIntakes(
  searchText
) {
  const cleanedSearchText =
    cleanText(
      searchText,
      250
    );

  if (!cleanedSearchText) {
    return getAllClientIntakes();
  }

  const searchValue =
    "%" +
    cleanedSearchText +
    "%";

  const result =
    await db.query(
      `
        SELECT
          id,
          name,
          phone,
          email,
          contact_method,
          project_type,
          description,
          budget,
          timeline,
          location,
          image_url,
          image_public_id,
          status,
          created_at,
          updated_at
        FROM client_intakes
        WHERE
          name ILIKE $1
          OR email ILIKE $1
          OR phone ILIKE $1
          OR contact_method ILIKE $1
          OR project_type ILIKE $1
          OR description ILIKE $1
          OR budget ILIKE $1
          OR timeline ILIKE $1
          OR location ILIKE $1
        ORDER BY
          created_at DESC
      `,
      [
        searchValue
      ]
    );

  return result.rows.map(
    formatClientIntake
  );
}

// ============================================================
// UPDATE CLIENT INTAKE STATUS
// ============================================================

async function updateClientIntakeStatus(
  intakeId,
  status
) {
  const requestedStatus =
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, "_");

  if (
    !ALLOWED_STATUSES.includes(
      requestedStatus
    )
  ) {
    const error =
      new Error(
        "The selected client intake status is invalid."
      );

    error.statusCode = 400;

    throw error;
  }

  const result =
    await db.query(
      `
        UPDATE client_intakes
        SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id,
          name,
          phone,
          email,
          contact_method,
          project_type,
          description,
          budget,
          timeline,
          location,
          image_url,
          image_public_id,
          status,
          created_at,
          updated_at
      `,
      [
        requestedStatus,
        intakeId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatClientIntake(
    result.rows[0]
  );
}

// ============================================================
// UPDATE COMPLETE CLIENT INTAKE
// ============================================================

async function updateClientIntake(
  intakeId,
  intakeData
) {
  const currentIntake =
    await getClientIntakeById(
      intakeId
    );

  if (!currentIntake) {
    return null;
  }

  const input =
    intakeData || {};

  const intake =
    normalizeClientIntakeInput({
      name:
        input.name === undefined
          ? currentIntake.name
          : input.name,

      phone:
        input.phone === undefined
          ? currentIntake.phone
          : input.phone,

      email:
        input.email === undefined
          ? currentIntake.email
          : input.email,

      contactMethod:
        input.contactMethod ===
          undefined &&
        input.contact_method ===
          undefined
          ? currentIntake.contactMethod
          : (
              input.contactMethod ||
              input.contact_method
            ),

      projectType:
        input.projectType ===
          undefined &&
        input.project_type ===
          undefined
          ? currentIntake.projectType
          : (
              input.projectType ||
              input.project_type
            ),

      description:
        input.description ===
          undefined
          ? currentIntake.description
          : input.description,

      budget:
        input.budget === undefined
          ? currentIntake.budget
          : input.budget,

      timeline:
        input.timeline === undefined
          ? currentIntake.timeline
          : input.timeline,

      location:
        input.location === undefined
          ? currentIntake.location
          : input.location,

      imageUrl:
        input.imageUrl === undefined &&
        input.image_url === undefined
          ? currentIntake.imageUrl
          : (
              input.imageUrl ||
              input.image_url
            ),

      imagePublicId:
        input.imagePublicId ===
          undefined &&
        input.image_public_id ===
          undefined
          ? currentIntake.imagePublicId
          : (
              input.imagePublicId ||
              input.image_public_id
            ),

      status:
        input.status === undefined
          ? currentIntake.status
          : input.status
    });

  const validationErrors =
    validateClientIntake(
      intake
    );

  if (
    validationErrors.length > 0
  ) {
    throw createValidationError(
      validationErrors
    );
  }

  if (
    !ALLOWED_STATUSES.includes(
      intake.status
    )
  ) {
    const error =
      new Error(
        "The selected client intake status is invalid."
      );

    error.statusCode = 400;

    throw error;
  }

  const result =
    await db.query(
      `
        UPDATE client_intakes
        SET
          name = $1,
          phone = $2,
          email = $3,
          contact_method = $4,
          project_type = $5,
          description = $6,
          budget = $7,
          timeline = $8,
          location = $9,
          image_url = $10,
          image_public_id = $11,
          status = $12,
          updated_at = NOW()
        WHERE id = $13
        RETURNING
          id,
          name,
          phone,
          email,
          contact_method,
          project_type,
          description,
          budget,
          timeline,
          location,
          image_url,
          image_public_id,
          status,
          created_at,
          updated_at
      `,
      [
        intake.name,
        intake.phone,
        intake.email,
        intake.contactMethod,
        intake.projectType,
        intake.description,
        intake.budget,
        intake.timeline,
        intake.location,
        intake.imageUrl,
        intake.imagePublicId,
        intake.status,
        intakeId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatClientIntake(
    result.rows[0]
  );
}

// ============================================================
// DELETE CLIENT INTAKE
// ============================================================

async function deleteClientIntake(
  intakeId
) {
  const result =
    await db.query(
      `
        DELETE FROM client_intakes
        WHERE id = $1
        RETURNING
          id,
          name,
          phone,
          email,
          contact_method,
          project_type,
          description,
          budget,
          timeline,
          location,
          image_url,
          image_public_id,
          status,
          created_at,
          updated_at
      `,
      [
        intakeId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatClientIntake(
    result.rows[0]
  );
}

// ============================================================
// COUNT ALL CLIENT INTAKES
// ============================================================

async function countClientIntakes() {
  const result =
    await db.query(
      `
        SELECT
          COUNT(*)::INTEGER
            AS intake_count
        FROM client_intakes
      `
    );

  return Number(
    result.rows[0]
      .intake_count || 0
  );
}

// ============================================================
// COUNT CLIENT INTAKES BY STATUS
// ============================================================

async function countClientIntakesByStatus() {
  const result =
    await db.query(
      `
        SELECT
          status,
          COUNT(*)::INTEGER
            AS intake_count
        FROM client_intakes
        GROUP BY status
        ORDER BY status ASC
      `
    );

  const counts = {
    new: 0,
    contacted: 0,
    in_review: 0,
    approved: 0,
    closed: 0
  };

  result.rows.forEach(
    function (row) {
      const status =
        normalizeStatus(
          row.status
        );

      counts[status] =
        Number(
          row.intake_count || 0
        );
    }
  );

  return counts;
}

// ============================================================
// EXPORT CLIENT INTAKE MODEL
// ============================================================

module.exports = {
  ALLOWED_STATUSES:
    ALLOWED_STATUSES,

  cleanText:
    cleanText,

  normalizeStatus:
    normalizeStatus,

  formatClientIntake:
    formatClientIntake,

  normalizeClientIntakeInput:
    normalizeClientIntakeInput,

  validateClientIntake:
    validateClientIntake,

  createClientIntake:
    createClientIntake,

  getAllClientIntakes:
    getAllClientIntakes,

  getClientIntakesByStatus:
    getClientIntakesByStatus,

  getClientIntakeById:
    getClientIntakeById,

  searchClientIntakes:
    searchClientIntakes,

  updateClientIntakeStatus:
    updateClientIntakeStatus,

  updateClientIntake:
    updateClientIntake,

  deleteClientIntake:
    deleteClientIntake,

  countClientIntakes:
    countClientIntakes,

  countClientIntakesByStatus:
    countClientIntakesByStatus
};