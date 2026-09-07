// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: homepage.js
// HOMEPAGE MINI CART
//
// Purpose:
// - Display homepage mini cart
// - Update cart badges
// - Display cart selections
// - Show quantities, variants, prices, subtotal
// - Link customers to cart and checkout
// ============================================================

(function () {

  "use strict";


  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  var CART_STORAGE_KEY =
    "cart";

  var MAXIMUM_VISIBLE_ITEMS =
    3;



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



  function createTextElement(
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


    element.textContent =
      text === undefined ||
      text === null
        ? ""
        : String(text);


    return element;

  }



  function createActionLink(
    destination,
    className,
    text
  ) {

    var link =
      document.createElement(
        "a"
      );


    link.href =
      destination;


    link.className =
      className;


    link.textContent =
      text;


    return link;

  }



  // ==========================================================
  // CART ITEM HELPERS
  // ==========================================================

  function getItemQuantity(
    item
  ) {

    var quantity =
      Number(
        item &&
        item.quantity
      );


    if (
      !Number.isFinite(quantity) ||
      quantity < 1
    ) {

      return 1;

    }


    return Math.floor(
      quantity
    );

  }



  function getItemPrice(
    item
  ) {

    var price =
      Number(
        item &&
        item.price
      );


    if (
      !Number.isFinite(price) ||
      price < 0
    ) {

      return 0;

    }


    return price;

  }



  function getItemName(
    item
  ) {

    return (
      item &&
      item.name
    )

      ? String(
          item.name
        )

      : "Custom Product";

  }



  function getItemVariantName(
    item
  ) {

    if (
      !item
    ) {

      return "";

    }


    return String(
      item.variantName ||
      item.variant ||
      ""
    );

  }



  function getItemSku(
    item
  ) {

    return (
      item &&
      item.sku
    )

      ? String(
          item.sku
        )

      : "";

  }



  function getItemImage(
    item
  ) {

    return (
      item &&
      item.image
    )

      ? String(
          item.image
        )

      : "";

  }



  // ==========================================================
  // CURRENCY FORMAT
  // ==========================================================

  function formatCurrency(
    value
  ) {

    var amount =
      Number(
        value
      );


    if (
      !Number.isFinite(amount)
    ) {

      amount = 0;

    }


    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          "USD"
      }
    ).format(
      amount
    );

  }
  // ==========================================================
// LOAD STORED CART
// ==========================================================

function loadStoredCart() {

  try {

    var savedCart =
      localStorage.getItem(
        CART_STORAGE_KEY
      );


    if (!savedCart) {

      return [];

    }


    var parsedCart =
      JSON.parse(
        savedCart
      );


    if (
      !Array.isArray(
        parsedCart
      )
    ) {

      return [];

    }


    return parsedCart.filter(
      function(item){

        return (
          item &&
          typeof item === "object"
        );

      }
    );


  } catch(error) {


    console.error(
      "MMC cart loading failed:",
      error
    );


    return [];

  }

}



// ==========================================================
// CART TOTALS
// ==========================================================

function getTotalQuantity(
  cart
) {

  return cart.reduce(
    function(
      total,
      item
    ){

      return (
        total +
        getItemQuantity(
          item
        )
      );

    },
    0
  );

}



function getCartSubtotal(
  cart
) {

  return cart.reduce(
    function(
      total,
      item
    ){

      return (
        total +
        (
          getItemPrice(
            item
          ) *
          getItemQuantity(
            item
          )
        )
      );

    },
    0
  );

}



// ==========================================================
// UPDATE CART BADGES
// ==========================================================

function updateCartCount(
  totalQuantity
) {


  var badges =
    document.querySelectorAll(
      "#cart-count, [data-cart-count]"
    );



  var label =
    totalQuantity === 1

      ? "1 item in cart"

      : String(
          totalQuantity
        ) +
        " items in cart";



  badges.forEach(
    function(
      badge
    ){

      badge.textContent =
        String(
          totalQuantity
        );


      badge.setAttribute(
        "aria-label",
        label
      );


      badge.dataset.cartQuantity =
        String(
          totalQuantity
        );

    }
  );

}



// ==========================================================
// MINI CART IMAGE
// ==========================================================

function createMiniCartImage(
  item
) {

  var imageUrl =
    getItemImage(
      item
    );


  if (
    !imageUrl
  ) {

    return null;

  }



  var wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "mini-cart-item-image-container";



  var image =
    document.createElement(
      "img"
    );


  image.className =
    "mini-cart-item-image";


  image.src =
    imageUrl;


  image.alt =
    getItemName(
      item
    );


  image.loading =
    "lazy";



  image.onerror =
    function(){

      wrapper.remove();

    };



  wrapper.appendChild(
    image
  );


  return wrapper;

}



// ==========================================================
// CREATE MINI CART ITEM
// ==========================================================

