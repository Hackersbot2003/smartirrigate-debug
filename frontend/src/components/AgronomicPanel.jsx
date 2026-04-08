import { Bar, SHead } from "./UI";
import {
  calcVPD, calcETo, calcCWN, calcDew, calcHeat, calcDrought,
  calcDisease, calcPhoto, calcNutrient, calcWiltHours, lVPD,
} from "../agronomy";

const KMini = ({ label, val, unit, bg, c }) => (
  <div style={{ padding:"10px 12px", borderRadius:10, background:bg, flex:1, minWidth:0 }}>
    <p style={{ fontSize:9, fontWeight:700, color:c, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>{label}</p>
    <p style={{ fontSize:18, fontWeight:700, fontFamily:"'Sora',sans-serif", color:"#182818", lineHeight:1 }}>
      {val}<span style={{ fontSize:11, color:"#84a084", marginLeft:3 }}>{unit}</span>
    </p>
  </div>
);

const Row = ({ icon, label, val, unit, pct, color, desc }) => (
  <div style={{ padding:"9px 0", borderBottom:"1px solid #e0ece0" }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
      <span style={{ fontSize:12, color:"#182818" }}>{icon} <span style={{ fontWeight:500 }}>{label}</span></span>
      <span style={{ fontSize:13, fontWeight:700, color }}>{val != null ? `${val}${unit??""}` : "--"}</span>
    </div>
    {pct != null && <Bar val={pct} max={100} color={color} h={5} />}
    <p style={{ fontSize:10, color:"#84a084", marginTop:3 }}>{desc}</p>
  </div>
);

export default function AgronomicPanel({ temp, hum, soil, wind = 10, solar = 18 }) {
  const vpd     = calcVPD(temp, hum);
  const et0     = calcETo(temp, hum, wind, solar);
  const cwn     = calcCWN(et0);
  const dew     = calcDew(temp, hum);
  const heat    = calcHeat(temp);
  const drought = calcDrought(soil);
  const disease = calcDisease(hum, temp);
  const photo   = calcPhoto(temp, soil, hum);
  const nutr    = calcNutrient(soil);
  const wilt    = calcWiltHours(soil, vpd);
  const vl      = lVPD(vpd);
  const f       = (v, d = 2) => v != null ? Number(v).toFixed(d) : "--";

  return (
    <div className="card fade-up" style={{ padding:18, animationDelay:"300ms" }}>
      <SHead title="🧪 Agronomic Metrics" sub="Calculated from your sensors + weather" />

      {/* 4 mini KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        <KMini label="VPD (Air Dryness)"  val={f(vpd)}  unit="kPa"    bg="#e6f2fd" c="#1260a0" />
        <KMini label="ET₀ (Evaporation)"  val={f(et0)}  unit="mm/day" bg="#fdf4e6" c="#a06010" />
        <KMini label="Crop Water Need"    val={f(cwn)}  unit="mm/day" bg="#eef8ee" c="#1a6e1a" />
        <KMini label="Dew Point"          val={dew != null ? `${dew}°C` : "--"} unit="" bg="#f2f5f2" c="#456045" />
      </div>

      {/* VPD plain English pill */}
      <div style={{ padding:"7px 11px", borderRadius:8, background:vl.c+"14", marginBottom:12, fontSize:12, color:vl.c, fontWeight:500 }}>
        💨 Air dryness: {vl.t}
      </div>

      {/* Factor rows */}
      <Row icon="📸" label="Photosynthesis Efficiency"
        val={photo} unit="%" pct={photo}
        color={photo==null?"#888":photo>70?"#27a627":photo>40?"#c97a1a":"#d94f4f"}
        desc={photo==null?"Waiting…":photo>70?"Crops converting sunlight well ✓":photo>40?"Efficiency reduced — check conditions":"Very low — crops are struggling"}
      />
      <Row icon="🌾" label="Nutrient Uptake"
        val={nutr} unit="%" pct={nutr}
        color={nutr==null?"#888":nutr>70?"#27a627":nutr>40?"#c97a1a":"#d94f4f"}
        desc={nutr==null?"Waiting…":nutr>70?"Roots absorbing nutrients well ✓":"Low soil moisture is slowing nutrient uptake"}
      />
      <Row icon="🔥" label="Heat Stress Index"
        val={heat} unit="%" pct={heat}
        color={heat<20?"#27a627":heat<55?"#c97a1a":"#d94f4f"}
        desc={heat<20?"Temperature is comfortable for crops ✓":heat<55?"Some heat stress — monitor closely":"High heat — crops need water & shade 🚨"}
      />
      <Row icon="🏜️" label="Drought Stress Index"
        val={drought} unit="%" pct={drought}
        color={drought<20?"#27a627":drought<55?"#c97a1a":"#d94f4f"}
        desc={drought<20?"Soil has enough water ✓":drought<55?"Getting dry — consider watering":"Crops are stressed from dryness 🚨"}
      />
      <Row icon="🍄" label="Disease Risk"
        val={disease} unit="%" pct={disease}
        color={disease<25?"#27a627":disease<60?"#c97a1a":"#7c4fba"}
        desc={disease<25?"Low risk of crop disease ✓":disease<60?"Moderate risk — watch for disease signs":"High fungal risk — reduce humidity"}
      />

      {/* Wilt & Canopy row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:6 }}>
        <div style={{ padding:"9px 12px", borderRadius:9, background:"#f2f5f2", border:"1px solid #e0ece0" }}>
          <p style={{ fontSize:9, fontWeight:700, color:"#84a084", textTransform:"uppercase", letterSpacing:1 }}>Time to Wilt</p>
          <p style={{ fontSize:17, fontWeight:700, fontFamily:"'Sora',sans-serif", color:"#182818", marginTop:3 }}>
            {wilt == null ? "--" : wilt === 0 ? "Now 🚨" : `~${wilt}h`}
          </p>
          <p style={{ fontSize:10, color:"#84a084", marginTop:2 }}>Hours until crops wilt</p>
        </div>
        <div style={{ padding:"9px 12px", borderRadius:9, background:"#f2f5f2", border:"1px solid #e0ece0" }}>
          <p style={{ fontSize:9, fontWeight:700, color:"#84a084", textTransform:"uppercase", letterSpacing:1 }}>Yield Loss Risk</p>
          <p style={{ fontSize:17, fontWeight:700, fontFamily:"'Sora',sans-serif",
            color:heat+drought>60?"#d94f4f":"#27a627", marginTop:3 }}>
            ~{Math.min(100, Math.round(heat*0.35 + drought*0.45 + disease*0.20))}%
          </p>
          <p style={{ fontSize:10, color:"#84a084", marginTop:2 }}>Estimated yield reduction</p>
        </div>
      </div>
    </div>
  );
}
