# Multi-Maniacs-Customs-Website-Build

Official website for Multi-Maniacs Customs LLC.

## Dropshipping provider integrations

The administrator product page uses a provider-neutral catalog search,
selected-product import, hidden-draft pricing, and stock-sync workflow.
Products store a provider ID and provider product/variant IDs with each
variant, so order items retain fulfillment-provider references.

CJdropshipping is currently the first configured provider. Set `CJ_API_KEY`
in the backend host's environment variables; never put provider credentials
in frontend configuration or commit them.

Providers are registered in
[`backend/providers/dropshipping/index.js`](./backend/providers/dropshipping/index.js).
Each provider adapter implements product search, normalized product details
for import, and inventory lookup. The shared protected routes in
[`backend/routes/DropshippingRoutes.js`](./backend/routes/DropshippingRoutes.js)
handle catalog search, importing selected products as hidden drafts, and
stock synchronization. A new provider can be added as an adapter and
registered without changing the product-management workflow. Provider order
submission can likewise be implemented behind provider adapters; retaining
the provider identifiers in order items prepares for that step, but paid
orders are not yet forwarded automatically.
