const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const clientIntakeRoutes = require("./routes/clientIntakeRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/products", productRoutes);
app.use("/categories", categoryRoutes);
app.use("/intake", clientIntakeRoutes);

// MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

app.get("/", (req, res) => {
  res.send("MMC Backend Running");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
