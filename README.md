# ⚔️ RevisionVault v2

Spaced repetition for DSA/CS problems — MongoDB-backed, with calendar heatmap + streak tracking.

## Stack
- **Extension**: Chrome MV3 (popup + background service worker)
- **Backend**: Node.js + Express + Mongoose
- **Database**: MongoDB (local or Atlas)
- **Reminders**: node-cron (10 AM daily) + node-notifier (OS notifications)

---

## Setup

### 1. MongoDB
Make sure MongoDB is running locally:
```bash
# Install (Arch/CachyOS)
sudo pacman -S mongodb-bin
sudo systemctl start mongodb
sudo systemctl enable mongodb   # optional: start on boot
```
Or use MongoDB Atlas — set MONGO_URI env var.

### 2. Server
```bash
cd server
npm install
node index.js
```
Server runs on **http://localhost:3001**

You should see:
```
✅ MongoDB connected: mongodb://localhost:27017/revisionvault
🚀 RevisionVault server running at http://localhost:3001
📅 Daily reminders scheduled at 10:00 AM
```

### 3. Chrome Extension
1. Open `chrome://extensions/`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. Pin RevisionVault to your toolbar

---

## How it works

| Feature | Details |
|---|---|
| **Add tab** | Saves current URL to MongoDB with category + note |
| **Spaced intervals** | Auto-schedules reviews at +1, +3, +7, +14 days |
| **Today tab** | Shows everything due today with undone count badge |
| **Calendar** | Heatmap of your study activity — click any day to see what you studied |
| **Vault** | All saved items with progress dots per interval |
| **Streak** | Consecutive days where you saved at least 1 item |
| **OS Notifications** | Desktop notification at 10 AM daily if reviews pending |
| **Server dot** | Green = server online, Red = offline |

## Run server on startup (Linux)

Create a systemd service so the server + reminders auto-start:
```bash
# Create /etc/systemd/system/revisionvault.service
[Unit]
Description=RevisionVault Server
After=network.target mongod.service

[Service]
WorkingDirectory=/path/to/revisionvault/server
ExecStart=/usr/bin/node index.js
Restart=always
Environment=MONGO_URI=mongodb://localhost:27017/revisionvault

[Install]
WantedBy=multi-user.target
```
Then:
```bash
sudo systemctl enable revisionvault
sudo systemctl start revisionvault
```
