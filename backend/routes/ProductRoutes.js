// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: routes/ProductRoutes.js
// PRODUCT ROUTES FOR NEON POSTGRESQL
// ============================================================

"use strict";

const express =
  require("express");

const Product =
  require("../models/Product");

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
    .slice(
      0,
      maximumLength
    );
}

function cleanWholeNumber(
  value,
  fallbackValue
) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    // Added a comma between 0 and Math.floor
    return Math.max(0, Math.floor(Number(fallbackValue || 0))); 
  }


  return Math.max(
    0,
    Math.floor(number)
  );
}

function normalizeVariantIndex(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const variantIndex =
    Number(value);

  if (
    !Number.isInteger(
      variantIndex
    ) ||
    variantIndex < 0
  ) {
    return null;
  }

  return variantIndex;
}

// ============================================================
// ERROR HANDLER
// ============================================================

function sendProductError(
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
          "A product with that SKU or slug already exists."
      });
  }

  if (
    error.code === "23503"
  ) {
    return response
      .status(409)
      .json({
        error:
          "The selected category or related database record is invalid."
      });
  }

  if (
    error.code === "22P02"
  ) {
    return response
      .status(400)
      .json({
        error:
          "The product ID is invalid."
      });
  }

  if (
    error.code === "23514"
  ) {
    return response
      .status(400)
      .json({
        error:
          "One or more product values are invalid."
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

      validationErrors:
        error.validationErrors ||
        undefined
    });
}

// ============================================================
// CHECK PRODUCT SKU
// ============================================================

async function checkProductSku(
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

  return Product
    .productSkuExists(
      cleanedSku,
      excludedProductId
    );
}

// ============================================================
// PUBLIC: GET ACTIVE PRODUCTS
//
// GET /products
//
// Optional query:
// /products?search=shirt
// ============================================================