function createMiniCartItem(
  item
) {

  var article =
    document.createElement(
      "article"
    );


  article.className =
    "mini-cart-item";



  var image =
    createMiniCartImage(
      item
    );



  if(image){

    article.appendChild(
      image
    );

  }



  var content =
    document.createElement(
      "div"
    );


  content.className =
    "mini-cart-item-content";



  var quantity =
    getItemQuantity(
      item
    );


  var price =
    getItemPrice(
      item
    );


  var variant =
    getItemVariantName(
      item
    );


  var sku =
    getItemSku(
      item
    );



  content.appendChild(
    createTextElement(
      "h3",
      "mini-cart-item-name",
      getItemName(
        item
      )
    )
  );



  if(variant){

    content.appendChild(
      createTextElement(
        "p",
        "mini-cart-item-variant",
        "Variant: " +
        variant
      )
    );

  }



  if(sku){

    content.appendChild(
      createTextElement(
        "p",
        "mini-cart-item-sku",
        "SKU: " +
        sku
      )
    );

  }



  content.appendChild(
    createTextElement(
      "p",
      "mini-cart-item-details",
      quantity +
      " × " +
      formatCurrency(
        price
      )
    )
  );



  content.appendChild(
    createTextElement(
      "p",
      "mini-cart-item-total",
      "Total: " +
      formatCurrency(
        price * quantity
      )
    )
  );



  article.appendChild(
    content
  );



  return article;

}
// ==========================================================
// EMPTY CART DISPLAY
// ==========================================================

function displayEmptyMiniCart(
  container
) {

  var emptyState =
    document.createElement(
      "div"
    );


  emptyState.className =
    "mini-cart-empty-state";



  emptyState.appendChild(
    createTextElement(
      "p",
      "mini-cart-empty",
      "Your cart is currently empty."
    )
  );



  emptyState.appendChild(
    createActionLink(
      "shop.html",
      "mini-cart-link",
      "Browse the Shop"
    )
  );



  container.appendChild(
    emptyState
  );

}



// ==========================================================
// ADDITIONAL ITEMS MESSAGE
// ==========================================================

function displayAdditionalItems(
  container,
  cart
) {

  if (
    cart.length <=
    MAXIMUM_VISIBLE_ITEMS
  ) {

    return;

  }



  var extraItems =
    cart.length -
    MAXIMUM_VISIBLE_ITEMS;



  container.appendChild(
    createTextElement(
      "p",
      "mini-cart-more-items",
      "+" +
      extraItems +
      (
        extraItems === 1
          ? " more cart selection"
          : " more cart selections"
      )
    )
  );

}



// ==========================================================
// MINI CART SUMMARY
// ==========================================================

function displayMiniCartSummary(
  container,
  cart
) {

  var quantity =
    getTotalQuantity(
      cart
    );


  var subtotal =
    getCartSubtotal(
      cart
    );



  var summary =
    document.createElement(
      "div"
    );


  summary.className =
    "mini-cart-summary";



  summary.appendChild(
    createTextElement(
      "p",
      "mini-cart-quantity",
      quantity === 1
        ? "1 item in your cart."
        : quantity +
          " items in your cart."
    )
  );



  summary.appendChild(
    createTextElement(
      "p",
      "mini-cart-subtotal",
      "Subtotal: " +
      formatCurrency(
        subtotal
      )
    )
  );



  var actions =
    document.createElement(
      "div"
    );


  actions.className =
    "mini-cart-actions";



  actions.appendChild(
    createActionLink(
      "cart.html",
      "mini-cart-link",
      "View Full Cart"
    )
  );



  actions.appendChild(
    createActionLink(
      "checkout.html",
      "mini-cart-checkout-link",
      "Continue to Checkout"
    )
  );



  summary.appendChild(
    actions
  );



  container.appendChild(
    summary
  );

}



// ==========================================================
// RENDER HOMEPAGE MINI CART
// ==========================================================

function renderMiniCart(){

  var container =
    getElement(
      "miniCartItems"
    );


  var cart =
    loadStoredCart();



  var totalQuantity =
    getTotalQuantity(
      cart
    );



  updateCartCount(
    totalQuantity
  );



  if(
    !container
  ){

    return;

  }



  container.replaceChildren();



  if(
    cart.length === 0
  ){

    displayEmptyMiniCart(
      container
    );


    return;

  }



  var visibleItems =
    cart.slice(
      0,
      MAXIMUM_VISIBLE_ITEMS
    );



  var itemsWrapper =
    document.createElement(
      "div"
    );


  itemsWrapper.className =
    "mini-cart-visible-items";



  visibleItems.forEach(
    function(item){

      itemsWrapper.appendChild(
        createMiniCartItem(
          item
        )
      );

    }
  );



  container.appendChild(
    itemsWrapper
  );



  displayAdditionalItems(
    container,
    cart
  );



  displayMiniCartSummary(
    container,
    cart
  );

}



// ==========================================================
// CART EVENTS
// ==========================================================

function handleStorageChange(
  event
){

  if(
    event.key ===
    CART_STORAGE_KEY
  ){

    renderMiniCart();

  }

}



function handleCartUpdated(){

  renderMiniCart();

}



// ==========================================================
// INITIALIZATION
// ==========================================================

function initializeHomepage(){

  renderMiniCart();



  document.addEventListener(
    "cartUpdated",
    handleCartUpdated
  );



  window.addEventListener(
    "mmc-cart-updated",
    handleCartUpdated
  );



  window.addEventListener(
    "storage",
    handleStorageChange
  );

}



// ==========================================================
// PAGE STARTUP
// ==========================================================

if(
  document.readyState ===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    initializeHomepage
  );

} else {

  initializeHomepage();

}



// ==========================================================
// GLOBAL SUPPORT
// ==========================================================

window.renderMiniCart =
  renderMiniCart;


window.refreshMiniCart =
  renderMiniCart;


window.updateHomepageCartCount =
  updateCartCount;


})();