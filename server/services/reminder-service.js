// server/services/reminder-service.js - Daily reminder notifications
const cron = require("node-cron");
const notifier = require("node-notifier");
const { Item, Mem } = require("../models");
const { debug, info, warn, error } = require("../utils/logger");

function todayStr() { return new Date().toISOString().split("T")[0]; }

function setupReminders() {
  cron.schedule("0 10 * * *", async () => {
    try {
      const today = todayStr();
      const [dueItems, dueMems] = await Promise.all([
        Item.find({ nextReviewDates: today }),
        Mem.find({ nextReviewDates: today }),
      ]);
      const allDue = [...dueItems, ...dueMems];
      if (allDue.length === 0) {
        debug("Reminder cron - nothing due", { date: today });
        return;
      }
      const cats = {};
      allDue.forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1; });
      info("Reminder cron triggered", { date: today, totalDue: allDue.length, byCategory: cats });
      notifier.notify({
        title: `RevisionVault — ${allDue.length} items due!`,
        message: Object.entries(cats).map(([c,n]) => `${c}(${n})`).join(", "),
        sound: true,
      });
    } catch (e) { error("Reminder cron error", { error: e.message, stack: e.stack }); }
  });

  setTimeout(async () => {
    try {
      const today = todayStr();
      const [a, b] = await Promise.all([Item.find({ nextReviewDates: today }), Mem.find({ nextReviewDates: today })]);
      if (a.length + b.length > 0) {
        info("Startup reminder", { date: today, totalDue: a.length + b.length });
        notifier.notify({ title: "RevisionVault", message: `${a.length+b.length} items to review today!` });
      }
    } catch (e) { error("Startup reminder error", { error: e.message, stack: e.stack }); }
  }, 3000);
}

module.exports = { setupReminders };