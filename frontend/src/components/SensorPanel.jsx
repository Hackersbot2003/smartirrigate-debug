import { Ring, Bar, Toggle, SHead } from "./UI";
import { lSoil, lTemp, lHum } from "../agronomy";

export default function SensorPanel({ temp, hum, soil, motorOn, onToggle, motorBusy, lastTs }) {
  const sl = lSoil(soil);
  const tl = lTemp(temp);
  const hl = lHum(hum);
  const tsStr = lastTs
    ? new Date(typeof lastTs === "number" && lastTs < 1e10 ? lastTs * 1000 : lastTs)
        .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "Waiting for ESP32…";

  const f = (v, d = 1) => v != null ? Number(v).toFixed(d) : "--";

  return (
    <div className="card fade-up" style={{ padding: 18, animationDelay: "240ms" }}>
      <SHead title="📡 Live Sensor Feed" sub={`Last update: ${tsStr}`} />

      {/* Three ring gauges */}
      <div style={{ display:"flex", justifyContent:"space-around", paddingBottom:16, borderBottom:"1px solid #e0ece0", marginBottom:14 }}>
        {[
          { val:temp, max:50,  color:tl.c, unit:"°C", label:"Temperature", lbl:tl },
          { val:hum,  max:100, color:"#2f86d4", unit:"%",  label:"Humidity",    lbl:hl },
          { val:soil, max:100, color:sl.c,  unit:"%",  label:"Soil Water",  lbl:sl },
        ].map(({ val, max, color, unit, label, lbl }) => (
          <div key={label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <Ring val={val} max={max} color={color} size={86} sw={7} unit={unit} label={label} />
            <p style={{ fontSize:11, fontWeight:600, color:lbl.c, textAlign:"center", maxWidth:82 }}>{lbl.t}</p>
          </div>
        ))}
      </div>

      {/* Progress bars with labels */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
        {[
          { icon:"🌡️", label:"Temperature",  val:temp, max:50,  color:tl.c,      unit:"°C" },
          { icon:"💧", label:"Humidity",      val:hum,  max:100, color:"#2f86d4", unit:"%"  },
          { icon:"🌱", label:"Soil Moisture", val:soil, max:100, color:sl.c,      unit:"%"  },
        ].map(({ icon, label, val, max, color, unit }) => (
          <div key={label}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
              <span style={{ color:"#456045" }}>{icon} {label}</span>
              <span style={{ fontWeight:700, color:"#182818" }}>
                {val != null ? `${f(val)} ${unit}` : "--"}
              </span>
            </div>
            <Bar val={val} max={max} color={color} />
          </div>
        ))}
      </div>

      {/* Health bar */}
      <div style={{
        padding:"9px 13px", borderRadius:10,
        background:"#f2f5f2", border:"1px solid #e0ece0",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:10,
      }}>
        <span style={{ fontSize:12, color:"#456045" }}>❤️ Health score</span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:78 }}>
            <Bar val={Math.max(0, Math.min(100, (soil??0) - Math.max(0, ((temp??30)-30)*2)))} max={100} color="#27a627" />
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:"#27a627" }}>
            {soil != null ? Math.max(0, Math.min(100, Math.round((soil??0)-Math.max(0,((temp??30)-30)*2)))) : "--"}
          </span>
          <span style={{
            fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99,
            background:"#eef8ee", color:"#1a6e1a", border:"1px solid #a0d0a0",
          }}>
            {soil == null ? "LOADING" : soil > 50 ? "EXCELLENT" : soil > 35 ? "GOOD" : soil > 20 ? "FAIR" : "LOW"}
          </span>
        </div>
      </div>

      {/* Motor toggle */}
      <div style={{
        padding:"11px 13px", borderRadius:10,
        background: motorOn ? "#eef8ee" : "#fdf4e6",
        border:`1px solid ${motorOn?"#a0d0a0":"#f0d090"}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:motorOn?"#1a6e1a":"#a06010" }}>
            💦 Water Pump — {motorOn ? "Running" : "Off"}
          </p>
          <p style={{ fontSize:11, color:"#456045", marginTop:2 }}>
            {motorOn ? "Water is flowing to your fields" : "Pump is switched off"}
          </p>
        </div>
        <Toggle on={motorOn} onChange={onToggle} disabled={motorBusy} />
      </div>
    </div>
  );
}
