// ═══════════════════════════════════════════════════════════════════
//  Firebase helpers — reads YOUR exact structure:
//
//  SensorData/
//    -OosLiSCUa2tDW6TZgut/
//      Humidity:     41.8
//      SoilMoisture: 0
//      Temperature:  29.8
//      Timestamp:    2
//    -OosLji8IDaz-XscR__y/  ...
//
//  SensorHistory/           (optional — same shape)
//
//  IrrigationState/         (motorOn: true/false)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { FB_URL } from "./config";

// ── Generic Firebase SSE listener ──────────────────────────────────
function useSSE(path) {
  const [raw,   setRaw]   = useState(null);
  const [conn,  setConn]  = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let es;
    try {
      es = new EventSource(`${FB_URL}${path}.json`);
      ref.current = es;
      es.onopen  = () => setConn(true);
      es.onerror = () => setConn(false);
      es.addEventListener("put", (e) => {
        try { const p = JSON.parse(e.data); if (p?.data !== undefined) setRaw(p.data); } catch {}
      });
      es.addEventListener("patch", (e) => {
        try { const p = JSON.parse(e.data); if (p?.data) setRaw((d) => ({ ...d, ...p.data })); } catch {}
      });
    } catch {}
    return () => { ref.current?.close(); };
  }, [path]);

  return { raw, conn };
}

// ── Write a value to Firebase (REST PUT) ───────────────────────────
export async function fbWrite(path, value) {
  try {
    const r = await fetch(`${FB_URL}${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    return r.ok;
  } catch (e) {
    console.warn("Firebase write error:", e.message);
    return false;
  }
}

// ── useSensorData ──────────────────────────────────────────────────
//  Reads /SensorData (object of push-keys) → returns latest entry
export function useSensorData() {
  const { raw, conn } = useSSE("/SensorData");

  const latest = (() => {
    if (!raw || typeof raw !== "object") return null;
    // Each value under SensorData is one reading; pick the one with max Timestamp
    const entries = Object.values(raw);
    if (!entries.length) return null;
    return entries.reduce((best, cur) =>
      (cur.Timestamp ?? 0) >= (best.Timestamp ?? 0) ? cur : best
    , entries[0]);
  })();

  // Normalise field names (capitalised in your DB)
  const sensor = latest ? {
    temperature:  latest.Temperature  ?? latest.temperature  ?? null,
    humidity:     latest.Humidity     ?? latest.humidity     ?? null,
    soilMoisture: latest.SoilMoisture ?? latest.soilMoisture ?? null,
    timestamp:    latest.Timestamp    ?? latest.timestamp    ?? null,
  } : null;

  return { sensor, rawSensorData: raw, connected: conn };
}

// ── useSensorHistory ───────────────────────────────────────────────
//  Reads /SensorHistory (same shape) → sorted array for charts
export function useSensorHistory() {
  const { raw } = useSSE("/SensorHistory");

  const history = (() => {
    if (!raw || typeof raw !== "object") return [];
    return Object.values(raw)
      .sort((a, b) => (a.Timestamp ?? a.timestamp ?? 0) - (b.Timestamp ?? b.timestamp ?? 0))
      .slice(-48)
      .map((d) => {
        const ts = d.Timestamp ?? d.timestamp ?? 0;
        const label = ts > 1000000000000
          ? new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
          : `#${ts}`;
        return {
          time: label,
          soil: parseFloat((d.SoilMoisture ?? d.soilMoisture ?? 0).toFixed(1)),
          temp: parseFloat((d.Temperature  ?? d.temperature  ?? 0).toFixed(1)),
          hum:  parseFloat((d.Humidity     ?? d.humidity     ?? 0).toFixed(1)),
        };
      });
  })();

  return { history };
}

// ── useMotor ───────────────────────────────────────────────────────
export function useMotor() {
  const { raw, conn } = useSSE("/IrrigationState");
  const motorOn = raw?.motorOn ?? (typeof raw === "boolean" ? raw : false);

  const toggle = useCallback(async () => {
    await fbWrite("/IrrigationState/motorOn", !motorOn);
  }, [motorOn]);

  return { motorOn, toggle };
}
