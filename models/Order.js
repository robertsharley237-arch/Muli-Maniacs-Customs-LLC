// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: models/Order.js
// ORDER MODEL FOR NEON POSTGRESQL
// ============================================================

"use strict";

const db = require("../db");

// ============================================================
// ALLOWED STATUS VALUES
// ============================================================

const ALLOWED_ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "completed",
  "cancelled",
  "refunded"
];

const ALLOWED_PAYMENT_STATUSES = [
  "unpaid",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded"
];

// ============================================================
// CLEANING HELPERS
// ============================================================

function cleanText(
  value,
  maximumLength
) {
  return String(value || "")
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function cleanEmail(value) {
  return cleanText(
    value,
    254
  ).toLowerCase();
}

function isValidEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function cleanMoney(
  value,
  fallbackValue
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return Number(
      fallbackValue || 0
    );
  }

  return Math.max(
    0,
    Math.round(
      number * 100
    ) / 100
  );
}

function cleanWholeNumber(
  value,
  fallbackValue
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return Math.max(
      1,
      Math.floor(
        Number(
          fallbackValue || 1
        )
      )
    );
  }

  return Math.max(
    1,
    Math.floor(number)
  );
}

// ============================================================
// STATUS NORMALIZATION
// ============================================================

function normalizeOrderStatus(
  value,
  fallbackStatus
) {
  const status =
    String(
      value ||
      fallbackStatus ||
      "pending"
    )
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, "_");

  if (
    ALLOWED_ORDER_STATUSES.includes(
      status
    )
  ) {
    return status;
  }

  return (
    fallbackStatus ||
    "pending"
  );
}

function normalizePaymentStatus(
  value,
  fallbackStatus
) {
  const status =
    String(
      value ||
      fallbackStatus ||
      "unpaid"
    )
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, "_");

  if (
    ALLOWED_PAYMENT_STATUSES.includes(
      status
    )
  ) {
    return status;
  }

  return (
    fallbackStatus ||
    "unpaid"
  );
}

function normalizeCurrency(value) {
  const currency =
    cleanText(
      value || "USD",
      3
    ).toUpperCase();

  if (
    /^[A-Z]{3}$/.test(
      currency
    )
  ) {
    return currency;
  }

  return "USD";
}

// ============================================================
// ORDER ITEMS
// ============================================================

function normalizeOrderItem(
  item,
  itemIndex
) {
  const input =
    item || {};

  const price =
    cleanMoney(
      input.price !== undefined
        ? input.price
        : input.unitPrice !==
            undefined
          ? input.unitPrice
          : input.unit_price,
      0
    );

  const quantity =
    cleanWholeNumber(
      input.quantity,
      1
    );

  let variantIndex = null;

  if (
    input.variantIndex !== null &&
    input.variantIndex !== undefined &&
    input.variantIndex !== ""
  ) {
    const providedVariantIndex =
      Number(
        input.variantIndex
      );

    if (
      Number.isInteger(
        providedVariantIndex
      ) &&
      providedVariantIndex >= 0
    ) {
      variantIndex =
        providedVariantIndex;
    }
  }

  return {
    productId: String(
      input.productId ||
      input.product_id ||
      input.id ||
      input._id ||
      ""
    ),

    variantIndex:
      variantIndex,

    variantId:
      cleanText(
        input.variantId ||
        input.variant_id,
        200
      ),

    name:
      cleanText(
        input.name ||
        input.productName ||
        input.product_name ||
        "Product",
        200
      ),

    sku:
      cleanText(
        input.sku,
        100
      ),

    variantName:
      cleanText(
        input.variantName ||
        input.variant_name,
        150
      ),

    image:
      cleanText(
        input.image,
        2000
      ),

    quantity:
      quantity,

    price:
      price,

    lineTotal:
      cleanMoney(
        price * quantity,
        0
      ),

    itemIndex:
      itemIndex
  };
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(
    normalizeOrderItem
  );
}