router.get(
  "/products",
  async function (
    request,
    response
  ) {
    try {
      const search =
        cleanText(
          request.query.search,
          250
        );

      const products =
        search
          ? await Product
              .searchProducts(
                search,
                false
              )
          : await Product
              .getPublicProducts();

      return response.json({
        products:
          products
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "Products could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: GET ALL PRODUCTS
//
// GET /admin/products
//
// Includes active and inactive products.
// ============================================================

router.get(
  "/admin/products",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const search =
        cleanText(
          request.query.search,
          250
        );

      const products =
        search
          ? await Product
              .searchProducts(
                search,
                true
              )
          : await Product
              .getAllProducts();

      return response.json({
        products:
          products
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "Administrator products could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: PRODUCT SUMMARY
//
// GET /admin/products/summary
// ============================================================

router.get(
  "/admin/products/summary",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const totalProducts =
        await Product
          .countProducts();

      const activeProducts =
        await Product
          .countActiveProducts();

      return response.json({
        summary: {
          totalProducts:
            totalProducts,

          activeProducts:
            activeProducts,

          inactiveProducts:
            Math.max(
              0,
              totalProducts -
              activeProducts
            )
        }
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "Product totals could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: GET PRODUCT BY ID
//
// GET /admin/products/:id
//
// This route can return an inactive product.
// ============================================================

router.get(
  "/admin/products/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const product =
        await Product
          .getProductById(
            request.params.id,
            true
          );

      if (!product) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      return response.json({
        product:
          product
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: CREATE PRODUCT
//
// POST /products
// ============================================================

router.post(
  "/products",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const productData =
        request.body || {};

      const sku =
        cleanText(
          productData.sku,
          100
        );

      if (
        await checkProductSku(
          sku
        )
      ) {
        return response
          .status(409)
          .json({
            error:
              "A product with that SKU already exists."
          });
      }

      const product =
        await Product
          .createProduct(
            productData
          );

      return response
        .status(201)
        .json({
          message:
            "Product added successfully.",

          product:
            product
        });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product could not be added."
      );
    }
  }
);

// ============================================================
// ADMIN: CREATE PRODUCT
// ALTERNATE ADMIN ROUTE
//
// POST /admin/products
// ============================================================

router.post(
  "/admin/products",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const productData =
        request.body || {};

      const sku =
        cleanText(
          productData.sku,
          100
        );

      if (
        await checkProductSku(
          sku
        )
      ) {
        return response
          .status(409)
          .json({
            error:
              "A product with that SKU already exists."
          });
      }

      const product =
        await Product
          .createProduct(
            productData
          );

      return response
        .status(201)
        .json({
          message:
            "Product added successfully.",

          product:
            product
        });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product could not be added."
      );
    }
  }
);

// ============================================================
// ADMIN: UPDATE PRODUCT
//
// PUT /products/:id
// ============================================================

router.put(
  "/products/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const productId =
        request.params.id;

      const existingProduct =
        await Product
          .getProductById(
            productId,
            true
          );

      if (!existingProduct) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      if (
        request.body.sku !==
          undefined
      ) {
        const requestedSku =
          cleanText(
            request.body.sku,
            100
          );

        if (
          await checkProductSku(
            requestedSku,
            productId
          )
        ) {
          return response
            .status(409)
            .json({
              error:
                "A product with that SKU already exists."
            });
        }
      }

      const product =
        await Product
          .updateProduct(
            productId,
            request.body
          );

      if (!product) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      return response.json({
        message:
          "Product updated successfully.",

        product:
          product
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product could not be updated."
      );
    }
  }
);

// ============================================================
// ADMIN: UPDATE PRODUCT
// ALTERNATE ADMIN ROUTE
//
// PUT /admin/products/:id
// ============================================================

router.put(
  "/admin/products/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const productId =
        request.params.id;

      const existingProduct =
        await Product
          .getProductById(
            productId,
            true
          );

      if (!existingProduct) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      if (
        request.body.sku !==
          undefined
      ) {
        const requestedSku =
          cleanText(
            request.body.sku,
            100
          );

        if (
          await checkProductSku(
            requestedSku,
            productId
          )
        ) {
          return response
            .status(409)
            .json({
              error:
                "A product with that SKU already exists."
            });
        }
      }

      const product =
        await Product
          .updateProduct(
            productId,
            request.body
          );

      return response.json({
        message:
          "Product updated successfully.",

        product:
          product
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product could not be updated."
      );
    }
  }
);

// ============================================================
// ADMIN: UPDATE PRODUCT STOCK
//
// PUT /products/:id/stock
//
// Body for base product:
// {
//   "stock": 10
// }
//
// Body for a variant:
// {
//   "stock": 5,
//   "variantIndex": 0
// }
// ============================================================

router.put(
  "/products/:id/stock",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const productId =
        request.params.id;

      const stock =
        Number(
          request.body.stock
        );

      if (
        !Number.isInteger(
          stock
        ) ||
        stock < 0
      ) {
        return response
          .status(400)
          .json({
            error:
              "Stock must be a whole number of 0 or higher."
          });
      }

      const providedVariantIndex =
        request.body.variantIndex;

      const variantIndex =
        normalizeVariantIndex(
          providedVariantIndex
        );

      if (
        providedVariantIndex !==
          undefined &&
        providedVariantIndex !==
          null &&
        providedVariantIndex !==
          "" &&
        variantIndex === null
      ) {
        return response
          .status(400)
          .json({
            error:
              "The variant index is invalid."
          });
      }

      let product;

      if (variantIndex !== null) {
        product =
          await Product
            .updateVariantStock(
              productId,
              variantIndex,
              stock
            );
      } else {
        product =
          await Product
            .updateProductStock(
              productId,
              stock
            );
      }

      if (!product) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      return response.json({
        message:
          variantIndex === null
            ? "Product stock updated successfully."
            : "Variant stock updated successfully.",

        product:
          product
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "Product stock could not be updated."
      );
    }
  }
);

// ============================================================
// ADMIN: ADD PRODUCT VARIANT
//
// POST /products/:id/variants
// ============================================================

router.post(
  "/products/:id/variants",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const productId =
        request.params.id;

      const product =
        await Product
          .getProductById(
            productId,
            true
          );

      if (!product) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      const newVariant =
        Product.normalizeVariant(
          request.body,
          product.variants.length
        );

      if (!newVariant.name) {
        return response
          .status(400)
          .json({
            error:
              "Variant name is required."
          });
      }

      if (!newVariant.sku) {
        return response
          .status(400)
          .json({
            error:
              "Variant SKU is required."
          });
      }

      if (
        !Number.isFinite(
          newVariant.price
        ) ||
        newVariant.price < 0
      ) {
        return response
          .status(400)
          .json({
            error:
              "Variant price must be 0 or higher."
          });
      }

      if (
        !Number.isInteger(
          newVariant.stock
        ) ||
        newVariant.stock < 0
      ) {
        return response
          .status(400)
          .json({
            error:
              "Variant stock must be a whole number of 0 or higher."
          });
      }

      const duplicateVariantSku =
        product.variants.some(
          function (variant) {
            return (
              String(
                variant.sku || ""
              )
                .trim()
                .toLowerCase() ===
              newVariant.sku
                .trim()
                .toLowerCase()
            );
          }
        );

      if (duplicateVariantSku) {
        return response
          .status(409)
          .json({
            error:
              "A variant with that SKU already exists."
          });
      }

      const variants =
        product.variants.concat(
          newVariant
        );

      const updatedProduct =
        await Product
          .updateProduct(
            productId,
            {
              variants:
                variants
            }
          );

      return response
        .status(201)
        .json({
          message:
            "Variant added successfully.",

          product:
            updatedProduct,

          variant:
            newVariant
        });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product variant could not be added."
      );
    }
  }
);

// ============================================================
// ADMIN: UPDATE PRODUCT VARIANT
//
// PUT /products/:id/variants/:variantIndex
// ============================================================

router.put(
  "/products/:id/variants/:variantIndex",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const productId =
        request.params.id;

      const variantIndex =
        normalizeVariantIndex(
          request.params.variantIndex
        );

      if (variantIndex === null) {
        return response
          .status(400)
          .json({
            error:
              "The variant index is invalid."
          });
      }

      const product =
        await Product
          .getProductById(
            productId,
            true
          );

      if (!product) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      if (
        variantIndex >=
        product.variants.length
      ) {
        return response
          .status(404)
          .json({
            error:
              "Product variant not found."
          });
      }

      const currentVariant =
        product.variants[
          variantIndex
        ];

      const updatedVariant =
        Product.normalizeVariant(
          {
            id:
              currentVariant.id,

            name:
              request.body.name ===
                undefined
                ? currentVariant.name
                : request.body.name,

            sku:
              request.body.sku ===
                undefined
                ? currentVariant.sku
                : request.body.sku,

            price:
              request.body.price ===
                undefined
                ? currentVariant.price
                : request.body.price,

            stock:
              request.body.stock ===
                undefined
                ? currentVariant.stock
                : request.body.stock,

            image:
              request.body.image ===
                undefined
                ? currentVariant.image
                : request.body.image,

            imagePublicId:
              request.body
                .imagePublicId ===
                undefined &&
              request.body
                .image_public_id ===
                undefined
                ? currentVariant
                    .imagePublicId
                : (
                    request.body
                      .imagePublicId ||
                    request.body
                      .image_public_id
                  )
          },
          variantIndex
        );

      if (
        !updatedVariant.name ||
        !updatedVariant.sku
      ) {
        return response
          .status(400)
          .json({
            error:
              "Variant name and SKU are required."
          });
      }

      const duplicateVariantSku =
        product.variants.some(
          function (
            variant,
            currentIndex
          ) {
            return (
              currentIndex !==
                variantIndex &&
              String(
                variant.sku || ""
              )
                .trim()
                .toLowerCase() ===
              updatedVariant.sku
                .trim()
                .toLowerCase()
            );
          }
        );

      if (duplicateVariantSku) {
        return response
          .status(409)
          .json({
            error:
              "A variant with that SKU already exists."
          });
      }

      const variants =
        product.variants.slice();

      variants[
        variantIndex
      ] = updatedVariant;

      const updatedProduct =
        await Product
          .updateProduct(
            productId,
            {
              variants:
                variants
            }
          );

      return response.json({
        message:
          "Variant updated successfully.",

        product:
          updatedProduct,

        variant:
          updatedVariant
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product variant could not be updated."
      );
    }
  }
);

// ============================================================
// ADMIN: DELETE PRODUCT VARIANT
//
// DELETE /products/:id/variants/:variantIndex
// ============================================================

router.delete(
  "/products/:id/variants/:variantIndex",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const productId =
        request.params.id;

      const variantIndex =
        normalizeVariantIndex(
          request.params
            .variantIndex
        );

      if (variantIndex === null) {
        return response
          .status(400)
          .json({
            error:
              "The variant index is invalid."
          });
      }

      const product =
        await Product
          .getProductById(
            productId,
            true
          );

      if (!product) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      if (
        variantIndex >=
        product.variants.length
      ) {
        return response
          .status(404)
          .json({
            error:
              "Product variant not found."
          });
      }

      const deletedVariant =
        product.variants[
          variantIndex
        ];

      const variants =
        product.variants.slice();

      variants.splice(
        variantIndex,
        1
      );

      const updatedProduct =
        await Product
          .updateProduct(
            productId,
            {
              variants:
                variants
            }
          );

      return response.json({
        message:
          "Variant deleted successfully.",

        product:
          updatedProduct,

        variant:
          deletedVariant
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product variant could not be deleted."
      );
    }
  }
);

