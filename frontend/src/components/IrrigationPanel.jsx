import { Bar, Toggle, SHead } from "./UI";
import { irrDecision } from "../agronomy";

export default function IrrigationPanel({ soil, temp, vpd, motorOn, onToggle, motorBusy, rainPct, forecast }) {
  const dec = irrDecision(soil, vpd, rainPct, temp);
  const urgBg  = { high:"#fdf0f0", medium:"#fdf4e6", low:"#eef8ee", none:"#eef8ee" };
  const urgBdr = { high:"#eec0c0", medium:"#f0d090", low:"#a0d0a0", none:"#a0d0a0" };
  const urgTxt = { high:"#b22020", medium:"#a06010", low:"#1a6e1a", none:"#1a6e1a" };
  const urg    = dec.urg ?? "none";
  const rainDay = forecast?.find((d) => d.rainPct > 50);

  return (
    <div className="card fade-up" style={{ padding: 18, animationDelay: "480ms" }}>
      <SHead title="💧 Irrigation Control" sub="Auto-decision engine + manual override" />

      {/* Main recommendation */}
      <div style={{
        padding: "13px 15px", borderRadius: 12,
        background: urgBg[urg], border: `1px solid ${urgBdr[urg]}`,
        marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 20 }}>{dec.icon}</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: urgTxt[urg] }}>
            {dec.on ? "Irrigation Recommended" : "No Irrigation Needed"}
          </p>
        </div>
        <p style={{ fontSize: 12, color: "#456045", lineHeight: 1.6 }}>{dec.msg}</p>
        {dec.mm > 0 && (
          <p style={{ fontSize: 12, fontWeight: 600, color: urgTxt[urg], marginTop: 5 }}>
            💧 Apply approx. <b>{dec.mm} mm</b> of water
          </p>
        )}
        {rainDay && (
          <p style={{ fontSize: 11, color: "#1260a0", marginTop: 5 }}>
            🌧️ Rain forecast on {rainDay.day} ({rainDay.rainPct}%) — adjust your plan
          </p>
        )}
      </div>

      {/* Threshold bars */}
      <p style={{ fontSize: 10, fontWeight: 700, color: "#84a084", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        Sensor Levels vs Thresholds
      </p>

      <ThreshRow label="Soil Moisture" val={soil} unit="%" max={100}
        threshold={30} threshLabel="< 30% → Irrigate"
        color={soil != null && soil < 30 ? "#d94f4f" : "#27a627"} />
      <ThreshRow label="Temperature" val={temp} unit="°C" max={50}
        threshold={38} threshLabel="> 38°C → Heat Stress"
        color={temp != null && temp > 38 ? "#d94f4f" : "#27a627"} />
      <ThreshRow label="Air Dryness (VPD)" val={vpd} unit=" kPa" max={5}
        threshold={2} threshLabel="> 2 kPa → High Stress"
        color={vpd != null && vpd > 2 ? "#c97a1a" : "#27a627"} decimals={2} />

      {/* Manual pump toggle */}
      <div style={{
        marginTop: 12, padding: "12px 14px", borderRadius: 10,
        background: motorOn ? "#eef8ee" : "#f2f5f2",
        border: `1px solid ${motorOn ? "#a0d0a0" : "#e0ece0"}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: motorOn ? "#1a6e1a" : "#456045" }}>
            ⚙️ Pump — {motorOn ? "Running" : "Off"}
          </p>
          <p style={{ fontSize: 11, color: "#84a084", marginTop: 2 }}>
            {motorOn ? "Water flowing to fields" : "Manual override available"}
          </p>
        </div>
        <Toggle on={motorOn} onChange={onToggle} disabled={motorBusy} />
      </div>
    </div>
  );
}

function ThreshRow({ label, val, unit, max, threshold, threshLabel, color, decimals = 1 }) {
  const pct     = Math.min(100, Math.max(0, ((val ?? 0) / max) * 100));
  const thPct   = (threshold / max) * 100;
  const display = val != null ? `${Number(val).toFixed(decimals)}${unit}` : "--";

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: "#456045", fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{display}</span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 99, background: "#e8f0e8", overflow: "visible" }}>
        {/* Fill */}
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          borderRadius: 99, background: color, width: `${pct}%`,
          transition: "width 1s",
        }} />
        {/* Threshold marker */}
        <div style={{
          position: "absolute", top: -3, width: 2, height: 12, borderRadius: 2,
          background: "#c97a1a", left: `${thPct}%`,
        }} />
      </div>
      <p style={{ fontSize: 10, color: "#84a084", marginTop: 2 }}>{threshLabel}</p>
    </div>
  );
}
