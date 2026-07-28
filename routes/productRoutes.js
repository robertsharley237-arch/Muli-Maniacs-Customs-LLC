const express = require("express");
const Product = require("../models/Product");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Image upload setup
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Upload product image
router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// Add product
router.post("/add", async (req, res) => {
  try {
    const { name, price, description, category, imageUrl } = req.body;
    const newProduct = new Product({ name, price, description, category, imageUrl });
    await newProduct.save();
    res.json({ message: "Product added successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add product" });
  }
});

// Edit product
router.put("/edit", async (req, res) => {
  try {
    const { id, name, price, description, category, imageUrl } = req.body;
    const updated = await Product.findByIdAndUpdate(
      id,
      { name, price, description, category, imageUrl },
      { new: true }
    );
    if (!updated) return res.json({ error: "Product not found" });
    res.json({ message: "Product updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product
router.delete("/delete", async (req, res) => {
  try {
    const { id } = req.body;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Get all products
router.get("/all", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

module.exports = router;
