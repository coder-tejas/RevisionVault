// server/routes/mems.js - Memory notes routes
const express = require("express");
const { Mem } = require("../models");
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
    const { userId, content, category } = req.body;
    if (!userId || !content || !category) {
      warn("Mem create validation failed", { userId, category, reason: "missing fields" });
      return res.status(400).json({ error: "Missing fields" });
    }
    const savedDate = todayStr();
    const mem = await Mem.create({
      userId, content, category, savedDate,
      nextReviewDates: computeReviewDates(savedDate), completedIntervals: [],
    });
    info("Mem created", { userId, category, memId: mem._id });
    res.json({ ok: true, mem });
  } catch (e) {
    error("Mem create failed", { userId: req.body.userId, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const mems = await Mem.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    debug("Mems fetched", { userId: req.params.userId, count: mems.length });
    res.json({ ok: true, mems });
  } catch (e) { 
    error("Mems fetch failed", { userId: req.params.userId, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

router.get("/:userId/due-today", async (req, res) => {
  try {
    const mems = await Mem.find({ userId: req.params.userId, nextReviewDates: todayStr() }).sort({ createdAt: -1 });
    debug("Due today mems fetched", { userId: req.params.userId, count: mems.length });
    res.json({ ok: true, mems });
  } catch (e) { 
    error("Due today mems fetch failed", { userId: req.params.userId, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

// NEW: mems that had a review scheduled on a specific past date
router.get("/:userId/due-on/:date", async (req, res) => {
  try {
    const { userId, date } = req.params;
    const mems = await Mem.find({ userId, nextReviewDates: date }).sort({ createdAt: -1 });
    debug("Due-on-date mems fetched", { userId, date, count: mems.length });
    res.json({ ok: true, mems });
  } catch (e) {
    error("Due-on-date mems fetch failed", { userId: req.params.userId, date: req.params.date, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message });
  }
});

router.get("/:userId/by-date/:date", async (req, res) => {
  try {
    const mems = await Mem.find({ userId: req.params.userId, savedDate: req.params.date });
    debug("Mems by date fetched", { userId: req.params.userId, date: req.params.date, count: mems.length });
    res.json({ ok: true, mems });
  } catch (e) { 
    error("Mems by date fetch failed", { userId: req.params.userId, date: req.params.date, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

router.patch("/:id/complete", async (req, res) => {
  try {
    const mem = await Mem.findByIdAndUpdate(req.params.id,
      { $addToSet: { completedIntervals: req.body.intervalIdx } }, { new: true });
    if (!mem) {
      warn("Mem complete not found", { memId: req.params.id });
      return res.status(404).json({ error: "Not found" });
    }
    info("Mem completed", { memId: req.params.id, intervalIdx: req.body.intervalIdx });
    res.json({ ok: true, mem });
  } catch (e) { 
    error("Mem complete failed", { memId: req.params.id, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

router.delete("/:id", async (req, res) => {
  try { 
    await Mem.findByIdAndDelete(req.params.id); 
    info("Mem deleted", { memId: req.params.id });
    res.json({ ok: true }); 
  }
  catch (e) { 
    error("Mem delete failed", { memId: req.params.id, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

module.exports = router;