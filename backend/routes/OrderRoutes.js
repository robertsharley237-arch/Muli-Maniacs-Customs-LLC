// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: routes/OrderRoutes.js
// ADMINISTRATOR ORDER MANAGEMENT ROUTES
// NEON POSTGRESQL
// ============================================================

"use strict";

const express =
  require("express");

const Order =
  require("../models/Order");

const requireAdmin =
  require("../middleware/requireAdmin");

const requireSuperAdmin =
  require("../middleware/requireSuperAdmin");

const router =
  express.Router();

// ============================================================
// HELPERS
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

function getPagination(request) {
  const requestedLimit =
    Number(
      request.query.limit ||
      250
    );

  const requestedOffset =
    Number(
      request.query.offset ||
      0
    );

  return {
    limit:
      Math.min(
        1000,
        Math.max(
          1,
          Math.floor(
            Number.isFinite(
              requestedLimit
            )
              ? requestedLimit
              : 250
          )
        )
      ),

    offset:
      Math.max(
        0,
        Math.floor(
          Number.isFinite(
            requestedOffset
          )
            ? requestedOffset
            : 0
        )
      )
  };
}

function sendOrderError(
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
          "The order ID is invalid."
      });
  }

  if (
    error.code === "23514"
  ) {
    return response
      .status(400)
      .json({
        error:
          "One or more order values are invalid."
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
        undefined,

      validationErrors:
        error.validationErrors ||
        undefined
    });
}

// ============================================================
// ADMIN: GET ORDERS
//
// GET /admin/orders
//
// Query examples:
// ?search=example@email.com
// ?status=processing
// ?limit=100
// ?offset=0
// ============================================================

