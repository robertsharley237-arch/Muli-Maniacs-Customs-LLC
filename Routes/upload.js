const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "mmc-products",
        allowed_formats: ["jpg", "png", "jpeg", "webp"]
    }
});

const upload = multer({ storage });

router.post("/", upload.single("image"), (req, res) => {
    res.json({ url: req.file.path });
});

module.exports = router;
