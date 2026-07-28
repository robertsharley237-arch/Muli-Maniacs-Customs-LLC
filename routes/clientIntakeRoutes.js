const express = require("express");
const ClientIntake = require("../models/ClientIntake");
const nodemailer = require("nodemailer");
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

// Submit intake
router.post("/submit", upload.single("image"), async (req, res) => {
  try {
    const {
      name, phone, email, contactMethod,
      projectType, description, budget,
      timeline, location
    } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const intake = new ClientIntake({
      name, phone, email, contactMethod,
      projectType, description, budget,
      timeline, location, imageUrl
    });

    await intake.save();

    // Email notification
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.INTAKE_EMAIL_USER,
        pass: process.env.INTAKE_EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.INTAKE_EMAIL_USER,
      to: "multimaniacscustoms@gmail.com",
      subject: `New Client Intake - ${name}`,
      text: `
New client intake submitted:

Name: ${name}
Phone: ${phone}
Email: ${email}
Preferred Contact: ${contactMethod}
Project Type: ${projectType}
Budget: ${budget}
Timeline: ${timeline}
Location: ${location}

Description:
${description}

Image: ${imageUrl}
      `
    });

    res.json({ message: "Client intake submitted successfully." });
  } catch (err) {
    console.error("Intake Error:", err);
    res.status(500).json({ error: "Failed to submit client intake." });
  }
});

// Admin view
router.get("/all", async (req, res) => {
  try {
    const intakes = await ClientIntake.find().sort({ createdAt: -1 });
    res.json(intakes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch client intakes." });
  }
});

module.exports = router;
