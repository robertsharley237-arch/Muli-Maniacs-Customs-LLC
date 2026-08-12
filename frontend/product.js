// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: models/Product.js
// PRODUCT MODEL FOR NEON POSTGRESQL
// ============================================================

"use strict";

const db = require("../db");

// ============================================================
// TEXT HELPERS
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
// NUMBER HELPERS
// ============================================================

function cleanNumber(
  value,
  fallbackValue,
  minimumValue
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return fallbackValue;
  }

  return Math.max(
    minimumValue,
    number
  );
}

function cleanWholeNumber(
  value,
  fallbackValue
) {
  const number =
    cleanNumber(
      value,
      fallbackValue,
      0
    );

  return Math.floor(number);
}

// ============================================================
// BOOLEAN HELPER
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
// SLUG HELPER
// ============================================================

function createSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

// ============================================================
// VARIANT NORMALIZATION
// ============================================================

function normalizeVariant(
  variant,
  variantIndex
) {
  const input =
    variant || {};

  return {
    id: String(
      input.id ||
      input._id ||
      (
        "variant-" +
        Date.now() +
        "-" +
        variantIndex
      )
    ),

    name:
      cleanText(
        input.name,
        150
      ),

    sku:
      cleanText(
        input.sku,
        100
      ),

    price:
      cleanNumber(
        input.price,
        0,
        0
      ),

    stock:
      cleanWholeNumber(
        input.stock,
        0
      ),

    image:
      cleanText(
        input.image,
        2000
      ),

    imagePublicId:
      cleanText(
        input.imagePublicId ||
        input.image_public_id,
        500
      )
  };
}

function normalizeVariants(variants) {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants.map(
    normalizeVariant
  );
}

// ============================================================
// DATABASE VARIANT PARSING
// ============================================================

function parseVariants(value) {
  if (Array.isArray(value)) {
    return normalizeVariants(value);
  }

  if (typeof value === "string") {
    try {
      const parsedValue =
        JSON.parse(value);

      if (Array.isArray(parsedValue)) {
        return normalizeVariants(
          parsedValue
        );
      }
    } catch (error) {
      console.error(
        "Product variants could not be parsed:",
        error
      );
    }
  }

  return [];
}

// ============================================================
// PRODUCT ROW FORMATTING
// ============================================================

