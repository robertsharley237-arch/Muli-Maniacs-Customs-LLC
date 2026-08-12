// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: routes/CategoryRoutes.js
// CATEGORY ROUTES FOR NEON POSTGRESQL
// ============================================================

"use strict";

const express =
  require("express");

const Category =
  require("../models/Category");

const requireAdmin =
  require("../middleware/requireAdmin");

const router =
  express.Router();

// ============================================================
// REQUEST HELPERS
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

function getCategoryId(
  request
) {
  return (
    request.params.id ||
    request.body.id ||
    request.body.categoryId ||
    ""
  );
}

// ============================================================
// ERROR HANDLING
// ============================================================

function sendCategoryError(
  response,
  error,
  fallbackMessage
) {
  console.error(
    fallbackMessage,
    error
  );

  if (
    error.code === "23505"
  ) {
    return response
      .status(409)
      .json({
        error:
          "A category with that name or slug already exists."
      });
  }

  if (
    error.code === "23503"
  ) {
    return response
      .status(409)
      .json({
        error:
          "This category is still connected to another database record."
      });
  }

  if (
    error.code === "22P02"
  ) {
    return response
      .status(400)
      .json({
        error:
          "The category ID is invalid."
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
            )
    });
}

// ============================================================
// CATEGORY VALIDATION
// ============================================================

function validateCategoryName(name) {
  if (!name) {
    return (
      "Category name is required."
    );
  }

  if (name.length < 2) {
    return (
      "Category name must contain at least 2 characters."
    );
  }

  if (name.length > 100) {
    return (
      "Category name cannot contain more than 100 characters."
    );
  }

  return "";
}

// ============================================================
// CREATE CATEGORY HANDLER
// ============================================================

async function createCategoryHandler(
  request,
  response
) {
  try {
    const name =
      cleanText(
        request.body.name,
        100
      );

    const validationError =
      validateCategoryName(
        name
      );

    if (validationError) {
      return response
        .status(400)
        .json({
          error:
            validationError
        });
    }

    const categoryExists =
      await Category
        .categoryExists(
          name
        );

    if (categoryExists) {
      return response
        .status(409)
        .json({
          error:
            "A category with that name already exists."
        });
    }

    const category =
      await Category
        .createCategory({
          name:
            name,

          slug:
            request.body.slug,

          active:
            cleanBoolean(
              request.body.active,
              true
            )
        });

    return response
      .status(201)
      .json({
        message:
          "Category added successfully.",

        category:
          category
      });
  } catch (error) {
    return sendCategoryError(
      response,
      error,
      "The category could not be added."
    );
  }
}

// ============================================================
// UPDATE CATEGORY HANDLER
// ============================================================

async function updateCategoryHandler(
  request,
  response
) {
  try {
    const categoryId =
      getCategoryId(
        request
      );

    if (!categoryId) {
      return response
        .status(400)
        .json({
          error:
            "Category ID is required."
        });
    }

    const existingCategory =
      await Category
        .getCategoryById(
          categoryId
        );

    if (!existingCategory) {
      return response
        .status(404)
        .json({
          error:
            "Category not found."
        });
    }

    const name =
      request.body.name ===
        undefined
        ? existingCategory.name
        : cleanText(
            request.body.name,
            100
          );

    const validationError =
      validateCategoryName(
        name
      );

    if (validationError) {
      return response
        .status(400)
        .json({
          error:
            validationError
        });
    }

    const categoryExists =
      await Category
        .categoryExists(
          name,
          categoryId
        );

    if (categoryExists) {
      return response
        .status(409)
        .json({
          error:
            "A category with that name already exists."
        });
    }

    const category =
      await Category
        .updateCategory(
          categoryId,
          {
            name:
              name,

            slug:
              request.body.slug,

            active:
              request.body.active ===
                undefined
                ? existingCategory.active
                : cleanBoolean(
                    request.body.active,
                    existingCategory.active
                  )
          }
        );

    if (!category) {
      return response
        .status(404)
        .json({
          error:
            "Category not found."
        });
    }

    return response.json({
      message:
        "Category updated successfully.",

      category:
        category
    });
  } catch (error) {
    return sendCategoryError(
      response,
      error,
      "The category could not be updated."
    );
  }
}

// ============================================================
// DELETE CATEGORY HANDLER
// ============================================================

