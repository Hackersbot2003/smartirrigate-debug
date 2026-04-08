const express = require("express");
const router  = express.Router();
const { getLiveSensorData, getHistoryByHours, getHistoryLast } = require("../services/firebaseService");
const { generateAlerts } = require("../services/alertEngine");

// GET /api/sensors/live
router.get("/live", async (req, res) => {
  console.log("[Route /api/sensors/live] Request received");
  try {
    const data = await getLiveSensorData();
    if (!data) {
      console.warn("[Route /api/sensors/live] ⚠️  No data returned — ESP32 may not be running");
      return res.status(404).json({ error: "No sensor data. Is ESP32 running?" });
    }
    const alerts = generateAlerts(data);
    console.log("[Route /api/sensors/live] ✅ Responding with:", data, "| alerts:", alerts);
    res.json({ data, alerts, fetchedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[Route /api/sensors/live] ERROR:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sensors/history?hours=24
router.get("/history", async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 24, 168);
  console.log(`[Route /api/sensors/history] Request received | hours=${hours}`);
  try {
    const history = await getHistoryByHours(hours);
    console.log(`[Route /api/sensors/history] ✅ Returning ${history.length} records`);
    res.json({
      data:  history,
      count: history.length,
      hours,
      from:  history[0]?.timestampISO        || null,
      to:    history.at(-1)?.timestampISO || null,
    });
  } catch (e) {
    console.error("[Route /api/sensors/history] ERROR:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sensors/stats?hours=24
router.get("/stats", async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours) || 24, 168);
  console.log(`[Route /api/sensors/stats] Request received | hours=${hours}`);
  try {
    const history = await getHistoryByHours(hours);
    if (!history.length) {
      console.warn("[Route /api/sensors/stats] ⚠️  No data for period");
      return res.json({ error: "No data for period" });
    }

    const calc = (key) => {
      const vals = history.map((r) => r[key]).filter((v) => v != null);
      const avg  = vals.reduce((s, v) => s + v, 0) / vals.length;
      return { avg: +avg.toFixed(2), min: +Math.min(...vals).toFixed(2), max: +Math.max(...vals).toFixed(2) };
    };

    const response = {
      hours, count: history.length,
      temperature:  calc("temperature"),
      humidity:     calc("humidity"),
      soilMoisture: calc("soilMoisture"),
    };
    console.log("[Route /api/sensors/stats] ✅ Stats:", response);
    res.json(response);
  } catch (e) {
    console.error("[Route /api/sensors/stats] ERROR:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
