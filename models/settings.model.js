// models/settings.model.js
const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
    storeName: { type: String, default: "Multi-Maniacs Customs LLC" },

    contactPhone1: { type: String, default: "" },
    contactPhone2: { type: String, default: "" },
    contactEmail: { type: String, default: "" },

    taxRate: { type: Number, default: 0.06 },
    storeOpen: { type: Boolean, default: true },

    defaultStock: { type: Number, default: 1 },
    autoActivateProducts: { type: Boolean, default: true },

    backendURL: { type: String, default: "" },
    stripePublicKey: { type: String, default: "" },
    stripeSecretKey: { type: String, default: "" },
    cloudinaryKey: { type: String, default: "" },
    cloudinarySecret: { type: String, default: "" },

    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Settings", SettingsSchema);
