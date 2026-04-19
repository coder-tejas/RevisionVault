// models.js
const mongoose = require("mongoose");

// ── URL-based items (existing) ────────────────────────────────────────────────
const ItemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  url: { type: String, required: true },
  category: { type: String, required: true, default: "DSA" },
  note: { type: String, default: "" },
  savedDate: { type: String, required: true },
  nextReviewDates: [String],
  completedIntervals: [Number],
  createdAt: { type: Date, default: Date.now },
});
ItemSchema.index({ userId: 1, url: 1, savedDate: 1 }, { unique: true });
const Item = mongoose.model("Item", ItemSchema);

// ── Remember notes (no URL, just text content) ────────────────────────────────
const MemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },   // the trick / command / note
  category: { type: String, required: true, default: "DSA" },
  savedDate: { type: String, required: true },
  nextReviewDates: [String],
  completedIntervals: [Number],
  createdAt: { type: Date, default: Date.now },
});
const Mem = mongoose.model("Mem", MemSchema);

// ── Custom categories per user ────────────────────────────────────────────────
const CategorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
CategorySchema.index({ userId: 1, name: 1 }, { unique: true });
const Category = mongoose.model("Category", CategorySchema);

module.exports = { Item, Mem, Category };
