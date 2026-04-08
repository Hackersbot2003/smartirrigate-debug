const Groq = require("groq-sdk");

let client = null;
function groq() {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

// ── Build statistics from history array ──────────────────────────
function stats(arr, key) {
  const vals = arr.map((r) => r[key]).filter((v) => v != null);
  if (!vals.length) return { avg: null, min: null, max: null };
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return {
    avg: +avg.toFixed(2),
    min: +Math.min(...vals).toFixed(2),
    max: +Math.max(...vals).toFixed(2),
  };
}

// ── Build the prompt sent to LLaMA ───────────────────────────────
function buildPrompt(history, cropType) {
  const last = history[history.length - 1] || {};
  const t = stats(history, "temperature");
  const h = stats(history, "humidity");
  const s = stats(history, "soilMoisture");

  // Send a compact summary — no need to send all 288 readings
  // Just stats + last 6 readings (most recent 30 min)
  const recent = history.slice(-6).map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString("en-IN"),
    temp: r.temperature,
    hum:  r.humidity,
    soil: r.soilMoisture,
  }));

  return `You are an expert agricultural AI. Analyse this 24-hour IoT sensor data for crop: "${cropType}".

CURRENT READINGS:
  Temperature:   ${last.temperature}°C
  Humidity:      ${last.humidity}%
  Soil Moisture: ${last.soilMoisture}%

24-HOUR STATISTICS:
  Temperature  → avg ${t.avg}°C  min ${t.min}°C  max ${t.max}°C
  Humidity     → avg ${h.avg}%   min ${h.min}%   max ${h.max}%
  Soil Moisture→ avg ${s.avg}%   min ${s.min}%   max ${s.max}%

LAST 30 MINUTES (6 readings):
${JSON.stringify(recent, null, 2)}

DATA POINTS: ${history.length} readings over ~24 hours

Reply with ONLY a valid JSON object — no markdown, no explanation, just JSON:
{
  "healthScore": <integer 0-100>,
  "healthLabel": "<Critical|Poor|Fair|Good|Excellent>",
  "soilStatus": "<Critically Dry|Dry|Optimal|Moist|Waterlogged>",
  "shouldIrrigate": <true|false>,
  "irrigationDurationMinutes": <integer 0-60>,
  "urgency": "<none|low|medium|high|critical>",
  "stressFactors": ["<factor>"],
  "alerts": ["<alert message>"],
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "analysis": "<2-3 sentence plain-English summary>"
}`;
}

// ── Main analysis call ────────────────────────────────────────────
async function analyzeCropHealth(history, cropType = "general") {
  if (!history || history.length < 2) {
    throw new Error("Need at least 2 history readings for analysis");
  }

  const prompt = buildPrompt(history, cropType);

  const completion = await groq().chat.completions.create({
    model:       "llama-3.1-8b-instant",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.1,   // low = consistent structured output
    max_tokens:  700,
  });

  const raw = completion.choices[0].message.content.trim();

  // Strip accidental markdown code fences if model adds them
  const jsonStr = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let result;
  try {
    result = JSON.parse(jsonStr);
  } catch {
    // If parse fails return a safe fallback so the app doesn't crash
    console.error("[Groq] Failed to parse response:", raw.slice(0, 200));
    return fallback("JSON parse failed");
  }

  return {
    ...result,
    model:       "llama-3.1-8b-instant",
    cropType,
    dataPoints:  history.length,
    analyzedAt:  new Date().toISOString(),
  };
}

function fallback(reason) {
  return {
    healthScore: 50,
    healthLabel: "Unknown",
    soilStatus:  "Unknown",
    shouldIrrigate: false,
    irrigationDurationMinutes: 0,
    urgency: "none",
    stressFactors: [],
    alerts: [`AI analysis unavailable: ${reason}`],
    recommendations: ["Check Groq API key in .env", "Retry in a few minutes"],
    analysis: `AI analysis could not complete (${reason}). Check your GROQ_API_KEY.`,
    model: "fallback",
    cropType: "unknown",
    dataPoints: 0,
    analyzedAt: new Date().toISOString(),
  };
}

module.exports = { analyzeCropHealth };