router.get(
  "/admin/orders",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const search =
        cleanText(
          request.query.search,
          300
        );

      const status =
        cleanText(
          request.query.status,
          30
        )
          .toLowerCase()
          .replace(
            /[ -]+/g,
            "_"
          );

      const pagination =
        getPagination(request);

      let orders;

      if (search) {
        orders =
          await Order.searchOrders(
            search,
            pagination
          );
      } else if (
        status &&
        status !== "all"
      ) {
        orders =
          await Order
            .getOrdersByStatus(
              status,
              pagination
            );
      } else {
        orders =
          await Order.getAllOrders(
            pagination
          );
      }

      return response.json({
        orders:
          orders,

        pagination:
          pagination
      });
    } catch (error) {
      return sendOrderError(
        response,
        error,
        "Orders could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: ORDER SUMMARY
//
// GET /admin/orders/summary
// ============================================================

router.get(
  "/admin/orders/summary",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const summary =
        await Order
          .getOrderSummary();

      return response.json({
        summary:
          summary
      });
    } catch (error) {
      return sendOrderError(
        response,
        error,
        "Order totals could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: ORDER STATUS COUNTS
//
// GET /admin/orders/status-counts
// ============================================================

router.get(
  "/admin/orders/status-counts",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const statuses =
        await Order
          .countOrdersByStatus();

      return response.json({
        statuses:
          statuses
      });
    } catch (error) {
      return sendOrderError(
        response,
        error,
        "Order status totals could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: REVENUE
//
// GET /admin/orders/revenue?currency=USD
// ============================================================

router.get(
  "/admin/orders/revenue",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const revenue =
        await Order
          .calculateRevenue(
            request.query.currency ||
            "USD"
          );

      return response.json({
        revenue:
          revenue
      });
    } catch (error) {
      return sendOrderError(
        response,
        error,
        "Revenue could not be calculated."
      );
    }
  }
);

// ============================================================
// ADMIN: GET ORDER BY STRIPE SESSION
//
// GET /admin/orders/stripe-session/:sessionId
// ============================================================

router.get(
  "/admin/orders/stripe-session/:sessionId",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const order =
        await Order
          .getOrderByStripeSessionId(
            request.params.sessionId
          );

      if (!order) {
        return response
          .status(404)
          .json({
            error:
              "Order not found."
          });
      }

      return response.json({
        order:
          order
      });
    } catch (error) {
      return sendOrderError(
        response,
        error,
        "The order could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: GET ORDER BY ID
//
// GET /admin/orders/:id
// ============================================================

router.get(
  "/admin/orders/:id",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const order =
        await Order
          .getOrderById(
            request.params.id
          );

      if (!order) {
        return response
          .status(404)
          .json({
            error:
              "Order not found."
          });
      }

      return response.json({
        order:
          order
      });
    } catch (error) {
      return sendOrderError(
        response,
        error,
        "The order could not be loaded."
      );
    }
  }
);

// ============================================================
// ADMIN: UPDATE ORDER STATUS
//
// PATCH /admin/orders/:id/status
//
// Body:
// {
//   "status": "processing"
// }
// ============================================================

router.patch(
  "/admin/orders/:id/status",
  requireAdmin,
  async function (
    request,
    response
  ) {
    try {
      const status =
        cleanText(
          request.body.status,
          30
        )
          .toLowerCase()
          .replace(
            /[ -]+/g,
            "_"
          );

      if (
        !Order
          .ALLOWED_ORDER_STATUSES
          .includes(status)
      ) {
        return response
          .status(400)
          .json({
            error:
              "The selected order status is invalid."
          });
      }

      const order =
        await Order
          .updateOrderStatus(
            request.params.id,
            status
          );

      if (!order) {
        return response
          .status(404)
          .json({
            error:
              "Order not found."
          });
      }

      return response.json({
        message:
          "Order status updated successfully.",

        order:
          order
      });
    } catch (error) {
      return sendOrderError(
        response,
        error,
        "The order status could not be updated."
      );
    }
  }
);

// ============================================================
// SUPER ADMIN: UPDATE PAYMENT STATUS
//
// PATCH /admin/orders/:id/payment-status
//
// Body:
// {
//   "paymentStatus": "refunded"
// }
// ============================================================

router.patch(
  "/admin/orders/:id/payment-status",
  requireSuperAdmin,
  async function (
    request,
    response
  ) {
    try {
      const paymentStatus =
        cleanText(
          request.body
            .paymentStatus ||
          request.body
            .payment_status,
          30
        )
          .toLowerCase()
          .replace(
            /[ -]+/g,
            "_"
          );

      if (
        !Order
          .ALLOWED_PAYMENT_STATUSES
          .includes(
            paymentStatus
          )
      ) {
        return response
          .status(400)
          .json({
            error:
              "The selected payment status is invalid."
          });
      }

      const order =
        await Order
          .updatePaymentStatus(
            request.params.id,
            paymentStatus,
            request.body
          );

      if (!order) {
        return response
          .status(404)
          .json({
            error:
              "Order not found."
          });
      }

      return response.json({
        message:
          "Payment status updated successfully.",

        order:
          order
      });
    } catch (error) {
      return sendOrderError(
        response,
        error,
        "The payment status could not be updated."
      );
    }
  }
);

// ============================================================
// SUPER ADMIN: DELETE ORDER
//
// DELETE /admin/orders/:id
//
// Paid orders should normally be retained for business records.
// ============================================================

router.delete(
  "/admin/orders/:id",
  requireSuperAdmin,
  async function (
    request,
    response
  ) {
    try {
      const existingOrder =
        await Order
          .getOrderById(
            request.params.id
          );

      if (!existingOrder) {
        return response
          .status(404)
          .json({
            error:
              "Order not found."
          });
      }

      if (
        existingOrder
          .paymentStatus ===
        "paid"
      ) {
        return response
          .status(409)
          .json({
            error:
              "Paid orders cannot be deleted. Mark the order as refunded or cancelled instead."
          });
      }

      const order =
        await Order.deleteOrder(
          request.params.id
        );

      return response.json({
        message:
          "Order deleted successfully.",

        order:
          order
      });
    } catch (error) {
      return sendOrderError(
        response,
        error,
        "The order could not be deleted."
      );
    }
  }
);

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;