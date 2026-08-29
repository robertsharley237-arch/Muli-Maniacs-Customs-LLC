// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: models/Product.js
// NEON POSTGRESQL PRODUCT MODEL
//
// Used by:
// - ProductRoutes.js
// - CheckoutRoutes.js
// - Administrator inventory management
// - Public shop and product pages
// ============================================================

"use strict";

const db =
  require("../db");

// ============================================================
// DEFAULT VALUES
// ============================================================

const DEFAULT_CATEGORY =
  "General";

const DEFAULT_LOW_STOCK_WARNING =
  5;

// ============================================================
// TEXT HELPERS
// ============================================================

function cleanText(
  value,
  maximumLength
) {
  return String(
    value === undefined ||
    value === null
      ? ""
      : value
  )
    .trim()
    .slice(
      0,
      maximumLength
    );
}

// ============================================================
// NUMBER HELPERS
// ============================================================

function normalizeMoney(
  value,
  fallbackValue
) {
  let number =
    Number(value);

  if (!Number.isFinite(number)) {
    number =
      Number(fallbackValue);
  }

  if (!Number.isFinite(number)) {
    number = 0;
  }

  return Math.max(
    0,
    Math.round(
      number * 100
    ) / 100
  );
}

function normalizeWholeNumber(
  value,
  fallbackValue
) {
  let number =
    Number(value);

  if (!Number.isFinite(number)) {
    number =
      Number(fallbackValue);
  }

  if (!Number.isFinite(number)) {
    number = 0;
  }

  return Math.max(
    0,
    Math.floor(number)
  );
}

function normalizeBoolean(
  value,
  fallbackValue
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return Boolean(
      fallbackValue
    );
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (
    typeof value ===
    "number"
  ) {
    return value !== 0;
  }

  const normalizedValue =
    String(value)
      .trim()
      .toLowerCase();

  if (
    normalizedValue === "true" ||
    normalizedValue === "yes" ||
    normalizedValue === "1" ||
    normalizedValue === "on"
  ) {
    return true;
  }

  if (
    normalizedValue === "false" ||
    normalizedValue === "no" ||
    normalizedValue === "0" ||
    normalizedValue === "off"
  ) {
    return false;
  }

  return Boolean(
    fallbackValue
  );
}

// ============================================================
// DATABASE IDENTIFIER HELPERS
// ============================================================

function normalizeProductId(
  productId
) {
  const normalizedId =
    cleanText(
      productId,
      250
    );

  if (!normalizedId) {
    const error =
      new Error(
        "Product ID is required."
      );

    error.statusCode =
      400;

    error.code =
      "PRODUCT_ID_REQUIRED";

    throw error;
  }

  return normalizedId;
}

function normalizeVariantIndex(
  variantIndex
) {
  const normalizedIndex =
    Number(
      variantIndex
    );

  if (
    !Number.isInteger(
      normalizedIndex
    ) ||
    normalizedIndex < 0
  ) {
    const error =
      new Error(
        "The variant index is invalid."
      );

    error.statusCode =
      400;

    error.code =
      "INVALID_VARIANT_INDEX";

    throw error;
  }

  return normalizedIndex;
}

// ============================================================
// VARIANT IDENTIFIER
// ============================================================

function createVariantId(
  variantIndex
) {
  return (
    "variant-" +
    Date.now() +
    "-" +
    String(variantIndex) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}

// ============================================================
// VARIANT NORMALIZATION
// ============================================================

function normalizeVariant(
  variant,
  variantIndex
) {
  const sourceVariant =
    variant &&
    typeof variant ===
      "object"
      ? variant
      : {};

  const normalizedIndex =
    normalizeWholeNumber(
      variantIndex,
      0
    );

  const variantId =
    cleanText(
      sourceVariant.id ||
      sourceVariant._id,
      250
    ) ||
    createVariantId(
      normalizedIndex
    );

  return {
    id:
      variantId,

    _id:
      variantId,

    name:
      cleanText(
        sourceVariant.name,
        250
      ),

    sku:
      cleanText(
        sourceVariant.sku,
        100
      ),

    price:
      normalizeMoney(
        sourceVariant.price,
        0
      ),

    stock:
      normalizeWholeNumber(
        sourceVariant.stock,
        0
      ),

    image:
      cleanText(
        sourceVariant.image,
        2000
      ),

    imagePublicId:
      cleanText(
        sourceVariant.imagePublicId ||
        sourceVariant.image_public_id,
        500
      )
  };
}

function normalizeVariants(
  variants
) {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants.map(
    function (
      variant,
      variantIndex
    ) {
      return normalizeVariant(
        variant,
        variantIndex
      );
    }
  );
}

// ============================================================
// DATABASE JSON HELPER
// ============================================================

function parseVariants(
  value
) {
  if (Array.isArray(value)) {
    return normalizeVariants(
      value
    );
  }

  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    try {
      const parsedValue =
        JSON.parse(value);

      return normalizeVariants(
        parsedValue
      );
    } catch (error) {
      console.warn(
        "A product contained invalid variant JSON:",
        error.message
      );
    }
  }

  return [];
}

