// server/routes/items.js - Item routes
const express = require("express");
const { Item } = require("../models");
const { debug, info, warn, error } = require("../utils/logger");
const router = express.Router();

const INTERVALS = [1, 3, 7, 14, 25];

function todayStr() { return new Date().toISOString().split("T")[0]; }

function computeReviewDates(savedDateStr) {
  const base = new Date(savedDateStr);
  return INTERVALS.map((days) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  });
}

router.post("/", async (req, res) => {
  try {
    const { userId, url, category, note } = req.body;
    if (!userId || !url || !category) {
      warn("Item create validation failed", { userId, category, reason: "missing fields" });
      return res.status(400).json({ error: "Missing fields" });
    }
    const savedDate = todayStr();
    const item = await Item.create({
      userId, url, category, note: note || "", savedDate,
      nextReviewDates: computeReviewDates(savedDate), completedIntervals: [],
    });
    info("Item created", { userId, category, itemId: item._id });
    res.json({ ok: true, item });
  } catch (e) {
    if (e.code === 11000) {
      warn("Item duplicate", { userId: req.body.userId, url: req.body.url });
      return res.status(409).json({ error: "Already saved today" });
    }
    error("Item create failed", { userId: req.body.userId, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const items = await Item.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    debug("Items fetched", { userId: req.params.userId, count: items.length });
    res.json({ ok: true, items });
  } catch (e) { 
    error("Items fetch failed", { userId: req.params.userId, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

router.get("/:userId/due-today", async (req, res) => {
  try {
    const today = todayStr();
    const items = await Item.find({ userId: req.params.userId, nextReviewDates: today }).sort({ createdAt: -1 });
    debug("Due today items fetched", { userId: req.params.userId, date: today, count: items.length });
    res.json({ ok: true, items, today });
  } catch (e) { 
    error("Due today fetch failed", { userId: req.params.userId, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

// NEW: items that had a review scheduled on a specific past date
router.get("/:userId/due-on/:date", async (req, res) => {
  try {
    const { userId, date } = req.params;
    const items = await Item.find({ userId, nextReviewDates: date }).sort({ createdAt: -1 });
    debug("Due-on-date items fetched", { userId, date, count: items.length });
    res.json({ ok: true, items });
  } catch (e) {
    error("Due-on-date fetch failed", { userId: req.params.userId, date: req.params.date, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message });
  }
});

router.get("/:userId/by-date/:date", async (req, res) => {
  try {
    const items = await Item.find({ userId: req.params.userId, savedDate: req.params.date });
    debug("Items by date fetched", { userId: req.params.userId, date: req.params.date, count: items.length });
    res.json({ ok: true, items });
  } catch (e) { 
    error("Items by date fetch failed", { userId: req.params.userId, date: req.params.date, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

router.get("/:userId/activity", async (req, res) => {
  try {
    const items = await Item.find({ userId: req.params.userId }, "savedDate");
    const map = {};
    items.forEach((i) => { map[i.savedDate] = (map[i.savedDate] || 0) + 1; });
    debug("Activity fetched", { userId: req.params.userId, activeDays: Object.keys(map).length });
    res.json({ ok: true, activity: map });
  } catch (e) { 
    error("Activity fetch failed", { userId: req.params.userId, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

router.patch("/:id/complete", async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id,
      { $addToSet: { completedIntervals: req.body.intervalIdx } }, { new: true });
    if (!item) {
      warn("Item complete not found", { itemId: req.params.id });
      return res.status(404).json({ error: "Not found" });
    }
    info("Item completed", { itemId: req.params.id, intervalIdx: req.body.intervalIdx });
    res.json({ ok: true, item });
  } catch (e) { 
    error("Item complete failed", { itemId: req.params.id, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

router.delete("/:id", async (req, res) => {
  try { 
    await Item.findByIdAndDelete(req.params.id); 
    info("Item deleted", { itemId: req.params.id });
    res.json({ ok: true }); 
  }
  catch (e) { 
    error("Item delete failed", { itemId: req.params.id, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

module.exports = router;