// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// CHECKOUT PAGE
//
// Hosting: Vercel
// Database: Neon PostgreSQL
// Payments: Stripe Checkout
// Inventory: Product and variant support
// ============================================================

const CHECKOUT_BACKEND_URL =
  window.MMC_BACKEND_URL ||
  window.location.origin;

const CHECKOUT_SESSION_API =
  `${CHECKOUT_BACKEND_URL}/create-checkout-session`;

const CART_STORAGE_KEY = "cart";

let checkoutCart = [];

// ============================================================
// CART HELPERS
// ============================================================

function loadCheckoutCart() {
  try {
    const savedCart =
      localStorage.getItem(
        CART_STORAGE_KEY
      );

    const parsedCart =
      savedCart
        ? JSON.parse(savedCart)
        : [];

    checkoutCart =
      Array.isArray(parsedCart)
        ? parsedCart
            .map(normalizeCartItem)
            .filter(Boolean)
        : [];
  } catch (error) {
    console.error(
      "Could not load the cart:",
      error
    );

    checkoutCart = [];
  }

  return checkoutCart;
}

function normalizeCartItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const productId =
    item.id ||
    item._id ||
    item.productId;

  if (!productId) {
    return null;
  }

  const quantity =
    Number.isInteger(
      Number(item.quantity)
    ) &&
    Number(item.quantity) > 0
      ? Number(item.quantity)
      : 1;

  const price =
    Number(item.price);

  return {
    id: String(productId),

    name: String(
      item.name ||
      "Unnamed Product"
    ),

    price:
      Number.isFinite(price) &&
      price >= 0
        ? price
        : 0,

    quantity,

    image: String(
      item.image || ""
    ),

    sku: String(
      item.sku || ""
    ),

    variantName: String(
      item.variantName || ""
    ),

    variantId:
      item.variantId !== undefined &&
      item.variantId !== null
        ? String(item.variantId)
        : null,

    variantIndex:
      item.variantIndex !== undefined &&
      item.variantIndex !== null &&
      Number.isInteger(
        Number(item.variantIndex)
      )
        ? Number(item.variantIndex)
        : null
  };
}

function saveCheckoutCart() {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(checkoutCart)
  );
}

function getCartQuantity() {
  return checkoutCart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );
}

function getCartSubtotal() {
  return checkoutCart.reduce(
    (total, item) =>
      total +
      item.price *
      item.quantity,
    0
  );
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

function formatCurrency(value) {
  const amount = Number(value);

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD"
    }
  ).format(
    Number.isFinite(amount)
      ? amount
      : 0
  );
}

function createCheckoutElement(
  tagName,
  options = {}
) {
  const element =
    document.createElement(tagName);

  if (options.className) {
    element.className =
      options.className;
  }

  if (options.text !== undefined) {
    element.textContent =
      options.text;
  }

  if (options.type) {
    element.type =
      options.type;
  }

  return element;
}

function appendCheckoutInformation(
  container,
  label,
  value
) {
  const paragraph =
    createCheckoutElement("p");

  const strong =
    createCheckoutElement(
      "strong",
      {
        text: `${label}: `
      }
    );

  paragraph.appendChild(strong);

  paragraph.appendChild(
    document.createTextNode(
      String(value)
    )
  );

  container.appendChild(paragraph);
}

// ============================================================
// RENDER CHECKOUT
// ============================================================