// ============================================================
// PRODUCT FORMATTING
// ============================================================

function formatProduct(
  databaseRow
) {
  if (!databaseRow) {
    return null;
  }

  const productId =
    String(
      databaseRow.id
    );

  const variants =
    parseVariants(
      databaseRow.variants
    );

  return {
    id:
      productId,

    _id:
      productId,

    name:
      databaseRow.name ||
      "",

    sku:
      databaseRow.sku ||
      "",

    price:
      normalizeMoney(
        databaseRow.price,
        0
      ),

    image:
      databaseRow.image ||
      "",

    imagePublicId:
      databaseRow
        .image_public_id ||
      "",

    image_public_id:
      databaseRow
        .image_public_id ||
      "",

    stock:
      normalizeWholeNumber(
        databaseRow.stock,
        0
      ),

    variants:
      variants,

    lowStockWarning:
      normalizeWholeNumber(
        databaseRow
          .low_stock_warning,
        DEFAULT_LOW_STOCK_WARNING
      ),

    low_stock_warning:
      normalizeWholeNumber(
        databaseRow
          .low_stock_warning,
        DEFAULT_LOW_STOCK_WARNING
      ),

    category:
      databaseRow.category ||
      DEFAULT_CATEGORY,

    description:
      databaseRow.description ||
      "",

    active:
      normalizeBoolean(
        databaseRow.active,
        true
      ),

    createdAt:
      databaseRow.created_at,

    created_at:
      databaseRow.created_at,

    updatedAt:
      databaseRow.updated_at,

    updated_at:
      databaseRow.updated_at
  };
}

function formatProductRows(
  rows
) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(
    formatProduct
  );
}

// ============================================================
// PRODUCT VALIDATION
// ============================================================

function validateProductData(
  productData,
  requireRequiredFields
) {
  const data =
    productData &&
    typeof productData ===
      "object"
      ? productData
      : {};

  const validationErrors =
    [];

  if (
    requireRequiredFields ||
    data.name !== undefined
  ) {
    if (
      !cleanText(
        data.name,
        250
      )
    ) {
      validationErrors.push(
        "Product name is required."
      );
    }
  }

  if (
    requireRequiredFields ||
    data.sku !== undefined
  ) {
    if (
      !cleanText(
        data.sku,
        100
      )
    ) {
      validationErrors.push(
        "Product SKU is required."
      );
    }
  }

  if (
    requireRequiredFields ||
    data.price !== undefined
  ) {
    const price =
      Number(data.price);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      validationErrors.push(
        "Product price must be 0 or higher."
      );
    }
  }

  if (
    data.stock !== undefined
  ) {
    const stock =
      Number(data.stock);

    if (
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      validationErrors.push(
        "Product stock must be a whole number of 0 or higher."
      );
    }
  }

  const warningValue =
    data.lowStockWarning !==
      undefined
      ? data.lowStockWarning
      : data.low_stock_warning;

  if (
    warningValue !== undefined
  ) {
    const warningNumber =
      Number(
        warningValue
      );

    if (
      !Number.isInteger(
        warningNumber
      ) ||
      warningNumber < 0
    ) {
      validationErrors.push(
        "The low-stock warning must be a whole number of 0 or higher."
      );
    }
  }

  if (
    data.variants !== undefined &&
    !Array.isArray(
      data.variants
    )
  ) {
    validationErrors.push(
      "Product variants must be an array."
    );
  }

  if (
    Array.isArray(
      data.variants
    )
  ) {
    const variants =
      normalizeVariants(
        data.variants
      );

    const usedVariantSkus =
      new Set();

    variants.forEach(
      function (
        variant,
        variantIndex
      ) {
        if (!variant.name) {
          validationErrors.push(
            "Variant " +
            String(
              variantIndex + 1
            ) +
            " requires a name."
          );
        }

        if (!variant.sku) {
          validationErrors.push(
            "Variant " +
            String(
              variantIndex + 1
            ) +
            " requires a SKU."
          );
        }

        if (
          !Number.isFinite(
            variant.price
          ) ||
          variant.price < 0
        ) {
          validationErrors.push(
            "Variant " +
            String(
              variantIndex + 1
            ) +
            " requires a valid price."
          );
        }

        if (
          !Number.isInteger(
            variant.stock
          ) ||
          variant.stock < 0
        ) {
          validationErrors.push(
            "Variant " +
            String(
              variantIndex + 1
            ) +
            " requires a valid stock amount."
          );
        }

        const normalizedSku =
          variant.sku
            .trim()
            .toLowerCase();

        if (
          normalizedSku &&
          usedVariantSkus.has(
            normalizedSku
          )
        ) {
          validationErrors.push(
            "Variant SKUs must be unique within a product."
          );
        }

        if (normalizedSku) {
          usedVariantSkus.add(
            normalizedSku
          );
        }
      }
    );
  }

  if (
    validationErrors.length > 0
  ) {
    const validationError =
      new Error(
        "One or more product values are invalid."
      );

    validationError.statusCode =
      400;

    validationError.code =
      "PRODUCT_VALIDATION_FAILED";

    validationError.validationErrors =
      validationErrors;

    throw validationError;
  }
}

