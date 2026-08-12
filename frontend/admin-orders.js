// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// ADMIN ORDER MANAGEMENT
// ============================================================

(function () {
  "use strict";

  var ORDER_BACKEND_URL =
    window.MMC_BACKEND_URL ||
    window.location.origin;

  var ADMIN_ORDERS_API =
    ORDER_BACKEND_URL +
    "/admin/orders";

  var orderRecords = [];

  // ==========================================================
  // ELEMENT HELPERS
  // ==========================================================

  function getElement(elementId) {
    return document.getElementById(
      elementId
    );
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

    if (text !== undefined) {
      element.textContent =
        text;
    }

    return element;
  }

  // ==========================================================
  // ADMIN AUTHENTICATION
  // ==========================================================

  function getAdminToken() {
    return localStorage.getItem(
      "adminToken"
    );
  }

  function getAdminHeaders(
    includeJson
  ) {
    var headers = {
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
      "adminUser"
    );

    localStorage.removeItem(
      "MMC_ADMIN_TOKEN"
    );
  }

  function redirectToAdminLogin() {
    clearAdminSession();

    window.location.href =
      "admin-login.html";
  }

  function logoutAdmin() {
    redirectToAdminLogin();
  }

  // ==========================================================
  // SERVER RESPONSE
  // ==========================================================

  async function readOrderResponse(
    response
  ) {
    var data;

    try {
      data =
        await response.json();
    } catch (error) {
      data = {
        error:
          "The server returned an unexpected response."
      };
    }

    if (response.status === 401) {
      redirectToAdminLogin();

      throw new Error(
        data.error ||
        "Your administrator session expired."
      );
    }

    if (response.status === 403) {
      throw new Error(
        data.error ||
        "You do not have permission to manage orders."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        (
          "The request failed with status " +
          response.status +
          "."
        )
      );
    }

    return data;
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
      message || "";

    messageBox.classList.remove(
      "orders-error",
      "orders-success",
      "orders-information"
    );

    if (messageType === "error") {
      messageBox.classList.add(
        "orders-error"
      );
    } else if (
      messageType === "success"
    ) {
      messageBox.classList.add(
        "orders-success"
      );
    } else {
      messageBox.classList.add(
        "orders-information"
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
  // VERIFY ADMINISTRATOR
  // ==========================================================

  function formatAdminRole(role) {
    return String(role || "")
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  async function verifyAdminSession() {
    if (!getAdminToken()) {
      redirectToAdminLogin();
      return false;
    }

    try {
      var response = await fetch(
        ORDER_BACKEND_URL +
        "/admin/me",
        {
          method: "GET",
          headers:
            getAdminHeaders(false)
        }
      );

      var data =
        await readOrderResponse(
          response
        );

      var admin =
        data.admin || {};

      localStorage.setItem(
        "adminUser",
        JSON.stringify(admin)
      );

      var usernameElement =
        getElement(
          "admin-username"
        );

      var roleElement =
        getElement(
          "admin-role"
        );

      if (usernameElement) {
        usernameElement.textContent =
          admin.username || "";
      }

      if (roleElement) {
        roleElement.textContent =
          formatAdminRole(
            admin.role
          );
      }

      return true;
    } catch (error) {
      console.error(
        "Administrator verification failed:",
        error
      );

      showOrderMessage(
        error.message ||
        "The administrator session could not be verified.",
        "error"
      );

      return false;
    }
  }

  // ==========================================================
  // NORMALIZE ORDER STATUS
  // ==========================================================

  function normalizeOrderStatus(
    status
  ) {
    var normalizedStatus =
      String(status || "pending")
        .trim()
        .toLowerCase()
        .replace(/[ -]+/g, "_");

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
      ) === -1
    ) {
      return "pending";
    }

    return normalizedStatus;
  }

  // ==========================================================
  // NORMALIZE ORDER ITEMS
  // ==========================================================

  function normalizeOrderItem(item) {
    return {
      name: String(
        item.name ||
        item.productName ||
        item.product_name ||
        "Product"
      ),

      sku: String(
        item.sku || ""
      ),

      variantName: String(
        item.variantName ||
        item.variant_name ||
        ""
      ),

      quantity: Math.max(
        1,
        Number(
          item.quantity || 1
        )
      ),

      price: Math.max(
        0,
        Number(
          item.price ||
          item.unitPrice ||
          item.unit_price ||
          0
        )
      )
    };
  }

  // ==========================================================
  // NORMALIZE ORDER
  // ==========================================================

  function normalizeOrder(order) {
    var rawItems;

    if (Array.isArray(order.items)) {
      rawItems = order.items;
    } else if (
      Array.isArray(
        order.order_items
      )
    ) {
      rawItems =
        order.order_items;
    } else {
      rawItems = [];
    }

    return {
      id: String(
        order.id ||
        order._id ||
        ""
      ),

      email: String(
        order.email ||
        order.clientEmail ||
        order.client_email ||
        ""
      ),

      total: Math.max(
        0,
        Number(
          order.total ||
          order.totalAmount ||
          order.total_amount ||
          0
        )
      ),

      currency: String(
        order.currency || "USD"
      ).toUpperCase(),

      status:
        normalizeOrderStatus(
          order.status ||
          order.payment_status
        ),

      stripeSessionId: String(
        order.stripeSessionId ||
        order.stripe_session_id ||
        ""
      ),

      createdAt:
        order.createdAt ||
        order.created_at ||
        null,

      items:
        rawItems.map(
          normalizeOrderItem
        )
    };
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

    if (!Number.isFinite(amount)) {
      amount = 0;
    }

    try {
      return new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency:
            String(
              currency || "USD"
            ).toUpperCase()
        }
      ).format(amount);
    } catch (error) {
      return (
        "$" +
        amount.toFixed(2)
      );
    }
  }

  function formatOrderDate(value) {
    if (!value) {
      return "Date unavailable";
    }

    var date =
      new Date(value);

    if (
      isNaN(
        date.getTime()
      )
    ) {
      return "Date unavailable";
    }

    return date.toLocaleString();
  }

  function formatOrderStatus(status) {
    return String(
      status || "pending"
    )
      .replace(/_/g, " ")
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
      String(value || "").trim();

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
        safeOrderText(value)
      )
    );

    return item;
  }

  function createEmailItem(email) {
    var item =
      createOrderElement(
        "section",
        "order-information-item"
      );

    var heading =
      createOrderElement(
        "h3",
        "",
        "Client Email"
      );

    var paragraph =
      document.createElement("p");

    item.appendChild(heading);

    if (email) {
      var link =
        document.createElement("a");

      link.href =
        "mailto:" + email;

      link.textContent =
        email;

      paragraph.appendChild(link);
    } else {
      paragraph.textContent =
        "Not provided";
    }

    item.appendChild(paragraph);

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
          document.createElement("div");

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

    section.appendChild(list);

    return section;
  }

  // ==========================================================
  // STATUS SELECT
  // ==========================================================

  function createStatusSelect(order) {
    var select =
      document.createElement(
        "select"
      );

    select.setAttribute(
      "aria-label",
      "Status for order " +
      order.id
    );

    var statusOptions = [
      ["pending", "Pending"],
      ["paid", "Paid"],
      ["processing", "Processing"],
      ["completed", "Completed"],
      ["cancelled", "Cancelled"],
      ["refunded", "Refunded"]
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
      order.status;

    return select;
  }

  // ==========================================================
  // CREATE ORDER CARD
  // ==========================================================

  function createOrderCard(order) {
    var card =
      createOrderElement(
        "article",
        "order-card"
      );

    var cardHeader =
      createOrderElement(
        "header",
        "order-card-header"
      );

    var headingGroup =
      document.createElement("div");

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
          order.status
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
      createEmailItem(
        order.email
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
        "Stripe Session",
        order.stripeSessionId ||
        "Not available"
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

    var cardActions =
      createOrderElement(
        "footer",
        "order-card-actions"
      );

    var statusSelect =
      createStatusSelect(order);

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
      order.email,
      order.status,
      order.stripeSessionId,
      itemText
    ]
      .join(" ")
      .toLowerCase();

    return (
      searchableText.indexOf(
        searchText
      ) >= 0
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
          selectedStatus === "all" ||
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

    if (!filteredOrders.length) {
      var emptyMessage =
        orderRecords.length
          ? "No orders match the selected filters."
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
          createOrderCard(order)
        );
      }
    );
  }

  // ==========================================================
  // ORDER SUMMARY
  // ==========================================================

  function updateOrderSummary() {
    var paidCount = 0;
    var processingCount = 0;
    var totalRevenue = 0;

    orderRecords.forEach(
      function (order) {
        if (order.status === "paid") {
          paidCount++;
          totalRevenue += order.total;
        } else if (
          order.status === "processing"
        ) {
          processingCount++;
        }
    });

    var paidElement = getElement('orders-paid-count');
    var processingElement = getElement('orders-processing-count');
    var revenueElement = getElement('orders-total-revenue');

    if (paidElement) {
      paidElement.textContent = String(paidCount);
    }

    if (processingElement) {
      processingElement.textContent = String(processingCount);
    }

    if (revenueElement) {
      revenueElement.textContent = formatCurrency(totalRevenue, 'USD');
    }
  }

})();