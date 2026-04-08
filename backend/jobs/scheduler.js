/**
 * scheduler.js
 *
 * Two jobs:
 *
 * Job 1  — every 5 minutes
 *   Reads /SensorData (live, from ESP32) → appends to /SensorHistory
 *   This is how past data accumulates for the AI to analyse.
 *
 * Job 2  — every 15 minutes
 *   Reads last 24 h from /SensorHistory → calls Groq → saves result
 */

const cron = require("node-cron");
const { getLiveSensorData, pushSensorHistory, getHistoryByHours, saveAnalysis } = require("../services/firebaseService");
const { analyzeCropHealth } = require("../services/groqService");
const { generateAlerts }    = require("../services/alertEngine");

let io = null; // injected from server.js

function setIO(instance) { io = instance; }

// ── JOB 1: Snapshot every 5 minutes ─────────────────────────────
function startHistoryJob() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const data = await getLiveSensorData();

      // Detailed log so you can debug what Firebase is returning
      console.log("[Cron] SensorData read:", JSON.stringify(data));

      if (!data) {
        console.log("[Cron] ⚠️  Firebase /SensorData is empty — is ESP32 running?");
        return;
      }
      if (data.temperature == null && data.humidity == null && data.soilMoisture == null) {
        console.log("[Cron] ⚠️  All sensor values are null — check field names in Firebase");
        console.log("       Expected: Temperature, Humidity, SoilMoisture (capital letters)");
        return;
      }

      const entry = await pushSensorHistory(data);
      console.log(`[Cron] ✅ Snapshot saved — T=${data.temperature}°C  H=${data.humidity}%  S=${data.soilMoisture}%`);

      const alerts = generateAlerts(data);
      if (alerts.length && io) io.emit("alerts", alerts);

    } catch (err) {
      console.error("[Cron] History job error:", err.message);
    }
  });
  console.log("✅ History snapshot cron started  (every 5 min)");
}

// ── JOB 2: AI analysis every 15 minutes ──────────────────────────
function startAnalysisJob() {
  cron.schedule("*/15 * * * *", async () => {
    try {
      console.log("[Cron] Running AI crop analysis...");

      const history = await getHistoryByHours(24);
      if (history.length < 3) {
        console.log(`[Cron] Not enough history yet (${history.length} readings). Need ≥ 3.`);
        return;
      }

      const analysis = await analyzeCropHealth(history, "general");
      const saved    = await saveAnalysis(analysis);

      console.log(`[Cron] ✅ Analysis saved — score: ${analysis.healthScore}/100 (${analysis.healthLabel})`);
      if (io) io.emit("analysis_update", saved);

    } catch (err) {
      console.error("[Cron] Analysis job error:", err.message);
    }
  });
  console.log("✅ AI analysis cron started       (every 15 min)");
}

function startAllJobs(ioInstance) {
  setIO(ioInstance);
  startHistoryJob();
  startAnalysisJob();
}

module.exports = { startAllJobs };
