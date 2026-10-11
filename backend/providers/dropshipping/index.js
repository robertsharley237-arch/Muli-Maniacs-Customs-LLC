"use strict";

const providers = new Map([
  [
    "cjdropshipping",
    require("./cjdropshipping")
  ]
]);

function getProvider(providerId) {
  return providers.get(
    String(providerId || "")
      .trim()
      .toLowerCase()
  ) || null;
}

function getAvailableProviders() {
  return Array.from(
    providers.values()
  ).map(
    function (provider) {
      return {
        id: provider.id,
        name: provider.name
      };
    }
  );
}

module.exports = {
  getProvider:
    getProvider,
  getAvailableProviders:
    getAvailableProviders
};
