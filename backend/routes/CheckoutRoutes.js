// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: routes/CheckoutRoutes.js
// STRIPE CHECKOUT AND WEBHOOK ROUTES
// NEON POSTGRESQL
// ============================================================

"use strict";

const express =
  require("express");

const Stripe =
  require("stripe");

const db =
  require("../db");

const Product =
  require("../models/Product");

const Order =
  require("../models/Order");

const router =
  express.Router();

// ============================================================
// STRIPE CONFIGURATION
// ============================================================

function getStripe() {
  if (
    !process.env
      .STRIPE_SECRET_KEY
  ) {
    const error =
      new Error(
        "Stripe is not configured on the server."
      );

    error.statusCode = 503;
    error.code =
      "STRIPE_NOT_CONFIGURED";

    throw error;
  }

  return new Stripe(
    process.env
      .STRIPE_SECRET_KEY
  );
}

// ============================================================
// GENERAL HELPERS
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

function cleanQuantity(value) {
  const quantity =
    Number(value);

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity < 1
  ) {
    return 1;
  }

  return Math.min(
    100,
    quantity
  );
}

function normalizeVariantIndex(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const index =
    Number(value);

  if (
    !Number.isInteger(index) ||
    index < 0
  ) {
    return null;
  }

  return index;
}

function moneyToCents(value) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return 0;
  }

  return Math.round(
    amount * 100
  );
}

function centsToMoney(value) {
  const amount =
    Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(
    amount
  ) / 100;
}

function getFrontendUrl() {
  return String(
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_FRONTEND_URL ||
    "http://localhost:3000"
  ).replace(
    /\/+$/,
    ""
  );
}

function isValidEmail(email) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

// ============================================================
// ERROR HANDLER
// ============================================================

function sendCheckoutError(
  response,
  error,
  fallbackMessage
) {
  console.error(
    fallbackMessage,
    error
  );

  if (
    error.code === "22P02"
  ) {
    return response
      .status(400)
      .json({
        error:
          "A product or order ID is invalid."
      });
  }

  if (
    error.code === "23505"
  ) {
    return response
      .status(409)
      .json({
        error:
          "This checkout request has already been processed."
      });
  }

  const statusCode =
    Number(
      error.statusCode
    ) || 500;

  return response
    .status(statusCode)
    .json({
      error:
        statusCode >= 500
          ? fallbackMessage
          : (
              error.message ||
              fallbackMessage
            ),

      code:
        error.code ||
        undefined
    });
}

// ============================================================
// LOAD STORE SETTINGS
// ============================================================

async function getCheckoutSettings() {
  const result =
    await db.query(
      `
        SELECT
          tax_rate,
          store_open,
          closed_store_message
        FROM settings
        WHERE id = 1
        LIMIT 1
      `
    );

  if (
    result.rows.length === 0
  ) {
    return {
      taxRate:
        0,

      storeOpen:
        true,

      closedStoreMessage:
        ""
    };
  }

  const settingsRow =
    result.rows[0];

  let taxRate =
    Number(
      settingsRow.tax_rate || 0
    );

  if (
    !Number.isFinite(taxRate) ||
    taxRate < 0
  ) {
    taxRate = 0;
  }

  /*
   * This supports either:
   *
   * 0.06 = 6 percent
   * 6    = 6 percent
   */

  if (taxRate > 1) {
    taxRate =
      taxRate / 100;
  }

  return {
    taxRate:
      taxRate,

    storeOpen:
      settingsRow.store_open !==
      false,

    closedStoreMessage:
      String(
        settingsRow
          .closed_store_message ||
        ""
      )
  };
}

// ============================================================
// BUILD VERIFIED CART ITEMS
//
// Product prices and inventory are loaded from Neon.
// Browser-provided prices are never trusted.
// ============================================================

