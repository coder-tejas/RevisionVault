// background.js
const API = "http://localhost:3001";

// Generate a stable userId from browser fingerprint stored in chrome.storage
async function getUserId() {
  const d = await chrome.storage.local.get("userId");
  if (d.userId) return d.userId;
  const id = "user_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  await chrome.storage.local.set({ userId: id });
  return id;
}

chrome.runtime.onInstalled.addListener(() => {
  // Check badge every 30 minutes
  chrome.alarms.create("badgeRefresh", { periodInMinutes: 30 });
  refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  refreshBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "badgeRefresh") refreshBadge();
});

async function refreshBadge() {
  try {
    const userId = await getUserId();
    const res = await fetch(`${API}/api/items/${userId}/due-today`);
    const data = await res.json();
    const items = data.items || [];

    // Count undone reviews
    const today = new Date().toISOString().split("T")[0];
    let pending = 0;
    items.forEach((item) => {
      item.nextReviewDates.forEach((d, idx) => {
        if (d === today && !(item.completedIntervals || []).includes(idx)) pending++;
      });
    });

    await chrome.action.setBadgeText({ text: pending > 0 ? String(pending) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
  } catch (e) {
    // server not running — clear badge
    await chrome.action.setBadgeText({ text: "" });
  }
}

// Expose userId and API base to popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_USER_ID") {
    getUserId().then((id) => sendResponse({ userId: id }));
    return true;
  }
  if (msg.type === "REFRESH_BADGE") {
    refreshBadge().then(() => sendResponse({ ok: true }));
    return true;
  }
});
