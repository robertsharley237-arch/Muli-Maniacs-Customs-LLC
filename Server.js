// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: server.js
// EXPRESS API ENTRY POINT
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Authentication: JWT
// Uploads: Multer + Cloudinary
// Payments: Stripe Checkout
// ============================================================

"use strict";

// ============================================================
// ENVIRONMENT CONFIGURATION
// ============================================================

require("dotenv").config();

// ============================================================
// DEPENDENCIES
// ============================================================

const express =
  require("express");

const cors =
  require("cors");

const db =
  require("./db");

// ============================================================
// ROUTES
// ============================================================

const checkoutRoutes =
  require("./routes/CheckoutRoutes");

const adminRoutes =
  require("./routes/AdminRoutes");

const categoryRoutes =
  require("./routes/CategoryRoutes");

const clientIntakeRoutes =
  require("./routes/ClientIntakeRoutes");

const orderRoutes =
  require("./routes/OrderRoutes");

const productRoutes =
  require("./routes/ProductRoutes");

const settingsRoutes =
  require("./routes/SettingsRoutes");

const uploadRoutes =
  require("./routes/UploadRoutes");

// ============================================================
// EXPRESS APPLICATION
// ============================================================

const app =
  express();

// ============================================================
// SERVER SETTINGS
// ============================================================

app.disable(
  "x-powered-by"
);

app.set(
  "trust proxy",
  1
);

// ============================================================
// ENVIRONMENT CHECK
// ============================================================

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "DATABASE_URL",
  "JWT_SECRET"
];

const RECOMMENDED_ENVIRONMENT_VARIABLES = [
  "ADMIN_BOOTSTRAP_KEY",
  "FRONTEND_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "INTAKE_EMAIL_USER",
  "INTAKE_EMAIL_PASS",
  "INTAKE_NOTIFICATION_EMAIL"
];

function checkEnvironmentVariables() {
  const missingRequired =
    REQUIRED_ENVIRONMENT_VARIABLES.filter(
      function (variableName) {
        return !process.env[
          variableName
        ];
      }
    );

  const missingRecommended =
    RECOMMENDED_ENVIRONMENT_VARIABLES.filter(
      function (variableName) {
        return !process.env[
          variableName
        ];
      }
    );

  if (
    missingRequired.length > 0
  ) {
    console.error(
      "Missing required environment variables:",
      missingRequired.join(", ")
    );
  }

  if (
    missingRecommended.length > 0
  ) {
    console.warn(
      "Missing optional or recommended environment variables:",
      missingRecommended.join(", ")
    );
  }

  return {
    missingRequired:
      missingRequired,

    missingRecommended:
      missingRecommended
  };
}

const environmentStatus =
  checkEnvironmentVariables();

// ============================================================
// CORS CONFIGURATION
// ============================================================

function normalizeOrigin(value) {
  return String(value || "")
    .trim()
    .replace(
      /\/+$/,
      ""
    );
}

function getAllowedOrigins() {
  const originValues = [
    process.env.FRONTEND_URL,
    process.env.PUBLIC_FRONTEND_URL,
    process.env.SITE_URL,
    process.env.ALLOWED_ORIGINS
  ];

  const origins = [];

  originValues.forEach(
    function (originValue) {
      if (!originValue) {
        return;
      }

      String(originValue)
        .split(",")
        .forEach(
          function (origin) {
            const normalizedOrigin =
              normalizeOrigin(
                origin
              );

            if (
              normalizedOrigin &&
              !origins.includes(
                normalizedOrigin
              )
            ) {
              origins.push(
                normalizedOrigin
              );
            }
          }
        );
    }
  );

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    [
      "http://localhost:3000",
      "http://localhost:5000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000"
    ].forEach(
      function (origin) {
        if (
          !origins.includes(
            origin
          )
        ) {
          origins.push(
            origin
          );
        }
      }
    );
  }

  return origins;
}

const allowedOrigins =
  getAllowedOrigins();

const corsOptions = {
  origin:
    function (
      requestOrigin,
      callback
    ) {
      /*
       * Requests from servers, terminal tools, health checks,
       * mobile applications, and same-origin pages may not
       * include an Origin header.
       */

      if (!requestOrigin) {
        callback(
          null,
          true
        );

        return;
      }

      const normalizedOrigin =
        normalizeOrigin(
          requestOrigin
        );

      /*
       * During local development, allow requests if no origins
       * were configured. Production should define FRONTEND_URL.
       */

      if (
        allowedOrigins.length === 0 &&
        process.env.NODE_ENV !==
          "production"
      ) {
        callback(
          null,
          true
        );

        return;
      }

      if (
        allowedOrigins.includes(
          normalizedOrigin
        )
      ) {
        callback(
          null,
          true
        );

        return;
      }

      const error =
        new Error(
          "This website origin is not allowed to access the MMC API."
        );

      error.statusCode = 403;
      error.code =
        "CORS_ORIGIN_BLOCKED";

      callback(error);
    },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Stripe-Signature",
    "x-bootstrap-key"
  ],

  exposedHeaders: [
    "Content-Length"
  ],

  credentials:
    false,

  maxAge:
    86400,

  optionsSuccessStatus:
    204
};

