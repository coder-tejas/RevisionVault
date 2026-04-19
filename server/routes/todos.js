// server/routes/todos.js
const express = require("express");
const { Todo } = require("../models");
const { info, warn, error } = require("../utils/logger");
const router = express.Router();

// GET todos for a specific due date
router.get("/:userId/:date", async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.params.userId, dueDate: req.params.date }).sort({ createdAt: 1 });
    res.json({ ok: true, todos });
  } catch (e) {
    error("Todos fetch failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// GET all todos for a user (for vault/overview)
router.get("/:userId", async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.params.userId }).sort({ dueDate: 1, createdAt: 1 });
    res.json({ ok: true, todos });
  } catch (e) {
    error("All todos fetch failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// POST create todo
router.post("/", async (req, res) => {
  try {
    const { userId, text, dueDate } = req.body;
    if (!userId || !text || !dueDate) return res.status(400).json({ error: "Missing fields" });
    const todo = await Todo.create({ userId, text, dueDate, done: false });
    info("Todo created", { userId, dueDate, todoId: todo._id });
    res.json({ ok: true, todo });
  } catch (e) {
    error("Todo create failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// PATCH toggle done/undone
router.patch("/:id/toggle", async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ error: "Not found" });
    todo.done = !todo.done;
    await todo.save();
    info("Todo toggled", { todoId: req.params.id, done: todo.done });
    res.json({ ok: true, todo });
  } catch (e) {
    error("Todo toggle failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// DELETE todo
router.delete("/:id", async (req, res) => {
  try {
    await Todo.findByIdAndDelete(req.params.id);
    info("Todo deleted", { todoId: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    error("Todo delete failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