async function buildVerifiedItems(
  requestedCart
) {
  if (
    !Array.isArray(
      requestedCart
    ) ||
    requestedCart.length === 0
  ) {
    const error =
      new Error(
        "The cart is empty."
      );

    error.statusCode = 400;

    throw error;
  }

  if (
    requestedCart.length > 100
  ) {
    const error =
      new Error(
        "The cart contains too many separate items."
      );

    error.statusCode = 400;

    throw error;
  }

  const verifiedItems = [];

  for (
    const requestedItem
    of requestedCart
  ) {
    const productId =
      String(
        requestedItem.productId ||
        requestedItem.id ||
        ""
      ).trim();

    const quantity =
      cleanQuantity(
        requestedItem.quantity
      );

    const providedVariantIndex =
      requestedItem.variantIndex;

    const variantIndex =
      normalizeVariantIndex(
        providedVariantIndex
      );

    if (!productId) {
      const error =
        new Error(
          "A cart item is missing its product ID."
        );

      error.statusCode = 400;

      throw error;
    }

    const product =
      await Product
        .getProductById(
          productId,
          false
        );

    if (!product) {
      const error =
        new Error(
          "A product in the cart is no longer available."
        );

      error.statusCode = 404;

      throw error;
    }

    let itemPrice =
      Number(product.price);

    let itemSku =
      product.sku;

    let itemImage =
      product.image;

    let variantId = "";
    let variantName = "";

    let availableStock =
      Number(product.stock || 0);

    if (
      product.variants.length > 0
    ) {
      if (
        variantIndex === null ||
        variantIndex >=
          product.variants.length
      ) {
        const error =
          new Error(
            "Choose a valid variant for " +
            product.name +
            "."
          );

        error.statusCode = 400;

        throw error;
      }

      const variant =
        product.variants[
          variantIndex
        ];

      itemPrice =
        Number(
          variant.price
        );

      itemSku =
        variant.sku ||
        product.sku;

      itemImage =
        variant.image ||
        product.image;

      variantId =
        String(
          variant.id || ""
        );

      variantName =
        String(
          variant.name || ""
        );

      availableStock =
        Number(
          variant.stock || 0
        );
    } else if (
      providedVariantIndex !==
        undefined &&
      providedVariantIndex !==
        null &&
      providedVariantIndex !== ""
    ) {
      const error =
        new Error(
          product.name +
          " does not have product variants."
        );

      error.statusCode = 400;

      throw error;
    }

    if (
      !Number.isFinite(itemPrice) ||
      itemPrice < 0
    ) {
      const error =
        new Error(
          product.name +
          " has an invalid price."
        );

      error.statusCode = 409;

      throw error;
    }

    if (
      !Number.isInteger(
        availableStock
      ) ||
      availableStock < quantity
    ) {
      const error =
        new Error(
          "There is not enough inventory available for " +
          product.name +
          (
            variantName
              ? " - " +
                variantName
              : ""
          ) +
          "."
        );

      error.statusCode = 409;
      error.code =
        "INSUFFICIENT_STOCK";

      throw error;
    }

    verifiedItems.push({
      productId:
        product.id,

      variantIndex:
        variantIndex,

      variantId:
        variantId,

      name:
        product.name,

      sku:
        itemSku,

      variantName:
        variantName,

      image:
        itemImage,

      quantity:
        quantity,

      price:
        itemPrice,

      lineTotal:
        Number(
          (
            itemPrice *
            quantity
          ).toFixed(2)
        )
    });
  }

  return verifiedItems;
}

// ============================================================
// CREATE STRIPE LINE ITEMS
// ============================================================

function buildStripeLineItems(
  verifiedItems
) {
  return verifiedItems.map(
    function (item) {
      const productData = {
        name:
          item.variantName
            ? (
                item.name +
                " - " +
                item.variantName
              )
            : item.name
      };

      if (item.image) {
        productData.images = [
          item.image
        ];
      }

      if (item.sku) {
        productData.metadata = {
          sku:
            item.sku
        };
      }

      return {
        price_data: {
          currency:
            "usd",

          product_data:
            productData,

          unit_amount:
            moneyToCents(
              item.price
            )
        },

        quantity:
          item.quantity
      };
    }
  );
}

// ============================================================
// CREATE CHECKOUT SESSION
//
// POST /create-checkout-session
// ============================================================

