// ============================================================
// Multi-Maniacs Customs LLC
// Backend: Express + Vercel + Neon PostgreSQL
// Admin: Multi-user JWT admin system
// Uploads: Multer + Cloudinary
// Payments: Stripe Checkout
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// ============================================================
// REQUIRED ENVIRONMENT VARIABLES
// ============================================================

const requiredEnv = [
  "DATABASE_URL",
  "JWT_SECRET",
  "STRIPE_SECRET_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error("Missing environment variables:", missingEnv.join(", "));
}

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.SITE_URL
]
  .filter(Boolean)
  .flatMap((value) => value.split(","))
  .map((value) => value.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      const cleanOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// ============================================================
// NEON POSTGRESQL CONNECTION
// ============================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on("error", (err) => {
  console.error("Unexpected Neon pool error:", err);
});

// ============================================================
// CLOUDINARY + MULTER
// ============================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "mmc-products",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    resource_type: "image"
  })
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }

    cb(null, true);
  }
});

// ============================================================
// STRIPE WEBHOOK
// Optional until STRIPE_WEBHOOK_SECRET is added in Vercel.
// Must stay before express.json().
// ============================================================

app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({
        error: "STRIPE_WEBHOOK_SECRET is not configured."
      });
    }

    const sig = req.headers["stripe-signature"];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = Number(session.metadata?.orderId);

        if (orderId) {
          await completePaidOrder(orderId, session.id);
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Stripe webhook error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// ============================================================
// BODY PARSERS
// ============================================================

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ============================================================
// DATABASE SETUP
// ============================================================

let databaseReadyPromise = null;

async function initializeDatabase() {
  if (databaseReadyPromise) return databaseReadyPromise;

  databaseReadyPromise = (async () => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id BIGSERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          sku TEXT UNIQUE NOT NULL,
          price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
          image TEXT NOT NULL,
          image_public_id TEXT NOT NULL DEFAULT '',
          stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
          variants JSONB NOT NULL DEFAULT '[]'::jsonb,
          low_stock_warning INTEGER NOT NULL DEFAULT 5,
          category TEXT NOT NULL DEFAULT 'General',
          description TEXT NOT NULL DEFAULT '',
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS settings (
          setting_key TEXT PRIMARY KEY,
          setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id BIGSERIAL PRIMARY KEY,
          stripe_session_id TEXT UNIQUE,
          status TEXT NOT NULL DEFAULT 'pending',
          amount_total INTEGER,
          currency TEXT NOT NULL DEFAULT 'usd',
          customer_email TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          paid_at TIMESTAMPTZ
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id BIGSERIAL PRIMARY KEY,
          order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          product_id BIGINT NOT NULL REFERENCES products(id),
          product_name TEXT NOT NULL,
          variant_index INTEGER,
          variant_name TEXT,
          sku TEXT,
          unit_price NUMERIC(12, 2) NOT NULL,
          quantity INTEGER NOT NULL CHECK (quantity > 0)
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS products_active_index
        ON products(active);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS order_items_order_id_index
        ON order_items(order_id);
      `);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      databaseReadyPromise = null;
      throw err;
    } finally {
      client.release();
    }

    await ensureFirstAdmin();

    console.log("Neon database tables are ready.");
  })();

  return databaseReadyPromise;
}

async function ensureDatabase(req, res, next) {
  try {
    await initializeDatabase();
    next();
  } catch (err) {
    console.error("Database initialization error:", err);

    res.status(500).json({
      error: "Database initialization failed."
    });
  }
}

app.use(ensureDatabase);

// ============================================================
// FIRST ADMIN SETUP
// Uses ADMIN_USERNAME and ADMIN_PASSWORD from Vercel.
// This creates only the first super-admin account.
// ============================================================

async function ensureFirstAdmin() {
  const username = String(process.env.ADMIN_USERNAME || "").trim();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!username || !password) {
    console.log("ADMIN_USERNAME or ADMIN_PASSWORD not set. Skipping first admin creation.");
    return;
  }

  if (password.length < 10) {
    console.error("ADMIN_PASSWORD must be at least 10 characters.");
    return;
  }

  const existing = await pool.query(
    `
      SELECT id
      FROM admins
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
    `,
    [username]
  );

  if (existing.rows.length > 0) {
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await pool.query(
    `
      INSERT INTO admins (username, password, role, active)
      VALUES ($1, $2, 'super_admin', true)
    `,
    [username, hashedPassword]
  );

  console.log("Initial super-admin account created.");
}

// ============================================================
// HELPERS
// ============================================================

function normalizeVariants(variants) {
  if (!Array.isArray(variants)) return [];

  return variants.map((variant, index) => ({
    id: variant.id || variant._id || `variant-${Date.now()}-${index}`,
    name: String(variant.name || "").trim(),
    sku: String(variant.sku || "").trim(),
    price: Math.max(0, Number(variant.price || 0)),
    stock: Math.max(0, Number(variant.stock || 0)),
    image: String(variant.image || ""),
    imagePublicId: String(
      variant.imagePublicId || variant.image_public_id || ""
    )
  }));
}

function formatProduct(row) {
  return {
    _id: String(row.id),
    id: String(row.id),
    name: row.name,
    sku: row.sku,
    price: Number(row.price),
    image: row.image,
    imagePublicId: row.image_public_id || "",
    stock: Number(row.stock),
    variants: normalizeVariants(row.variants),
    lowStockWarning: Number(row.low_stock_warning),
    category: row.category,
    description: row.description,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function createAdminToken(admin) {
  return jwt.sign(
    {
      adminId: String(admin.id),
      username: admin.username,
      role: admin.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "2h",
      issuer: "multi-maniacs-customs",
      audience: "mmc-admin"
    }
  );
}

async function verifyAdmin(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "No admin token provided."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "multi-maniacs-customs",
      audience: "mmc-admin"
    });

    const result = await pool.query(
      `
        SELECT id, username, role, active
        FROM admins
        WHERE id = $1
        LIMIT 1
      `,
      [decoded.adminId]
    );

    if (result.rows.length === 0 || !result.rows[0].active) {
      return res.status(401).json({
        error: "Admin account is unavailable."
      });
    }

    req.admin = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired admin token."
    });
  }
}

function requireSuperAdmin(req, res, next) {
  if (req.admin.role !== "super_admin") {
    return res.status(403).json({
      error: "Super-admin permission is required."
    });
  }

  next();
}

// ============================================================
// ORDER COMPLETION
// Inventory is reduced after Stripe confirms payment.
// ============================================================

async function completePaidOrder(orderId, stripeSessionId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT *
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found.");
    }

    if (orderResult.rows[0].status === "paid") {
      await client.query("COMMIT");
      return;
    }

    const itemResult = await client.query(
      `
        SELECT *
        FROM order_items
        WHERE order_id = $1
        ORDER BY id
      `,
      [orderId]
    );

    for (const item of itemResult.rows) {
      const productResult = await client.query(
        `
          SELECT *
          FROM products
          WHERE id = $1
          FOR UPDATE
        `,
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.product_id} no longer exists.`);
      }

      const product = productResult.rows[0];

      if (item.variant_index !== null && item.variant_index !== undefined) {
        const variants = normalizeVariants(product.variants);
        const variant = variants[item.variant_index];

        if (!variant) {
          throw new Error("Variant not found.");
        }

        if (variant.stock < item.quantity) {
          throw new Error(`Insufficient variant stock for ${product.name}.`);
        }

        variant.stock -= item.quantity;

        await client.query(
          `
            UPDATE products
            SET variants = $1::jsonb, updated_at = NOW()
            WHERE id = $2
          `,
          [JSON.stringify(variants), item.product_id]
        );
      } else {
        if (Number(product.stock) < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}.`);
        }

        await client.query(
          `
            UPDATE products
            SET stock = stock - $1, updated_at = NOW()
            WHERE id = $2
          `,
          [item.quantity, item.product_id]
        );
      }
    }

    await client.query(
      `
        UPDATE orders
        SET status = 'paid',
            stripe_session_id = $1,
            paid_at = NOW()
        WHERE id = $2
      `,
      [stripeSessionId, orderId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// TEST ROUTES
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "Multi-Maniacs Customs backend is running.",
    hosting: "Vercel",
    database: "Neon PostgreSQL",
    status: "online"
  });
});

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    res.json({
      status: "healthy",
      database: "connected",
      databaseTime: result.rows[0].database_time
    });
  } catch (err) {
    console.error("Health check error:", err);

    res.status(500).json({
      status: "unhealthy",
      database: "disconnected"
    });
  }
});

// ============================================================
// ADMIN LOGIN
// ============================================================

app.post("/admin/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required."
      });
    }

    const result = await pool.query(
      `
        SELECT id, username, password, role, active
        FROM admins
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1
      `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid username or password."
      });
    }

    const admin = result.rows[0];

    if (!admin.active) {
      return res.status(403).json({
        error: "This admin account is disabled."
      });
    }

    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid username or password."
      });
    }

    const token = createAdminToken(admin);

    res.json({
      message: "Login successful.",
      token,
      admin: {
        id: String(admin.id),
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    console.error("Admin login error:", err);

    res.status(500).json({
      error: "Admin login failed."
    });
  }
});

app.get("/admin/me", verifyAdmin, (req, res) => {
  res.json({
    admin: {
      id: String(req.admin.id),
      username: req.admin.username,
      role: req.admin.role
    }
  });
});

// ============================================================
// MULTI-ADMIN MANAGEMENT
// Only super_admin can manage other admins.
// ============================================================

app.get("/admin/users", verifyAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, username, role, active, created_at, updated_at
        FROM admins
        ORDER BY created_at ASC
      `
    );

    res.json(
      result.rows.map((admin) => ({
        id: String(admin.id),
        username: admin.username,
        role: admin.role,
        active: admin.active,
        createdAt: admin.created_at,
        updatedAt: admin.updated_at
      }))
    );
  } catch (err) {
    console.error("Admin users error:", err);

    res.status(500).json({
      error: "Failed to load admin users."
    });
  }
});

