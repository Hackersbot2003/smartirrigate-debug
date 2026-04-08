const express = require("express");
const router = express.Router();
const { getLatestAnalysis, getHistoryByHours, saveAnalysis } = require("../services/firebaseService");
const { analyzeCropHealth } = require("../services/groqService");
const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

let groqClient = null;
let geminiClient = null;

function getGroqClient() {
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

function getGeminiClient() {
  if (!geminiClient) geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return geminiClient;
}

// POST /api/ai-assistant/chat — enhanced chat with crop info and historical data
router.post("/chat", async (req, res) => {
  try {
    const { 
      question, 
      sensorData, 
      weatherData, 
      agroData, 
      chatHistory,
      cropType,
      plantingDate,
      imageData 
    } = req.body;
    
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

    // Build crop information context
    let cropContext = "Crop Information:\n";
    if (cropType) {
      cropContext += `Crop Type: ${cropType}\n`;
    } else {
      cropContext += "Crop Type: Not specified\n";
    }
    
    if (plantingDate) {
      const plantDate = new Date(plantingDate);
      const daysGrown = Math.floor((Date.now() - plantDate.getTime()) / (1000 * 60 * 60 * 24));
      cropContext += `Planting Date: ${plantDate.toLocaleDateString('en-IN')} (${daysGrown} days ago)\n`;
      
      // Calculate estimated harvest period based on common crop cycles
      let estimatedHarvest = "Unknown";
      if (cropType) {
        const cropCycles = {
          "wheat": 120,
          "rice": 120,
          "maize": 90,
          "corn": 90,
          "tomato": 90,
          "potato": 120,
          "onion": 120,
          "chilli": 150,
          "cotton": 180,
          "sugarcane": 365,
          "groundnut": 120,
          "soybean": 120
        };
        
        const cycleDays = cropCycles[cropType.toLowerCase()] || 120;
        const harvestDate = new Date(plantDate.getTime() + (cycleDays * 24 * 60 * 60 * 1000));
        estimatedHarvest = harvestDate.toLocaleDateString('en-IN');
        
        cropContext += `Estimated Harvest: ${estimatedHarvest} (in ~${cycleDays - daysGrown} days)\n`;
      }
    } else {
      cropContext += "Planting Date: Not specified\n";
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

${cropContext}

${historyContext}

Rules:
- ALWAYS reference the actual sensor values above in your answer
- Use historical trends to provide better context when relevant
- Use simple, warm language any farmer can understand
- Give specific, actionable advice based on the REAL data
- Be brief: 2-4 sentences maximum
- If soil is ${s.soilMoisture?.toFixed(0) || "?"}%, say "your soil is currently at ${s.soilMoisture?.toFixed(0) || "?"}%"
- Speak like a knowledgeable friend, not a textbook
- If image data is provided, analyze it for crop health, diseases, and nutrients
- Provide crop-specific advice based on the crop type and growth stage`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(chatHistory || []).slice(-6).map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      })),
      { role: "user", content: question },
    ];

    let reply;

    if (imageData) {
      // Use Gemini for image analysis with correct model
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-pro-latest" }); // Use available model for image analysis
      
      // Convert base64 image to buffer for Gemini
      const imageBuffer = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ""), 'base64');
      
      // Determine the correct mime type based on the image data
      let mimeType = "image/jpeg";
      if (imageData.startsWith("data:image/png")) {
        mimeType = "image/png";
      } else if (imageData.startsWith("data:image/gif")) {
        mimeType = "image/gif";
      } else if (imageData.startsWith("data:image/webp")) {
        mimeType = "image/webp";
      }
      
      const result = await model.generateContent([
        {
          text: `${systemPrompt}\n\nAnalyze this crop image for health, diseases, nutrients, and overall condition. Provide specific advice based on the image and current sensor data. Question: ${question}`,
        },
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBuffer.toString('base64'),
          },
        },
      ]);
      
      reply = await result.response.text();
    } else {
      // Use Groq for text-based analysis
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: messages,
        max_tokens: 250,
        temperature: 0.65,
      });

      reply = completion.choices[0].message.content;
    }
    
    res.json({ reply });
  } catch (e) {
    console.error("AI Assistant error:", e);
    
    // Extract sensor data from request body
    const sensorData = req.body.sensorData || {};
    const soilMoisture = sensorData.soilMoisture?.toFixed(1) || '?';
    const temperature = sensorData.temperature?.toFixed(1) || '?';
    const humidity = sensorData.humidity?.toFixed(1) || '?';
    
    // Provide a helpful fallback response when AI services fail
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

// GET /api/ai-assistant/report — generate detailed crop report
router.get("/report", async (req, res) => {
  try {
    const { cropType, plantingDate } = req.query;
    
    const hours = parseInt(req.query.hours) || 24;
    const history = await getHistoryByHours(hours);
    const recentHistory = history.slice(-10);
    
    // Generate detailed analysis report
    const report = {
      cropType: cropType || "Not specified",
      plantingDate: plantingDate || "Not specified",
      dataPeriod: `${hours} hours`,
      totalReadings: history.length,
      recentReadings: recentHistory,
      summary: {
        avgTemp: history.reduce((sum, r) => sum + (r.temperature || 0), 0) / history.length || 0,
        avgHumidity: history.reduce((sum, r) => sum + (r.humidity || 0), 0) / history.length || 0,
        avgSoilMoisture: history.reduce((sum, r) => sum + (r.soilMoisture || 0), 0) / history.length || 0,
      },
      recommendations: [
        "Monitor soil moisture levels closely",
        "Adjust irrigation based on weather conditions",
        "Watch for heat stress during peak temperatures"
      ],
      alerts: [],
    };
    
    if (report.summary.avgTemp > 35) {
      report.alerts.push("High temperature detected - consider shade protection");
    }
    if (report.summary.avgSoilMoisture < 30) {
      report.alerts.push("Low soil moisture - increase irrigation frequency");
    }
    
    res.json(report);
  } catch (e) {
    console.error("Report error:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;