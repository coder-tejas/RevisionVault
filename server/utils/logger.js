// utils/logger.js - Pino JSON logger with daily file rotation
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "logs");

const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFile() {
  const today = new Date().toISOString().split("T")[0];
  return path.join(LOG_DIR, `revisionvault-${today}.log`);
}

function cleanupOldLogs() {
  if (!fs.existsSync(LOG_DIR)) return;
  const cutoff = Date.now() - (24 * 60 * 60 * 1000);
  fs.readdirSync(LOG_DIR)
    .filter(f => f.startsWith("revisionvault-") && f.endsWith(".log"))
    .forEach(f => {
      const fpath = path.join(LOG_DIR, f);
      if (fs.statSync(fpath).mtime.getTime() < cutoff) {
        fs.unlinkSync(fpath);
      }
    });
}

ensureLogDir();
cleanupOldLogs();

function createLogger(options = {}) {
  const { writeToFile = true } = options;
  
  const stream = writeToFile 
    ? fs.createWriteStream(getLogFile(), { flags: "a" })
    : pino.destination(1);

  return pino({
    level: process.env.LOG_LEVEL || "debug",
    levels: LOG_LEVELS,
    formatters: {
      level: (label) => ({ level: LOG_LEVELS[label] }),
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    redact: {
      paths: ["req.headers.authorization", "req.body.password", "req.body.token"],
      censor: "[REDACTED]",
    },
  }, stream);
}

const loggerConsole = createLogger({ writeToFile: false });
const loggerFile = createLogger({ writeToFile: true });

function debug(msg, ctx = {}) { loggerConsole.debug({ msg, ...ctx }); loggerFile.debug({ msg, ...ctx }); }
function info(msg, ctx = {}) { loggerConsole.info({ msg, ...ctx }); loggerFile.info({ msg, ...ctx }); }
function warn(msg, ctx = {}) { loggerConsole.warn({ msg, ...ctx }); loggerFile.warn({ msg, ...ctx }); }
function error(msg, ctx = {}) { loggerConsole.error({ msg, ...ctx }); loggerFile.error({ msg, ...ctx }); }

module.exports = { debug, info, warn, error, LOG_LEVELS };