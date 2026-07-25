const mongoose = require("mongoose");

const ClientIntakeSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  contactMethod: String,
  projectType: String,
  description: String,
  budget: String,
  timeline: String,
  location: String,
  imageUrl: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ClientIntake", ClientIntakeSchema);
