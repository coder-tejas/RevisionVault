// server/routes/ratings.js
const express = require("express");
const { Rating } = require("../models");
const { info, warn, error } = require("../utils/logger");
const router = express.Router();

// GET ratings for a month — returns { "YYYY-MM-DD": rating }
// MUST be before /:userId/:date or Express matches "month" as :date
router.get("/:userId/month/:year/:month", async (req, res) => {
  try {
    const { userId, year, month } = req.params;
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const ratings = await Rating.find({ userId, date: { $regex: `^${prefix}` } });
    const map = {};
    ratings.forEach(r => { map[r.date] = r.rating; });
    res.json({ ok: true, ratings: map });
  } catch (e) {
    error("Rating month fetch failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// GET rating for a specific date
router.get("/:userId/:date", async (req, res) => {
  try {
    const rating = await Rating.findOne({ userId: req.params.userId, date: req.params.date });
    res.json({ ok: true, rating: rating || null });
  } catch (e) {
    error("Rating fetch failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// POST/PUT — upsert rating for a date (overwrites if exists)
router.post("/", async (req, res) => {
  try {
    const { userId, date, rating, note } = req.body;
    if (!userId || !date || !rating) return res.status(400).json({ error: "Missing fields" });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });

    const result = await Rating.findOneAndUpdate(
      { userId, date },
      { rating, note: note || "", createdAt: new Date() },
      { upsert: true, new: true }
    );
    info("Rating saved", { userId, date, rating });
    res.json({ ok: true, rating: result });
  } catch (e) {
    error("Rating save failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