app.use(
  cors(corsOptions)
);

app.options(
  "*",
  cors(corsOptions)
);

// ============================================================
// CHECKOUT AND STRIPE WEBHOOK ROUTES
//
// IMPORTANT:
//
// CheckoutRoutes.js contains its own body parsers:
//
// express.raw() for:
// POST /stripe-webhook
//
// express.json() for:
// POST /create-checkout-session
//
// It must be mounted before the global JSON middleware.
// ============================================================

app.use(
  "/",
  checkoutRoutes
);

// ============================================================
// GLOBAL BODY PARSERS
//
// These apply to the remaining API routes after CheckoutRoutes.
// ============================================================

app.use(
  express.json({
    limit:
      "2mb",

    strict:
      true
  })
);

app.use(
  express.urlencoded({
    extended:
      true,

    limit:
      "2mb",

    parameterLimit:
      1000
  })
);

// ============================================================
// REQUEST INFORMATION
// ============================================================

app.use(
  function (
    request,
    response,
    next
  ) {
    request.requestStartedAt =
      Date.now();

    response.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    response.setHeader(
      "X-Frame-Options",
      "DENY"
    );

    response.setHeader(
      "Referrer-Policy",
      "no-referrer"
    );

    next();
  }
);

// ============================================================
// DATABASE AVAILABILITY
// ============================================================

async function requireDatabase(
  request,
  response,
  next
) {
  if (
    environmentStatus
      .missingRequired
      .includes(
        "DATABASE_URL"
      )
  ) {
    return response
      .status(503)
      .json({
        error:
          "The database is not configured.",

        code:
          "DATABASE_NOT_CONFIGURED"
      });
  }

  try {
    await db.query(
      "SELECT 1"
    );

    next();
  } catch (error) {
    console.error(
      "Neon database connection failed:",
      error
    );

    return response
      .status(503)
      .json({
        error:
          "The database is temporarily unavailable.",

        code:
          "DATABASE_UNAVAILABLE"
      });
  }
}

// ============================================================
// PUBLIC ROOT ROUTE
// ============================================================

app.get(
  "/",
  function (
    request,
    response
  ) {
    return response.json({
      message:
        "Multi-Maniacs Customs backend is running.",

      application:
        "Multi-Maniacs Customs LLC",

      hosting:
        "Vercel",

      database:
        "Neon PostgreSQL",

      status:
        "online",

      timestamp:
        new Date()
          .toISOString()
    });
  }
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/health",
  async function (
    request,
    response
  ) {
    const startedAt =
      Date.now();

    try {
      const result =
        await db.query(
          `
            SELECT
              NOW()
                AS database_time
          `
        );

      return response.json({
        status:
          "healthy",

        server:
          "online",

        database:
          "connected",

        databaseTime:
          result.rows[0]
            .database_time,

        responseTimeMilliseconds:
          Date.now() -
          startedAt
      });
    } catch (error) {
      console.error(
        "Health check failed:",
        error
      );

      return response
        .status(503)
        .json({
          status:
            "unhealthy",

          server:
            "online",

          database:
            "disconnected",

          responseTimeMilliseconds:
            Date.now() -
            startedAt
        });
    }
  }
);

// ============================================================
// PUBLIC CONFIGURATION STATUS
//
// This route returns booleans only.
// It never returns environment-variable values or secrets.
// ============================================================

app.get(
  "/configuration-status",
  function (
    request,
    response
  ) {
    return response.json({
      databaseConfigured:
        Boolean(
          process.env
            .DATABASE_URL
        ),

      frontendConfigured:
        Boolean(
          process.env
            .FRONTEND_URL ||
          process.env
            .PUBLIC_FRONTEND_URL ||
          process.env
            .SITE_URL
        ),

      stripeConfigured:
        Boolean(
          process.env
            .STRIPE_SECRET_KEY
        ),

      stripeWebhookConfigured:
        Boolean(
          process.env
            .STRIPE_WEBHOOK_SECRET
        ),

      cloudinaryConfigured:
        Boolean(
          process.env
            .CLOUDINARY_CLOUD_NAME &&
          process.env
            .CLOUDINARY_API_KEY &&
          process.env
            .CLOUDINARY_API_SECRET
        ),

      intakeEmailConfigured:
        Boolean(
          process.env
            .INTAKE_EMAIL_USER &&
          process.env
            .INTAKE_EMAIL_PASS
        )
    });
  }
);