function parseOrderItems(value) {
  if (Array.isArray(value)) {
    return normalizeOrderItems(
      value
    );
  }

  if (typeof value === "string") {
    try {
      const parsedValue =
        JSON.parse(value);

      if (
        Array.isArray(
          parsedValue
        )
      ) {
        return normalizeOrderItems(
          parsedValue
        );
      }
    } catch (error) {
      console.error(
        "Order items could not be parsed:",
        error
      );
    }
  }

  return [];
}

function calculateItemsSubtotal(items) {
  const normalizedItems =
    normalizeOrderItems(
      items
    );

  const subtotal =
    normalizedItems.reduce(
      function (
        currentTotal,
        item
      ) {
        return (
          currentTotal +
          item.lineTotal
        );
      },
      0
    );

  return cleanMoney(
    subtotal,
    0
  );
}

// ============================================================
// FORMAT DATABASE ORDER
// ============================================================

function formatOrder(row) {
  if (!row) {
    return null;
  }

  return {
    id:
      String(row.id),

    email:
      String(row.email || ""),

    subtotal:
      Number(
        row.subtotal || 0
      ),

    tax:
      Number(
        row.tax || 0
      ),

    total:
      Number(
        row.total || 0
      ),

    currency:
      normalizeCurrency(
        row.currency
      ),

    status:
      normalizeOrderStatus(
        row.status,
        "pending"
      ),

    paymentStatus:
      normalizePaymentStatus(
        row.payment_status,
        "unpaid"
      ),

    stripeSessionId:
      String(
        row.stripe_session_id ||
        ""
      ),

    stripePaymentIntentId:
      String(
        row.stripe_payment_intent_id ||
        ""
      ),

    stripeCustomerId:
      String(
        row.stripe_customer_id ||
        ""
      ),

    items:
      parseOrderItems(
        row.items
      ),

    notes:
      String(row.notes || ""),

    createdAt:
      row.created_at || null,

    updatedAt:
      row.updated_at || null,

    paidAt:
      row.paid_at || null,

    completedAt:
      row.completed_at || null,

    cancelledAt:
      row.cancelled_at || null,

    refundedAt:
      row.refunded_at || null
  };
}

// ============================================================
// NORMALIZE ORDER INPUT
// ============================================================

function normalizeOrderInput(
  orderData
) {
  const input =
    orderData || {};

  const items =
    normalizeOrderItems(
      input.items ||
      input.order_items
    );

  const calculatedSubtotal =
    calculateItemsSubtotal(
      items
    );

  const subtotal =
    cleanMoney(
      input.subtotal !== undefined
        ? input.subtotal
        : calculatedSubtotal,
      calculatedSubtotal
    );

  const tax =
    cleanMoney(
      input.tax !== undefined
        ? input.tax
        : input.taxAmount !==
            undefined
          ? input.taxAmount
          : input.tax_amount,
      0
    );

  const calculatedTotal =
    cleanMoney(
      subtotal + tax,
      0
    );

  return {
    email:
      cleanEmail(
        input.email ||
        input.clientEmail ||
        input.client_email
      ),

    subtotal:
      subtotal,

    tax:
      tax,

    total:
      cleanMoney(
        input.total !== undefined
          ? input.total
          : input.totalAmount !==
              undefined
            ? input.totalAmount
            : input.total_amount,
        calculatedTotal
      ),

    currency:
      normalizeCurrency(
        input.currency
      ),

    status:
      normalizeOrderStatus(
        input.status,
        "pending"
      ),

    paymentStatus:
      normalizePaymentStatus(
        input.paymentStatus ||
        input.payment_status,
        "unpaid"
      ),

    stripeSessionId:
      cleanText(
        input.stripeSessionId ||
        input.stripe_session_id,
        300
      ),

    stripePaymentIntentId:
      cleanText(
        input.stripePaymentIntentId ||
        input.stripe_payment_intent_id,
        300
      ),

    stripeCustomerId:
      cleanText(
        input.stripeCustomerId ||
        input.stripe_customer_id,
        300
      ),

    items:
      items,

    notes:
      cleanText(
        input.notes,
        2000
      )
  };
}

// ============================================================
// VALIDATE ORDER
// ============================================================

