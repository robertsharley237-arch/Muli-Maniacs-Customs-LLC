// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// CATEGORY MODEL
// NEON POSTGRESQL
// ============================================================

"use strict";

const db = require("../db");

// ============================================================
// FORMAT CATEGORY RECORD
// ============================================================

function formatCategory(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),

    name: String(
      row.name || ""
    ),

    slug: String(
      row.slug || ""
    ),

    active:
      row.active !== false,

    createdAt:
      row.created_at || null,

    updatedAt:
      row.updated_at || null
  };
}

// ============================================================
// CREATE CATEGORY SLUG
// ============================================================

function createSlug(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================================
// CLEAN CATEGORY NAME
// ============================================================

function cleanCategoryName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

// ============================================================
// GET ALL CATEGORIES
// ============================================================

async function getAllCategories(
  includeHidden
) {
  const showHidden =
    includeHidden === true;

  const result = await db.query(
    `
      SELECT
        id,
        name,
        slug,
        active,
        created_at,
        updated_at
      FROM categories
      WHERE
        $1::BOOLEAN = TRUE
        OR active = TRUE
      ORDER BY
        name ASC
    `,
    [showHidden]
  );

  return result.rows.map(
    formatCategory
  );
}

// ============================================================
// GET CATEGORY BY ID
// ============================================================

async function getCategoryById(
  categoryId
) {
  const result = await db.query(
    `
      SELECT
        id,
        name,
        slug,
        active,
        created_at,
        updated_at
      FROM categories
      WHERE id = $1
      LIMIT 1
    `,
    [categoryId]
  );

  if (!result.rows.length) {
    return null;
  }

  return formatCategory(
    result.rows[0]
  );
}

// ============================================================
// GET CATEGORY BY SLUG
// ============================================================

async function getCategoryBySlug(
  categorySlug
) {
  const result = await db.query(
    `
      SELECT
        id,
        name,
        slug,
        active,
        created_at,
        updated_at
      FROM categories
      WHERE slug = $1
      LIMIT 1
    `,
    [
      String(
        categorySlug || ""
      )
        .trim()
        .toLowerCase()
    ]
  );

  if (!result.rows.length) {
    return null;
  }

  return formatCategory(
    result.rows[0]
  );
}

// ============================================================
// CREATE CATEGORY
// ============================================================

async function createCategory(
  categoryData
) {
  const name =
    cleanCategoryName(
      categoryData.name
    );

  const slug =
    createSlug(
      categoryData.slug ||
      name
    );

  const active =
    categoryData.active !== false;

  if (name.length < 2) {
    throw new Error(
      "Category name must contain at least 2 characters."
    );
  }

  if (!slug) {
    throw new Error(
      "A valid category slug could not be created."
    );
  }

  const result = await db.query(
    `
      INSERT INTO categories (
        name,
        slug,
        active,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        name,
        slug,
        active,
        created_at,
        updated_at
    `,
    [
      name,
      slug,
      active
    ]
  );

  return formatCategory(
    result.rows[0]
  );
}

// ============================================================
// UPDATE CATEGORY
// ============================================================

async function updateCategory(
  categoryId,
  categoryData
) {
  const currentCategory =
    await getCategoryById(
      categoryId
    );

  if (!currentCategory) {
    return null;
  }

  const name =
    categoryData.name === undefined
      ? currentCategory.name
      : cleanCategoryName(
          categoryData.name
        );

  const slug =
    categoryData.slug === undefined &&
    categoryData.name === undefined
      ? currentCategory.slug
      : createSlug(
          categoryData.slug ||
          name
        );

  const active =
    categoryData.active === undefined
      ? currentCategory.active
      : categoryData.active === true ||
        categoryData.active === "true";

  if (name.length < 2) {
    throw new Error(
      "Category name must contain at least 2 characters."
    );
  }

  if (!slug) {
    throw new Error(
      "A valid category slug could not be created."
    );
  }

  const result = await db.query(
    `
      UPDATE categories
      SET
        name = $1,
        slug = $2,
        active = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING
        id,
        name,
        slug,
        active,
        created_at,
        updated_at
    `,
    [
      name,
      slug,
      active,
      categoryId
    ]
  );

  if (!result.rows.length) {
    return null;
  }

  return formatCategory(
    result.rows[0]
  );
}

// ============================================================
// DELETE CATEGORY
// ============================================================

async function deleteCategory(
  categoryId
) {
  const result = await db.query(
    `
      DELETE FROM categories
      WHERE id = $1
      RETURNING
        id,
        name,
        slug,
        active,
        created_at,
        updated_at
    `,
    [categoryId]
  );

  if (!result.rows.length) {
    return null;
  }

  return formatCategory(
    result.rows[0]
  );
}

// ============================================================
// CHECK FOR DUPLICATE CATEGORY
// ============================================================

async function categoryExists(
  name,
  excludedCategoryId
) {
  const cleanedName =
    cleanCategoryName(name);

  const slug =
    createSlug(cleanedName);

  const excludedId =
    excludedCategoryId || null;

  const result = await db.query(
    `
      SELECT id
      FROM categories
      WHERE
        (
          LOWER(name) = LOWER($1)
          OR slug = $2
        )
        AND (
          $3::BIGINT IS NULL
          OR id <> $3
        )
      LIMIT 1
    `,
    [
      cleanedName,
      slug,
      excludedId
    ]
  );

  return result.rows.length > 0;
}

// ============================================================
// COUNT CATEGORIES
// ============================================================

async function countCategories() {
  const result = await db.query(
    `
      SELECT
        COUNT(*)::INTEGER
          AS category_count
      FROM categories
    `
  );

  return Number(
    result.rows[0]
      .category_count || 0
  );
}

// ============================================================
// EXPORT CATEGORY FUNCTIONS
// ============================================================

module.exports = {
  formatCategory:
    formatCategory,

  createSlug:
    createSlug,

  getAllCategories:
    getAllCategories,

  getCategoryById:
    getCategoryById,

  getCategoryBySlug:
    getCategoryBySlug,

  createCategory:
    createCategory,

  updateCategory:
    updateCategory,

  deleteCategory:
    deleteCategory,

  categoryExists:
    categoryExists,

  countCategories:
    countCategories
};