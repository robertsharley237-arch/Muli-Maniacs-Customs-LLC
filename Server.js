// ================================
// Multi-Maniacs Customs LLC
// FULL BACKEND WITH INVENTORY + VARIANTS + MULTI-ADMIN + CLOUDINARY
// ================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cloudinary = require("cloudinary").v2;

const app = express();

// ================================
// Middleware
// ================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SETTINGS ROUTE
app.use("/settings", require("./routes/settings.routes"));

// ================================
// MongoDB Connection
// ================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// ================================
// Cloudinary Config
// ================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ================================
// Admin Model (Multi-Admin)
// ================================
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
});

const Admin = mongoose.model("Admin", AdminSchema);

// ================================
// Product + Variant Models
// ================================
const VariantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Example: "Red", "XL", "Gloss"
  sku: { type: String, required: true }, // Example: "MMC-001-RD"
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  image: { type: String, default: "" },
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true }, // Base SKU, e.g. "MMC-001"
  price: { type: Number, required: true }, // Base price (if no variants)
  image: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 }, // Stock for non-variant products
  variants: { type: [VariantSchema], default: [] }, // Optional variants
  lowStockWarning: { type: Number, default: 5 },
  category: { type: String, default: "General" },
  description: { type: String, default: "" },
  active: { type: Boolean, default: true },
});

const Product = mongoose.model("Product", ProductSchema);

// ================================
// Admin Auth Middleware
// ================================
function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ================================
// Admin Registration (one-time use to create accounts)
// ================================
app.post("/admin/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existing = await Admin.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = new Admin({ username, password: hashed });
    await admin.save();

    res.json({ message: "Admin created", admin });
  } catch (err) {
    console.error("Admin register error:", err);
    res.status(500).json({ error: "Failed to create admin" });
  }
});

// ================================
// Multi-Admin Login
// ================================
app.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: "Invalid username" });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { adminId: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ================================
// Cloudinary Image Upload Route
// ================================
app.post("/upload/image", async (req, res) => {
  try {
    const { image } = req.body; // base64 or remote URL

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "mmc-products", // your Cloudinary folder
    });

    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Image upload failed" });
  }
});

// ================================
// Test Route
// ================================
app.get("/", (req, res) => {
  res.send("MMC Backend Running with Advanced Inventory + Variants + Multi-Admin + Cloudinary");
});

// ================================
// Get All Active Products
// ================================
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find({ active: true });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ================================
// Get Single Product
// ================================
app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Product not found" });
  }
});

// ================================
// Admin: Create Product
// ================================
app.post("/products", verifyAdmin, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json(newProduct);
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// ================================
// Admin: Update Product
// ================================
app.put("/products/:id", verifyAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// ================================
// Admin: Update Stock (base or variant)
// ================================
app.put("/products/:id/stock", verifyAdmin, async (req, res) => {
  try {
    const { stock, variantIndex } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ error: "Product not found" });

    if (variantIndex !== undefined && variantIndex !== null) {
      product.variants[variantIndex].stock = stock;
    } else {
      product.stock = stock;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    console.error("Update stock error:", err);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

// ================================
// Admin: Delete Product
// ================================
app.delete("/products/:id", verifyAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ================================
// Stripe Checkout Session
// ================================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const cart = req.body.cart || [];

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty or invalid." });
    }

    // Check inventory before checkout
    for (const item of cart) {
      const product = await Product.findById(item.id);

      if (!product) {
        return res.status(400).json({ error: `${item.name} no longer exists.` });
      }

      if (item.variantIndex !== undefined && item.variantIndex !== null) {
        const variant = product.variants[item.variantIndex];
        if (!variant) {
          return res.status(400).json({ error: "Variant not found." });
        }
        if (variant.stock < item.quantity) {
          return res.status(400).json({
            error: `${product.name} (${variant.name}) only has ${variant.stock} left.`,
          });
        }
      } else {
        if (product.stock < item.quantity) {
          return res.status(400).json({
            error: `${product.name} only has ${product.stock} left.`,
          });
        }
      }
    }

    const line_items = cart.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.variantName ? `${item.name} (${item.variantName})` : item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: "https://multi-maniacscustoms.netlify.app/success.html",
      cancel_url: "https://multi-maniacscustoms.netlify.app/Cart.html",
    });

    // Reduce inventory AFTER session creation
    for (const item of cart) {
      const product = await Product.findById(item.id);
      if (!product) continue;

      if (item.variantIndex !== undefined && item.variantIndex !== null) {
        const variant = product.variants[item.variantIndex];
        if (variant) {
          variant.stock -= item.quantity;
        }
      } else {
        product.stock -= item.quantity;
      }

      await product.save();
    }

    res.json({ url: session.url });
  } catch (error) {
    console.error("Checkout Error:", error);
    res.status(500).json({ error: "Checkout session failed." });
  }
});

// ================================
// Start Server
// ================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`MMC Backend running on port ${PORT}`);
});
