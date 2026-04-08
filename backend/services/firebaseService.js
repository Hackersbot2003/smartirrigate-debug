/**
 * firebaseService.js  — with full debug logging
 *
 * ESP32 writes to Firebase:
 *   /SensorData/Temperature   (capital T)
 *   /SensorData/Humidity      (capital H)
 *   /SensorData/SoilMoisture  (capital S)
 *
 * This service reads those exact field names, then normalises them
 * to lowercase for the rest of the backend + frontend.
 */

const { getDb } = require("../config/firebase");

// ── Normalise whatever ESP32 sends into consistent lowercase keys ─
function normalise(raw) {
  if (!raw) {
    console.warn("[FirebaseService] normalise() received null/undefined — Firebase node is empty");
    return null;
  }

  console.log("[FirebaseService] Raw value from Firebase /SensorData:", JSON.stringify(raw));

  const result = {
    temperature:  raw.Temperature  ?? raw.temperature  ?? null,
    humidity:     raw.Humidity     ?? raw.humidity     ?? null,
    soilMoisture: raw.SoilMoisture ?? raw.soilMoisture ?? null,
  };

  console.log("[FirebaseService] Normalised result:", result);

  if (result.temperature === null)  console.warn("[FirebaseService] ⚠️  temperature is null — check key name in Firebase (expecting 'Temperature' or 'temperature')");
  if (result.humidity === null)     console.warn("[FirebaseService] ⚠️  humidity is null — check key name in Firebase (expecting 'Humidity' or 'humidity')");
  if (result.soilMoisture === null) console.warn("[FirebaseService] ⚠️  soilMoisture is null — check key name in Firebase (expecting 'SoilMoisture' or 'soilMoisture')");

  return result;
}

// ── READ live sensor data ─────────────────────────────────────────
async function getLiveSensorData() {
  console.log("[FirebaseService] getLiveSensorData() → reading /SensorData ...");
  try {
    const snap = await getDb().ref("SensorData").once("value");
    const raw  = snap.val();
    console.log("[FirebaseService] /SensorData snapshot exists:", snap.exists());
    console.log("[FirebaseService] /SensorData raw val:", raw);
    return normalise(raw);
  } catch (err) {
    console.error("[FirebaseService] getLiveSensorData() ERROR:", err.message);
    throw err;
  }
}

// ── SAVE one history snapshot ─────────────────────────────────────
async function pushSensorHistory(data) {
  console.log("[FirebaseService] pushSensorHistory() → saving snapshot:", data);
  const entry = {
    temperature:  data.temperature,
    humidity:     data.humidity,
    soilMoisture: data.soilMoisture,
    timestamp:    Date.now(),
    timestampISO: new Date().toISOString(),
  };
  try {
    await getDb().ref("SensorHistory").push(entry);
    console.log("[FirebaseService] ✅ History snapshot saved:", entry.timestampISO);
    return entry;
  } catch (err) {
    console.error("[FirebaseService] pushSensorHistory() ERROR:", err.message);
    throw err;
  }
}

// ── READ history — last N hours ───────────────────────────────────
async function getHistoryByHours(hours = 24) {
  const since = Date.now() - hours * 60 * 60 * 1000;
  console.log(`[FirebaseService] getHistoryByHours(${hours}) → querying /SensorHistory from`, new Date(since).toISOString());
  try {
    const snap = await getDb()
      .ref("SensorHistory")
      .orderByChild("timestamp")
      .startAt(since)
      .once("value");

    const raw = snap.val();
    console.log("[FirebaseService] /SensorHistory snapshot exists:", snap.exists());
    console.log("[FirebaseService] /SensorHistory raw keys count:", raw ? Object.keys(raw).length : 0);

    if (!raw) {
      console.warn("[FirebaseService] ⚠️  No history data — either the node is empty or the cron has not run yet (wait ~5 min)");
      return [];
    }

    const sorted = Object.values(raw).sort((a, b) => a.timestamp - b.timestamp);
    console.log(`[FirebaseService] Returning ${sorted.length} history entries (oldest: ${sorted[0]?.timestampISO}, newest: ${sorted.at(-1)?.timestampISO})`);
    return sorted;
  } catch (err) {
    console.error("[FirebaseService] getHistoryByHours() ERROR:", err.message);
    throw err;
  }
}

// ── READ history — last N entries ─────────────────────────────────
async function getHistoryLast(n = 288) {
  console.log(`[FirebaseService] getHistoryLast(${n}) → querying /SensorHistory limitToLast`);
  try {
    const snap = await getDb()
      .ref("SensorHistory")
      .orderByChild("timestamp")
      .limitToLast(n)
      .once("value");

    const raw = snap.val();
    console.log("[FirebaseService] getHistoryLast raw keys count:", raw ? Object.keys(raw).length : 0);
    if (!raw) return [];
    return Object.values(raw).sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.error("[FirebaseService] getHistoryLast() ERROR:", err.message);
    throw err;
  }
}

// ── SAVE AI analysis result ───────────────────────────────────────
async function saveAnalysis(analysis) {
  console.log("[FirebaseService] saveAnalysis() → saving to /LatestAnalysis and /AnalysisHistory");
  const entry = { ...analysis, savedAt: Date.now() };
  try {
    await getDb().ref("LatestAnalysis").set(entry);
    await getDb().ref("AnalysisHistory").push(entry);
    console.log("[FirebaseService] ✅ Analysis saved. healthLabel:", entry.healthLabel, "| score:", entry.healthScore);
    return entry;
  } catch (err) {
    console.error("[FirebaseService] saveAnalysis() ERROR:", err.message);
    throw err;
  }
}

async function getLatestAnalysis() {
  console.log("[FirebaseService] getLatestAnalysis() → reading /LatestAnalysis");
  try {
    const snap = await getDb().ref("LatestAnalysis").once("value");
    const val  = snap.val();
    console.log("[FirebaseService] /LatestAnalysis exists:", snap.exists(), "| val:", val ? `healthLabel=${val.healthLabel}` : "null");
    return val;
  } catch (err) {
    console.error("[FirebaseService] getLatestAnalysis() ERROR:", err.message);
    throw err;
  }
}

// ── WATCH live sensor changes (called once at server start) ───────
function watchSensorData(callback) {
  console.log("[FirebaseService] watchSensorData() → attaching .on('value') listener to /SensorData");
  getDb().ref("SensorData").on("value", (snap) => {
    console.log("[FirebaseService] 🔔 Firebase /SensorData changed! exists:", snap.exists());
    const raw = snap.val();
    console.log("[FirebaseService] Raw change payload:", raw);
    const normalised = normalise(raw);
    if (normalised) {
      console.log("[FirebaseService] ✅ Calling callback with normalised data:", normalised);
      callback(normalised);
    } else {
      console.warn("[FirebaseService] ⚠️  normalise() returned null — not calling callback");
    }
  }, (err) => {
    console.error("[FirebaseService] watchSensorData() listener ERROR:", err.message);
  });
}

module.exports = {
  getLiveSensorData,
  pushSensorHistory,
  getHistoryByHours,
  getHistoryLast,
  saveAnalysis,
  getLatestAnalysis,
  watchSensorData,
};