// ============================================================
// ADMIN: DELETE PRODUCT
//
// DELETE /products/:id
// ============================================================

router.delete(
  "/products/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const product =
        await Product
          .deleteProduct(
            request.params.id
          );

      if (!product) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      return response.json({
        message:
          "Product deleted successfully.",

        product:
          product
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product could not be deleted."
      );
    }
  }
);

// ============================================================
// ADMIN: DELETE PRODUCT
// ALTERNATE ADMIN ROUTE
//
// DELETE /admin/products/:id
// ============================================================

router.delete(
  "/admin/products/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const product =
        await Product
          .deleteProduct(
            request.params.id
          );

      if (!product) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      return response.json({
        message:
          "Product deleted successfully.",

        product:
          product
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product could not be deleted."
      );
    }
  }
);

// ============================================================
// PUBLIC: GET PRODUCT BY ID
//
// GET /products/:id
//
// Keep this dynamic route after the specific product routes.
// ============================================================

router.get(
  "/products/:id",
  async function (
    request,
    response
  ) {
    try {
      const product =
        await Product
          .getProductById(
            request.params.id,
            false
          );

      if (!product) {
        return response
          .status(404)
          .json({
            error:
              "Product not found."
          });
      }

      return response.json({
        product:
          product
      });
    } catch (error) {
      return sendProductError(
        response,
        error,
        "The product could not be loaded."
      );
    }
  }
);

// ============================================================
// EXPORT PRODUCT ROUTER
// ============================================================

module.exports = router;