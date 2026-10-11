"use strict";

const CJ_API_BASE_URL =
  "https://developers.cjdropshipping.com/api2.0/v1";

const REQUEST_TIMEOUT_MS =
  15000;

let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;
let accessTokenRequest = null;

function createCjError(
  message,
  statusCode,
  code
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
}

async function requestJson(
  url,
  options
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      function () {
        controller.abort();
      },
      REQUEST_TIMEOUT_MS
    );

  let response;

  try {
    response =
      await fetch(
        url,
        Object.assign(
          {},
          options || {},
          {
            signal:
              controller.signal
          }
        )
      );
  } catch (error) {
    throw createCjError(
      error.name === "AbortError"
        ? "CJdropshipping did not respond in time."
        : "CJdropshipping could not be reached.",
      502,
      "CJ_REQUEST_FAILED"
    );
  } finally {
    clearTimeout(timeout);
  }

  let result;

  try {
    result =
      await response.json();
  } catch (error) {
    throw createCjError(
      "CJdropshipping returned an unreadable response.",
      502,
      "CJ_INVALID_RESPONSE"
    );
  }

  if (
    !response.ok ||
    !result ||
    result.result !== true ||
    Number(result.code) !== 200
  ) {
    const error =
      createCjError(
        "CJdropshipping rejected the request.",
        502,
        "CJ_API_ERROR"
      );

    error.cjCode =
      result && result.code;

    error.cjRequestId =
      result && result.requestId;

    throw error;
  }

  return result.data;
}

async function getAccessToken() {
  if (
    cachedAccessToken &&
    Date.now() <
      cachedAccessTokenExpiresAt
  ) {
    return cachedAccessToken;
  }

  if (accessTokenRequest) {
    return accessTokenRequest;
  }

  accessTokenRequest =
    (async function () {
      const apiKey =
        String(
          process.env.CJ_API_KEY ||
          ""
        ).trim();

      if (!apiKey) {
        throw createCjError(
          "CJ_API_KEY is not configured on the backend.",
          503,
          "CJ_NOT_CONFIGURED"
        );
      }

      const tokenData =
        await requestJson(
          CJ_API_BASE_URL +
            "/authentication/getAccessToken",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              apiKey: apiKey
            })
          }
        );

      if (
        !tokenData ||
        typeof tokenData.accessToken !==
          "string" ||
        !tokenData.accessToken
      ) {
        throw createCjError(
          "CJdropshipping did not return an access token.",
          502,
          "CJ_TOKEN_MISSING"
        );
      }

      const expiry =
        Date.parse(
          tokenData.accessTokenExpiryDate
        );

      cachedAccessToken =
        tokenData.accessToken;

      cachedAccessTokenExpiresAt =
        Number.isFinite(expiry)
          ? expiry - 5 * 60 * 1000
          : Date.now() +
            175 * 24 * 60 * 60 * 1000;

      return cachedAccessToken;
    })();

  try {
    return await accessTokenRequest;
  } finally {
    accessTokenRequest = null;
  }
}

async function cjGet(path, query) {
  const accessToken =
    await getAccessToken();

  const url =
    new URL(
      CJ_API_BASE_URL + path
    );

  Object.keys(query || {}).forEach(
    function (key) {
      const value = query[key];

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        url.searchParams.set(
          key,
          String(value)
        );
      }
    }
  );

  return requestJson(
    url.toString(),
    {
      method: "GET",
      headers: {
        "CJ-Access-Token":
          accessToken
      }
    }
  );
}

function getProductResults(data) {
  if (
    !data ||
    !Array.isArray(data.content)
  ) {
    return [];
  }

  return data.content.reduce(
    function (products, entry) {
      if (
        entry &&
        Array.isArray(entry.productList)
      ) {
        return products.concat(
          entry.productList
        );
      }

      if (entry && entry.id) {
        products.push(entry);
      }

      return products;
    },
    []
  );
}

async function searchProducts(keyword) {
  const data =
    await cjGet(
      "/product/listV2",
      {
        keyWord: keyword,
        page: 1,
        size: 20
      }
    );

  return {
    products:
      getProductResults(data),
    totalRecords:
      Number(data && data.totalRecords) || 0
  };
}

async function getProductDetails(productId) {
  return cjGet(
    "/product/query",
    {
      pid: productId
    }
  );
}

module.exports = {
  searchProducts:
    searchProducts,

  getProductDetails:
    getProductDetails
};