app.post("/admin/register", verifyAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const requestedRole = String(req.body.role || "admin");

    const allowedRoles = ["super_admin", "admin", "manager", "fulfillment"];
    const role = allowedRoles.includes(requestedRole) ? requestedRole : "admin";

    if (username.length < 3) {
      return res.status(400).json({
        error: "Username must be at least 3 characters."
      });
    }

    if (password.length < 10) {
      return res.status(400).json({
        error: "Password must be at least 10 characters."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
        INSERT INTO admins (username, password, role, active)
        VALUES ($1, $2, $3, true)
        RETURNING id, username, role, active, created_at
      `,
      [username, hashedPassword, role]
    );

    const admin = result.rows[0];

    res.status(201).json({
      message: "Administrator created.",
      admin: {
        id: String(admin.id),
        username: admin.username,
        role: admin.role,
        active: admin.active,
        createdAt: admin.created_at
      }
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "That username already exists."
      });
    }

    console.error("Admin registration error:", err);

    res.status(500).json({
      error: "Failed to create administrator."
    });
  }
});

app.patch("/admin/users/:id", verifyAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const requestedRole = String(req.body.role || "admin");
    const allowedRoles = ["super_admin", "admin", "manager", "fulfillment"];
    const active = typeof req.body.active === "boolean" ? req.body.active : true;

    if (!allowedRoles.includes(requestedRole)) {
      return res.status(400).json({
        error: "Invalid administrator role."
      });
    }

    const result = await pool.query(
      `
        UPDATE admins
        SET role = $1,
            active = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, username, role, active, updated_at
      `,
      [requestedRole, active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Administrator not found."
      });
    }

    const admin = result.rows[0];

    res.json({
      message: "Administrator updated.",
      admin: {
        id: String(admin.id),
        username: admin.username,
        role: admin.role,
        active: admin.active,
        updatedAt: admin.updated_at
      }
    });
  } catch (err) {
    console.error("Admin update error:", err);

    res.status(500).json({
      error: "Failed to update administrator."
    });
  }
});

app.patch(
  "/admin/users/:id/password",
  verifyAdmin,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const password = String(req.body.password || "");

      if (password.length < 10) {
        return res.status(400).json({
          error: "Password must be at least 10 characters."
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await pool.query(
        `
          UPDATE admins
          SET password = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING id
        `,
        [hashedPassword, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: "Administrator not found."
        });
      }

      res.json({
        message: "Administrator password updated."
      });
    } catch (err) {
      console.error("Admin password update error:", err);

      res.status(500).json({
        error: "Failed to update administrator password."
      });
    }
  }
);

app.delete("/admin/users/:id", verifyAdmin, requireSuperAdmin, async (req, res) => {
  try {
    if (String(req.admin.id) === String(req.params.id)) {
      return res.status(400).json({
        error: "You cannot delete your own account."
      });
    }

    const result = await pool.query(
      `
        DELETE FROM admins
        WHERE id = $1
        RETURNING id
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Administrator not found."
      });
    }

    res.json({
      message: "Administrator deleted."
    });
  } catch (err) {
    console.error("Admin delete error:", err);

    res.status(500).json({
      error: "Failed to delete administrator."
    });
  }
});

