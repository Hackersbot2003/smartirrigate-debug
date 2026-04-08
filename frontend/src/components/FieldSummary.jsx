import { SHead } from "./UI";
import { lSoil, lTemp, lHum, lHealth, irrDecision } from "../agronomy";

export default function FieldSummary({ temp, hum, soil, score, vpd, rainPct }) {
  const sl  = lSoil(soil);
  const tl  = lTemp(temp);
  const hl  = lHum(hum);
  const hsl = lHealth(score);
  const dec = irrDecision(soil, vpd, rainPct, temp);

  const rows = [
    { icon:"🌱", label:"Soil Water",      val:sl.t,  ok:sl.c==="#1a6e1a" },
    { icon:"🌡️", label:"Field Heat",      val:tl.t,  ok:tl.c==="#1a6e1a" },
    { icon:"💧", label:"Air Moisture",    val:hl.t,  ok:hl.c==="#1a6e1a" },
    { icon:"💦", label:"Water Today?",    val:`${dec.icon} ${dec.on?"Water crops now":"No watering needed"}`, ok:!dec.on },
    { icon:"❤️", label:"Overall Health",  val:`${score??"-"}/100 — ${hsl.t}`, ok:(score??0)>=70 },
  ];

  return (
    <div className="card fade-up" style={{ padding:18, animationDelay:"500ms" }}>
      <SHead title="📋 Today's Field Summary" sub="Everything in plain language" />

      <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
        {rows.map((r) => (
          <div key={r.label} style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"9px 0", borderBottom:"1px solid #e0ece0",
          }}>
            <span style={{ fontSize:18, width:24 }}>{r.icon}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:11, color:"#84a084", fontWeight:500 }}>{r.label}</p>
              <p style={{ fontSize:13, fontWeight:600, color: r.ok ? "#182818" : "#a06010", marginTop:1 }}>{r.val}</p>
            </div>
            <div style={{
              width:24, height:24, borderRadius:"50%",
              background: r.ok ? "#eef8ee" : "#fdf4e6",
              border: `1px solid ${r.ok ? "#a0d0a0" : "#f0d090"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12,
            }}>
              {r.ok ? "✓" : "!"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
