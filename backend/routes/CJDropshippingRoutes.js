"use strict";

const express =
  require("express");

const Product =
  require("../models/Product");

const CJ =
  require("../services/cjdropshipping");

const requireAdmin =
  require("../middleware/requireAdmin");

const router =
  express.Router();

function cleanText(value, maximumLength) {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
}

function getInventory(variant) {
  if (!Array.isArray(variant.inventories)) {
    return 0;
  }

  return variant.inventories.reduce(
    function (total, inventory) {
      const stock =
        Number(inventory.totalInventory);

      return total +
        (
          Number.isFinite(stock) &&
          stock > 0
            ? Math.floor(stock)
            : 0
        );
    },
    0
  );
}

function sendCjError(response, error) {
  console.error(
    "CJdropshipping product request failed.",
    {
      code: error.code,
      cjCode: error.cjCode,
      cjRequestId: error.cjRequestId
    }
  );

  if (error.code === "23505") {
    return response
      .status(409)
      .json({
        error:
          "This CJ product or one of its SKUs is already in your catalog."
      });
  }

  const statusCode =
    Number(error.statusCode) || 500;

  return response
    .status(statusCode)
    .json({
      error:
        statusCode >= 500
          ? error.message
          : (
              error.message ||
              "The CJdropshipping request failed."
            ),
      code:
        error.code || undefined
    });
}

router.get(
  "/admin/cj/products",
  requireAdmin,
  async function (request, response) {
    try {
      const keyword =
        cleanText(
          request.query.search,
          200
        );

      if (keyword.length < 2) {
        return response
          .status(400)
          .json({
            error:
              "Enter at least two characters to search CJdropshipping."
          });
      }

      const result =
        await CJ.searchProducts(keyword);

      return response.json(result);
    } catch (error) {
      return sendCjError(
        response,
        error
      );
    }
  }
);

router.post(
  "/admin/cj/products/:productId/import",
  requireAdmin,
  async function (request, response) {
    try {
      const cjProductId =
        cleanText(
          request.params.productId,
          200
        );

      if (!cjProductId) {
        return response
          .status(400)
          .json({
            error:
              "A CJ product ID is required."
          });
      }

      const details =
        await CJ.getProductDetails(
          cjProductId
        );

      if (
        !details ||
        typeof details !== "object"
      ) {
        return response
          .status(422)
          .json({
            error:
              "CJ returned no product details for that product ID."
          });
      }

      const productSku =
        cleanText(
          details.productSku,
          100
        );

      if (
        !details.pid ||
        !productSku ||
        !Array.isArray(details.variants) ||
        details.variants.length === 0
      ) {
        return response
          .status(422)
          .json({
            error:
              "CJ did not return an importable product with variants."
          });
      }

      if (
        await Product.productSkuExists(
          productSku
        )
      ) {
        return response
          .status(409)
          .json({
            error:
              "A product with CJ SKU " +
              productSku +
              " already exists in your catalog."
          });
      }

      const variants =
        details.variants.map(
          function (variant) {
            return {
              id:
                cleanText(
                  variant.vid,
                  250
                ),
              name:
                cleanText(
                  variant.variantNameEn ||
                  variant.variantKey ||
                  variant.variantSku,
                  250
                ),
              sku:
                cleanText(
                  variant.variantSku,
                  100
                ),
              price: 0,
              stock:
                getInventory(variant),
              image:
                cleanText(
                  variant.variantImage ||
                  details.bigImage,
                  2000
                ),
              cjProductId:
                cleanText(
                  details.pid,
                  200
                ),
              cjVariantId:
                cleanText(
                  variant.vid,
                  200
                )
            };
          }
        );

      if (
        variants.some(
          function (variant) {
            return !variant.name ||
              !variant.sku ||
              !variant.cjVariantId;
          }
        )
      ) {
        return response
          .status(422)
          .json({
            error:
              "CJ product variants are missing a name, SKU, or variant ID."
          });
      }

      const product =
        await Product.createProduct({
          name:
            cleanText(
              details.productNameEn ||
              details.productSku,
              250
            ),
          sku:
            productSku,
          price: 0,
          image:
            cleanText(
              details.bigImage,
              2000
            ),
          stock: 0,
          variants: variants,
          category:
            cleanText(
              details.categoryName ||
              "General",
              150
            ),
          description:
            cleanText(
              details.description,
              10000
            ),
          active: false
        });

      return response
        .status(201)
        .json({
          message:
            "CJ product imported as a hidden draft. Set your selling prices before publishing it.",
          product:
            product
        });
    } catch (error) {
      return sendCjError(
        response,
        error
      );
    }
  }
);

router.post(
  "/admin/cj/products/:productId/sync-stock",
  requireAdmin,
  async function (request, response) {
    try {
      const product =
        await Product.getProductById(
          request.params.productId,
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

      const cjProductIds =
        Array.from(
          new Set(
            product.variants
              .map(function (variant) {
                return variant.cjProductId;
              })
              .filter(Boolean)
          )
        );

      if (
        cjProductIds.length !== 1 ||
        product.variants.some(
          function (variant) {
            return !variant.cjVariantId;
          }
        )
      ) {
        return response
          .status(409)
          .json({
            error:
              "This product does not have a complete CJ product and variant mapping."
          });
      }

      const details =
        await CJ.getProductDetails(
          cjProductIds[0]
        );

      if (
        !details ||
        !Array.isArray(details.variants)
      ) {
        return response
          .status(422)
          .json({
            error:
              "CJ did not return variant inventory for this product."
          });
      }

      const stockByVariantId = {};

      details.variants.forEach(
        function (variant) {
          if (
            variant.vid &&
            Array.isArray(variant.inventories)
          ) {
            stockByVariantId[
              String(variant.vid)
            ] = getInventory(variant);
          }
        }
      );

      const updatedProduct =
        await Product.updateCjProductInventory(
          product.id,
          stockByVariantId
        );

      return response.json({
        message:
          "CJ variant inventory was refreshed.",
        product:
          updatedProduct
      });
    } catch (error) {
      return sendCjError(
        response,
        error
      );
    }
  }
);

module.exports = router;
