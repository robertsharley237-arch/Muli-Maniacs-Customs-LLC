// routes/settings.routes.js
const express = require("express");
const router = express.Router();
const { getSettings, updateSettings } = require("../controllers/settings.controller");
const verifyAdmin = require("../middleware/verifyAdmin");

router.get("/", verifyAdmin, getSettings);
router.put("/", verifyAdmin, updateSettings);

module.exports = router;