function renderCheckout() {
  const container =
    document.getElementById(
      "checkout-items"
    );

  const itemCountElement =
    document.getElementById(
      "checkout-item-count"
    );

  const subtotalElement =
    document.getElementById(
      "checkout-subtotal"
    );

  const totalElement =
    document.getElementById(
      "checkout-total"
    );

  const purchaseButton =
    document.getElementById(
      "complete-purchase-button"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (checkoutCart.length === 0) {
    const emptyMessage =
      createCheckoutElement(
        "div",
        {
          className:
            "empty-checkout",
          text:
            "Your cart is empty. Add products before continuing to checkout."
        }
      );

    container.appendChild(
      emptyMessage
    );

    if (itemCountElement) {
      itemCountElement.textContent =
        "0";
    }

    if (subtotalElement) {
      subtotalElement.textContent =
        formatCurrency(0);
    }

    if (totalElement) {
      totalElement.textContent =
        formatCurrency(0);
    }

    if (purchaseButton) {
      purchaseButton.disabled = true;
    }

    return;
  }

  checkoutCart.forEach(
    (item, index) => {
      container.appendChild(
        createCheckoutRow(
          item,
          index
        )
      );
    }
  );

  const itemCount =
    getCartQuantity();

  const subtotal =
    getCartSubtotal();

  if (itemCountElement) {
    itemCountElement.textContent =
      String(itemCount);
  }

  if (subtotalElement) {
    subtotalElement.textContent =
      formatCurrency(subtotal);
  }

  if (totalElement) {
    totalElement.textContent =
      formatCurrency(subtotal);
  }

  if (purchaseButton) {
    purchaseButton.disabled = false;
  }
}

// ============================================================
// CREATE CHECKOUT ITEM
// ============================================================

function createCheckoutRow(
  item,
  itemIndex
) {
  const row =
    createCheckoutElement(
      "article",
      {
        className: "checkout-row"
      }
    );

  if (item.image) {
    const image =
      document.createElement("img");

    image.src = item.image;
    image.alt =
      `${item.name} product image`;

    image.className =
      "checkout-img";

    image.loading = "lazy";

    image.addEventListener(
      "error",
      () => {
        image.remove();
      }
    );

    row.appendChild(image);
  } else {
    const imagePlaceholder =
      createCheckoutElement(
        "div",
        {
          className:
            "checkout-img"
        }
      );

    imagePlaceholder.setAttribute(
      "aria-label",
      "No product image available"
    );

    row.appendChild(
      imagePlaceholder
    );
  }

  const information =
    createCheckoutElement(
      "div",
      {
        className:
          "checkout-info"
      }
    );

  information.appendChild(
    createCheckoutElement(
      "h2",
      {
        text: item.name
      }
    )
  );

  if (item.variantName) {
    appendCheckoutInformation(
      information,
      "Variant",
      item.variantName
    );
  }

  if (item.sku) {
    appendCheckoutInformation(
      information,
      "SKU",
      item.sku
    );
  }

  appendCheckoutInformation(
    information,
    "Price",
    formatCurrency(item.price)
  );

  const quantityField =
    createQuantityField(
      item,
      itemIndex
    );

  information.appendChild(
    quantityField
  );

  const removeButton =
    createCheckoutElement(
      "button",
      {
        className:
          "checkout-remove-button",
        text: "Remove",
        type: "button"
      }
    );

  removeButton.addEventListener(
    "click",
    () => {
      removeCheckoutItem(
        itemIndex
      );
    }
  );

  information.appendChild(
    removeButton
  );

  row.appendChild(information);

  const itemTotal =
    item.price *
    item.quantity;

  const priceDisplay =
    createCheckoutElement(
      "div",
      {
        className:
          "checkout-item-price",
        text:
          formatCurrency(itemTotal)
      }
    );

  row.appendChild(priceDisplay);

  return row;
}

// ============================================================
// QUANTITY CONTROL
// ============================================================

function createQuantityField(
  item,
  itemIndex
) {
  const wrapper =
    createCheckoutElement(
      "div",
      {
        className:
          "checkout-quantity-field"
      }
    );

  const label =
    createCheckoutElement(
      "label",
      {
        text: "Quantity: "
      }
    );

  const input =
    document.createElement("input");

  input.type = "number";
  input.min = "1";
  input.step = "1";
  input.value =
    String(item.quantity);

  input.setAttribute(
    "aria-label",
    `Quantity for ${item.name}`
  );

  input.addEventListener(
    "change",
    () => {
      updateCheckoutQuantity(
        itemIndex,
        input.value
      );
    }
  );

  label.appendChild(input);
  wrapper.appendChild(label);

  return wrapper;
}

function updateCheckoutQuantity(
  itemIndex,
  newQuantity
) {
  const quantity =
    Number(newQuantity);

  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    showCheckoutMessage(
      "Quantity must be a whole number of 1 or higher.",
      "error"
    );

    renderCheckout();
    return;
  }

  if (!checkoutCart[itemIndex]) {
    return;
  }

  checkoutCart[itemIndex].quantity =
    quantity;

  saveCheckoutCart();
  clearCheckoutMessage();
  renderCheckout();
}

function removeCheckoutItem(
  itemIndex
) {
  const item =
    checkoutCart[itemIndex];

  if (!item) {
    return;
  }

  const confirmed =
    window.confirm(
      `Remove "${item.name}" from your cart?`
    );

  if (!confirmed) {
    return;
  }

  checkoutCart.splice(
    itemIndex,
    1
  );

  saveCheckoutCart();
  clearCheckoutMessage();
  renderCheckout();
}

// ============================================================
// CHECKOUT MESSAGE
// ============================================================