// ============================================================
// PRODUCT SKU CHECK
// ============================================================

async function productSkuExists(
  sku,
  excludedProductId
) {
  const cleanedSku =
    cleanText(
      sku,
      100
    );

  if (!cleanedSku) {
    return false;
  }

  const parameters = [
    cleanedSku
  ];

  let excludedProductClause =
    "";

  if (
    excludedProductId !==
      undefined &&
    excludedProductId !==
      null &&
    String(
      excludedProductId
    ).trim()
  ) {
    parameters.push(
      normalizeProductId(
        excludedProductId
      )
    );

    excludedProductClause =
      "AND id <> $2";
  }

  const result =
    await db.query(
      `
        SELECT
          id
        FROM products
        WHERE LOWER(sku) =
          LOWER($1)
        ${excludedProductClause}
        LIMIT 1
      `,
      parameters
    );

  return (
    result.rows.length > 0
  );
}

// ============================================================
// PUBLIC PRODUCTS
// ============================================================

async function getPublicProducts() {
  const result =
    await db.query(
      `
        SELECT
          *
        FROM products
        WHERE active = true
        ORDER BY
          created_at DESC,
          id DESC
      `
    );

  return formatProductRows(
    result.rows
  );
}

// ============================================================
// ALL PRODUCTS FOR ADMINISTRATORS
// ============================================================

async function getAllProducts() {
  const result =
    await db.query(
      `
        SELECT
          *
        FROM products
        ORDER BY
          created_at DESC,
          id DESC
      `
    );

  return formatProductRows(
    result.rows
  );
}

// ============================================================
// SEARCH PRODUCTS
// ============================================================

async function searchProducts(
  searchTerm,
  includeInactive
) {
  const cleanedSearchTerm =
    cleanText(
      searchTerm,
      250
    );

  if (!cleanedSearchTerm) {
    return includeInactive
      ? getAllProducts()
      : getPublicProducts();
  }

  const activeCondition =
    includeInactive
      ? ""
      : "AND active = true";

  const result =
    await db.query(
      `
        SELECT
          *
        FROM products
        WHERE (
          name ILIKE $1
          OR sku ILIKE $1
          OR category ILIKE $1
          OR description ILIKE $1
        )
        ${activeCondition}
        ORDER BY
          name ASC,
          id ASC
      `,
      [
        "%" +
        cleanedSearchTerm +
        "%"
      ]
    );

  return formatProductRows(
    result.rows
  );
}

// ============================================================
// GET PRODUCT BY ID
// ============================================================