router.post(
  "/create-checkout-session",
  async function (
    request,
    response
  ) {
    let createdOrder = null;

    try {
      const stripe =
        getStripe();

      const settings =
        await getCheckoutSettings();

      if (!settings.storeOpen) {
        const error =
          new Error(
            settings
              .closedStoreMessage ||
            "The online shop is temporarily unavailable."
          );

        error.statusCode = 503;
        error.code =
          "STORE_CLOSED";

        throw error;
      }

      const requestBody =
        request.body || {};

      const requestedCart =
        requestBody.items ||
        requestBody.cart ||
        [];

      const customerEmail =
        cleanText(
          requestBody.email ||
          requestBody.customerEmail,
          254
        ).toLowerCase();

      if (
        customerEmail &&
        !isValidEmail(
          customerEmail
        )
      ) {
        const error =
          new Error(
            "Enter a valid email address."
          );

        error.statusCode = 400;

        throw error;
      }

      const verifiedItems =
        await buildVerifiedItems(
          requestedCart
        );

      const subtotal =
        Number(
          verifiedItems
            .reduce(
              function (
                total,
                item
              ) {
                return (
                  total +
                  item.lineTotal
                );
              },
              0
            )
            .toFixed(2)
        );

      const tax =
        Number(
          (
            subtotal *
            settings.taxRate
          ).toFixed(2)
        );

      const total =
        Number(
          (
            subtotal +
            tax
          ).toFixed(2)
        );

      createdOrder =
        await Order.createOrder({
          email:
            customerEmail,

          subtotal:
            subtotal,

          tax:
            tax,

          total:
            total,

          currency:
            "USD",

          status:
            "pending",

          paymentStatus:
            "unpaid",

          items:
            verifiedItems
        });

      const stripeLineItems =
        buildStripeLineItems(
          verifiedItems
        );

      if (tax > 0) {
        stripeLineItems.push({
          price_data: {
            currency:
              "usd",

            product_data: {
              name:
                "Sales tax"
            },

            unit_amount:
              moneyToCents(tax)
          },

          quantity:
            1
        });
      }

      const frontendUrl =
        getFrontendUrl();

      const sessionData = {
        mode:
          "payment",

        line_items:
          stripeLineItems,

        success_url:
          frontendUrl +
          "/success.html?session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          frontendUrl +
          "/cancel.html",

        client_reference_id:
          createdOrder.id,

        metadata: {
          orderId:
            createdOrder.id
        },

        payment_intent_data: {
          metadata: {
            orderId:
              createdOrder.id
          }
        }
      };

      if (customerEmail) {
        sessionData.customer_email =
          customerEmail;
      }

      const session =
        await stripe.checkout.sessions
          .create(
            sessionData,
            {
              idempotencyKey:
                "mmc-order-" +
                createdOrder.id
            }
          );

      await Order
        .updateStripeIdentifiers(
          createdOrder.id,
          {
            stripeSessionId:
              session.id,

            stripePaymentIntentId:
              typeof session.payment_intent ===
                "string"
                ? session
                    .payment_intent
                : "",

            stripeCustomerId:
              typeof session.customer ===
                "string"
                ? session.customer
                : ""
          }
        );

      return response
        .status(201)
        .json({
          sessionId:
            session.id,

          url:
            session.url,

          orderId:
            createdOrder.id
        });
    } catch (error) {
      if (createdOrder) {
        try {
          await Order.deleteOrder(
            createdOrder.id
          );
        } catch (cleanupError) {
          console.error(
            "Incomplete checkout order could not be removed:",
            cleanupError
          );
        }
      }

      return sendCheckoutError(
        response,
        error,
        "The checkout session could not be created."
      );
    }
  }
);

// ============================================================
// DECREASE INVENTORY
//
// This uses a Neon transaction and row locks to prevent two
// completed checkouts from changing the same stock record at
// exactly the same time.
// ============================================================

