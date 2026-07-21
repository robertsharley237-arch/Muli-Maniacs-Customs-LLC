require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Create Stripe Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const cart = req.body.cart || [];

    const line_items = cart.map(item => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url: "https://your-frontend-url.com/success.html",
      cancel_url: "https://your-frontend-url.com/cancel.html",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

app.get("/", (req, res) => {
  res.send("MMC Stripe backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