// ============================================================
// IMAGE UPLOAD ROUTES
// Frontend FormData field name must be "image".
// ============================================================

function sendUploadedImage(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: "No image file was uploaded."
    });
  }

  res.status(201).json({
    message: "Image uploaded.",
    url: req.file.path,
    secure_url: req.file.path,
    public_id: req.file.filename
  });
}

app.post("/upload/image", verifyAdmin, upload.single("image"), (req, res) => {
  sendUploadedImage(req, res);
});

app.post("/upload", verifyAdmin, upload.single("image"), (req, res) => {
  sendUploadedImage(req, res);
});

// ============================================================
// PUBLIC PRODUCT ROUTES
// ============================================================

app.get("/products", async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM products
        WHERE active = true
        ORDER BY created_at DESC
      `
    );

    res.json(result.rows.map(formatProduct));
  } catch (err) {
    console.error("Products error:", err);

    res.status(500).json({
      error: "Failed to fetch products."
    });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM products
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found."
      });
    }

    res.json(formatProduct(result.rows[0]));
  } catch (err) {
    console.error("Product error:", err);

    res.status(500).json({
      error: "Failed to fetch product."
    });
  }
});

// ============================================================
// ADMIN PRODUCT ROUTES
// ============================================================

app.get("/admin/products", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM products
        ORDER BY created_at DESC
      `
    );

    res.json(result.rows.map(formatProduct));
  } catch (err) {
    console.error("Admin products error:", err);

    res.status(500).json({
      error: "Failed to fetch admin products."
    });
  }
});

