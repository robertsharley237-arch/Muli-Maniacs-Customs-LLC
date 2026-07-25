const express = require("express");
const Category = require("../models/Category");

const router = express.Router();

// Add category
router.post("/add", async (req, res) => {
  try {
    const { name } = req.body;
    const newCat = new Category({ name });
    await newCat.save();
    res.json({ message: "Category added successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add category" });
  }
});

// Edit category
router.put("/edit", async (req, res) => {
  try {
    const { id, name } = req.body;
    const updated = await Category.findByIdAndUpdate(id, { name }, { new: true });
    if (!updated) return res.json({ error: "Category not found" });
    res.json({ message: "Category updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

// Delete category
router.delete("/delete", async (req, res) => {
  try {
    const { id } = req.body;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.json({ error: "Category not found" });
    res.json({ message: "Category deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// Get all categories
router.get("/all", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

module.exports = router;
