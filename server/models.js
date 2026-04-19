// models.js
const mongoose = require("mongoose");

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

const MemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  category: { type: String, required: true, default: "DSA" },
  savedDate: { type: String, required: true },
  nextReviewDates: [String],
  completedIntervals: [Number],
  createdAt: { type: Date, default: Date.now },
});
const Mem = mongoose.model("Mem", MemSchema);

const CategorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
CategorySchema.index({ userId: 1, name: 1 }, { unique: true });
const Category = mongoose.model("Category", CategorySchema);

// ── Day Rating ────────────────────────────────────────────────────────────────
const RatingSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true },   // "YYYY-MM-DD"
  rating: { type: Number, required: true, min: 1, max: 5 },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});
RatingSchema.index({ userId: 1, date: 1 }, { unique: true });
const Rating = mongoose.model("Rating", RatingSchema);

// ── Todo ──────────────────────────────────────────────────────────────────────
const TodoSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
  dueDate: { type: String, required: true }, // "YYYY-MM-DD"
  createdAt: { type: Date, default: Date.now },
});
const Todo = mongoose.model("Todo", TodoSchema);

module.exports = { Item, Mem, Category, Rating, Todo };