app.post("/products", verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      sku,
      price,
      image,
      imagePublicId,
      stock,
      variants,
      lowStockWarning,
      category,
      description,
      active
    } = req.body;

    if (!name || !sku || price === undefined || !image) {
      return res.status(400).json({
        error: "Name, SKU, price, and image are required."
      });
    }

    const result = await pool.query(
      `
        INSERT INTO products (
          name,
          sku,
          price,
          image,
          image_public_id,
          stock,
          variants,
          low_stock_warning,
          category,
          description,
          active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        String(name).trim(),
        String(sku).trim(),
        Math.max(0, Number(price)),
        String(image),
        String(imagePublicId || ""),
        Math.max(0, Number(stock || 0)),
        JSON.stringify(normalizeVariants(variants)),
        Math.max(0, Number(lowStockWarning ?? 5)),
        String(category || "General"),
        String(description || ""),
        active !== false
      ]
    );

    res.status(201).json(formatProduct(result.rows[0]));
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "A product with that SKU already exists."
      });
    }

    console.error("Create product error:", err);

    res.status(500).json({
      error: "Failed to create product."
    });
  }
});

app.put("/products/:id", verifyAdmin, async (req, res) => {
  try {
    const existing = await pool.query(
      `
        SELECT *
        FROM products
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found."
      });
    }

    const current = formatProduct(existing.rows[0]);

    const updated = {
      name: req.body.name !== undefined ? String(req.body.name).trim() : current.name,
      sku: req.body.sku !== undefined ? String(req.body.sku).trim() : current.sku,
      price: req.body.price !== undefined ? Math.max(0, Number(req.body.price)) : current.price,
      image: req.body.image !== undefined ? String(req.body.image) : current.image,
      imagePublicId:
        req.body.imagePublicId !== undefined
          ? String(req.body.imagePublicId)
          : current.imagePublicId,
      stock:
        req.body.stock !== undefined
          ? Math.max(0, Number(req.body.stock))
          : current.stock,
      variants:
        req.body.variants !== undefined
          ? normalizeVariants(req.body.variants)
          : current.variants,
      lowStockWarning:
        req.body.lowStockWarning !== undefined
          ? Math.max(0, Number(req.body.lowStockWarning))
          : current.lowStockWarning,
      category:
        req.body.category !== undefined
          ? String(req.body.category)
          : current.category,
      description:
        req.body.description !== undefined
          ? String(req.body.description)
          : current.description,
      active: req.body.active !== undefined ? Boolean(req.body.active) : current.active
    };

    const result = await pool.query(
      `
        UPDATE products
        SET name = $1,
            sku = $2,
            price = $3,
            image = $4,
            image_public_id = $5,
            stock = $6,
            variants = $7::jsonb,
            low_stock_warning = $8,
            category = $9,
            description = $10,
            active = $11,
            updated_at = NOW()
        WHERE id = $12
        RETURNING *
      `,
      [
        updated.name,
        updated.sku,
        updated.price,
        updated.image,
        updated.imagePublicId,
        updated.stock,
        JSON.stringify(updated.variants),
        updated.lowStockWarning,
        updated.category,
        updated.description,
        updated.active,
        req.params.id
      ]
    );

    res.json(formatProduct(result.rows[0]));
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "A product with that SKU already exists."
      });
    }

    console.error("Update product error:", err);

    res.status(500).json({
      error: "Failed to update product."
    });
  }
});

