// server/routes/categories.js - Category routes
const express = require("express");
const { Category } = require("../models");
const { debug, info, warn, error } = require("../utils/logger");
const router = express.Router();

const DEFAULT_CATS = ["DSA", "OS", "CN", "DB Internals", "System Design", "Other"];

router.get("/:userId", async (req, res) => {
  try {
    const custom = await Category.find({ userId: req.params.userId }).sort({ createdAt: 1 });
    const customNames = custom.map(c => c.name);
    debug("Categories fetched", { userId: req.params.userId, defaultCount: DEFAULT_CATS.length, customCount: customNames.length });
    res.json({ ok: true, defaults: DEFAULT_CATS, custom: customNames, all: [...DEFAULT_CATS, ...customNames] });
  } catch (e) { 
    error("Categories fetch failed", { userId: req.params.userId, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, name } = req.body;
    if (!userId || !name) {
      warn("Category create validation failed", { userId, reason: "missing fields" });
      return res.status(400).json({ error: "Missing fields" });
    }
    if (DEFAULT_CATS.includes(name)) {
      warn("Category create rejected", { userId, name, reason: "default category" });
      return res.status(409).json({ error: "Already a default" });
    }
    const cat = await Category.create({ userId, name: name.trim() });
    info("Category created", { userId, name: cat.name, categoryId: cat._id });
    res.json({ ok: true, cat });
  } catch (e) {
    if (e.code === 11000) {
      warn("Category duplicate", { userId: req.body.userId, name: req.body.name });
      return res.status(409).json({ error: "Already exists" });
    }
    error("Category create failed", { userId: req.body.userId, name: req.body.name, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:userId/:name", async (req, res) => {
  try {
    await Category.deleteOne({ userId: req.params.userId, name: decodeURIComponent(req.params.name) });
    info("Category deleted", { userId: req.params.userId, name: decodeURIComponent(req.params.name) });
    res.json({ ok: true });
  } catch (e) { 
    error("Category delete failed", { userId: req.params.userId, name: req.params.name, error: e.message, stack: e.stack });
    res.status(500).json({ error: e.message }); 
  }
});

module.exports = router;