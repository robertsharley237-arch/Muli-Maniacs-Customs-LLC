# Multi-Maniacs-Customs-Website-Build

Official website for Multi-Maniacs Customs LLC.

## Database setup

Run the SQL files in `backend/migrations/` in numeric order against the Neon
database used by the backend:

- `001_create_admins.sql` creates the administrator table expected by login
  and role-based authorization. It stores bcrypt password hashes, supports
  the `admin` and `super_admin` roles, and enforces case-insensitive username
  uniqueness.
- `002_create_products_and_settings.sql` creates the product catalog and
  store-settings tables. It seeds the single settings row with the
  application's default values; the product catalog starts empty.
- `003_create_categories.sql` creates the categories table used by the
  dashboard's category-management tools.
- `004_create_orders.sql` creates order records, payment/order status fields,
  Stripe identifiers, and JSON order items.
- `005_create_client_intakes.sql` creates client project request records and
  their review statuses.

After creating the admin table, configure `ADMIN_BOOTSTRAP_KEY` in the
backend environment and use the one-time `POST /admin/bootstrap` endpoint to
create the first super administrator. Set a strong administrator password;
do not insert a plaintext password into the database.

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
