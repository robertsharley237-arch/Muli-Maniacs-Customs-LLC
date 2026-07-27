// ================================
// Multi-Maniacs Customs LLC
// FULL BACKEND WITH INVENTORY + VARIANTS
// ================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const uploadRoutes = require("./routes/upload");



const app = express();

// ================================
// Middleware
// ================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/upload", uploadRoutes);

// ================================
// MongoDB Connection
// ================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Error:", err));

// ================================
// Product + Variant Models
// ================================
const VariantSchema = new mongoose.Schema({
    name: { type: String, required: true },       // Example: "Red", "XL", "Gloss"
    sku: { type: String, required: true },        // Example: "MMC-001-RD"
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 }
});

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true }, // Base SKU, e.g. "MMC-001"
    price: { type: Number, required: true },             // Base price (if no variants)
    image: { type: String, required: true },
    stock: { type: Number, required: true, default: 0 }, // Stock for non-variant products
    variants: { type: [VariantSchema], default: [] },    // Optional variants
    lowStockWarning: { type: Number, default: 5 },
    category: { type: String, default: "General" },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true }
});

const Product = mongoose.model("Product", ProductSchema);

// ================================
// Test Route
// ================================
app.get("/", (req, res) => {
    res.send("MMC Backend Running with Advanced Inventory + Variants");
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
app.post("/products", async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.json(newProduct);
    } catch (err) {
        res.status(500).json({ error: "Failed to create product" });
    }
});

// ================================
// Admin: Update Stock (base or variant)
// ================================
app.put("/products/:id/stock", async (req, res) => {
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
        res.status(500).json({ error: "Failed to update stock" });
    }
});

// ================================
// Admin: Delete Product
// ================================
app.delete("/products/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted" });
    } catch (err) {
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
                        error: `${product.name} (${variant.name}) only has ${variant.stock} left.`
                    });
                }
            } else {
                if (product.stock < item.quantity) {
                    return res.status(400).json({
                        error: `${product.name} only has ${product.stock} left.`
                    });
                }
            }
        }

        const line_items = cart.map(item => ({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.variantName ? `${item.name} (${item.variantName})` : item.name
                },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items,
            mode: "payment",
            success_url: "https://multi-maniacscustoms.netlify.app/success.html",
            cancel_url: "https://multi-maniacscustoms.netlify.app/Cart.html"
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
