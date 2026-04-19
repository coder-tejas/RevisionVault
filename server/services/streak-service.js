// server/services/streak-service.js - Streak calculation
const { Item, Mem } = require("../models");
const { debug, info, warn, error } = require("../utils/logger");

async function calculateStreak(userId) {
  try {
    debug("Streak calculation started", { userId });
    
    const [itemDates, memDates] = await Promise.all([
      Item.find({ userId }, "savedDate"),
      Mem.find({ userId }, "savedDate"),
    ]);
    
    const days = [...new Set([...itemDates, ...memDates].map(i => i.savedDate))].sort().reverse();
    
    if (days.length === 0) {
      debug("Streak calculation - no data", { userId });
      return { streak: 0, longest: 0, totalDays: 0 };
    }

    let streak = 0;
    let cursor = new Date(); cursor.setHours(0,0,0,0);
    for (const day of days) {
      const cs = cursor.toISOString().split("T")[0];
      if (day === cs) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else if (day < cs) break;
    }

    const sortedAsc = [...days].reverse();
    let longest = 1, cur = 1;
    for (let i = 1; i < sortedAsc.length; i++) {
      const prev = new Date(sortedAsc[i-1]); prev.setDate(prev.getDate() + 1);
      if (prev.toISOString().split("T")[0] === sortedAsc[i]) { cur++; longest = Math.max(longest, cur); }
      else cur = 1;
    }

    const result = { streak, longest, totalDays: days.length };
    debug("Streak calculation completed", { userId, ...result });
    return result;
  } catch (e) {
    error("Streak calculation error", { userId, error: e.message, stack: e.stack });
    throw e;
  }
}

module.exports = { calculateStreak };