"use strict";

const client =
  require("../../services/silverbene");

function cleanText(value, maximumLength) {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
}

function normalizeStock(value) {
  const stock = Number(value);

  return Number.isFinite(stock) && stock > 0
    ? Math.floor(stock)
    : 0;
}

function getProductImages(product) {
  const images = [];
  const values = [
    product.image,
    product.gallery
  ];

  values.forEach(function addImage(value) {
    if (Array.isArray(value)) {
      value.forEach(addImage);
      return;
    }

    const image =
      cleanText(value, 2000);

    if (image && !images.includes(image)) {
      images.push(image);
    }
  });

  return images;
}

function normalizeSearchProduct(product) {
  const sku =
    cleanText(product.sku, 100);

  if (!sku) {
    return null;
  }

  const images =
    getProductImages(product);

  return {
    id: sku,
    name: cleanText(product.title || sku, 250),
    sku: sku,
    image: images[0] || "",
    images: images,
    referencePrice:
      Number.isFinite(Number(product.price_from)) &&
      Number(product.price_from) > 0
        ? Number(product.price_from)
        : null
  };
}

async function searchProducts(keyword) {
  const result =
    await client.requestProductList({
      keyword: keyword,
      page: 1,
      per_page: 20
    });

  return {
    products:
      result.data
        .map(normalizeSearchProduct)
        .filter(Boolean),
    totalRecords:
      Number(
        result.pagination &&
        result.pagination.total
      ) || result.data.length
  };
}

async function getProductForImport(productId) {
  const sku =
    cleanText(productId, 100);

  if (!sku) {
    return null;
  }

  const result =
    await client.requestProductList({
      sku: sku,
      page: 1,
      per_page: 50
    });
  const details =
    result.data.find(function (product) {
      return cleanText(product.sku, 100) === sku;
    });

  if (!details || !Array.isArray(details.options)) {
    return null;
  }

  const images =
    getProductImages(details);

  return {
    id: sku,
    name: cleanText(details.title || sku, 250),
    sku: sku,
    image: images[0] || "",
    images: images,
    category: "General",
    description: cleanText(details.description, 10000),
    variants:
      details.options.map(function (option) {
        const attributes =
          Array.isArray(option.attributes)
            ? option.attributes
                .map(function (attribute) {
                  if (!attribute) {
                    return "";
                  }

                  const name =
                    cleanText(attribute.name, 100);
                  const value =
                    cleanText(attribute.value, 100);

                  return name && value
                    ? name + ": " + value
                    : value || name;
                })
                .filter(Boolean)
            : [];

        return {
          id: cleanText(option.option_id, 200),
          name:
            cleanText(attributes.join(" / "), 250) ||
            cleanText(option.sku, 250),
          sku: cleanText(option.sku, 100),
          stock: normalizeStock(option.stock),
          image: images[0] || ""
        };
      })
  };
}

async function getStockByVariantIds(productId) {
  const importedProduct =
    await getProductForImport(productId);

  if (!importedProduct) {
    return null;
  }

  const stockByVariantId = {};

  importedProduct.variants.forEach(function (variant) {
    if (variant.id) {
      stockByVariantId[variant.id] =
        variant.stock;
    }
  });

  return stockByVariantId;
}

module.exports = {
  id: "silverbene",
  name: "Silverbene",
  searchProducts: searchProducts,
  getProductForImport: getProductForImport,
  getStockByVariantIds: getStockByVariantIds
};
