import { useState, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════
//  Backend AI Engine — full structured analysis + chat with live data
// ═══════════════════════════════════════════════════════════════════

// ── Full crop analysis — returns structured JSON report ────────────
export async function analyzeCrop(sensor, weather, agro) {
  try {
    const response = await fetch('/api/analytics/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sensorData: sensor,
        weatherData: weather,
        agroData: agro,
        cropType: "general"
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Analysis API failed:", e);
    // Return fallback data
    return buildFallback(agro?.healthScore, sensor?.soilMoisture, sensor?.temperature, sensor?.humidity, agro?.dec);
  }
}

// ── Chat: conversational with full live context ────────────────────
export async function chatWithFarmer(question, sensor, weather, agro, history = []) {
  try {
    const response = await fetch('/api/analytics/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        sensorData: sensor,
        weatherData: weather,
        agroData: agro,
        chatHistory: history
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.reply || "I'm here to help with your farming questions. How can I assist you today?";
  } catch (e) {
    console.error("Chat API failed:", e);
    return "Sorry, I couldn't reach the AI assistant right now. Please try again later.";
  }
}

// ── Fallback result when JSON parse fails ──────────────────────────
function buildFallback(score, soil, temp, hum, dec) {
  const s = score ?? 60;
  return {
    overallStatus: s >= 80 ? "Good" : s >= 60 ? "Fair" : s >= 40 ? "Poor" : "Critical",
    healthScore: s,
    urgency: (soil ?? 50) < 25 ? "immediate" : (soil ?? 50) < 35 ? "today" : "none",
    mainMessage: `Your crop health score is ${s}/100. Soil moisture is ${soil?.toFixed(1) ?? "?"}% and temperature is ${temp?.toFixed(1) ?? "?"}°C. ${dec?.msg ?? "Monitor conditions regularly."}`,
    irrigationAdvice: {
      shouldIrrigate: (soil ?? 50) < 30,
      when: (soil ?? 50) < 25 ? "Water immediately" : (soil ?? 50) < 35 ? "Water this evening" : "No watering today",
      howMuch: (soil ?? 50) < 25 ? "20mm" : (soil ?? 50) < 35 ? "12mm" : "0mm",
      reason: dec?.msg ?? "Based on soil moisture reading",
    },
    soilAnalysis: { status: (soil??50)<25?"Critically Dry":(soil??50)<35?"Dry":"Good", reading:`${soil?.toFixed(1)??"?"}%`, interpretation:"From your soil sensor", action: (soil??50)<30?"Water crops now":"Maintain current schedule" },
    temperatureAnalysis: { status: (temp??30)>38?"Hot":(temp??30)>33?"Warm":"Ideal", reading:`${temp?.toFixed(1)??"?"}°C`, interpretation:"Current field temperature", action:(temp??30)>38?"Provide extra water and shade":"Temperature is acceptable" },
    humidityAnalysis: { status:(hum??50)<25?"Very Low":(hum??50)<40?"Low":"Good", reading:`${hum?.toFixed(1)??"?"}%`, interpretation:"Air moisture level", action:(hum??50)<30?"Monitor water evaporation closely":"Humidity is fine" },
    stressFactors:[
      {name:"Heat Stress",    level:`${Math.max(0,Math.round(((temp??30)-28)/18*100))}%`, severity:"Low",   impact:"Minimal crop impact",    remedy:"Monitor temperature"},
      {name:"Drought Stress", level:`${Math.max(0,Math.round(((55-(soil??42))/47)*100))}%`,severity:"Medium",impact:"Affects water uptake",   remedy:"Maintain soil moisture above 35%"},
      {name:"Disease Risk",   level:"20%", severity:"Low", impact:"Low fungal risk",    remedy:"Ensure good air circulation"},
    ],
    cropPerformance:{photosynthesisStatus:"Good",photosynthesisNote:"Plants are converting sunlight adequately",nutrientUptakeStatus:"Good",nutrientUptakeNote:"Roots absorbing nutrients normally",overallGrowth:"Normal growth expected",yieldForecast:"Normal yield expected if conditions maintained"},
    immediateActions:["Check soil moisture tomorrow morning","Water if soil drops below 30%","Inspect plants for any stress signs"],
    todaySchedule:[{time:"5:00 AM - 7:00 AM",task:"Check soil and water if needed"},{time:"10:00 AM",task:"Inspect plants for heat stress"},{time:"6:00 PM",task:"Evening check and watering if required"}],
    weeklyTips:["Monitor soil every morning","Keep irrigation records","Check weather forecast before irrigating"],
    diseaseWarnings:"Low disease risk. Watch for yellowing or wilting leaves.",
    fertilizerAdvice:"Apply balanced NPK fertilizer if growth rate slows.",
    weatherImpact:"Current conditions are within acceptable range for most crops.",
    bestIrrigationTime:"Early morning 5-7 AM or evening after 6 PM",
    waterSavingTip:"Irrigate in the early morning to reduce evaporation losses.",
  };
}

// ── Main React hook ────────────────────────────────────────────────
export function useGroqFull() {
  const [chatMsgs,    setChatMsgs]    = useState([{
    role: "ai",
    text: "Namaste! 🌾 I'm your AI farming expert. I have access to your LIVE sensor data right now. Click \"Analyze My Crops\" for a full health report, or ask me anything like \"Should I water today?\" or \"What is stressing my plants?\"",
  }]);
  const [chatLoading, setChatLoading] = useState(false);
  const [analysis,    setAnalysis]    = useState(null);
  const [analyzing,   setAnalyzing]   = useState(false);
  const [analysisErr, setAnalysisErr] = useState(null);
  const histRef = useRef([]);

  const runAnalysis = useCallback(async (sensor, weather, agro) => {
    setAnalyzing(true);
    setAnalysisErr(null);
    try {
      const result = await analyzeCrop(sensor, weather, agro);
      setAnalysis(result);
      const summaryMsg = { role: "ai", text: `✅ Full analysis done! Health score: ${result.healthScore}/100 (${result.overallStatus}). ${result.mainMessage}` };
      setChatMsgs((m) => [...m, summaryMsg]);
      histRef.current = [...histRef.current, summaryMsg];
    } catch (e) {
      const msg = e.message.includes("401") ? "⚠️ Backend API error. Check server logs."
        : e.message.includes("429") ? "⚠️ Too many requests. Wait a moment and try again."
        : `⚠️ Analysis failed: ${e.message}`;
      setAnalysisErr(msg);
      setChatMsgs((m) => [...m, { role: "ai", text: msg }]);
    }
    setAnalyzing(false);
  }, []);

  const sendChat = useCallback(async (question, sensor, weather, agro) => {
    if (!question.trim() || chatLoading) return;
    const userMsg = { role: "user", text: question };
    setChatMsgs((m) => [...m, userMsg]);
    histRef.current = [...histRef.current.slice(-8), userMsg];
    setChatLoading(true);
    try {
      const reply = await chatWithFarmer(question, sensor, weather, agro, histRef.current);
      const aiMsg = { role: "ai", text: reply };
      setChatMsgs((m) => [...m, aiMsg]);
      histRef.current = [...histRef.current, aiMsg];
    } catch (e) {
      const msg = "Sorry, couldn't reach AI assistant right now. Check your internet connection and server status.";
      setChatMsgs((m) => [...m, { role: "ai", text: msg }]);
    }
    setChatLoading(false);
  }, [chatLoading]);

  return { chatMsgs, chatLoading, sendChat, analysis, analyzing, analysisErr, runAnalysis };
}