function validateOrder(order) {
  const errors = [];

  if (
    order.email &&
    !isValidEmail(
      order.email
    )
  ) {
    errors.push(
      "Enter a valid client email address."
    );
  }

  if (!order.items.length) {
    errors.push(
      "An order must contain at least one item."
    );
  }

  if (
    !Number.isFinite(
      order.subtotal
    ) ||
    order.subtotal < 0
  ) {
    errors.push(
      "Order subtotal must be 0 or higher."
    );
  }

  if (
    !Number.isFinite(
      order.tax
    ) ||
    order.tax < 0
  ) {
    errors.push(
      "Order tax must be 0 or higher."
    );
  }

  if (
    !Number.isFinite(
      order.total
    ) ||
    order.total < 0
  ) {
    errors.push(
      "Order total must be 0 or higher."
    );
  }

  if (
    Math.abs(
      order.total -
      (
        order.subtotal +
        order.tax
      )
    ) > 0.01
  ) {
    errors.push(
      "Order total must equal subtotal plus tax."
    );
  }

  order.items.forEach(
    function (
      item,
      itemIndex
    ) {
      const itemNumber =
        itemIndex + 1;

      if (!item.name) {
        errors.push(
          "Order item " +
          itemNumber +
          " requires a name."
        );
      }

      if (
        !Number.isInteger(
          item.quantity
        ) ||
        item.quantity < 1
      ) {
        errors.push(
          "Order item " +
          itemNumber +
          " quantity must be at least 1."
        );
      }

      if (
        !Number.isFinite(
          item.price
        ) ||
        item.price < 0
      ) {
        errors.push(
          "Order item " +
          itemNumber +
          " price must be 0 or higher."
        );
      }
    }
  );

  return errors;
}

// ============================================================
// MODEL ERROR
// ============================================================

function createModelError(
  message,
  statusCode,
  errorCode,
  validationErrors
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    errorCode;

  if (validationErrors) {
    error.validationErrors =
      validationErrors;
  }

  return error;
}

// ============================================================
// COMMON ORDER SELECT
// ============================================================

const ORDER_SELECT = `
  SELECT
    id,
    email,
    subtotal,
    tax,
    total,
    currency,
    status,
    payment_status,
    stripe_session_id,
    stripe_payment_intent_id,
    stripe_customer_id,
    items,
    notes,
    created_at,
    updated_at,
    paid_at,
    completed_at,
    cancelled_at,
    refunded_at
  FROM orders
`;

// ============================================================
// CREATE ORDER
// ============================================================

async function createOrder(
  orderData
) {
  const order =
    normalizeOrderInput(
      orderData
    );

  const errors =
    validateOrder(order);

  if (errors.length) {
    throw createModelError(
      errors.join(" "),
      400,
      "INVALID_ORDER",
      errors
    );
  }

  try {
    const result =
      await db.query(
        `
          INSERT INTO orders (
            email,
            subtotal,
            tax,
            total,
            currency,
            status,
            payment_status,
            stripe_session_id,
            stripe_payment_intent_id,
            stripe_customer_id,
            items,
            notes,
            created_at,
            updated_at,
            paid_at,
            completed_at,
            cancelled_at,
            refunded_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            NULLIF($8, ''),
            NULLIF($9, ''),
            NULLIF($10, ''),
            $11::JSONB,
            $12,
            NOW(),
            NOW(),

            CASE
              WHEN $7 = 'paid'
              THEN NOW()
              ELSE NULL
            END,

            CASE
              WHEN $6 = 'completed'
              THEN NOW()
              ELSE NULL
            END,

            CASE
              WHEN $6 = 'cancelled'
              THEN NOW()
              ELSE NULL
            END,

            CASE
              WHEN
                $6 = 'refunded'
                OR $7 = 'refunded'
              THEN NOW()
              ELSE NULL
            END
          )
          RETURNING id
        `,
        [
          order.email,
          order.subtotal,
          order.tax,
          order.total,
          order.currency,
          order.status,
          order.paymentStatus,
          order.stripeSessionId,
          order.stripePaymentIntentId,
          order.stripeCustomerId,
          JSON.stringify(
            order.items
          ),
          order.notes
        ]
      );

    return getOrderById(
      result.rows[0].id
    );
  } catch (error) {
    if (error.code === "23505") {
      throw createModelError(
        "An order already exists for that Stripe checkout session.",
        409,
        "DUPLICATE_STRIPE_SESSION"
      );
    }

    throw error;
  }
}

