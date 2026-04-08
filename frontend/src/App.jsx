import { useState, useMemo, useCallback } from "react";
import Sidebar         from "./components/Sidebar.jsx";
import Header          from "./components/Header.jsx";
import SummaryCards    from "./components/SummaryCards.jsx";
import SensorPanel     from "./components/SensorPanel.jsx";
import AgronomicPanel  from "./components/AgronomicPanel.jsx";
import ChartPanel      from "./components/ChartPanel.jsx";
import WeatherPanel    from "./components/WeatherPanel.jsx";
import IrrigationPanel from "./components/IrrigationPanel.jsx";
import AIAssistant     from "./components/AIAssistant.jsx";
import FieldSummary    from "./components/FieldSummary.jsx";
import TipCard         from "./components/TipCard.jsx";
import { AlertBanner } from "./components/UI.jsx";

import { useSensorData, useSensorHistory, useMotor } from "./firebase.js";
import { useDemoSensor } from "./demo.js";
import { useWeather }    from "./weather.js";
import {
  calcVPD, calcETo, calcCWN, calcHealth, calcHeat, calcDrought,
  calcDisease, calcPhoto, calcNutrient, calcWiltHours, irrDecision,
} from "./agronomy.js";
import { LOCATION } from "./config.js";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [aiAssistantState, setAiAssistantState] = useState({
    isOpen: false,
    position: { right: 24, bottom: 24 } // Default position
  });

  const toggleAIAssistant = () => {
    if (aiAssistantState.isOpen) {
      // Close and reset to original position
      setAiAssistantState({
        isOpen: false,
        position: { right: 24, bottom: 24 }
      });
    } else {
      // Open at a different position (moved away from original)
      setAiAssistantState({
        isOpen: true,
        position: { right: 48, bottom: 48 } // Moved 24px away from original
      });
    }
  };

  // ── Firebase live data ─────────────────────────────────────────
  const { sensor: fbSensor, connected } = useSensorData();
  const { history: fbHistory }          = useSensorHistory();
  const { motorOn, toggle: rawToggle }  = useMotor();
  const [motorBusy, setMotorBusy]       = useState(false);

  // ── Demo fallback ──────────────────────────────────────────────
  const useDemoMode = !connected || fbSensor == null;
  const { sensor: demoSensor, history: demoHistory } = useDemoSensor(useDemoMode);

  const sensor = useDemoMode ? demoSensor : fbSensor;
  const T  = sensor?.temperature  ?? null;
  const H  = sensor?.humidity     ?? null;
  const S  = sensor?.soilMoisture ?? null;
  const TS = sensor?.timestamp    ?? null;

  const chartData = fbHistory.length >= 3 ? fbHistory : demoHistory;

  // ── Weather ────────────────────────────────────────────────────
  const { weather, forecast, wDemo, maxRainPct } = useWeather();

  // ── All agronomic calculations ─────────────────────────────────
  const vpd         = useMemo(() => calcVPD(T, H),                       [T, H]);
  const et0         = useMemo(() => calcETo(T, H, weather?.wind ?? 10),  [T, H, weather]);
  const cwn         = useMemo(() => calcCWN(et0),                         [et0]);
  const score       = useMemo(() => calcHealth(T, H, S),                  [T, H, S]);
  const heatStress  = useMemo(() => calcHeat(T),                          [T]);
  const droughtStress = useMemo(() => calcDrought(S),                     [S]);
  const diseaseRisk = useMemo(() => calcDisease(H, T),                    [H, T]);
  const photosynthesis = useMemo(() => calcPhoto(T, S, H),                [T, S, H]);
  const nutrientUptake = useMemo(() => calcNutrient(S),                   [S]);
  const wiltHours   = useMemo(() => calcWiltHours(S, vpd),                [S, vpd]);
  const yieldLoss   = useMemo(() => Math.min(100, Math.round(
    heatStress * 0.35 + droughtStress * 0.45 + diseaseRisk * 0.20
  )), [heatStress, droughtStress, diseaseRisk]);
  const dec         = useMemo(() => irrDecision(S, vpd, maxRainPct, T),   [S, vpd, maxRainPct, T]);


  // ── Motor toggle ───────────────────────────────────────────────
  const handleMotor = useCallback(async () => {
    setMotorBusy(true);
    await rawToggle();
    setTimeout(() => setMotorBusy(false), 1200);
  }, [rawToggle]);

  // ── Alert banners ──────────────────────────────────────────────
  const alerts = useMemo(() => {
    const a = [];
    if (S != null && S < 20)    a.push({ icon:"🚨", text:"Soil critically dry — water immediately!",        type:"danger"  });
    else if (S!=null && S < 30) a.push({ icon:"⚠️", text:"Soil is dry — consider watering today",           type:"warn"    });
    if (T != null && T > 38)    a.push({ icon:"🌡️", text:`Very hot (${T.toFixed(0)}°C) — heat stress risk`, type:"danger"  });
    if (H != null && H < 25)    a.push({ icon:"💨", text:"Very dry air — water evaporating fast",            type:"warn"    });
    if (motorOn)                a.push({ icon:"💦", text:"Water pump is running",                            type:"success" });
    if (maxRainPct > 50)        a.push({ icon:"🌧️", text:`Rain forecast (${maxRainPct}%) — skip irrigation`,type:"info"    });
    return a;
  }, [S, T, H, motorOn, maxRainPct]);

  // ── Shared sensor panel props ──────────────────────────────────
  const sensorProps = {
    temp:T, hum:H, soil:S,
    motorOn, onToggle:handleMotor, motorBusy, lastTs:TS,
  };

  // ── Layout shortcuts ───────────────────────────────────────────
  const col = { display:"flex", flexDirection:"column", gap:14 };
  const g3  = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, alignItems:"start" };
  const g2  = { display:"grid", gridTemplateColumns:"1fr 1fr",     gap:14, alignItems:"start" };

  return (
    <div style={{ minHeight:"100vh", background:"#f2f5f2" }}>
      {/* AI Assistant Floating Button */}
      <div style={{ position:"fixed", bottom:24, right:24, zIndex:1000 }}>
        <button
          onClick={toggleAIAssistant}
          style={{
            width:56, height:56, backgroundColor:"#22c55e",
            color:"white", borderRadius:"50%", boxShadow:"0 4px 12px rgba(0,0,0,0.15)",
            border:"none", cursor:"pointer", fontSize:20, display:"flex",
            alignItems:"center", justifyContent:"center", transition:"all 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          title="AI Farming Assistant"
        >
          🤖
        </button>
      </div>

      {/* AI Assistant Modal */}
      <AIAssistant
        isOpen={aiAssistantState.isOpen}
        onClose={() => setAiAssistantState({ isOpen: false, position: { right: 24, bottom: 24 } })}
        position={aiAssistantState.position}
        sensorData={{ temperature: T, humidity: H, soilMoisture: S, timestamp: TS }}
        weatherData={weather}
        agroData={{
          vpd, et0, cwn, heatStress, droughtStress, diseaseRisk,
          photosynthesis, nutrientUptake, healthScore: score,
          wiltHours, yieldLoss, dec
        }}
      />

      <Sidebar active={page} setActive={setPage} />

      <div style={{ marginLeft:68, display:"flex", flexDirection:"column", minHeight:"100vh" }}>
        <Header isLive={connected && !useDemoMode} isDemoWeather={wDemo} />

        <main style={{ flex:1, padding:"20px 24px" }}>

          {/* ── DASHBOARD ── */}
          {page === "dashboard" && (
            <>
              <div style={{ marginBottom:12 }}>
                <h2 style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:22, color:"#182818" }}>
                  Dashboard
                </h2>
                <p style={{ fontSize:12, color:"#84a084", marginTop:2 }}>
                  {useDemoMode
                    ? "🟡 Demo mode — Firebase not connected or no sensor data"
                    : "🟢 Live data from Firebase SensorData node"}
                </p>
              </div>

              <AlertBanner items={alerts} />
              <SummaryCards score={score} vpd={vpd} cwn={cwn} weather={weather} dec={dec} />

              <div style={g3}>
                {/* Left */}
                <div style={col}>
                  <SensorPanel {...sensorProps} />
                  <WeatherPanel weather={weather} forecast={forecast} wDemo={wDemo} />
                </div>

                {/* Middle */}
                <div style={col}>
                  <ChartPanel data={chartData} />
                  <AgronomicPanel temp={T} hum={H} soil={S} wind={weather?.wind} />
                </div>

                {/* Right */}
                <div style={col}>
                  <IrrigationPanel
                    soil={S} temp={T} vpd={vpd}
                    motorOn={motorOn} onToggle={handleMotor} motorBusy={motorBusy}
                    rainPct={maxRainPct} forecast={forecast}
                  />
                  <FieldSummary temp={T} hum={H} soil={S} score={score} vpd={vpd} rainPct={maxRainPct} />
                  <TipCard temp={T} hum={H} soil={S} />
                </div>
              </div>
            </>
          )}

          {/* ── AI ANALYSIS FULL PAGE ── */}
          {page === "analytics" && (
            <>
              <PTitle title="AI Crop Analysis" sub="Full report from your live sensor data" />
              <AlertBanner items={alerts} />
              <div style={g2}>
                {/* Left: AI Chat full width feel */}
                <div style={{ ...col, gridColumn:"1 / -1" }}>
                  <SummaryCards score={score} vpd={vpd} cwn={cwn} weather={weather} dec={dec} />
                </div>
                <AIAssistant
                  isOpen={aiAssistantState.isOpen}
                  onClose={() => setAiAssistantState({ isOpen: false, position: { right: 24, bottom: 24 } })}
                  position={aiAssistantState.position}
                  sensorData={{ temperature: T, humidity: H, soilMoisture: S, timestamp: TS }}
                  weatherData={weather}
                  agroData={{
                    vpd, et0, cwn, heatStress, droughtStress, diseaseRisk,
                    photosynthesis, nutrientUptake, healthScore: score,
                    wiltHours, yieldLoss, dec
                  }}
                />
                <div style={col}>
                  <AgronomicPanel temp={T} hum={H} soil={S} wind={weather?.wind} />
                  <FieldSummary temp={T} hum={H} soil={S} score={score} vpd={vpd} rainPct={maxRainPct} />
                </div>
              </div>
            </>
          )}

          {/* ── IRRIGATION ── */}
          {page === "irrigation" && (
            <>
              <PTitle title="Irrigation Control" sub="Auto-decision + manual pump override" />
              <AlertBanner items={alerts} />
              <div style={g2}>
                <IrrigationPanel
                  soil={S} temp={T} vpd={vpd}
                  motorOn={motorOn} onToggle={handleMotor} motorBusy={motorBusy}
                  rainPct={maxRainPct} forecast={forecast}
                />
                <SensorPanel {...sensorProps} />
              </div>
            </>
          )}

          {/* ── WEATHER ── */}
          {page === "weather" && (
            <>
               <PTitle title="Weather" sub={`Conditions & 5-day forecast — ${LOCATION().name}`} />
              <div style={g2}>
                <WeatherPanel weather={weather} forecast={forecast} wDemo={wDemo} />
                <AgronomicPanel temp={T} hum={H} soil={S} wind={weather?.wind} />
              </div>
            </>
          )}

          {/* ── SETTINGS ── */}
          {page === "settings" && (
            <>
              <PTitle title="Settings" sub="Dashboard configuration" />
              <SettingsPage />
            </>
          )}

          <div style={{ textAlign:"center", padding:"18px 0 8px", fontSize:11, color:"#84a084" }}>
            SmartIrrigate · {connected && !useDemoMode ? "🟢 Firebase Live" : "🟡 Demo Mode"} · AI by Groq LLaMA 3 70B
          </div>
        </main>
      </div>
    </div>
  );
}

