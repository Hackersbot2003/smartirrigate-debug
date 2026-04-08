const express  = require("express");
const router   = express.Router();
const { getLatestAnalysis, getHistoryByHours, saveAnalysis } = require("../services/firebaseService");
const { analyzeCropHealth } = require("../services/groqService");
const Groq = require("groq-sdk");

let groqClient = null;
function getGroqClient() {
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

// GET /api/analytics/latest
router.get("/latest", async (req, res) => {
  try {
    const analysis = await getLatestAnalysis();
    if (!analysis) return res.status(404).json({
      error: "No analysis yet.",
      hint: "POST /api/analytics/run to trigger the first one, or wait up to 15 min for the cron job.",
    });
    res.json(analysis);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/analytics/run  — trigger on-demand from the dashboard
router.post("/run", async (req, res) => {
  try {
    const { cropType = "general", sensorData, weatherData, agroData } = req.body;
    
    // If sensor data is provided from frontend, use it for analysis
    if (sensorData && weatherData && agroData) {
      // Create a simplified analysis based on current sensor data
      // This will be processed by the Groq service
      const hours = parseInt(req.query.hours) || 24;
      const history = await getHistoryByHours(hours);

      // If we have historical data, use it for full analysis
      if (history.length >= 3) {
        const analysis = await analyzeCropHealth(history, cropType);
        const saved = await saveAnalysis(analysis);
        
        // Broadcast to all open dashboard tabs
        req.app.get("io")?.emit("analysis_update", saved);
        
        res.json(saved);
      } else {
        // If no historical data, create a basic analysis from current data
        const analysis = await analyzeCropHealth([{
          timestamp: new Date().toISOString(),
          ...sensorData
        }], cropType);
        const saved = await saveAnalysis(analysis);
        
        // Broadcast to all open dashboard tabs
        req.app.get("io")?.emit("analysis_update", saved);
        
        res.json(saved);
      }
    } else {
      // Original behavior - get historical data
      const hours = parseInt(req.query.hours) || 24;
      const history = await getHistoryByHours(hours);

      if (history.length < 3) {
        return res.status(400).json({
          error: `Not enough history data (${history.length} readings). Need at least 3.`,
          hint: "The backend saves a snapshot every 5 minutes. Wait ~15 minutes after first startup.",
        });
      }

      const analysis = await analyzeCropHealth(history, cropType);
      const saved = await saveAnalysis(analysis);

      // Broadcast to all open dashboard tabs
      req.app.get("io")?.emit("analysis_update", saved);

      res.json(saved);
    }
  } catch (e) { 
    console.error("Analytics run error:", e);
    res.status(500).json({ error: e.message }); 
  }
});

// POST /api/analytics/chat — chat with AI using sensor data and history
router.post("/chat", async (req, res) => {
  try {
    const { question, sensorData, weatherData, agroData, chatHistory } = req.body;
    
    const s = sensorData || {};
    const w = weatherData || {};
    const a = agroData || {};

    // Fetch recent history to provide context to the AI
    const hours = parseInt(req.query.hours) || 24;
    const history = await getHistoryByHours(hours);
    const recentHistory = history.slice(-10); // Last 10 entries

    // Build history context
    let historyContext = "Recent Sensor Data (last 10 readings):\n";
    if (recentHistory.length > 0) {
      recentHistory.forEach((entry, index) => {
        const time = new Date(entry.timestamp).toLocaleTimeString("en-IN");
        historyContext += `${index + 1}. ${time} - Temp: ${entry.temperature?.toFixed(1) || "?"}°C, Humidity: ${entry.humidity?.toFixed(1) || "?"}%, Soil: ${entry.soilMoisture?.toFixed(1) || "?"}%\n`;
      });
    } else {
      historyContext += "No historical data available.\n";
    }

    const systemPrompt = `You are a friendly, expert farming assistant for Indian farmers in Madhya Pradesh.
You have LIVE REAL-TIME access to their farm sensors and historical data. Always use actual numbers in your answers.

CURRENT LIVE FARM DATA (reading right now from IoT sensors):
Soil Moisture: ${s.soilMoisture?.toFixed(1) || "unknown"}%
Air Temperature: ${s.temperature?.toFixed(1) || "unknown"}°C  
Air Humidity: ${s.humidity?.toFixed(1) || "unknown"}%

Weather in Bhopal: ${w.temp || "?"}°C, ${w.desc || "unknown"}, Wind ${w.wind || "?"}km/h

Calculated metrics:
VPD: ${a.vpd?.toFixed(2) || "?"} kPa | ET₀: ${a.et0?.toFixed(2) || "?"} mm/day | Water Need: ${a.cwn?.toFixed(2) || "?"} mm/day
Health Score: ${a.healthScore || "?"}/100 | Heat Stress: ${a.heatStress || "?"}% | Drought: ${a.droughtStress || "?"}% | Disease: ${a.diseaseRisk || "?"}%
Photosynthesis: ${a.photosynthesis || "?"}% | Nutrient Uptake: ${a.nutrientUptake || "?"}%
Irrigation decision: ${a.dec?.msg || "unknown"}
Time to wilt: ${a.wiltHours != null ? (a.wiltHours === 0 ? "IMMEDIATE RISK" : `~${a.wiltHours} hours`) : "unknown"}

${historyContext}

Rules:
- ALWAYS reference the actual sensor values above in your answer
- Use historical trends to provide better context when relevant
- Use simple, warm language any farmer can understand
- Give specific, actionable advice based on the REAL data
- Be brief: 2-4 sentences maximum
- If soil is ${s.soilMoisture?.toFixed(0) || "?"}%, say "your soil is currently at ${s.soilMoisture?.toFixed(0) || "?"}%"
- Speak like a knowledgeable friend, not a textbook`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(chatHistory || []).slice(-6).map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      })),
      { role: "user", content: question },
    ];

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: messages,
      max_tokens: 250,
      temperature: 0.65,
    });

    const reply = completion.choices[0].message.content;
    
    res.json({ reply });
  } catch (e) {
    console.error("Chat error:", e);
    
    // Extract sensor data from request body
    const sensorData = req.body.sensorData || {};
    const soilMoisture = sensorData.soilMoisture?.toFixed(1) || '?';
    const temperature = sensorData.temperature?.toFixed(1) || '?';
    const humidity = sensorData.humidity?.toFixed(1) || '?';
    
    // Provide a helpful fallback response when Groq API fails
    const fallbackResponses = {
      "water": `Based on your sensor data, your soil moisture is currently at ${soilMoisture}%. Water needs depend on your crop type, but generally water when soil drops below 30%.`,
      "irrigate": `Your irrigation decision depends on soil moisture (${soilMoisture}%), temperature (${temperature}°C), and weather forecast. Consider watering if soil is below 30%.`,
      "temperature": `Your current temperature is ${temperature}°C. High temperatures above 35°C require extra watering and possible shading for crops.`,
      "default": `I'm having trouble connecting to the AI service right now. Your current sensor readings show soil moisture at ${soilMoisture}%, temperature at ${temperature}°C, and humidity at ${humidity}%. Please check your internet connection and try again.`
    };
    
    const questionLower = (req.body.question || '').toLowerCase();
    let reply;
    
    if (questionLower.includes('water') || questionLower.includes('need')) {
      reply = fallbackResponses.water;
    } else if (questionLower.includes('irrigate') || questionLower.includes('water')) {
      reply = fallbackResponses.irrigate;
    } else if (questionLower.includes('temp') || questionLower.includes('hot') || questionLower.includes('cold')) {
      reply = fallbackResponses.temperature;
    } else {
      reply = fallbackResponses.default;
    }
    
    res.json({ reply });
  }
});

module.exports = router;