app.put("/products/:id/stock", verifyAdmin, async (req, res) => {
  try {
    const stock = Math.max(0, Number(req.body.stock));
    const variantIndex = req.body.variantIndex;

    const productResult = await pool.query(
      `
        SELECT *
        FROM products
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found."
      });
    }

    if (variantIndex !== undefined && variantIndex !== null) {
      const variants = normalizeVariants(productResult.rows[0].variants);

      if (!variants[variantIndex]) {
        return res.status(400).json({
          error: "Variant not found."
        });
      }

      variants[variantIndex].stock = stock;

      const result = await pool.query(
        `
          UPDATE products
          SET variants = $1::jsonb,
              updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `,
        [JSON.stringify(variants), req.params.id]
      );

      return res.json(formatProduct(result.rows[0]));
    }

    const result = await pool.query(
      `
        UPDATE products
        SET stock = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [stock, req.params.id]
    );

    res.json(formatProduct(result.rows[0]));
  } catch (err) {
    console.error("Update stock error:", err);

    res.status(500).json({
      error: "Failed to update stock."
    });
  }
});

app.post("/products/:id/variants", verifyAdmin, async (req, res) => {
  try {
    const productResult = await pool.query(
      `
        SELECT *
        FROM products
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found."
      });
    }

    const variants = normalizeVariants(productResult.rows[0].variants);
    const newVariant = normalizeVariants([req.body])[0];

    variants.push(newVariant);

    const result = await pool.query(
      `
        UPDATE products
        SET variants = $1::jsonb,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [JSON.stringify(variants), req.params.id]
    );

    res.status(201).json(formatProduct(result.rows[0]));
  } catch (err) {
    console.error("Add variant error:", err);

    res.status(500).json({
      error: "Failed to add variant."
    });
  }
});

app.delete("/products/:id/variants/:index", verifyAdmin, async (req, res) => {
  try {
    const index = Number(req.params.index);

    const productResult = await pool.query(
      `
        SELECT *
        FROM products
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found."
      });
    }

    const variants = normalizeVariants(productResult.rows[0].variants);

    if (!Number.isInteger(index) || !variants[index]) {
      return res.status(400).json({
        error: "Variant not found."
      });
    }

    variants.splice(index, 1);

    const result = await pool.query(
      `
        UPDATE products
        SET variants = $1::jsonb,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [JSON.stringify(variants), req.params.id]
    );

    res.json(formatProduct(result.rows[0]));
  } catch (err) {
    console.error("Delete variant error:", err);

    res.status(500).json({
      error: "Failed to delete variant."
    });
  }
});

app.delete("/products/:id", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `
        DELETE FROM products
        WHERE id = $1
        RETURNING image_public_id
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found."
      });
    }

    const publicId = result.rows[0].image_public_id;

    if (publicId) {
      cloudinary.uploader.destroy(publicId).catch((err) => {
        console.error("Cloudinary cleanup error:", err);
      });
    }

    res.json({
      message: "Product deleted."
    });
  } catch (err) {
    console.error("Delete product error:", err);

    res.status(500).json({
      error: "Failed to delete product."
    });
  }
});

// ============================================================
// SETTINGS ROUTES
// ============================================================

app.get("/settings", async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT setting_key, setting_value
        FROM settings
        ORDER BY setting_key
      `
    );

    const settings = Object.fromEntries(
      result.rows.map((row) => [row.setting_key, row.setting_value])
    );

    res.json(settings);
  } catch (err) {
    console.error("Settings error:", err);

    res.status(500).json({
      error: "Failed to fetch settings."
    });
  }
});

