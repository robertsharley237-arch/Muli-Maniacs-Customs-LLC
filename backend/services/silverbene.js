"use strict";

const REQUEST_TIMEOUT_MS = 15000;

function createSilverbeneError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getConfiguration() {
  const baseUrl =
    String(process.env.SILVERBENE_API_BASE_URL || "")
      .trim()
      .replace(/\/+$/, "");
  const token =
    String(process.env.SILVERBENE_API_TOKEN || "").trim();

  if (!baseUrl || !token) {
    throw createSilverbeneError(
      "SILVERBENE_API_BASE_URL and SILVERBENE_API_TOKEN must be configured on the backend.",
      503,
      "SILVERBENE_NOT_CONFIGURED"
    );
  }

  let parsedBaseUrl;

  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch (error) {
    throw createSilverbeneError(
      "SILVERBENE_API_BASE_URL must be a valid HTTP or HTTPS URL.",
      503,
      "SILVERBENE_INVALID_CONFIGURATION"
    );
  }

  const isLocalHttpHost =
    parsedBaseUrl.protocol === "http:" &&
    [
      "localhost",
      "127.0.0.1",
      "::1"
    ].includes(parsedBaseUrl.hostname);

  if (
    parsedBaseUrl.protocol !== "https:" &&
    !isLocalHttpHost
  ) {
    throw createSilverbeneError(
      "SILVERBENE_API_BASE_URL must use HTTPS, except for local development.",
      503,
      "SILVERBENE_INVALID_CONFIGURATION"
    );
  }

  if (
    parsedBaseUrl.username ||
    parsedBaseUrl.password ||
    parsedBaseUrl.pathname !== "/" ||
    parsedBaseUrl.search ||
    parsedBaseUrl.hash
  ) {
    throw createSilverbeneError(
      "SILVERBENE_API_BASE_URL must be an origin without credentials, a path, or query parameters.",
      503,
      "SILVERBENE_INVALID_CONFIGURATION"
    );
  }

  return {
    baseUrl: baseUrl,
    token: token
  };
}

async function requestProductList(parameters) {
  const configuration =
    getConfiguration();
  const url =
    new URL(
      configuration.baseUrl +
        "/api/dropshipping/product_list"
    );

  url.searchParams.set("token", configuration.token);
  Object.keys(parameters || {}).forEach(function (key) {
    const value = parameters[key];

    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const controller =
    new AbortController();
  const timeout =
    setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
  } catch (error) {
    throw createSilverbeneError(
      error.name === "AbortError"
        ? "Silverbene did not respond in time."
        : "Silverbene could not be reached.",
      502,
      error.name === "AbortError"
        ? "SILVERBENE_TIMEOUT"
        : "SILVERBENE_REQUEST_FAILED"
    );
  } finally {
    clearTimeout(timeout);
  }

  let result;

  try {
    result = await response.json();
  } catch (error) {
    throw createSilverbeneError(
      "Silverbene returned an unreadable product-list response.",
      502,
      "SILVERBENE_INVALID_RESPONSE"
    );
  }

  if (
    !response.ok ||
    !result ||
    Number(result.code) !== 0 ||
    !Array.isArray(result.data)
  ) {
    const providerMessage =
      result &&
      typeof result.message === "string"
        ? result.message.trim().slice(0, 300)
        : "";
    const error =
      createSilverbeneError(
        "Silverbene rejected the product-list request" +
          (providerMessage ? ": " + providerMessage : "."),
        502,
        "SILVERBENE_API_ERROR"
      );

    error.silverbeneCode =
      result && result.code;
    error.silverbeneMessage =
      providerMessage;
    error.silverbeneHttpStatus =
      response.status;

    throw error;
  }

  return result;
}

module.exports = {
  requestProductList: requestProductList
};