function showCheckoutMessage(
  message,
  type = "information"
) {
  const messageElement =
    document.getElementById(
      "checkout-message"
    );

  if (!messageElement) {
    if (type === "error") {
      alert(message);
    }

    return;
  }

  messageElement.textContent =
    message;

  messageElement.classList.remove(
    "checkout-error",
    "checkout-success",
    "checkout-information"
  );

  if (type === "error") {
    messageElement.classList.add(
      "checkout-error"
    );
  } else if (
    type === "success"
  ) {
    messageElement.classList.add(
      "checkout-success"
    );
  } else {
    messageElement.classList.add(
      "checkout-information"
    );
  }
}

function clearCheckoutMessage() {
  const messageElement =
    document.getElementById(
      "checkout-message"
    );

  if (!messageElement) {
    return;
  }

  messageElement.textContent = "";

  messageElement.classList.remove(
    "checkout-error",
    "checkout-success",
    "checkout-information"
  );
}

// ============================================================
// VALIDATION
// ============================================================

function getCheckoutEmail() {
  const emailInput =
    document.getElementById(
      "checkout-email"
    );

  return emailInput
    ? emailInput.value.trim()
    : "";
}

function isValidEmail(email) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function validateCheckoutCart() {
  if (checkoutCart.length === 0) {
    return (
      "Your cart is empty. Add a product before checking out."
    );
  }

  for (const item of checkoutCart) {
    if (!item.id) {
      return (
        "A cart item is missing its product ID. Remove the item and add it again."
      );
    }

    if (
      !Number.isFinite(item.price) ||
      item.price < 0
    ) {
      return (
        `${item.name} has an invalid price. ` +
        "Remove the item and add it again."
      );
    }

    if (
      !Number.isInteger(
        item.quantity
      ) ||
      item.quantity < 1
    ) {
      return (
        `${item.name} has an invalid quantity.`
      );
    }

    if (
      item.variantName &&
      item.variantIndex === null
    ) {
      return (
        `${item.name} (${item.variantName}) is missing its variant index. ` +
        "Remove this item and add it to the cart again after the product page is updated."
      );
    }
  }

  const email =
    getCheckoutEmail();

  if (!isValidEmail(email)) {
    return (
      "Please enter a valid email address."
    );
  }

  return "";
}

// ============================================================
// BUILD BACKEND CART
// ============================================================

function buildCheckoutCart() {
  return checkoutCart.map(
    (item) => {
      const checkoutItem = {
        id: item.id,
        name: item.name,
        quantity: item.quantity
      };

      if (
        item.variantIndex !== null
      ) {
        checkoutItem.variantIndex =
          item.variantIndex;

        checkoutItem.variantName =
          item.variantName;
      }

      return checkoutItem;
    }
  );
}

// ============================================================
// STRIPE CHECKOUT
// ============================================================

async function startCheckout() {
  clearCheckoutMessage();

  const validationError =
    validateCheckoutCart();

  if (validationError) {
    showCheckoutMessage(
      validationError,
      "error"
    );

    return;
  }

  const purchaseButton =
    document.getElementById(
      "complete-purchase-button"
    );

  try {
    if (purchaseButton) {
      purchaseButton.disabled = true;

      purchaseButton.textContent =
        "Preparing Secure Checkout...";
    }

    showCheckoutMessage(
      "Confirming products and inventory...",
      "information"
    );

    const response = await fetch(
      CHECKOUT_SESSION_API,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          cart:
            buildCheckoutCart(),

          customerEmail:
            getCheckoutEmail() ||
            null
        })
      }
    );

    const data =
      await readCheckoutResponse(
        response
      );

    if (!data.url) {
      throw new Error(
        "Stripe did not provide a checkout address."
      );
    }

    showCheckoutMessage(
      "Redirecting to secure Stripe checkout...",
      "success"
    );

    window.location.href =
      data.url;
  } catch (error) {
    console.error(
      "Checkout failed:",
      error
    );

    showCheckoutMessage(
      error.message ||
      "Checkout could not be started. Please try again.",
      "error"
    );

    if (purchaseButton) {
      purchaseButton.disabled =
        checkoutCart.length === 0;

      purchaseButton.textContent =
        "Continue to Secure Payment";
    }
  }
}

async function readCheckoutResponse(
  response
) {
  let data;

  try {
    data = await response.json();
  } catch (error) {
    data = {
      error:
        "The server returned an unexpected response."
    };
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Checkout failed with status ${response.status}.`
    );
  }

  return data;
}

// ============================================================
// PAGE STARTUP
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadCheckoutCart();
    renderCheckout();

    const purchaseButton =
      document.getElementById(
        "complete-purchase-button"
      );

    if (purchaseButton) {
      purchaseButton.addEventListener(
        "click",
        startCheckout
      );
    }
  }
);

// ============================================================
// SUPPORT OLD INLINE HTML CALLS
// ============================================================

window.checkout =
  startCheckout;

window.renderCheckout =
  renderCheckout;