app.get("/settings/:key", async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT setting_value
        FROM settings
        WHERE setting_key = $1
      `,
      [req.params.key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Setting not found."
      });
    }

    res.json(result.rows[0].setting_value);
  } catch (err) {
    console.error("Setting error:", err);

    res.status(500).json({
      error: "Failed to fetch setting."
    });
  }
});

app.put("/settings/:key", verifyAdmin, async (req, res) => {
  try {
    const value = req.body.value !== undefined ? req.body.value : req.body;

    const result = await pool.query(
      `
        INSERT INTO settings (setting_key, setting_value, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (setting_key)
        DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          updated_at = NOW()
        RETURNING setting_key, setting_value, updated_at
      `,
      [req.params.key, JSON.stringify(value)]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update setting error:", err);

    res.status(500).json({
      error: "Failed to update setting."
    });
  }
});

// ============================================================
// STRIPE CHECKOUT
// Inventory is reduced after Stripe confirms payment through webhook.
// ============================================================

app.post("/create-checkout-session", async (req, res) => {
  const cart = Array.isArray(req.body.cart) ? req.body.cart : [];

  if (cart.length === 0) {
    return res.status(400).json({
      error: "Cart is empty or invalid."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        INSERT INTO orders (status, currency, customer_email)
        VALUES ('pending', 'usd', $1)
        RETURNING id
      `,
      [req.body.customerEmail || null]
    );

    const orderId = orderResult.rows[0].id;
    const lineItems = [];

    for (const item of cart) {
      const quantity = Math.max(1, Number(item.quantity || 1));

      const productResult = await client.query(
        `
          SELECT *
          FROM products
          WHERE id = $1 AND active = true
          LIMIT 1
        `,
        [item.id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`${item.name || "Product"} is unavailable.`);
      }

      const product = productResult.rows[0];

      let checkoutName = product.name;
      let sku = product.sku;
      let unitPrice = Number(product.price);
      let variantName = null;
      let variantIndex = null;

      if (item.variantIndex !== undefined && item.variantIndex !== null) {
        variantIndex = Number(item.variantIndex);

        const variants = normalizeVariants(product.variants);
        const variant = variants[variantIndex];

        if (!variant) {
          throw new Error("Selected variant was not found.");
        }

        if (variant.stock < quantity) {
          throw new Error(`${product.name} (${variant.name}) has insufficient stock.`);
        }

        variantName = variant.name;
        checkoutName = `${product.name} (${variant.name})`;
        sku = variant.sku;
        unitPrice = Number(variant.price);
      } else {
        if (Number(product.stock) < quantity) {
          throw new Error(`${product.name} has insufficient stock.`);
        }
      }

      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            variant_index,
            variant_name,
            sku,
            unit_price,
            quantity
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          orderId,
          product.id,
          product.name,
          variantIndex,
          variantName,
          sku,
          unitPrice,
          quantity
        ]
      );

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: checkoutName
          },
          unit_amount: Math.round(unitPrice * 100)
        },
        quantity
      });
    }

    const baseUrl = String(
      process.env.FRONTEND_URL || process.env.SITE_URL || ""
    )
      .split(",")[0]
      .replace(/\/$/, "");

    if (!baseUrl) {
      throw new Error("FRONTEND_URL or SITE_URL is required for Stripe redirects.");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/Cart.html`,
      customer_email: req.body.customerEmail || undefined,
      metadata: {
        orderId: String(orderId)
      }
    });

    await client.query(
      `
        UPDATE orders
        SET stripe_session_id = $1,
            amount_total = $2
        WHERE id = $3
      `,
      [session.id, session.amount_total, orderId]
    );

    await client.query("COMMIT");

    res.json({
      url: session.url,
      orderId: String(orderId)
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Checkout error:", err);

    res.status(400).json({
      error: err.message || "Checkout failed."
    });
  } finally {
    client.release();
  }
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error("Unhandled request error:", err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.message
    });
  }

  res.status(500).json({
    error: err.message || "Internal server error."
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found."
  });
});

// ============================================================
// VERCEL EXPORT + LOCAL DEVELOPMENT
// ============================================================

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  initializeDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`MMC backend running locally on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Startup failed:", err);
      process.exit(1);
    });
}