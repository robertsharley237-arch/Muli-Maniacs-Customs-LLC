// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: admin-orders.js
// ADMINISTRATOR ORDER MANAGEMENT
//
// Frontend: Vercel
// Backend: Express
// Database: Neon PostgreSQL
// Authentication: JWT
// Payments: Stripe
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var REQUEST_TIMEOUT_MILLISECONDS =
    15000;

  var orderRecords =
    [];

  var ordersRequestActive =
    false;

  // ==========================================================
  // BACKEND URL
  // ==========================================================

  function removeTrailingSlashes(
    value
  ) {
    return String(value || "")
      .trim()
      .replace(
        /\/+$/,
        ""
      );
  }

  function getBackendUrl() {
    if (
      typeof window.MMC_BACKEND_URL ===
        "string" &&
      window.MMC_BACKEND_URL.trim()
    ) {
      return removeTrailingSlashes(
        window.MMC_BACKEND_URL
      );
    }

    var savedBackendUrl =
      localStorage.getItem(
        "MMC_BACKEND_URL"
      );

    if (
      typeof savedBackendUrl ===
        "string" &&
      savedBackendUrl.trim()
    ) {
      return removeTrailingSlashes(
        savedBackendUrl
      );
    }

    if (
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1"
    ) {
      return "http://localhost:10000";
    }

    return removeTrailingSlashes(
      window.location.origin
    );
  }

  var BACKEND_URL =
    getBackendUrl();

  var ADMIN_ORDERS_API =
    BACKEND_URL +
    "/admin/orders";

  var ADMIN_SESSION_API =
    BACKEND_URL +
    "/admin/me";

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getElement(
    elementId
  ) {
    return document.getElementById(
      elementId
    );
  }

  function setText(
    elementId,
    value
  ) {
    var element =
      getElement(
        elementId
      );

    if (!element) {
      return;
    }

    element.textContent =
      value === undefined ||
      value === null
        ? ""
        : String(value);
  }

  function createOrderElement(
    tagName,
    className,
    text
  ) {
    var element =
      document.createElement(
        tagName
      );

    if (className) {
      element.className =
        className;
    }

    if (
      text !== undefined &&
      text !== null
    ) {
      element.textContent =
        String(text);
    }

    return element;
  }

  // ==========================================================
  // ADMINISTRATOR AUTHENTICATION
  // ==========================================================

  function getAdminToken() {
    return String(
      localStorage.getItem(
        "adminToken"
      ) ||
      localStorage.getItem(
        "MMC_ADMIN_TOKEN"
      ) ||
      ""
    ).trim();
  }

  function getAdminHeaders(
    includeJson
  ) {
    var headers = {
      Accept:
        "application/json",

      Authorization:
        "Bearer " +
        getAdminToken()
    };

    if (includeJson) {
      headers["Content-Type"] =
        "application/json";
    }

    return headers;
  }

  function clearAdminSession() {
    localStorage.removeItem(
      "adminToken"
    );

    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
    );

    localStorage.removeItem(
      "adminUser"
    );

    localStorage.removeItem(
      "admin_token"
    );

    localStorage.removeItem(
      "token"
    );
  }

  function redirectToAdminLogin() {
    clearAdminSession();

    window.location.replace(
      "admin-login.html?return=" +
      encodeURIComponent(
        "admin-orders.html"
      )
    );
  }

  function logoutAdmin() {
    redirectToAdminLogin();
  }

  // ==========================================================
  // FETCH WITH TIMEOUT
  // ==========================================================

  async function fetchWithTimeout(
    url,
    options
  ) {
    var controller =
      new AbortController();

    var timeoutIdentifier =
      window.setTimeout(
        function () {
          controller.abort();
        },
        REQUEST_TIMEOUT_MILLISECONDS
      );

    try {
      return await fetch(
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
    } finally {
      window.clearTimeout(
        timeoutIdentifier
      );
    }
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readResponse(
    response
  ) {
    var responseText =
      "";

    try {
      responseText =
        await response.text();
    } catch (error) {
      return {
        error:
          "The server response could not be read."
      };
    }

    if (!responseText) {
      return {};
    }

    try {
      return JSON.parse(
        responseText
      );
    } catch (error) {
      return {
        error:
          responseText
      };
    }
  }

  function getErrorMessage(
    value,
    fallbackMessage
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {
      if (
        typeof value.message ===
          "string" &&
        value.message.trim()
      ) {
        return value.message.trim();
      }

      if (
        value.error !==
        undefined
      ) {
        return getErrorMessage(
          value.error,
          fallbackMessage
        );
      }

      if (
        value.errors !==
        undefined
      ) {
        return getErrorMessage(
          value.errors,
          fallbackMessage
        );
      }
    }

    return fallbackMessage;
  }

  function getRequestErrorMessage(
    error,
    fallbackMessage
  ) {
    if (
      error &&
      error.name ===
        "AbortError"
    ) {
      return (
        "The order request took too long. " +
        "Check the backend connection and try again."
      );
    }

    if (
      error instanceof
        TypeError
    ) {
      return (
        "The order server could not be reached. " +
        "Check the backend URL and CORS settings."
      );
    }

    return getErrorMessage(
      error,
      fallbackMessage
    );
  }

  async function requestJson(
    url,
    options
  ) {
    var response =
      await fetchWithTimeout(
        url,
        options
      );

    var responseData =
      await readResponse(
        response
      );

    if (
      response.status ===
      401
    ) {
      redirectToAdminLogin();

      throw new Error(
        "Your administrator session expired."
      );
    }

    if (
      response.status ===
      403
    ) {
      throw new Error(
        getErrorMessage(
          responseData,
          "You do not have permission to manage orders."
        )
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          responseData,
          (
            "The order request failed with status " +
            response.status +
            "."
          )
        )
      );
    }

    return responseData;
  }

  // ==========================================================
  // PAGE MESSAGES
  // ==========================================================

  function showOrderMessage(
    message,
    messageType
  ) {
    var messageBox =
      getElement(
        "orders-message"
      );

    if (!messageBox) {
      return;
    }

    messageBox.textContent =
      String(message || "");

    messageBox.classList.remove(
      "orders-error",
      "orders-success",
      "orders-information"
    );

    messageBox.removeAttribute(
      "role"
    );

    if (!message) {
      return;
    }

    if (
      messageType ===
      "success"
    ) {
      messageBox.classList.add(
        "orders-success"
      );

      messageBox.setAttribute(
        "role",
        "status"
      );
    } else if (
      messageType ===
      "information"
    ) {
      messageBox.classList.add(
        "orders-information"
      );

      messageBox.setAttribute(
        "role",
        "status"
      );
    } else {
      messageBox.classList.add(
        "orders-error"
      );

      messageBox.setAttribute(
        "role",
        "alert"
      );
    }
  }

  function clearOrderMessage() {
    showOrderMessage(
      "",
      "information"
    );
  }

  // ==========================================================
  // ADMINISTRATOR INFORMATION
  // ==========================================================

  function formatAdminRole(
    role
  ) {
    return String(
      role ||
      "Administrator"
    )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  function displayAdminInformation(
    administrator
  ) {
    var username =
      String(
        administrator.username ||
        administrator.name ||
        administrator.email ||
        "Administrator"
      );

    var role =
      formatAdminRole(
        administrator.role
      );

    [
      "admin-username",
      "admin-header-username"
    ].forEach(
      function (elementId) {
        setText(
          elementId,
          username
        );
      }
    );

    [
      "admin-role",
      "admin-header-role"
    ].forEach(
      function (elementId) {
        setText(
          elementId,
          role
        );
      }
    );
  }

  async function verifyAdminSession() {
    if (!getAdminToken()) {
      redirectToAdminLogin();

      return false;
    }

    try {
      var responseData =
        await requestJson(
          ADMIN_SESSION_API,
          {
            method:
              "GET",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      var administrator =
        responseData.admin ||
        responseData.user ||
        responseData;

      if (
        !administrator ||
        typeof administrator !==
          "object"
      ) {
        throw new Error(
          "The administrator account information was not returned."
        );
      }

      localStorage.setItem(
        "adminUser",
        JSON.stringify(
          administrator
        )
      );

      displayAdminInformation(
        administrator
      );

      return true;
    } catch (error) {
      console.error(
        "Administrator verification failed.",
        error
      );

      showOrderMessage(
        getRequestErrorMessage(
          error,
          "The administrator session could not be verified."
        ),
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // NUMBER NORMALIZATION
  // ==========================================================

  function normalizeMoney(
    value
  ) {
    var amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.round(
        amount * 100
      ) / 100
    );
  }

  function normalizeQuantity(
    value
  ) {
    var quantity =
      Number(value);

    if (
      !Number.isFinite(quantity)
    ) {
      return 1;
    }

    return Math.max(
      1,
      Math.floor(quantity)
    );
  }

  // ==========================================================
  // NORMALIZE ORDER STATUS
  // ==========================================================

  function normalizeOrderStatus(
    status
  ) {
    var normalizedStatus =
      String(
        status ||
        "pending"
      )
        .trim()
        .toLowerCase()
        .replace(
          /[ -]+/g,
          "_"
        );

    var validStatuses = [
      "pending",
      "paid",
      "processing",
      "completed",
      "cancelled",
      "refunded"
    ];

    if (
      validStatuses.indexOf(
        normalizedStatus
      ) ===
      -1
    ) {
      return "pending";
    }

    return normalizedStatus;
  }

  // ==========================================================
  // NORMALIZE ORDER ITEMS
  // ==========================================================

  function normalizeOrderItem(
    item
  ) {
    var source =
      item &&
      typeof item ===
        "object"
        ? item
        : {};

    return {
      id:
        String(
          source.id ||
          source._id ||
          ""
        ),

      productId:
        String(
          source.productId ||
          source.product_id ||
          ""
        ),

      name:
        String(
          source.name ||
          source.productName ||
          source.product_name ||
          "Product"
        ),

      sku:
        String(
          source.sku ||
          ""
        ),

      variantName:
        String(
          source.variantName ||
          source.variant_name ||
          source.variant ||
          ""
        ),

      quantity:
        normalizeQuantity(
          source.quantity
        ),

      price:
        normalizeMoney(
          source.price ||
          source.unitPrice ||
          source.unit_price ||
          0
        )
    };
  }

  // ==========================================================
  // NORMALIZE ORDER
  // ==========================================================

  function normalizeOrder(
    order
  ) {
    var source =
      order &&
      typeof order ===
        "object"
        ? order
        : {};

    var rawItems;

    if (
      Array.isArray(
        source.items
      )
    ) {
      rawItems =
        source.items;
    } else if (
      Array.isArray(
        source.orderItems
      )
    ) {
      rawItems =
        source.orderItems;
    } else if (
      Array.isArray(
        source.order_items
      )
    ) {
      rawItems =
        source.order_items;
    } else {
      rawItems =
        [];
    }

    return {
      id:
        String(
          source.id ||
          source._id ||
          source.orderId ||
          source.order_id ||
          ""
        ),

      clientName:
        String(
          source.clientName ||
          source.client_name ||
          source.customerName ||
          source.customer_name ||
          source.name ||
          ""
        ),

      email:
        String(
          source.email ||
          source.clientEmail ||
          source.client_email ||
          source.customerEmail ||
          source.customer_email ||
          ""
        ),

      phone:
        String(
          source.phone ||
          source.clientPhone ||
          source.client_phone ||
          source.customerPhone ||
          source.customer_phone ||
          ""
        ),

      total:
        normalizeMoney(
          source.total ||
          source.totalAmount ||
          source.total_amount ||
          source.amountTotal ||
          source.amount_total ||
          0
        ),

      currency:
        String(
          source.currency ||
          "USD"
        ).toUpperCase(),

      status:
        normalizeOrderStatus(
          source.status ||
          source.orderStatus ||
          source.order_status ||
          source.paymentStatus ||
          source.payment_status
        ),

      paymentStatus:
        String(
          source.paymentStatus ||
          source.payment_status ||
          ""
        ),

      stripeSessionId:
        String(
          source.stripeSessionId ||
          source.stripe_session_id ||
          source.checkoutSessionId ||
          source.checkout_session_id ||
          ""
        ),

      stripePaymentIntentId:
        String(
          source.stripePaymentIntentId ||
          source.stripe_payment_intent_id ||
          source.paymentIntentId ||
          source.payment_intent_id ||
          ""
        ),

      shippingAddress:
        String(
          source.shippingAddress ||
          source.shipping_address ||
          source.address ||
          ""
        ),

      notes:
        String(
          source.notes ||
          source.orderNotes ||
          source.order_notes ||
          ""
        ),

      createdAt:
        source.createdAt ||
        source.created_at ||
        source.orderDate ||
        source.order_date ||
        null,

      updatedAt:
        source.updatedAt ||
        source.updated_at ||
        null,

      items:
        rawItems.map(
          normalizeOrderItem
        )
    };
  }

  function getOrderList(
    responseData
  ) {
    if (
      Array.isArray(
        responseData
      )
    ) {
      return responseData;
    }

    if (
      responseData &&
      Array.isArray(
        responseData.orders
      )
    ) {
      return responseData.orders;
    }

    if (
      responseData &&
      responseData.data &&
      Array.isArray(
        responseData.data.orders
      )
    ) {
      return responseData.data.orders;
    }

    return [];
  }

  // ==========================================================
  // FORMATTING HELPERS
  // ==========================================================

  function formatCurrency(
    value,
    currency
  ) {
    var amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
      amount =
        0;
    }

    var normalizedCurrency =
      String(
        currency ||
        "USD"
      ).toUpperCase();

    try {
      return new Intl.NumberFormat(
        "en-US",
        {
          style:
            "currency",

          currency:
            normalizedCurrency
        }
      ).format(amount);
    } catch (error) {
      return (
        "$" +
        amount.toFixed(2)
      );
    }
  }

  function formatOrderDate(
    value
  ) {
    if (!value) {
      return "Date unavailable";
    }

    var date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        year:
          "numeric",

        month:
          "short",

        day:
          "numeric",

        hour:
          "numeric",

        minute:
          "2-digit"
      }
    ).format(date);
  }

  function formatOrderStatus(
    status
  ) {
    return String(
      normalizeOrderStatus(
        status
      )
    )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  function safeOrderText(
    value,
    fallback
  ) {
    var text =
      String(value || "")
        .trim();

    return (
      text ||
      fallback ||
      "Not provided"
    );
  }

  // ==========================================================
  // ORDER INFORMATION ITEMS
  // ==========================================================

  function createInformationItem(
    label,
    value
  ) {
    var item =
      createOrderElement(
        "section",
        "order-information-item"
      );

    item.appendChild(
      createOrderElement(
        "h3",
        "",
        label
      )
    );

    item.appendChild(
      createOrderElement(
        "p",
        "",
        safeOrderText(
          value
        )
      )
    );

    return item;
  }

  function createEmailItem(
    email
  ) {
    var item =
      createOrderElement(
        "section",
        "order-information-item"
      );

    item.appendChild(
      createOrderElement(
        "h3",
        "",
        "Client Email"
      )
    );

    var paragraph =
      document.createElement(
        "p"
      );

    var cleanEmail =
      String(email || "")
        .trim();

    if (cleanEmail) {
      var link =
        document.createElement(
          "a"
        );

      link.href =
        "mailto:" +
        cleanEmail;

      link.textContent =
        cleanEmail;

      paragraph.appendChild(
        link
      );
    } else {
      paragraph.textContent =
        "Not provided";
    }

    item.appendChild(
      paragraph
    );

    return item;
  }

  function createPhoneItem(
    phone
  ) {
    var item =
      createOrderElement(
        "section",
        "order-information-item"
      );

    item.appendChild(
      createOrderElement(
        "h3",
        "",
        "Client Phone"
      )
    );

    var paragraph =
      document.createElement(
        "p"
      );

    var cleanPhone =
      String(phone || "")
        .trim();

    if (cleanPhone) {
      var link =
        document.createElement(
          "a"
        );

      link.href =
        "tel:" +
        cleanPhone.replace(
          /[^0-9+]/g,
          ""
        );

      link.textContent =
        cleanPhone;

      paragraph.appendChild(
        link
      );
    } else {
      paragraph.textContent =
        "Not provided";
    }

    item.appendChild(
      paragraph
    );

    return item;
  }

  // ==========================================================
  // PURCHASED ITEMS
  // ==========================================================

  function createOrderItems(
    items,
    currency
  ) {
    var section =
      createOrderElement(
        "section",
        "order-items-section"
      );

    section.appendChild(
      createOrderElement(
        "h3",
        "",
        "Purchased Items"
      )
    );

    if (!items.length) {
      section.appendChild(
        createOrderElement(
          "p",
          "",
          "No order-item details are available."
        )
      );

      return section;
    }

    var list =
      createOrderElement(
        "ul",
        "order-items-list"
      );

    items.forEach(
      function (item) {
        var listItem =
          createOrderElement(
            "li",
            "order-item"
          );

        var information =
          document.createElement(
            "div"
          );

        information.appendChild(
          createOrderElement(
            "h4",
            "",
            item.name
          )
        );

        if (item.variantName) {
          information.appendChild(
            createOrderElement(
              "p",
              "",
              (
                "Variant: " +
                item.variantName
              )
            )
          );
        }

        if (item.sku) {
          information.appendChild(
            createOrderElement(
              "p",
              "",
              (
                "SKU: " +
                item.sku
              )
            )
          );
        }

        information.appendChild(
          createOrderElement(
            "p",
            "",
            (
              "Quantity: " +
              item.quantity +
              " | Unit price: " +
              formatCurrency(
                item.price,
                currency
              )
            )
          )
        );

        var itemTotal =
          createOrderElement(
            "div",
            "order-item-total",
            formatCurrency(
              item.price *
              item.quantity,
              currency
            )
          );

        listItem.appendChild(
          information
        );

        listItem.appendChild(
          itemTotal
        );

        list.appendChild(
          listItem
        );
      }
    );

    section.appendChild(
      list
    );

    return section;
  }

  // ==========================================================
  // ORDER NOTES
  // ==========================================================

  function createOrderNotes(
    notes
  ) {
    if (
      !String(notes || "")
        .trim()
    ) {
      return null;
    }

    var section =
      createOrderElement(
        "section",
        "order-notes"
      );

    section.appendChild(
      createOrderElement(
        "h3",
        "",
        "Order Notes"
      )
    );

    section.appendChild(
      createOrderElement(
        "p",
        "",
        notes
      )
    );

    return section;
  }

  // ==========================================================
  // STATUS SELECT
  // ==========================================================

  function createStatusSelect(
    order
  ) {
    var select =
      document.createElement(
        "select"
      );

    var safeOrderId =
      order.id.replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      );

    select.id =
      "order-status-" +
      safeOrderId;

    select.setAttribute(
      "aria-label",
      (
        "Status for order " +
        order.id
      )
    );

    var statusOptions = [
      [
        "pending",
        "Pending"
      ],
      [
        "paid",
        "Paid"
      ],
      [
        "processing",
        "Processing"
      ],
      [
        "completed",
        "Completed"
      ],
      [
        "cancelled",
        "Cancelled"
      ],
      [
        "refunded",
        "Refunded"
      ]
    ];

    statusOptions.forEach(
      function (statusOption) {
        var option =
          document.createElement(
            "option"
          );

        option.value =
          statusOption[0];

        option.textContent =
          statusOption[1];

        select.appendChild(
          option
        );
      }
    );

    select.value =
      normalizeOrderStatus(
        order.status
      );

    return select;
  }

  // ==========================================================
  // CREATE ORDER CARD
  // ==========================================================

  function createOrderCard(
    order
  ) {
    var card =
      createOrderElement(
        "article",
        "order-card"
      );

    card.dataset.orderId =
      order.id;

    var cardHeader =
      createOrderElement(
        "header",
        "order-card-header"
      );

    var headingGroup =
      document.createElement(
        "div"
      );

    headingGroup.appendChild(
      createOrderElement(
        "h2",
        "",
        (
          "Order " +
          order.id
        )
      )
    );

    headingGroup.appendChild(
      createOrderElement(
        "p",
        "order-date",
        (
          "Placed: " +
          formatOrderDate(
            order.createdAt
          )
        )
      )
    );

    var statusBadge =
      createOrderElement(
        "span",
        (
          "order-status status-" +
          order.status.replace(
            /_/g,
            "-"
          )
        ),
        formatOrderStatus(
          order.status
        )
      );

    cardHeader.appendChild(
      headingGroup
    );

    cardHeader.appendChild(
      statusBadge
    );

    var cardBody =
      createOrderElement(
        "div",
        "order-card-body"
      );

    var informationGrid =
      createOrderElement(
        "div",
        "order-information-grid"
      );

    informationGrid.appendChild(
      createInformationItem(
        "Client Name",
        order.clientName
      )
    );

    informationGrid.appendChild(
      createEmailItem(
        order.email
      )
    );

    informationGrid.appendChild(
      createPhoneItem(
        order.phone
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Order Total",
        formatCurrency(
          order.total,
          order.currency
        )
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Currency",
        order.currency
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Payment Status",
        safeOrderText(
          order.paymentStatus,
          formatOrderStatus(
            order.status
          )
        )
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Stripe Session",
        order.stripeSessionId ||
        "Not available"
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Payment Intent",
        order.stripePaymentIntentId ||
        "Not available"
      )
    );

    informationGrid.appendChild(
      createInformationItem(
        "Shipping Address",
        order.shippingAddress ||
        "Not provided"
      )
    );

    cardBody.appendChild(
      informationGrid
    );

    cardBody.appendChild(
      createOrderItems(
        order.items,
        order.currency
      )
    );

    var notesSection =
      createOrderNotes(
        order.notes
      );

    if (notesSection) {
      cardBody.appendChild(
        notesSection
      );
    }

    var cardActions =
      createOrderElement(
        "footer",
        "order-card-actions"
      );

    var statusSelect =
      createStatusSelect(
        order
      );

    var statusLabel =
      createOrderElement(
        "label",
        "",
        "Order Status:"
      );

    statusLabel.htmlFor =
      statusSelect.id;

    var updateButton =
      createOrderElement(
        "button",
        "order-action-button",
        "Update Status"
      );

    updateButton.type =
      "button";

    updateButton.addEventListener(
      "click",
      function () {
        updateOrderStatus(
          order.id,
          statusSelect.value,
          updateButton
        );
      }
    );

    cardActions.appendChild(
      statusLabel
    );

    cardActions.appendChild(
      statusSelect
    );

    cardActions.appendChild(
      updateButton
    );

    card.appendChild(
      cardHeader
    );

    card.appendChild(
      cardBody
    );

    card.appendChild(
      cardActions
    );

    return card;
  }

  // ==========================================================
  // SEARCH AND FILTER
  // ==========================================================

  function orderMatchesSearch(
    order,
    searchText
  ) {
    if (!searchText) {
      return true;
    }

    var itemText =
      order.items
        .map(
          function (item) {
            return [
              item.name,
              item.sku,
              item.variantName
            ].join(" ");
          }
        )
        .join(" ");

    var searchableText = [
      order.id,
      order.clientName,
      order.email,
      order.phone,
      order.status,
      order.paymentStatus,
      order.stripeSessionId,
      order.stripePaymentIntentId,
      order.shippingAddress,
      order.notes,
      itemText
    ]
      .join(" ")
      .toLowerCase();

    return (
      searchableText.indexOf(
        searchText
      ) >=
      0
    );
  }

  function getFilteredOrders() {
    var searchInput =
      getElement(
        "order-search"
      );

    var statusFilter =
      getElement(
        "order-status-filter"
      );

    var searchText =
      searchInput
        ? searchInput.value
            .trim()
            .toLowerCase()
        : "";

    var selectedStatus =
      statusFilter
        ? statusFilter.value
        : "all";

    return orderRecords.filter(
      function (order) {
        var statusMatches =
          selectedStatus ===
            "all" ||
          order.status ===
            selectedStatus;

        return (
          statusMatches &&
          orderMatchesSearch(
            order,
            searchText
          )
        );
      }
    );
  }

  // ==========================================================
  // RENDER ORDERS
  // ==========================================================

  function renderOrders() {
    var orderList =
      getElement(
        "orderList"
      );

    if (!orderList) {
      return;
    }

    var filteredOrders =
      getFilteredOrders();

    orderList.replaceChildren();

    orderList.setAttribute(
      "aria-busy",
      "false"
    );

    if (
      filteredOrders.length ===
      0
    ) {
      var emptyMessage =
        orderRecords.length > 0
          ? "No orders match the selected search and status filters."
          : "No client orders have been found.";

      orderList.appendChild(
        createOrderElement(
          "p",
          "order-list-empty",
          emptyMessage
        )
      );

      return;
    }

    filteredOrders.forEach(
      function (order) {
        orderList.appendChild(
          createOrderCard(
            order
          )
        );
      }
    );
  }

  // ==========================================================
  // ORDER SUMMARY
  // ==========================================================

  function updateOrderSummary() {
    var summary = {
      total:
        orderRecords.length,

      pending:
        0,

      paid:
        0,

      processing:
        0,

      completed:
        0,

      cancelled:
        0,

      refunded:
        0,

      revenue:
        0
    };

    orderRecords.forEach(
      function (order) {
        if (
          order.status ===
          "pending"
        ) {
          summary.pending +=
            1;
        }

        if (
          order.status ===
          "paid"
        ) {
          summary.paid +=
            1;
        }

        if (
          order.status ===
          "processing"
        ) {
          summary.processing +=
            1;
        }

        if (
          order.status ===
          "completed"
        ) {
          summary.completed +=
            1;
        }

        if (
          order.status ===
          "cancelled"
        ) {
          summary.cancelled +=
            1;
        }

        if (
          order.status ===
          "refunded"
        ) {
          summary.refunded +=
            1;
        }

        if (
          order.status ===
            "paid" ||
          order.status ===
            "processing" ||
          order.status ===
            "completed"
        ) {
          summary.revenue +=
            normalizeMoney(
              order.total
            );
        }
      }
    );

    setText(
      "total-orders",
      summary.total
    );

    setText(
      "pending-orders",
      summary.pending
    );

    setText(
      "paid-orders",
      summary.paid
    );

    setText(
      "processing-orders",
      summary.processing
    );

    setText(
      "completed-orders",
      summary.completed
    );

    setText(
      "cancelled-orders",
      summary.cancelled
    );

    setText(
      "refunded-orders",
      summary.refunded
    );

    setText(
      "total-order-revenue",
      formatCurrency(
        summary.revenue,
        "USD"
      )
    );
  }

  // ==========================================================
  // REFRESH BUTTON
  // ==========================================================

  function setRefreshButtonLoading(
    loading
  ) {
    var refreshButton =
      getElement(
        "refresh-orders-button"
      );

    if (!refreshButton) {
      return;
    }

    refreshButton.disabled =
      Boolean(loading);

    refreshButton.setAttribute(
      "aria-busy",
      loading
        ? "true"
        : "false"
    );

    refreshButton.textContent =
      loading
        ? "Refreshing Orders..."
        : "Refresh Orders";
  }

  // ==========================================================
  // LOAD ORDERS
  // ==========================================================

  async function loadOrders() {
    if (ordersRequestActive) {
      return false;
    }

    var orderList =
      getElement(
        "orderList"
      );

    ordersRequestActive =
      true;

    setRefreshButtonLoading(
      true
    );

    showOrderMessage(
      "Loading client orders...",
      "information"
    );

    if (orderList) {
      orderList.setAttribute(
        "aria-busy",
        "true"
      );

      orderList.replaceChildren(
        createOrderElement(
          "p",
          "order-list-loading",
          "Loading client orders..."
        )
      );
    }

    try {
      var responseData =
        await requestJson(
          ADMIN_ORDERS_API,
          {
            method:
              "GET",

            headers:
              getAdminHeaders(
                false
              )
          }
        );

      orderRecords =
        getOrderList(
          responseData
        )
          .map(
            normalizeOrder
          )
          .filter(
            function (order) {
              return Boolean(
                order.id
              );
            }
          )
          .sort(
            function (
              firstOrder,
              secondOrder
            ) {
              var firstTime =
                new Date(
                  firstOrder.createdAt ||
                  0
                ).getTime();

              var secondTime =
                new Date(
                  secondOrder.createdAt ||
                  0
                ).getTime();

              if (
                !Number.isFinite(
                  firstTime
                )
              ) {
                firstTime =
                  0;
              }

              if (
                !Number.isFinite(
                  secondTime
                )
              ) {
                secondTime =
                  0;
              }

              return (
                secondTime -
                firstTime
              );
            }
          );

      updateOrderSummary();
      renderOrders();

      showOrderMessage(
        orderRecords.length ===
          1
          ? "1 client order loaded."
          : (
              orderRecords.length +
              " client orders loaded."
            ),
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Client orders could not be loaded.",
        error
      );

      orderRecords =
        [];

      updateOrderSummary();

      if (orderList) {
        orderList.setAttribute(
          "aria-busy",
          "false"
        );

        orderList.replaceChildren(
          createOrderElement(
            "p",
            "order-list-empty",
            "Client orders could not be loaded."
          )
        );
      }

      showOrderMessage(
        getRequestErrorMessage(
          error,
          "Client orders could not be loaded."
        ),
        "error"
      );

      return false;
    } finally {
      ordersRequestActive =
        false;

      setRefreshButtonLoading(
        false
      );
    }
  }

  // ==========================================================
  // UPDATE ORDER STATUS
  // ==========================================================

  async function updateOrderStatus(
    orderId,
    newStatus,
    updateButton
  ) {
    var normalizedStatus =
      normalizeOrderStatus(
        newStatus
      );

    var selectedOrder =
      orderRecords.find(
        function (order) {
          return (
            order.id ===
            orderId
          );
        }
      );

    if (!selectedOrder) {
      showOrderMessage(
        "The selected order could not be found.",
        "error"
      );

      return false;
    }

    var previousStatus =
      selectedOrder.status;

    if (
      previousStatus ===
      normalizedStatus
    ) {
      showOrderMessage(
        "The order already has that status.",
        "information"
      );

      return false;
    }

    if (updateButton) {
      updateButton.disabled =
        true;
    }

    try {
      await requestJson(
        ADMIN_ORDERS_API +
        "/" +
        orderId,
        {
          method:
            "PATCH",

          headers:
            getAdminHeaders(
              true
            ),

          body:
            JSON.stringify(
              {
                status:
                  normalizedStatus
              }
            )
        }
      );

      selectedOrder.status =
        normalizedStatus;

      updateOrderSummary();
      renderOrders();

      showOrderMessage(
        "The order status has been updated.",
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "Order status could not be updated.",
        error
      );

      showOrderMessage(
        getRequestErrorMessage(
          error,
          "The order status could not be updated."
        ),
        "error"
      );

      return false;
    } finally {
      if (updateButton) {
        updateButton.disabled =
          false;
      }
    }
  }

  // ==========================================================
  // EVENT LISTENERS
  // ==========================================================

  function addOrderEventListeners() {
    var refreshButton =
      getElement(
        "refresh-orders-button"
      );

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        loadOrders
      );
    }

    var searchInput =
      getElement(
        "order-search"
      );

    if (searchInput) {
      searchInput.addEventListener(
        "input",
        renderOrders
      );
    }

    var statusFilter =
      getElement(
        "order-status-filter"
      );

    if (statusFilter) {
      statusFilter.addEventListener(
        "change",
        renderOrders
      );
    }
  }

  // ==========================================================
  // INITIALIZATION
  // ==========================================================

  async function initializeOrdersPage() {
    var verified =
      await verifyAdminSession();

    if (!verified) {
      return;
    }

    addOrderEventListeners();
    await loadOrders();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeOrdersPage
    );
  } else {
    initializeOrdersPage();
  }
})();