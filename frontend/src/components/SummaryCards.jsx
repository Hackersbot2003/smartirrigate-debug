import { Ring, WIcon } from "./UI";
import { lHealth, lVPD } from "../agronomy";

export default function SummaryCards({ score, vpd, cwn, weather, dec }) {
  const hl = lHealth(score);
  const vl = lVPD(vpd);
  const urgC = { high:"#b22020", medium:"#a06010", low:"#1a6e1a", none:"#1a6e1a" };

  const K = ({ label, children, accent, delay }) => (
    <div className="card fade-up" style={{ padding:18, borderTop:`3px solid ${accent}`, animationDelay:`${delay}ms` }}>
      <p style={{ fontSize:10, fontWeight:700, color:"#84a084", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>{label}</p>
      {children}
    </div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>

      {/* Health */}
      <K label="Crop Health Score" accent={hl.ring} delay={0}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <Ring val={score} color={hl.ring} size={76} sw={7} unit="/100" />
          <div>
            <p style={{ fontSize:28, fontWeight:700, fontFamily:"'Sora',sans-serif", color:"#182818", lineHeight:1 }}>
              {score ?? "--"}
            </p>
            <p style={{ fontSize:12, fontWeight:600, color:hl.c, marginTop:4 }}>{hl.t}</p>
          </div>
        </div>
      </K>

      {/* VPD */}
      <K label="Air Dryness (VPD)" accent="#2f86d4" delay={60}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:28, fontWeight:700, fontFamily:"'Sora',sans-serif", color:"#182818", lineHeight:1 }}>
              {vpd != null ? vpd.toFixed(2) : "--"}
              <span style={{ fontSize:13, color:"#84a084", marginLeft:4 }}>kPa</span>
            </p>
            <p style={{ fontSize:11, fontWeight:500, color:vl.c, marginTop:4 }}>{vl.t}</p>
          </div>
          <span style={{ fontSize:30 }}>💨</span>
        </div>
      </K>

      {/* Water Need */}
      <K label="Water Need Today" accent="#c97a1a" delay={120}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:28, fontWeight:700, fontFamily:"'Sora',sans-serif", color:"#182818", lineHeight:1 }}>
              {cwn != null ? cwn.toFixed(1) : "--"}
              <span style={{ fontSize:13, color:"#84a084", marginLeft:4 }}>mm/day</span>
            </p>
            <p style={{ fontSize:11, fontWeight:500, color: urgC[dec?.urg ?? "none"], marginTop:4 }}>
              {dec?.icon} {dec?.msg ?? "Calculating…"}
            </p>
          </div>
          <span style={{ fontSize:30 }}>🪣</span>
        </div>
      </K>

      {/* Weather */}
      <K label="Weather Now" accent="#2f86d4" delay={180}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:28, fontWeight:700, fontFamily:"'Sora',sans-serif", color:"#2f86d4", lineHeight:1 }}>
              {weather?.temp != null ? `${weather.temp}°C` : "--°C"}
            </p>
            <p style={{ fontSize:11, color:"#456045", marginTop:4 }}>
              Feels {weather?.feels ?? "--"}°C · {weather?.hum ?? "--"}% hum
            </p>
            <p style={{ fontSize:11, color:"#84a084", marginTop:2, textTransform:"capitalize" }}>
              {weather?.desc ?? "Loading…"}
            </p>
          </div>
          {weather?.icon && <WIcon code={weather.icon} size={46} />}
        </div>
      </K>

    </div>
  );
}