async function completePaidOrder(
  stripeSession
) {
  const orderId =
    cleanText(
      stripeSession.metadata &&
      stripeSession.metadata.orderId
        ? stripeSession
            .metadata
            .orderId
        : stripeSession
            .client_reference_id,
      100
    );

  if (!orderId) {
    throw new Error(
      "The Stripe session is missing its MMC order ID."
    );
  }

  const pool =
    db.pool;

  if (
    !pool ||
    typeof pool.connect !==
      "function"
  ) {
    throw new Error(
      "The Neon database pool is not available."
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const orderResult =
      await client.query(
        `
          SELECT
            id,
            items,
            status,
            payment_status
          FROM orders
          WHERE id = $1
          FOR UPDATE
        `,
        [
          orderId
        ]
      );

    if (
      orderResult.rows.length === 0
    ) {
      throw new Error(
        "The MMC order connected to this Stripe session was not found."
      );
    }

    const orderRow =
      orderResult.rows[0];

    /*
     * Stripe can resend webhook events. If the order is already
     * paid or fulfilled, return without subtracting stock again.
     */

    if (
      orderRow.payment_status ===
        "paid" ||
      orderRow.status ===
        "processing" ||
      orderRow.status ===
        "completed"
    ) {
      await client.query(
        "COMMIT"
      );

      return;
    }

    const items =
      Array.isArray(
        orderRow.items
      )
        ? orderRow.items
        : JSON.parse(
            orderRow.items ||
            "[]"
          );

    for (
      const item of items
    ) {
      const productResult =
        await client.query(
          `
            SELECT
              id,
              name,
              stock,
              variants
            FROM products
            WHERE id = $1
            FOR UPDATE
          `,
          [
            item.productId
          ]
        );

      if (
        productResult.rows.length ===
        0
      ) {
        throw new Error(
          "A purchased product could not be found during inventory processing."
        );
      }

      const productRow =
        productResult.rows[0];

      const quantity =
        cleanQuantity(
          item.quantity
        );

      const variantIndex =
        normalizeVariantIndex(
          item.variantIndex
        );

      const variants =
        Array.isArray(
          productRow.variants
        )
          ? productRow.variants
          : JSON.parse(
              productRow.variants ||
              "[]"
            );

      if (variantIndex !== null) {
        if (
          variantIndex >=
          variants.length
        ) {
          throw new Error(
            "A purchased product variant could not be found."
          );
        }

        const variant =
          variants[
            variantIndex
          ];

        const currentStock =
          Number(
            variant.stock || 0
          );

        if (
          currentStock <
          quantity
        ) {
          throw new Error(
            "Insufficient variant inventory for " +
            productRow.name +
            "."
          );
        }

        variant.stock =
          currentStock -
          quantity;

        await client.query(
          `
            UPDATE products
            SET
              variants = $1::JSONB,
              updated_at = NOW()
            WHERE id = $2
          `,
          [
            JSON.stringify(
              variants
            ),
            item.productId
          ]
        );
      } else {
        const currentStock =
          Number(
            productRow.stock || 0
          );

        if (
          currentStock <
          quantity
        ) {
          throw new Error(
            "Insufficient product inventory for " +
            productRow.name +
            "."
          );
        }

        await client.query(
          `
            UPDATE products
            SET
              stock = stock - $1,
              updated_at = NOW()
            WHERE id = $2
          `,
          [
            quantity,
            item.productId
          ]
        );
      }
    }

    await client.query(
      `
        UPDATE orders
        SET
          status = 'paid',
          payment_status = 'paid',
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
          paid_at =
            COALESCE(
              paid_at,
              NOW()
            ),
          updated_at = NOW()
        WHERE id = $4
      `,
      [
        stripeSession.id ||
        "",

        typeof stripeSession
          .payment_intent ===
          "string"
          ? stripeSession
              .payment_intent
          : "",

        typeof stripeSession
          .customer ===
          "string"
          ? stripeSession
              .customer
          : "",

        orderId
      ]
    );

    await client.query(
      "COMMIT"
    );
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// MARK CHECKOUT AS FAILED OR CANCELLED
// ============================================================

async function markCheckoutUnavailable(
  stripeSession,
  paymentStatus
) {
  const orderId =
    cleanText(
      stripeSession.metadata &&
      stripeSession.metadata.orderId
        ? stripeSession
            .metadata
            .orderId
        : stripeSession
            .client_reference_id,
      100
    );

  if (!orderId) {
    return;
  }

  await Order.updatePaymentStatus(
    orderId,
    paymentStatus,
    {
      stripeSessionId:
        stripeSession.id,

      stripePaymentIntentId:
        typeof stripeSession
          .payment_intent ===
          "string"
          ? stripeSession
              .payment_intent
          : "",

      stripeCustomerId:
        typeof stripeSession
          .customer ===
          "string"
          ? stripeSession
              .customer
          : ""
    }
  );
}

// ============================================================
// STRIPE WEBHOOK
//
// POST /stripe-webhook
//
// IMPORTANT:
// This endpoint must receive express.raw() before express.json()
// changes the request body.
// ============================================================

router.post(
  "/stripe-webhook",
  express.raw({
    type:
      "application/json"
  }),
  async function (
    request,
    response
  ) {
    try {
      const stripe =
        getStripe();

      const webhookSecret =
        process.env
          .STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        return response
          .status(503)
          .json({
            error:
              "Stripe webhook verification is not configured."
          });
      }

      const signature =
        request.headers[
          "stripe-signature"
        ];

      if (!signature) {
        return response
          .status(400)
          .json({
            error:
              "Stripe signature is missing."
          });
      }

      let stripeEvent;

      try {
        stripeEvent =
          stripe.webhooks
            .constructEvent(
              request.body,
              signature,
              webhookSecret
            );
      } catch (error) {
        console.error(
          "Stripe webhook signature verification failed:",
          error
        );

        return response
          .status(400)
          .json({
            error:
              "Stripe webhook signature verification failed."
          });
      }

      const stripeObject =
        stripeEvent
          .data
          .object;

      if (
        stripeEvent.type ===
          "checkout.session.completed" ||
        stripeEvent.type ===
          "checkout.session.async_payment_succeeded"
      ) {
        await completePaidOrder(
          stripeObject
        );
      } else if (
        stripeEvent.type ===
        "checkout.session.async_payment_failed"
      ) {
        await markCheckoutUnavailable(
          stripeObject,
          "failed"
        );
      } else if (
        stripeEvent.type ===
        "checkout.session.expired"
      ) {
        await markCheckoutUnavailable(
          stripeObject,
          "cancelled"
        );
      }

      return response.json({
        received:
          true
      });
    } catch (error) {
      console.error(
        "Stripe webhook processing failed:",
        error
      );

      return response
        .status(500)
        .json({
          error:
            "The Stripe webhook could not be processed."
        });
    }
  }
);

// ============================================================
// GET CHECKOUT SESSION
//
// GET /checkout-session/:sessionId
//
// This is used by success.html to display safe confirmation
// information. It does not complete or fulfill the order.
// ============================================================

router.get(
  "/checkout-session/:sessionId",
  async function (
    request,
    response
  ) {
    try {
      const stripe =
        getStripe();

      const sessionId =
        cleanText(
          request.params.sessionId,
          300
        );

      if (
        !sessionId ||
        !sessionId.startsWith(
          "cs_"
        )
      ) {
        return response
          .status(400)
          .json({
            error:
              "The checkout session ID is invalid."
          });
      }

      const session =
        await stripe
          .checkout
          .sessions
          .retrieve(
            sessionId
          );

      const order =
        await Order
          .getOrderByStripeSessionId(
            sessionId
          );

      return response.json({
        session: {
          id:
            session.id,

          paymentStatus:
            session.payment_status,

          status:
            session.status,

          customerEmail:
            session.customer_details &&
            session
              .customer_details
              .email
              ? session
                  .customer_details
                  .email
              : (
                  session
                    .customer_email ||
                  ""
                ),

          amountTotal:
            centsToMoney(
              session.amount_total
            ),

          currency:
            String(
              session.currency ||
              "usd"
            ).toUpperCase()
        },

        order:
          order
            ? {
                id:
                  order.id,

                status:
                  order.status,

                paymentStatus:
                  order.paymentStatus,

                total:
                  order.total,

                currency:
                  order.currency,

                createdAt:
                  order.createdAt
              }
            : null
      });
    } catch (error) {
      return sendCheckoutError(
        response,
        error,
        "The checkout confirmation could not be loaded."
      );
    }
  }
);

// ============================================================
// EXPORT CHECKOUT ROUTER
// ===========================================================