// ============================================================
// DATABASE-DEPENDENT ROUTES
// ============================================================

app.use(
  requireDatabase
);

// ============================================================
// ADMINISTRATOR ROUTES
//
// Examples:
//
// POST /admin/login
// POST /admin/bootstrap
// GET  /admin/me
// GET  /admin/users
// ============================================================

app.use(
  "/",
  adminRoutes
);

// ============================================================
// PRODUCT ROUTES
//
// ProductRoutes.js contains complete paths.
//
// GET  /products
// GET  /products/:id
// POST /products
// GET  /admin/products
// ============================================================

app.use(
  "/",
  productRoutes
);

// ============================================================
// CATEGORY ROUTES
//
// CategoryRoutes.js uses paths relative to /categories.
//
// GET    /categories
// POST   /categories
// PUT    /categories/:id
// DELETE /categories/:id
// ============================================================

app.use(
  "/categories",
  categoryRoutes
);

// ============================================================
// CLIENT INTAKE ROUTES
//
// ClientIntakeRoutes.js uses paths relative to /client-intakes.
//
// POST   /client-intakes
// GET    /client-intakes/admin/all
// PATCH  /client-intakes/:id/status
// DELETE /client-intakes/:id
// ============================================================

app.use(
  "/client-intakes",
  clientIntakeRoutes
);

// ============================================================
// ORDER ROUTES
//
// OrderRoutes.js contains complete /admin/orders paths.
// ============================================================

app.use(
  "/",
  orderRoutes
);

// ============================================================
// SETTINGS ROUTES
//
// SettingsRoutes.js contains complete paths.
//
// GET   /settings
// GET   /admin/settings
// PUT   /admin/settings
// PATCH /admin/settings
// ============================================================

app.use(
  "/",
  settingsRoutes
);

// ============================================================
// IMAGE UPLOAD ROUTES
//
// UploadRoutes.js uses paths relative to /upload.
//
// POST   /upload/image
// DELETE /upload/image
// GET    /upload/status
// ============================================================

app.use(
  "/upload",
  uploadRoutes
);

// ============================================================
// API ROUTE NOT FOUND
// ============================================================

app.use(
  function (
    request,
    response
  ) {
    return response
      .status(404)
      .json({
        error:
          "The requested API route was not found.",

        code:
          "ROUTE_NOT_FOUND",

        method:
          request.method,

        path:
          request.originalUrl
      });
  }
);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  function (
    error,
    request,
    response,
    next
  ) {
    console.error(
      "Unhandled MMC API error:",
      error
    );

    if (
      response.headersSent
    ) {
      return next(error);
    }

    if (
      error.code ===
      "CORS_ORIGIN_BLOCKED"
    ) {
      return response
        .status(403)
        .json({
          error:
            error.message,

          code:
            error.code
        });
    }

    if (
      error.type ===
      "entity.too.large"
    ) {
      return response
        .status(413)
        .json({
          error:
            "The submitted request is too large.",

          code:
            "REQUEST_TOO_LARGE"
        });
    }

    if (
      error instanceof
      SyntaxError
    ) {
      return response
        .status(400)
        .json({
          error:
            "The request contains invalid JSON.",

          code:
            "INVALID_JSON"
        });
    }

    const statusCode =
      Number(
        error.statusCode ||
        error.status
      ) || 500;

    return response
      .status(statusCode)
      .json({
        error:
          statusCode >= 500
            ? "An unexpected server error occurred."
            : (
                error.message ||
                "The request could not be completed."
              ),

        code:
          error.code ||
          "SERVER_ERROR"
      });
  }
);

// ============================================================
// VERCEL EXPORT
// ============================================================

module.exports =
  app;

// ============================================================
// LOCAL DEVELOPMENT SERVER
// ============================================================

if (
  require.main === module
) {
  const port =
    Number(
      process.env.PORT ||
      5000
    );

  app.listen(
    port,
    function () {
      console.log(
        "Multi-Maniacs Customs backend is running locally on port " +
        port +
        "."
      );

      console.log(
        "Allowed frontend origins:",
        allowedOrigins.length > 0
          ? allowedOrigins.join(", ")
          : "No origins configured"
      );
    }
  );
}