function PTitle({ title, sub }) {
  return (
    <div style={{ marginBottom:18 }}>
      <h2 style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:22, color:"#182818" }}>{title}</h2>
      {sub && <p style={{ fontSize:12, color:"#84a084", marginTop:2 }}>{sub}</p>}
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="card" style={{ padding:24, maxWidth:540 }}>
      <p style={{ fontSize:14, fontWeight:700, color:"#182818", marginBottom:14, fontFamily:"'Sora',sans-serif" }}>
        ⚙️ Configuration
      </p>
      {[
        ["Firebase DB URL",    "https://minor-project-mt-default-rtdb.asia-southeast1.firebasedatabase.app"],
        ["Firebase Project",   "minor-project-mt"],
        ["Groq Model",         "llama3-70b-8192"],
        ["Location",           "Bhopal, MP (23.2599°N, 77.4126°E)"],
        ["Soil Dry Threshold", "30%"],
        ["Heat Stress Limit",  "38°C"],
        ["Low Humidity Alert", "25%"],
      ].map(([k, v]) => (
        <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0",
          borderBottom:"1px solid #e0ece0", fontSize:12 }}>
          <span style={{ color:"#456045", fontWeight:500 }}>{k}</span>
          <span style={{ color:"#84a084", fontFamily:"monospace", fontSize:11, maxWidth:320, textAlign:"right" }}>{v}</span>
        </div>
      ))}
      <p style={{ marginTop:12, fontSize:11, color:"#84a084", lineHeight:1.7 }}>
        Edit <code style={{ background:"#f2f5f2", padding:"1px 5px", borderRadius:4 }}>src/config.js</code> to update credentials or thresholds.
      </p>
    </div>
  );
}
