"use strict";

const client =
  require("../../services/cjdropshipping");

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

function normalizeSearchProduct(product) {
  const sourcePrice =
    Number(
      product.nowPrice ||
      product.sellPrice
    );

  return {
    id:
      cleanText(product.id, 200),
    name:
      cleanText(
        product.nameEn ||
        product.name ||
        product.sku,
        250
      ),
    sku:
      cleanText(product.sku, 100),
    image:
      cleanText(
        product.bigImage,
        2000
      ),
    referencePrice:
      Number.isFinite(sourcePrice) &&
      sourcePrice > 0
        ? sourcePrice
        : null
  };
}

async function searchProducts(keyword) {
  const result =
    await client.searchProducts(keyword);

  return {
    products:
      result.products.map(
        normalizeSearchProduct
      ),
    totalRecords:
      result.totalRecords
  };
}

async function getProductForImport(productId) {
  const details =
    await client.getProductDetails(productId);

  if (
    !details ||
    !Array.isArray(details.variants)
  ) {
    return null;
  }

  return {
    id:
      cleanText(details.pid, 200),
    name:
      cleanText(
        details.productNameEn ||
        details.productSku,
        250
      ),
    sku:
      cleanText(details.productSku, 100),
    image:
      cleanText(details.bigImage, 2000),
    category:
      cleanText(details.categoryName, 150),
    description:
      cleanText(details.description, 10000),
    variants:
      details.variants.map(
        function (variant) {
          return {
            id:
              cleanText(variant.vid, 200),
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
            stock:
              getInventory(variant),
            image:
              cleanText(
                variant.variantImage ||
                details.bigImage,
                2000
              )
          };
        }
      )
  };
}

async function getStockByVariantIds(productId) {
  const details =
    await client.getProductDetails(productId);

  if (
    !details ||
    !Array.isArray(details.variants)
  ) {
    return null;
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

  return stockByVariantId;
}

module.exports = {
  id: "cjdropshipping",
  name: "CJdropshipping",
  searchProducts:
    searchProducts,
  getProductForImport:
    getProductForImport,
  getStockByVariantIds:
    getStockByVariantIds
};
