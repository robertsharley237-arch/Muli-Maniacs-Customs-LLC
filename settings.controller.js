// controllers/settings.controller.js
const Settings = require("../models/settings.model");

exports.getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        Object.assign(settings, req.body);
        settings.lastUpdated = Date.now();
        await settings.save();

        res.json({ message: "Settings updated", settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