// ============================================================
// GET ORDER BY ID
// ============================================================

async function getOrderById(
  orderId
) {
  const result =
    await db.query(
      ORDER_SELECT +
      `
        WHERE id = $1
        LIMIT 1
      `,
      [
        orderId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatOrder(
    result.rows[0]
  );
}

// ============================================================
// GET ORDER BY STRIPE SESSION
// ============================================================

async function getOrderByStripeSessionId(
  stripeSessionId
) {
  const sessionId =
    cleanText(
      stripeSessionId,
      300
    );

  if (!sessionId) {
    return null;
  }

  const result =
    await db.query(
      ORDER_SELECT +
      `
        WHERE
          stripe_session_id = $1
        LIMIT 1
      `,
      [
        sessionId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatOrder(
    result.rows[0]
  );
}

// ============================================================
// GET ORDER BY PAYMENT INTENT
// ============================================================

async function getOrderByPaymentIntentId(
  paymentIntentId
) {
  const intentId =
    cleanText(
      paymentIntentId,
      300
    );

  if (!intentId) {
    return null;
  }

  const result =
    await db.query(
      ORDER_SELECT +
      `
        WHERE
          stripe_payment_intent_id = $1
        LIMIT 1
      `,
      [
        intentId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return formatOrder(
    result.rows[0]
  );
}

// ============================================================
// GET ALL ORDERS
// ============================================================

async function getAllOrders(options) {
  const settings =
    options || {};

  const requestedLimit =
    Math.floor(
      Number(
        settings.limit || 250
      )
    );

  const requestedOffset =
    Math.floor(
      Number(
        settings.offset || 0
      )
    );

  const limit =
    Math.min(
      1000,
      Math.max(
        1,
        requestedLimit
      )
    );

  const offset =
    Math.max(
      0,
      requestedOffset
    );

  const result =
    await db.query(
      ORDER_SELECT +
      `
        ORDER BY
          created_at DESC
        LIMIT $1
        OFFSET $2
      `,
      [
        limit,
        offset
      ]
    );

  return result.rows.map(
    formatOrder
  );
}

// ============================================================
// GET ORDERS BY STATUS
// ============================================================

async function getOrdersByStatus(
  status,
  options
) {
  const requestedStatus =
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, "_");

  if (
    !ALLOWED_ORDER_STATUSES.includes(
      requestedStatus
    )
  ) {
    throw createModelError(
      "The selected order status is invalid.",
      400,
      "INVALID_ORDER_STATUS"
    );
  }

  const settings =
    options || {};

  const limit =
    Math.min(
      1000,
      Math.max(
        1,
        Math.floor(
          Number(
            settings.limit || 250
          )
        )
      )
    );

  const offset =
    Math.max(
      0,
      Math.floor(
        Number(
          settings.offset || 0
        )
      )
    );

  const result =
    await db.query(
      ORDER_SELECT +
      `
        WHERE status = $1
        ORDER BY
          created_at DESC
        LIMIT $2
        OFFSET $3
      `,
      [
        requestedStatus,
        limit,
        offset
      ]
    );

  return result.rows.map(
    formatOrder
  );
}

// ============================================================
// GET ORDERS BY EMAIL
// ============================================================

async function getOrdersByEmail(
  email,
  options
) {
  const cleanedEmail =
    cleanEmail(email);

  if (
    !cleanedEmail ||
    !isValidEmail(
      cleanedEmail
    )
  ) {
    throw createModelError(
      "Enter a valid client email address.",
      400,
      "INVALID_EMAIL"
    );
  }

  const settings =
    options || {};

  const limit =
    Math.min(
      1000,
      Math.max(
        1,
        Math.floor(
          Number(
            settings.limit || 250
          )
        )
      )
    );

  const offset =
    Math.max(
      0,
      Math.floor(
        Number(
          settings.offset || 0
        )
      )
    );

  const result =
    await db.query(
      ORDER_SELECT +
      `
        WHERE
          LOWER(email) =
          LOWER($1)
        ORDER BY
          created_at DESC
        LIMIT $2
        OFFSET $3
      `,
      [
        cleanedEmail,
        limit,
        offset
      ]
    );

  return result.rows.map(
    formatOrder
  );
}

// ============================================================
// SEARCH ORDERS
// ============================================================

async function searchOrders(
  searchText,
  options
) {
  const search =
    cleanText(
      searchText,
      300
    );

  if (!search) {
    return getAllOrders(
      options
    );
  }

  const settings =
    options || {};

  const limit =
    Math.min(
      1000,
      Math.max(
        1,
        Math.floor(
          Number(
            settings.limit || 250
          )
        )
      )
    );

  const offset =
    Math.max(
      0,
      Math.floor(
        Number(
          settings.offset || 0
        )
      )
    );

  const searchValue =
    "%" +
    search +
    "%";

  const numericId =
    /^\d+$/.test(search)
      ? search
      : null;

  const result =
    await db.query(
      ORDER_SELECT +
      `
        WHERE
          email ILIKE $1
          OR status ILIKE $1
          OR payment_status ILIKE $1
          OR COALESCE(
            stripe_session_id,
            ''
          ) ILIKE $1
          OR COALESCE(
            stripe_payment_intent_id,
            ''
          ) ILIKE $1
          OR items::TEXT ILIKE $1
          OR (
            $2::BIGINT IS NOT NULL
            AND id = $2
          )
        ORDER BY
          created_at DESC
        LIMIT $3
        OFFSET $4
      `,
      [
        searchValue,
        numericId,
        limit,
        offset
      ]
    );

  return result.rows.map(
    formatOrder
  );
}

// ============================================================
// UPDATE ORDER STATUS
// ============================================================

async function updateOrderStatus(
  orderId,
  status
) {
  const requestedStatus =
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, "_");

  if (
    !ALLOWED_ORDER_STATUSES.includes(
      requestedStatus
    )
  ) {
    throw createModelError(
      "The selected order status is invalid.",
      400,
      "INVALID_ORDER_STATUS"
    );
  }

  const result =
    await db.query(
      `
        UPDATE orders
        SET
          status = $1,

          payment_status =
            CASE
              WHEN $1 = 'paid'
                THEN 'paid'

              WHEN $1 = 'refunded'
                THEN 'refunded'

              WHEN
                $1 = 'cancelled'
                AND payment_status = 'unpaid'
                THEN 'cancelled'

              ELSE payment_status
            END,

          paid_at =
            CASE
              WHEN $1 = 'paid'
                THEN COALESCE(
                  paid_at,
                  NOW()
                )

              ELSE paid_at
            END,

          completed_at =
            CASE
              WHEN $1 = 'completed'
                THEN COALESCE(
                  completed_at,
                  NOW()
                )

              ELSE completed_at
            END,

          cancelled_at =
            CASE
              WHEN $1 = 'cancelled'
                THEN COALESCE(
                  cancelled_at,
                  NOW()
                )

              ELSE cancelled_at
            END,

          refunded_at =
            CASE
              WHEN $1 = 'refunded'
                THEN COALESCE(
                  refunded_at,
                  NOW()
                )

              ELSE refunded_at
            END,

          updated_at = NOW()

        WHERE id = $2

        RETURNING id
      `,
      [
        requestedStatus,
        orderId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return getOrderById(
    result.rows[0].id
  );
}

// ============================================================
// UPDATE PAYMENT STATUS
// ============================================================

async function updatePaymentStatus(
  orderId,
  paymentStatus,
  stripeData
) {
  const requestedStatus =
    String(paymentStatus || "")
      .trim()
      .toLowerCase()
      .replace(/[ -]+/g, "_");

  if (
    !ALLOWED_PAYMENT_STATUSES.includes(
      requestedStatus
    )
  ) {
    throw createModelError(
      "The selected payment status is invalid.",
      400,
      "INVALID_PAYMENT_STATUS"
    );
  }

  const stripe =
    stripeData || {};

  const result =
    await db.query(
      `
        UPDATE orders
        SET
          payment_status = $1,

          status =
            CASE
              WHEN
                $1 = 'paid'
                AND status = 'pending'
                THEN 'paid'

              WHEN $1 = 'refunded'
                THEN 'refunded'

              WHEN
                $1 = 'cancelled'
                AND status = 'pending'
                THEN 'cancelled'

              ELSE status
            END,

          stripe_session_id =
            COALESCE(
              NULLIF($2, ''),
              stripe_session_id
            ),

          stripe_payment_intent_id =
            COALESCE(
              NULLIF($3, ''),
              stripe_payment_intent_id
            ),

          stripe_customer_id =
            COALESCE(
              NULLIF($4, ''),
              stripe_customer_id
            ),

          paid_at =
            CASE
              WHEN $1 = 'paid'
                THEN COALESCE(
                  paid_at,
                  NOW()
                )

              ELSE paid_at
            END,

          refunded_at =
            CASE
              WHEN $1 = 'refunded'
                THEN COALESCE(
                  refunded_at,
                  NOW()
                )

              ELSE refunded_at
            END,

          cancelled_at =
            CASE
              WHEN $1 = 'cancelled'
                THEN COALESCE(
                  cancelled_at,
                  NOW()
                )

              ELSE cancelled_at
            END,

          updated_at = NOW()

        WHERE id = $5

        RETURNING id
      `,
      [
        requestedStatus,

        cleanText(
          stripe.stripeSessionId ||
          stripe.stripe_session_id,
          300
        ),

        cleanText(
          stripe.stripePaymentIntentId ||
          stripe.stripe_payment_intent_id,
          300
        ),

        cleanText(
          stripe.stripeCustomerId ||
          stripe.stripe_customer_id,
          300
        ),

        orderId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return getOrderById(
    result.rows[0].id
  );
}

// ============================================================
// UPDATE STRIPE IDENTIFIERS
// ============================================================

async function updateStripeIdentifiers(
  orderId,
  stripeData
) {
  const stripe =
    stripeData || {};

  const result =
    await db.query(
      `
        UPDATE orders
        SET
          stripe_session_id =
            COALESCE(
              NULLIF($1, ''),
              stripe_session_id
            ),

          stripe_payment_intent_id =
            COALESCE(
              NULLIF($2, ''),
              stripe_payment_intent_id
            ),

          stripe_customer_id =
            COALESCE(
              NULLIF($3, ''),
              stripe_customer_id
            ),

          updated_at = NOW()

        WHERE id = $4

        RETURNING id
      `,
      [
        cleanText(
          stripe.stripeSessionId ||
          stripe.stripe_session_id,
          300
        ),

        cleanText(
          stripe.stripePaymentIntentId ||
          stripe.stripe_payment_intent_id,
          300
        ),

        cleanText(
          stripe.stripeCustomerId ||
          stripe.stripe_customer_id,
          300
        ),

        orderId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return getOrderById(
    result.rows[0].id
  );
}

// ============================================================
// ORDER COUNTS
// ============================================================

async function countOrders() {
  const result =
    await db.query(
      `
        SELECT
          COUNT(*)::INTEGER
            AS order_count
        FROM orders
      `
    );

  return Number(
    result.rows[0]
      .order_count || 0
  );
}

async function countOrdersByStatus() {
  const result =
    await db.query(
      `
        SELECT
          status,
          COUNT(*)::INTEGER
            AS order_count
        FROM orders
        GROUP BY status
        ORDER BY status ASC
      `
    );

  const counts = {
    pending: 0,
    paid: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0
  };

  result.rows.forEach(
    function (row) {
      const status =
        normalizeOrderStatus(
          row.status,
          "pending"
        );

      counts[status] =
        Number(
          row.order_count || 0
        );
    }
  );

  return counts;
}

// ============================================================
// REVENUE
// ============================================================

async function calculateRevenue(currency) {
  const normalizedCurrency =
    normalizeCurrency(
      currency || "USD"
    );

  const result =
    await db.query(
      `
        SELECT
          COALESCE(
            SUM(total),
            0
          )::NUMERIC(14, 2)
            AS revenue
        FROM orders
        WHERE
          currency = $1
          AND payment_status = 'paid'
          AND status NOT IN (
            'cancelled',
            'refunded'
          )
      `,
      [
        normalizedCurrency
      ]
    );

  return {
    currency:
      normalizedCurrency,

    revenue:
      Number(
        result.rows[0]
          .revenue || 0
      )
  };
}

// ============================================================
// DASHBOARD SUMMARY
// ============================================================

async function getOrderSummary() {
  const result =
    await db.query(
      `
        SELECT
          COUNT(*)::INTEGER
            AS total_orders,

          COUNT(*) FILTER (
            WHERE status = 'pending'
          )::INTEGER
            AS pending_orders,

          COUNT(*) FILTER (
            WHERE status = 'paid'
          )::INTEGER
            AS paid_orders,

          COUNT(*) FILTER (
            WHERE status = 'processing'
          )::INTEGER
            AS processing_orders,

          COUNT(*) FILTER (
            WHERE status = 'completed'
          )::INTEGER
            AS completed_orders,

          COUNT(*) FILTER (
            WHERE status = 'cancelled'
          )::INTEGER
            AS cancelled_orders,

          COUNT(*) FILTER (
            WHERE status = 'refunded'
          )::INTEGER
            AS refunded_orders,

          COALESCE(
            SUM(total) FILTER (
              WHERE
                payment_status = 'paid'
                AND status NOT IN (
                  'cancelled',
                  'refunded'
                )
                AND currency = 'USD'
            ),
            0
          )::NUMERIC(14, 2)
            AS usd_revenue

        FROM orders
      `
    );

  const row =
    result.rows[0];

  return {
    totalOrders:
      Number(
        row.total_orders || 0
      ),

    pendingOrders:
      Number(
        row.pending_orders || 0
      ),

    paidOrders:
      Number(
        row.paid_orders || 0
      ),

    processingOrders:
      Number(
        row.processing_orders || 0
      ),

    completedOrders:
      Number(
        row.completed_orders || 0
      ),

    cancelledOrders:
      Number(
        row.cancelled_orders || 0
      ),

    refundedOrders:
      Number(
        row.refunded_orders || 0
      ),

    usdRevenue:
      Number(
        row.usd_revenue || 0
      )
  };
}

// ============================================================
// DELETE ORDER
// ============================================================

async function deleteOrder(orderId) {
  const currentOrder =
    await getOrderById(
      orderId
    );

  if (!currentOrder) {
    return null;
  }

  const result =
    await db.query(
      `
        DELETE FROM orders
        WHERE id = $1
        RETURNING id
      `,
      [
        orderId
      ]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return currentOrder;
}

// ============================================================
// EXPORT ORDER MODEL
// ============================================================

module.exports = {
  ALLOWED_ORDER_STATUSES:
    ALLOWED_ORDER_STATUSES,

  ALLOWED_PAYMENT_STATUSES:
    ALLOWED_PAYMENT_STATUSES,

  normalizeOrderStatus:
    normalizeOrderStatus,

  normalizePaymentStatus:
    normalizePaymentStatus,

  normalizeCurrency:
    normalizeCurrency,

  normalizeOrderItem:
    normalizeOrderItem,

  normalizeOrderItems:
    normalizeOrderItems,

  normalizeOrderInput:
    normalizeOrderInput,

  calculateItemsSubtotal:
    calculateItemsSubtotal,

  validateOrder:
    validateOrder,

  formatOrder:
    formatOrder,

  createOrder:
    createOrder,

  getOrderById:
    getOrderById,

  getOrderByStripeSessionId:
    getOrderByStripeSessionId,

  getOrderByPaymentIntentId:
    getOrderByPaymentIntentId,

  getAllOrders:
    getAllOrders,

  getOrdersByStatus:
    getOrdersByStatus,

  getOrdersByEmail:
    getOrdersByEmail,

  searchOrders:
    searchOrders,

  updateOrderStatus:
    updateOrderStatus,

  updatePaymentStatus:
    updatePaymentStatus,

  updateStripeIdentifiers:
    updateStripeIdentifiers,

  countOrders:
    countOrders,

  countOrdersByStatus:
    countOrdersByStatus,

  calculateRevenue:
    calculateRevenue,

  getOrderSummary:
    getOrderSummary,

  deleteOrder:
    deleteOrder
};
