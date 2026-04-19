// index.js — RevisionVault v5
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Item, Mem, Category } = require("./models");
const { debug, info, warn, error } = require("./utils/logger");

const itemsRouter = require("./routes/items");
const memsRouter = require("./routes/mems");
const categoriesRouter = require("./routes/categories");
const ratingsRouter = require("./routes/ratings");
const todosRouter = require("./routes/todos");
const { calculateStreak } = require("./services/streak-service");
const { setupReminders } = require("./services/reminder-service");

function todayStr() { return new Date().toISOString().split("T")[0]; }

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logFn = res.statusCode >= 400 ? warn : info;
    logFn(`${req.method} ${req.originalUrl} completed`, {
      method: req.method, path: req.originalUrl,
      statusCode: res.statusCode, duration_ms: duration,
    });
  });
  next();
});

info("Server startup", { version: "5", port: PORT });

mongoose.connect(MONGO_URI)
  .then(() => info("MongoDB connected"))
  .catch((e) => { error("MongoDB connection failed", { error: e.message }); process.exit(1); });

app.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/items", itemsRouter);
app.use("/api/mems", memsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/ratings", ratingsRouter);
app.use("/api/todos", todosRouter);

app.get("/api/items/:userId/streak", async (req, res) => {
  try {
    const streakData = await calculateStreak(req.params.userId);
    res.json({ ok: true, ...streakData });
  } catch (e) {
    error("Streak calculation failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/analytics/:userId", async (req, res) => {
  try {
    const uid = req.params.userId;
    const [items, mems] = await Promise.all([Item.find({ userId: uid }), Mem.find({ userId: uid })]);
    const all = [...items.map(i => ({ ...i.toObject(), _type: "url" })), ...mems.map(m => ({ ...m.toObject(), _type: "mem" }))];
    if (all.length === 0) return res.json({ ok: true, empty: true });

    const catCount = {};
    all.forEach(i => { catCount[i.category] = (catCount[i.category] || 0) + 1; });

    const streakData = await calculateStreak(uid);
    const INTERVALS = [1, 3, 7, 14, 25];
    const today = todayStr();

    const weeklyVelocity = [];
    for (let w = 9; w >= 0; w--) {
      const end = new Date(); end.setDate(end.getDate() - w * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      const count = all.filter(i => i.savedDate >= startStr && i.savedDate <= endStr).length;
      weeklyVelocity.push({ week: `W${10-w}`, startStr, count });
    }

    const intervalStats = INTERVALS.map((days, idx) => {
      const eligible = all.filter(i => i.nextReviewDates?.[idx] && i.nextReviewDates[idx] <= today);
      const completed = eligible.filter(i => (i.completedIntervals || []).includes(idx));
      return { label: `+${days}d`, eligible: eligible.length, completed: completed.length, rate: eligible.length > 0 ? Math.round((completed.length / eligible.length) * 100) : null };
    });

    const thirtyAgo = (() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().split("T")[0]; })();
    const last30 = all.filter(i => i.savedDate >= thirtyAgo).sort((a, b) => a.savedDate.localeCompare(b.savedDate));
    const dayCategories = {};
    last30.forEach(i => { if (!dayCategories[i.savedDate]) dayCategories[i.savedDate] = {}; dayCategories[i.savedDate][i.category] = (dayCategories[i.savedDate][i.category] || 0) + 1; });
    const domCatPerDay = Object.entries(dayCategories).sort(([a], [b]) => a.localeCompare(b)).map(([date, cats]) => ({ date, cat: Object.entries(cats).sort((a,b) => b[1]-a[1])[0][0] }));
    let jumps = 0;
    for (let i = 1; i < domCatPerDay.length; i++) { if (domCatPerDay[i].cat !== domCatPerDay[i-1].cat) jumps++; }
    const jumpScore = domCatPerDay.length > 1 ? Math.round((jumps / (domCatPerDay.length - 1)) * 100) : 0;

    const last14Days = [];
    for (let d = 13; d >= 0; d--) { const dt = new Date(); dt.setDate(dt.getDate() - d); last14Days.push(dt.toISOString().split("T")[0]); }
    const allCats = [...new Set(all.map(i => i.category))];
    const categoryTimeline = allCats.map(cat => ({ cat, days: last14Days.map(date => ({ date, count: all.filter(i => i.category === cat && i.savedDate === date).length })) }));

    const dayOfWeekCount = [0,0,0,0,0,0,0];
    all.forEach(i => { dayOfWeekCount[new Date(i.savedDate).getDay()]++; });
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const bestDayIdx = dayOfWeekCount.indexOf(Math.max(...dayOfWeekCount));

    const catCompletion = {};
    all.forEach(i => { if (!catCompletion[i.category]) catCompletion[i.category] = { due: 0, done: 0 }; INTERVALS.forEach((_, idx) => { if (i.nextReviewDates?.[idx] && i.nextReviewDates[idx] <= today) { catCompletion[i.category].due++; if ((i.completedIntervals || []).includes(idx)) catCompletion[i.category].done++; } }); });
    const neglected = Object.entries(catCompletion).filter(([,v]) => v.due > 0).map(([cat, v]) => ({ cat, rate: Math.round((v.done / v.due) * 100) })).sort((a, b) => a.rate - b.rate)[0] || null;

    res.json({ ok: true, totalItems: all.length, urlCount: items.length, notesCount: mems.length, catCount, weeklyVelocity, intervalStats, jumpScore, domCatPerDay, categoryTimeline, dayOfWeekCount, dayNames, bestDay: dayNames[bestDayIdx], neglected });
  } catch (e) {
    error("Analytics failed", { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

setupReminders();

app.listen(PORT, () => {
  info(`Server listening`, { port: PORT, url: `http://localhost:${PORT}` });
});