async function deleteCategoryHandler(
  request,
  response
) {
  try {
    const categoryId =
      getCategoryId(
        request
      );

    if (!categoryId) {
      return response
        .status(400)
        .json({
          error:
            "Category ID is required."
        });
    }

    const category =
      await Category
        .deleteCategory(
          categoryId
        );

    if (!category) {
      return response
        .status(404)
        .json({
          error:
            "Category not found."
        });
    }

    return response.json({
      message:
        "Category deleted successfully.",

      category:
        category
    });
  } catch (error) {
    return sendCategoryError(
      response,
      error,
      "The category could not be deleted."
    );
  }
}

// ============================================================
// PUBLIC: GET ACTIVE CATEGORIES
//
// GET /categories
// ============================================================

router.get(
  "/",
  async function (
    request,
    response
  ) {
    try {
      const categories =
        await Category
          .getAllCategories(
            false
          );

      return response.json({
        categories:
          categories
      });
    } catch (error) {
      return sendCategoryError(
        response,
        error,
        "Categories could not be loaded."
      );
    }
  }
);

// ============================================================
// PUBLIC: GET ACTIVE CATEGORIES
// LEGACY ROUTE
//
// GET /categories/all
// ============================================================

router.get(
  "/all",
  async function (
    request,
    response
  ) {
    try {
      const categories =
        await Category
          .getAllCategories(
            false
          );

      return response.json({
        categories:
          categories
      });
    } catch (error) {
      return sendCategoryError(
        response,
        error,
        "Categories could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: GET ALL CATEGORIES
// INCLUDES INACTIVE CATEGORIES
//
// GET /categories/admin/all
// ============================================================

router.get(
  "/admin/all",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const categories =
        await Category
          .getAllCategories(
            true
          );

      return response.json({
        categories:
          categories
      });
    } catch (error) {
      return sendCategoryError(
        response,
        error,
        "Administrator categories could not be loaded."
      );
    }
  }
);

// ============================================================
// PUBLIC: GET ACTIVE CATEGORY BY SLUG
//
// GET /categories/slug/:slug
// ============================================================

router.get(
  "/slug/:slug",
  async function (
    request,
    response
  ) {
    try {
      const category =
        await Category
          .getCategoryBySlug(
            request.params.slug
          );

      if (
        !category ||
        category.active === false
      ) {
        return response
          .status(404)
          .json({
            error:
              "Category not found."
          });
      }

      return response.json({
        category:
          category
      });
    } catch (error) {
      return sendCategoryError(
        response,
        error,
        "The category could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: CREATE CATEGORY
// LEGACY ROUTE
//
// POST /categories/add
// ============================================================

router.post(
  "/add",
  requireAdmin,
  createCategoryHandler
);

// ============================================================
// ADMIN: UPDATE CATEGORY
// LEGACY ROUTE
//
// PUT /categories/edit
// Body: { id, name, slug, active }
// ============================================================

router.put(
  "/edit",
  requireAdmin,
  updateCategoryHandler
);

// ============================================================
// ADMIN: DELETE CATEGORY
// LEGACY ROUTE
//
// DELETE /categories/delete
// Body: { id }
// ============================================================

router.delete(
  "/delete",
  requireAdmin,
  deleteCategoryHandler
);

// ============================================================
// ADMIN: CREATE CATEGORY
// REST ROUTE
//
// POST /categories
// ============================================================

router.post(
  "/",
  requireAdmin,
  createCategoryHandler
);

// ============================================================
// ADMIN: GET CATEGORY BY ID
//
// GET /categories/:id
// ============================================================

router.get(
  "/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const category =
        await Category
          .getCategoryById(
            request.params.id
          );

      if (!category) {
        return response
          .status(404)
          .json({
            error:
              "Category not found."
          });
      }

      return response.json({
        category:
          category
      });
    } catch (error) {
      return sendCategoryError(
        response,
        error,
        "The category could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: UPDATE CATEGORY
// REST ROUTE
//
// PUT /categories/:id
// ============================================================

router.put(
  "/:id",
  requireAdmin,
  updateCategoryHandler
);

// ============================================================
// ADMIN: DELETE CATEGORY
// REST ROUTE
//
// DELETE /categories/:id
// ============================================================

router.delete(
  "/:id",
  requireAdmin,
  deleteCategoryHandler
);

// ============================================================
// EXPORT CATEGORY ROUTER
// ============================================================

module.exports = router;