function formatProduct(row) {
  if (!row) {
    return null;
  }

  return {
    id:
      String(row.id),

    name:
      String(row.name || ""),

    slug:
      String(row.slug || ""),

    sku:
      String(row.sku || ""),

    price:
      Number(row.price || 0),

    stock:
      Number(row.stock || 0),

    lowStockWarning:
      Number(
        row.low_stock_warning ===
          null ||
        row.low_stock_warning ===
          undefined
          ? 5
          : row.low_stock_warning
      ),

    category:
      String(
        row.category_name ||
        row.category ||
        "General"
      ),

    categoryId:
      row.category_id ===
        null ||
      row.category_id ===
        undefined
        ? null
        : String(
            row.category_id
          ),

    categorySlug:
      String(
        row.category_slug || ""
      ),

    description:
      String(
        row.description || ""
      ),

    image:
      String(row.image || ""),

    imagePublicId:
      String(
        row.image_public_id || ""
      ),

    variants:
      parseVariants(
        row.variants
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
// PRODUCT INPUT NORMALIZATION
// ============================================================

function normalizeProductInput(
  productData,
  existingProduct
) {
  const input =
    productData || {};

  const current =
    existingProduct || {};

  const name =
    input.name === undefined
      ? cleanText(
          current.name,
          200
        )
      : cleanText(
          input.name,
          200
        );

  const suppliedSlug =
    input.slug === undefined
      ? current.slug
      : input.slug;

  const categoryIdValue =
    input.categoryId !== undefined
      ? input.categoryId
      : (
          input.category_id !==
            undefined
            ? input.category_id
            : current.categoryId
        );

  return {
    name:
      name,

    slug:
      createSlug(
        suppliedSlug ||
        name
      ),

    sku:
      input.sku === undefined
        ? cleanText(
            current.sku,
            100
          )
        : cleanText(
            input.sku,
            100
          ),

    price:
      input.price === undefined
        ? cleanNumber(
            current.price,
            0,
            0
          )
        : cleanNumber(
            input.price,
            0,
            0
          ),

    stock:
      input.stock === undefined
        ? cleanWholeNumber(
            current.stock,
            0
          )
        : cleanWholeNumber(
            input.stock,
            0
          ),

    lowStockWarning:
      input.lowStockWarning ===
        undefined &&
      input.low_stock_warning ===
        undefined
        ? cleanWholeNumber(
            current.lowStockWarning,
            5
          )
        : cleanWholeNumber(
            input.lowStockWarning !==
              undefined
              ? input.lowStockWarning
              : input.low_stock_warning,
            5
          ),

    category:
      input.category === undefined
        ? cleanText(
            current.category ||
            "General",
            150
          )
        : cleanText(
            input.category ||
            "General",
            150
          ),

    categoryId:
      categoryIdValue === null ||
      categoryIdValue === undefined ||
      categoryIdValue === ""
        ? null
        : String(
            categoryIdValue
          ),

    categorySlug:
      input.categorySlug ===
        undefined &&
      input.category_slug ===
        undefined
        ? cleanText(
            current.categorySlug,
            180
          )
        : cleanText(
            input.categorySlug ||
            input.category_slug,
            180
          ),

    description:
      input.description === undefined
        ? cleanLongText(
            current.description,
            10000
          )
        : cleanLongText(
            input.description,
            10000
          ),

    image:
      input.image === undefined
        ? cleanText(
            current.image,
            2000
          )
        : cleanText(
            input.image,
            2000
          ),

    imagePublicId:
      input.imagePublicId ===
        undefined &&
      input.image_public_id ===
        undefined
        ? cleanText(
            current.imagePublicId,
            500
          )
        : cleanText(
            input.imagePublicId ||
            input.image_public_id,
            500
          ),

    variants:
      input.variants === undefined
        ? normalizeVariants(
            current.variants
          )
        : normalizeVariants(
            input.variants
          ),

    active:
      cleanBoolean(
        input.active,
        current.active !== false
      )
  };
}

// ============================================================
// PRODUCT VALIDATION
// ============================================================

function validateProduct(product) {
  const validationErrors = [];

  if (
    !product.name ||
    product.name.length < 2
  ) {
    validationErrors.push(
      "Product name must contain at least 2 characters."
    );
  }

  if (
    !product.slug ||
    product.slug.length < 2
  ) {
    validationErrors.push(
      "A valid product slug is required."
    );
  }

  if (
    !product.sku ||
    product.sku.length < 2
  ) {
    validationErrors.push(
      "Product SKU must contain at least 2 characters."
    );
  }

  if (
    !Number.isFinite(
      product.price
    ) ||
    product.price < 0
  ) {
    validationErrors.push(
      "Product price must be 0 or higher."
    );
  }

  if (
    !Number.isInteger(
      product.stock
    ) ||
    product.stock < 0
  ) {
    validationErrors.push(
      "Product stock must be a whole number of 0 or higher."
    );
  }

  if (
    !Number.isInteger(
      product.lowStockWarning
    ) ||
    product.lowStockWarning < 0
  ) {
    validationErrors.push(
      "Low-stock warning must be a whole number of 0 or higher."
    );
  }

  if (!product.category) {
    validationErrors.push(
      "A product category is required."
    );
  }

  const savedVariantSkus = [];

  product.variants.forEach(
    function (
      variant,
      variantIndex
    ) {
      const variantNumber =
        variantIndex + 1;

      if (
        !variant.name ||
        variant.name.length < 1
      ) {
        validationErrors.push(
          "Variant " +
          variantNumber +
          " requires a name."
        );
      }

      if (
        !variant.sku ||
        variant.sku.length < 1
      ) {
        validationErrors.push(
          "Variant " +
          variantNumber +
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
          variantNumber +
          " price must be 0 or higher."
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
          variantNumber +
          " stock must be a whole number of 0 or higher."
        );
      }

      const normalizedSku =
        variant.sku
          .trim()
          .toLowerCase();

      if (
        normalizedSku &&
        savedVariantSkus.includes(
          normalizedSku
        )
      ) {
        validationErrors.push(
          "Variant SKUs must be unique within the product."
        );
      }

      savedVariantSkus.push(
        normalizedSku
      );
    }
  );

  return validationErrors;
}

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
// COMMON PRODUCT SELECT
// ============================================================

const PRODUCT_SELECT = `
  SELECT
    products.id,
    products.name,
    products.slug,
    products.sku,
    products.price,
    products.stock,
    products.low_stock_warning,
    products.category,
    products.category_id,
    products.category_slug,
    products.description,
    products.image,
    products.image_public_id,
    products.variants,
    products.active,
    products.created_at,
    products.updated_at,
    COALESCE(
      categories.name,
      products.category,
      'General'
    ) AS category_name
  FROM products
  LEFT JOIN categories
    ON categories.id =
      products.category_id
`;

// ============================================================
// GET PUBLIC PRODUCTS
// ============================================================

async function getPublicProducts() {
  const result =
    await db.query(
      PRODUCT_SELECT +
      `
        WHERE products.active = TRUE
        ORDER BY
          products.name ASC
      `
    );

  return result.rows.map(
    formatProduct
  );
}

// ============================================================
// GET ALL PRODUCTS FOR ADMIN
// ============================================================

async function getAllProducts() {
  const result =
    await db.query(
      PRODUCT_SELECT +
      `
        ORDER BY
          products.name ASC
      `
    );

  return result.rows.map(
    formatProduct
  );
}

// ============================================================
// GET PRODUCT BY ID
// ============================================================

async function getProductById(
  productId,
  includeHidden
) {
  const showHidden =
    includeHidden === true;

  const result =
    await db.query(
      PRODUCT_SELECT +
      `
        WHERE
          products.id = $1
          AND (
            $2::BOOLEAN = TRUE
            OR products.active = TRUE
          )
        LIMIT 1
      `,
      [
        productId,
        showHidden
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
// GET PRODUCT BY SKU
// ============================================================

async function getProductBySku(
  productSku,
  includeHidden
) {
  const cleanedSku =
    cleanText(
      productSku,
      100
    );

  const showHidden =
    includeHidden === true;

  const result =
    await db.query(
      PRODUCT_SELECT +
      `
        WHERE
          LOWER(products.sku) =
            LOWER($1)
          AND (
            $2::BOOLEAN = TRUE
            OR products.active = TRUE
          )
        LIMIT 1
      `,
      [
        cleanedSku,
        showHidden
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
// GET PRODUCT BY SLUG
// ============================================================

async function getProductBySlug(
  productSlug,
  includeHidden
) {
  const cleanedSlug =
    createSlug(productSlug);

  const showHidden =
    includeHidden === true;

  const result =
    await db.query(
      PRODUCT_SELECT +
      `
        WHERE
          products.slug = $1
          AND (
            $2::BOOLEAN = TRUE
            OR products.active = TRUE
          )
        LIMIT 1
      `,
      [
        cleanedSlug,
        showHidden
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
// CREATE PRODUCT
// ============================================================

async function createProduct(
  productData
) {
  const product =
    normalizeProductInput(
      productData,
      {
        active: true,
        lowStockWarning: 5,
        category: "General",
        variants: []
      }
    );

  const validationErrors =
    validateProduct(product);

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
        INSERT INTO products (
          name,
          slug,
          sku,
          price,
          stock,
          low_stock_warning,
          category,
          category_id,
          category_slug,
          description,
          image,
          image_public_id,
          variants,
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
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13::JSONB,
          $14,
          NOW(),
          NOW()
        )
        RETURNING
          id
      `,
      [
        product.name,
        product.slug,
        product.sku,
        product.price,
        product.stock,
        product.lowStockWarning,
        product.category,
        product.categoryId,
        product.categorySlug,
        product.description,
        product.image,
        product.imagePublicId,
        JSON.stringify(
          product.variants
        ),
        product.active
      ]
    );

  return getProductById(
    result.rows[0].id,
    true
  );
}

// ============================================================
// UPDATE PRODUCT
// ============================================================

async function updateProduct(
  productId,
  productData
) {
  const currentProduct =
    await getProductById(
      productId,
      true
    );

  if (!currentProduct) {
    return null;
  }

  const product =
    normalizeProductInput(
      productData,
      currentProduct
    );

  const validationErrors =
    validateProduct(product);

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
        UPDATE products
        SET
          name = $1,
          slug = $2,
          sku = $3,
          price = $4,
          stock = $5,
          low_stock_warning = $6,
          category = $7,
          category_id = $8,
          category_slug = $9,
          description = $10,
          image = $11,
          image_public_id = $12,
          variants = $13::JSONB,
          active = $14,
          updated_at = NOW()
        WHERE id = $15
        RETURNING
          id
      `,
      [
        product.name,
        product.slug,
        product.sku,
        product.price,
        product.stock,
        product.lowStockWarning,
        product.category,
        product.categoryId,
        product.categorySlug,
        product.description,
        product.image,
        product.imagePublicId,
        JSON.stringify(
          product.variants
        ),
        product.active,
        productId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return getProductById(
    result.rows[0].id,
    true
  );
}

// ============================================================
// DELETE PRODUCT
// ============================================================

async function deleteProduct(
  productId
) {
  const existingProduct =
    await getProductById(
      productId,
      true
    );

  if (!existingProduct) {
    return null;
  }

  const result =
    await db.query(
      `
        DELETE FROM products
        WHERE id = $1
        RETURNING
          id
      `,
      [
        productId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return existingProduct;
}

// ============================================================
// UPDATE PRODUCT STOCK
// ============================================================

async function updateProductStock(
  productId,
  stock
) {
  const cleanedStock =
    cleanWholeNumber(
      stock,
      0
    );

  const result =
    await db.query(
      `
        UPDATE products
        SET
          stock = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id
      `,
      [
        cleanedStock,
        productId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return getProductById(
    result.rows[0].id,
    true
  );
}

// ============================================================
// UPDATE VARIANT STOCK
// ============================================================

async function updateVariantStock(
  productId,
  variantIndex,
  stock
) {
  const product =
    await getProductById(
      productId,
      true
    );

  if (!product) {
    return null;
  }

  const cleanedVariantIndex =
    Number(variantIndex);

  if (
    !Number.isInteger(
      cleanedVariantIndex
    ) ||
    cleanedVariantIndex < 0 ||
    cleanedVariantIndex >=
      product.variants.length
  ) {
    const error =
      new Error(
        "The selected product variant was not found."
      );

    error.statusCode = 404;

    throw error;
  }

  product.variants[
    cleanedVariantIndex
  ].stock =
    cleanWholeNumber(
      stock,
      0
    );

  const result =
    await db.query(
      `
        UPDATE products
        SET
          variants = $1::JSONB,
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id
      `,
      [
        JSON.stringify(
          product.variants
        ),
        productId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return getProductById(
    productId,
    true
  );
}

// ============================================================
// SEARCH PRODUCTS
// ============================================================

async function searchProducts(
  searchText,
  includeHidden
) {
  const cleanedSearch =
    cleanText(
      searchText,
      250
    );

  if (!cleanedSearch) {
    return includeHidden
      ? getAllProducts()
      : getPublicProducts();
  }

  const searchValue =
    "%" +
    cleanedSearch +
    "%";

  const showHidden =
    includeHidden === true;

  const result =
    await db.query(
      PRODUCT_SELECT +
      `
        WHERE
          (
            products.name ILIKE $1
            OR products.sku ILIKE $1
            OR products.category ILIKE $1
            OR products.description ILIKE $1
          )
          AND (
            $2::BOOLEAN = TRUE
            OR products.active = TRUE
          )
        ORDER BY
          products.name ASC
      `,
      [
        searchValue,
        showHidden
      ]
    );

  return result.rows.map(
    formatProduct
  );
}

// ============================================================
// CHECK FOR DUPLICATE SKU
// ============================================================

async function productSkuExists(
  productSku,
  excludedProductId
) {
  const cleanedSku =
    cleanText(
      productSku,
      100
    );

  const excludedId =
    excludedProductId || null;

  const result =
    await db.query(
      `
        SELECT id
        FROM products
        WHERE
          LOWER(sku) =
            LOWER($1)
          AND (
            $2::BIGINT IS NULL
            OR id <> $2
          )
        LIMIT 1
      `,
      [
        cleanedSku,
        excludedId
      ]
    );

  return (
    result.rows.length > 0
  );
}

// ============================================================
// COUNT PRODUCTS
// ============================================================

async function countProducts() {
  const result =
    await db.query(
      `
        SELECT
          COUNT(*)::INTEGER
            AS product_count
        FROM products
      `
    );

  return Number(
    result.rows[0]
      .product_count || 0
  );
}

// ============================================================
// COUNT ACTIVE PRODUCTS
// ============================================================

async function countActiveProducts() {
  const result =
    await db.query(
      `
        SELECT
          COUNT(*)::INTEGER
            AS product_count
        FROM products
        WHERE active = TRUE
      `
    );

  return Number(
    result.rows[0]
      .product_count || 0
  );
}

// ============================================================
// EXPORT PRODUCT MODEL
// ============================================================

module.exports = {
  cleanText:
    cleanText,

  createSlug:
    createSlug,

  normalizeVariant:
    normalizeVariant,

  normalizeVariants:
    normalizeVariants,

  normalizeProductInput:
    normalizeProductInput,

  validateProduct:
    validateProduct,

  formatProduct:
    formatProduct,

  getPublicProducts:
    getPublicProducts,

  getAllProducts:
    getAllProducts,

  getProductById:
    getProductById,

  getProductBySku:
    getProductBySku,

  getProductBySlug:
    getProductBySlug,

  createProduct:
    createProduct,

  updateProduct:
    updateProduct,

  deleteProduct:
    deleteProduct,

  updateProductStock:
    updateProductStock,

  updateVariantStock:
    updateVariantStock,

  searchProducts:
    searchProducts,

  productSkuExists:
    productSkuExists,

  countProducts:
    countProducts,

  countActiveProducts:
    countActiveProducts
};