async function getProductById(
  productId,
  includeInactive
) {
  const normalizedId =
    normalizeProductId(
      productId
    );

  const activeCondition =
    includeInactive
      ? ""
      : "AND active = true";

  const result =
    await db.query(
      `
        SELECT
          *
        FROM products
        WHERE id = $1
        ${activeCondition}
        LIMIT 1
      `,
      [
        normalizedId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatProduct(
    result.rows[0]
  );
}

// ============================================================
// PRODUCT COUNTS
// ============================================================

async function countProducts() {
  const result =
    await db.query(
      `
        SELECT
          COUNT(*)::integer
            AS product_count
        FROM products
      `
    );

  return Number(
    result.rows[0]
      .product_count
  );
}

async function countActiveProducts() {
  const result =
    await db.query(
      `
        SELECT
          COUNT(*)::integer
            AS product_count
        FROM products
        WHERE active = true
      `
    );

  return Number(
    result.rows[0]
      .product_count
  );
}

// ============================================================
// CREATE PRODUCT
// ============================================================

async function createProduct(
  productData
) {
  const data =
    productData &&
    typeof productData ===
      "object"
      ? productData
      : {};

  validateProductData(
    data,
    true
  );

  const name =
    cleanText(
      data.name,
      250
    );

  const sku =
    cleanText(
      data.sku,
      100
    );

  const price =
    normalizeMoney(
      data.price,
      0
    );

  const image =
    cleanText(
      data.image,
      2000
    );

  const imagePublicId =
    cleanText(
      data.imagePublicId ||
      data.image_public_id,
      500
    );

  const stock =
    normalizeWholeNumber(
      data.stock,
      0
    );

  const variants =
    normalizeVariants(
      data.variants
    );

  const lowStockWarning =
    normalizeWholeNumber(
      data.lowStockWarning !==
        undefined
        ? data.lowStockWarning
        : data.low_stock_warning,
      DEFAULT_LOW_STOCK_WARNING
    );

  const category =
    cleanText(
      data.category ||
      DEFAULT_CATEGORY,
      150
    ) ||
    DEFAULT_CATEGORY;

  const description =
    cleanText(
      data.description,
      10000
    );

  const active =
    normalizeBoolean(
      data.active,
      true
    );

  const result =
    await db.query(
      `
        INSERT INTO products (
          name,
          sku,
          price,
          image,
          image_public_id,
          stock,
          variants,
          low_stock_warning,
          category,
          description,
          active,
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
          $7::jsonb,
          $8,
          $9,
          $10,
          $11,
          NOW(),
          NOW()
        )
        RETURNING *
      `,
      [
        name,
        sku,
        price,
        image,
        imagePublicId,
        stock,
        JSON.stringify(
          variants
        ),
        lowStockWarning,
        category,
        description,
        active
      ]
    );

  return formatProduct(
    result.rows[0]
  );
}

// ============================================================
// UPDATE PRODUCT
// ============================================================

async function updateProduct(
  productId,
  productData
) {
  const normalizedId =
    normalizeProductId(
      productId
    );

  const data =
    productData &&
    typeof productData ===
      "object"
      ? productData
      : {};

  validateProductData(
    data,
    false
  );

  const existingProduct =
    await getProductById(
      normalizedId,
      true
    );

  if (!existingProduct) {
    return null;
  }

  const name =
    data.name !== undefined
      ? cleanText(
          data.name,
          250
        )
      : existingProduct.name;

  const sku =
    data.sku !== undefined
      ? cleanText(
          data.sku,
          100
        )
      : existingProduct.sku;

  const price =
    data.price !== undefined
      ? normalizeMoney(
          data.price,
          existingProduct.price
        )
      : existingProduct.price;

  const image =
    data.image !== undefined
      ? cleanText(
          data.image,
          2000
        )
      : existingProduct.image;

  let imagePublicId =
    existingProduct.imagePublicId;

  if (
    data.imagePublicId !==
      undefined ||
    data.image_public_id !==
      undefined
  ) {
    imagePublicId =
      cleanText(
        data.imagePublicId ||
        data.image_public_id,
        500
      );
  }

  const stock =
    data.stock !== undefined
      ? normalizeWholeNumber(
          data.stock,
          existingProduct.stock
        )
      : existingProduct.stock;

  const variants =
    data.variants !== undefined
      ? normalizeVariants(
          data.variants
        )
      : normalizeVariants(
          existingProduct.variants
        );

  let lowStockWarning =
    existingProduct
      .lowStockWarning;

  if (
    data.lowStockWarning !==
      undefined ||
    data.low_stock_warning !==
      undefined
  ) {
    lowStockWarning =
      normalizeWholeNumber(
        data.lowStockWarning !==
          undefined
          ? data.lowStockWarning
          : data.low_stock_warning,
        existingProduct
          .lowStockWarning
      );
  }

  const category =
    data.category !== undefined
      ? (
          cleanText(
            data.category,
            150
          ) ||
          DEFAULT_CATEGORY
        )
      : existingProduct.category;

  const description =
    data.description !==
      undefined
      ? cleanText(
          data.description,
          10000
        )
      : existingProduct
          .description;

  const active =
    data.active !== undefined
      ? normalizeBoolean(
          data.active,
          existingProduct.active
        )
      : existingProduct.active;

  const result =
    await db.query(
      `
        UPDATE products
        SET
          name = $1,
          sku = $2,
          price = $3,
          image = $4,
          image_public_id = $5,
          stock = $6,
          variants = $7::jsonb,
          low_stock_warning = $8,
          category = $9,
          description = $10,
          active = $11,
          updated_at = NOW()
        WHERE id = $12
        RETURNING *
      `,
      [
        name,
        sku,
        price,
        image,
        imagePublicId,
        stock,
        JSON.stringify(
          variants
        ),
        lowStockWarning,
        category,
        description,
        active,
        normalizedId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatProduct(
    result.rows[0]
  );
}

// ============================================================
// UPDATE BASE PRODUCT STOCK
// ============================================================

async function updateProductStock(
  productId,
  stock
) {
  const normalizedId =
    normalizeProductId(
      productId
    );

  const normalizedStock =
    Number(stock);

  if (
    !Number.isInteger(
      normalizedStock
    ) ||
    normalizedStock < 0
  ) {
    const error =
      new Error(
        "Stock must be a whole number of 0 or higher."
      );

    error.statusCode =
      400;

    error.code =
      "INVALID_PRODUCT_STOCK";

    throw error;
  }

  const result =
    await db.query(
      `
        UPDATE products
        SET
          stock = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [
        normalizedStock,
        normalizedId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatProduct(
    result.rows[0]
  );
}

// ============================================================
// TRANSACTION HELPER
// ============================================================

async function runTransaction(
  transactionCallback
) {
  if (
    typeof db.withTransaction ===
    "function"
  ) {
    return db.withTransaction(
      transactionCallback
    );
  }

  const client =
    typeof db.getClient ===
      "function"
      ? await db.getClient()
      : await db.pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const result =
      await transactionCallback(
        client
      );

    await client.query(
      "COMMIT"
    );

    return result;
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Product transaction rollback failed:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// UPDATE VARIANT STOCK
// ============================================================

async function updateVariantStock(
  productId,
  variantIndex,
  stock
) {
  const normalizedId =
    normalizeProductId(
      productId
    );

  const normalizedIndex =
    normalizeVariantIndex(
      variantIndex
    );

  const normalizedStock =
    Number(stock);

  if (
    !Number.isInteger(
      normalizedStock
    ) ||
    normalizedStock < 0
  ) {
    const error =
      new Error(
        "Variant stock must be a whole number of 0 or higher."
      );

    error.statusCode =
      400;

    error.code =
      "INVALID_VARIANT_STOCK";

    throw error;
  }

  return runTransaction(
    async function (
      client
    ) {
      const productResult =
        await client.query(
          `
            SELECT
              *
            FROM products
            WHERE id = $1
            FOR UPDATE
          `,
          [
            normalizedId
          ]
        );

      if (
        productResult.rows.length ===
        0
      ) {
        return null;
      }

      const variants =
        parseVariants(
          productResult
            .rows[0]
            .variants
        );

      if (
        normalizedIndex >=
        variants.length
      ) {
        const error =
          new Error(
            "Product variant not found."
          );

        error.statusCode =
          404;

        error.code =
          "VARIANT_NOT_FOUND";

        throw error;
      }

      variants[
        normalizedIndex
      ].stock =
        normalizedStock;

      const updateResult =
        await client.query(
          `
            UPDATE products
            SET
              variants = $1::jsonb,
              updated_at = NOW()
            WHERE id = $2
            RETURNING *
          `,
          [
            JSON.stringify(
              variants
            ),
            normalizedId
          ]
        );

      return formatProduct(
        updateResult.rows[0]
      );
    }
  );
}

// ============================================================
// DELETE PRODUCT
// ============================================================

async function deleteProduct(
  productId
) {
  const normalizedId =
    normalizeProductId(
      productId
    );

  const result =
    await db.query(
      `
        DELETE FROM products
        WHERE id = $1
        RETURNING *
      `,
      [
        normalizedId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatProduct(
    result.rows[0]
  );
}

// ============================================================
// EXPORT PRODUCT MODEL
// ============================================================

module.exports = {
  cleanText:
    cleanText,

  normalizeVariant:
    normalizeVariant,

  normalizeVariants:
    normalizeVariants,

  formatProduct:
    formatProduct,

  validateProductData:
    validateProductData,

  productSkuExists:
    productSkuExists,

  getPublicProducts:
    getPublicProducts,

  getAllProducts:
    getAllProducts,

  searchProducts:
    searchProducts,

  getProductById:
    getProductById,

  countProducts:
    countProducts,

  countActiveProducts:
    countActiveProducts,

  createProduct:
    createProduct,

  updateProduct:
    updateProduct,

  updateProductStock:
    updateProductStock,

  updateVariantStock:
    updateVariantStock,

  deleteProduct:
    deleteProduct
};