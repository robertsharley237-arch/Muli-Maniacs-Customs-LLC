"use strict";

const express =
  require("express");

const Product =
  require("../models/Product");

const dropshippingProviders =
  require("../providers/dropshipping");

const requireAdmin =
  require("../middleware/requireAdmin");

const router =
  express.Router();

function cleanText(value, maximumLength) {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
}

function sendProviderError(
  response,
  error,
  providerId
) {
  console.error(
    "Dropshipping provider request failed.",
    {
      provider: providerId,
      code: error.code,
      providerCode: error.cjCode,
      providerMessage: error.cjMessage,
      providerHttpStatus: error.cjHttpStatus,
      requestId: error.cjRequestId
    }
  );

  if (error.code === "23505") {
    return response
      .status(409)
      .json({
        error:
          "This provider product or one of its SKUs is already in your catalog."
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
              "The provider request failed."
            ),
      code:
        error.code || undefined,
      providerCode:
        error.cjCode || undefined,
      requestId:
        error.cjRequestId || undefined
    });
}

function getProviderOrRespond(
  providerId,
  response
) {
  const provider =
    dropshippingProviders.getProvider(
      providerId
    );

  if (!provider) {
    response
      .status(404)
      .json({
        error:
          "The selected dropshipping provider is not configured."
      });

    return null;
  }

  return provider;
}

router.get(
  "/admin/dropshipping/providers",
  requireAdmin,
  function (request, response) {
    return response.json({
      providers:
        dropshippingProviders
          .getAvailableProviders()
    });
  }
);

router.get(
  "/admin/dropshipping/:providerId/products",
  requireAdmin,
  async function (request, response) {
    const provider =
      getProviderOrRespond(
        request.params.providerId,
        response
      );

    if (!provider) {
      return;
    }

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
              "Enter at least two characters to search the provider catalog."
          });
      }

      const result =
        await provider.searchProducts(keyword);

      return response.json(result);
    } catch (error) {
      return sendProviderError(
        response,
        error,
        provider.id
      );
    }
  }
);

router.post(
  "/admin/dropshipping/:providerId/products/:productId/import",
  requireAdmin,
  async function (request, response) {
    const provider =
      getProviderOrRespond(
        request.params.providerId,
        response
      );

    if (!provider) {
      return;
    }

    try {
      const providerProductId =
        cleanText(
          request.params.productId,
          200
        );

      if (!providerProductId) {
        return response
          .status(400)
          .json({
            error:
              "A provider product ID is required."
          });
      }

      const importedProduct =
        await provider.getProductForImport(
          providerProductId
        );

      if (
        !importedProduct ||
        !importedProduct.id ||
        !importedProduct.sku ||
        !Array.isArray(importedProduct.variants) ||
        importedProduct.variants.length === 0
      ) {
        return response
          .status(422)
          .json({
            error:
              "The provider did not return an importable product with variants."
          });
      }

      if (
        await Product.productSkuExists(
          importedProduct.sku
        )
      ) {
        return response
          .status(409)
          .json({
            error:
              "A product with provider SKU " +
              importedProduct.sku +
              " already exists in your catalog."
          });
      }

      const variants =
        importedProduct.variants.map(
          function (variant) {
            return {
              id:
                variant.id,
              name:
                variant.name,
              sku:
                variant.sku,
              price: 0,
              stock:
                variant.stock,
              image:
                variant.image,
              supplierProvider:
                provider.id,
              supplierProductId:
                importedProduct.id,
              supplierVariantId:
                variant.id
            };
          }
        );

      if (
        variants.some(
          function (variant) {
            return !variant.name ||
              !variant.sku ||
              !variant.supplierVariantId;
          }
        )
      ) {
        return response
          .status(422)
          .json({
            error:
              "The provider product contains variants without a name, SKU, or provider variant ID."
          });
      }

      const product =
        await Product.createProduct({
          name:
            importedProduct.name,
          sku:
            importedProduct.sku,
          price: 0,
          image:
            importedProduct.image,
          images:
            importedProduct.images,
          stock: 0,
          variants:
            variants,
          category:
            importedProduct.category ||
            "General",
          description:
            importedProduct.description,
          active: false
        });

      return response
        .status(201)
        .json({
          message:
            provider.name +
            " product imported as a hidden draft. Set your selling prices before publishing it.",
          product:
            product
        });
    } catch (error) {
      return sendProviderError(
        response,
        error,
        provider.id
      );
    }
  }
);

router.post(
  "/admin/dropshipping/:providerId/products/:productId/sync-stock",
  requireAdmin,
  async function (request, response) {
    const provider =
      getProviderOrRespond(
        request.params.providerId,
        response
      );

    if (!provider) {
      return;
    }

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

      const providerProductIds =
        Array.from(
          new Set(
            product.variants
              .filter(
                function (variant) {
                  return variant.supplierProvider ===
                    provider.id;
                }
              )
              .map(
                function (variant) {
                  return variant.supplierProductId;
                }
              )
              .filter(Boolean)
          )
        );

      if (
        providerProductIds.length !== 1 ||
        product.variants.some(
          function (variant) {
            return variant.supplierProvider !==
                provider.id ||
              !variant.supplierVariantId;
          }
        )
      ) {
        return response
          .status(409)
          .json({
            error:
              "This product does not have a complete mapping to the selected provider."
          });
      }

      if (
        typeof provider.getStockByVariantIds !==
        "function"
      ) {
        return response
          .status(501)
          .json({
            error:
              provider.name +
              " does not support stock synchronization yet."
          });
      }

      const stockByVariantId =
        await provider.getStockByVariantIds(
          providerProductIds[0]
        );

      if (!stockByVariantId) {
        return response
          .status(422)
          .json({
            error:
              "The provider did not return stock information."
          });
      }

      const updatedProduct =
        await Product.updateSupplierInventory(
          product.id,
          provider.id,
          stockByVariantId
        );

      return response.json({
        message:
          provider.name +
          " inventory was refreshed.",
        product:
          updatedProduct
      });
    } catch (error) {
      return sendProviderError(
        response,
        error,
        provider.id
      );
    }
  }
);

module.exports = router;
