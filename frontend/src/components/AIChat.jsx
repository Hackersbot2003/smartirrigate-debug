import { useState, useRef, useEffect } from "react";
import { SHead, Dots } from "./UI";

const QUICK_QUESTIONS = [
  "Should I water my crops today?",
  "Is my crop health good?",
  "What is stressing my plants right now?",
  "How much water do my crops need?",
  "Is there any disease risk today?",
  "What should I do right now for my farm?",
];

// ── Status color helpers ───────────────────────────────────────────
const statusColor = (s) => {
  const map = {
    excellent:"#1a6e1a", good:"#27a627", ideal:"#27a627", low:"#27a627",
    fair:"#a06010", warm:"#a06010", medium:"#a06010", reduced:"#a06010",
    poor:"#b22020", hot:"#b22020", high:"#b22020", dry:"#b22020",
    critical:"#7a0000", "very low":"#7a0000", "critically dry":"#7a0000",
    "dangerously hot":"#7a0000",
  };
  return map[(s ?? "").toLowerCase()] ?? "#456045";
};

const urgencyStyle = {
  immediate: { bg:"#fdf0f0", border:"#eec0c0", c:"#b22020", label:"⚡ Act Now" },
  today:     { bg:"#fdf4e6", border:"#f0d090", c:"#a06010", label:"📅 Today"  },
  this_week: { bg:"#e6f2fd", border:"#b0d0f0", c:"#1260a0", label:"📆 This Week" },
  none:      { bg:"#eef8ee", border:"#a0d0a0", c:"#1a6e1a", label:"✅ All Good" },
};

// ── Sub-components ─────────────────────────────────────────────────

function ScoreRing({ score }) {
  const color = score >= 80 ? "#27a627" : score >= 60 ? "#c97a1a" : score >= 40 ? "#d94f4f" : "#8b0000";
  const r = 44; const circ = 2 * Math.PI * r;
  const off = circ * (1 - (score ?? 0) / 100);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={104} height={104} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={52} cy={52} r={r} fill="none" stroke="#e8f0e8" strokeWidth={9}/>
        <circle cx={52} cy={52} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}/>
        <g style={{ transform:"rotate(90deg)", transformOrigin:"52px 52px" }}>
          <text x={52} y={46} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize:22, fontWeight:800, fontFamily:"'Sora',sans-serif", fill:"#182818" }}>
            {score ?? "--"}
          </text>
          <text x={52} y={64} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize:10, fill:"#84a084" }}>/100</text>
        </g>
      </svg>
    </div>
  );
}

function SectionCard({ icon, title, children, accent = "#e0ece0" }) {
  return (
    <div style={{ borderRadius:12, border:`1px solid ${accent}`, overflow:"hidden", marginBottom:10 }}>
      <div style={{ padding:"9px 14px", background: accent + "40", borderBottom:`1px solid ${accent}`,
        display:"flex", alignItems:"center", gap:7 }}>
        <span style={{ fontSize:14 }}>{icon}</span>
        <p style={{ fontSize:12, fontWeight:700, color:"#182818", fontFamily:"'Sora',sans-serif" }}>{title}</p>
      </div>
      <div style={{ padding:"10px 14px" }}>{children}</div>
    </div>
  );
}

function AnalysisReport({ data }) {
  const urg = urgencyStyle[data.urgency] ?? urgencyStyle.none;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>

      {/* Header — score + status */}
      <div style={{ display:"flex", alignItems:"center", gap:18, padding:"14px 0 12px", borderBottom:"1px solid #e0ece0", marginBottom:12 }}>
        <ScoreRing score={data.healthScore} />
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontSize:18, fontWeight:800, fontFamily:"'Sora',sans-serif",
              color: statusColor(data.overallStatus) }}>
              {data.overallStatus}
            </span>
            <span style={{
              padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700,
              background:urg.bg, color:urg.c, border:`1px solid ${urg.border}`,
            }}>{urg.label}</span>
          </div>
          <p style={{ fontSize:13, color:"#456045", lineHeight:1.6 }}>{data.mainMessage}</p>
        </div>
      </div>

      {/* Irrigation advice */}
      <SectionCard icon="💧" title="Irrigation Advice"
        accent={data.irrigationAdvice?.shouldIrrigate ? "#f0d090" : "#a0d0a0"}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <span style={{ fontSize:22 }}>{data.irrigationAdvice?.shouldIrrigate ? "🔴" : "✅"}</span>
          <div>
            <p style={{ fontSize:13, fontWeight:700,
              color: data.irrigationAdvice?.shouldIrrigate ? "#a06010" : "#1a6e1a" }}>
              {data.irrigationAdvice?.when}
            </p>
            <p style={{ fontSize:12, color:"#84a084" }}>Apply: {data.irrigationAdvice?.howMuch}</p>
          </div>
        </div>
        <p style={{ fontSize:12, color:"#456045", lineHeight:1.5 }}>{data.irrigationAdvice?.reason}</p>
        {data.bestIrrigationTime && (
          <p style={{ fontSize:11, color:"#1260a0", marginTop:5, fontWeight:500 }}>
            ⏰ Best time: {data.bestIrrigationTime}
          </p>
        )}
      </SectionCard>

      {/* Sensor readings */}
      <SectionCard icon="📡" title="Sensor Reading Analysis" accent="#b0d4f0">
        {[
          { label:"Soil Moisture",  data: data.soilAnalysis,       icon:"🌱" },
          { label:"Temperature",    data: data.temperatureAnalysis, icon:"🌡️" },
          { label:"Humidity",       data: data.humidityAnalysis,    icon:"💧" },
        ].map(({ label, data: d, icon }) => d && (
          <div key={label} style={{ marginBottom:10, paddingBottom:10, borderBottom:"1px solid #e8f0e8" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#182818" }}>{icon} {label}</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#182818", fontFamily:"monospace" }}>{d.reading}</span>
                <span style={{
                  fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
                  background: statusColor(d.status) + "15", color: statusColor(d.status),
                  border:`1px solid ${statusColor(d.status)}30`,
                }}>{d.status}</span>
              </div>
            </div>
            <p style={{ fontSize:12, color:"#456045", lineHeight:1.5 }}>{d.interpretation}</p>
            {d.action && d.action !== "No action needed" && d.action !== "Temperature is fine" && (
              <p style={{ fontSize:11, color:"#1a6e1a", marginTop:3, fontWeight:500 }}>→ {d.action}</p>
            )}
          </div>
        ))}
      </SectionCard>

      {/* Stress factors */}
      <SectionCard icon="⚠️" title="Stress Factors" accent="#f0d090">
        {data.stressFactors?.map((f) => (
          <div key={f.name} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#182818" }}>{f.name}</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:12, fontWeight:700, fontFamily:"monospace",
                  color: statusColor(f.severity) }}>{f.level}</span>
                <span style={{
                  fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
                  background: statusColor(f.severity) + "15", color: statusColor(f.severity),
                  border:`1px solid ${statusColor(f.severity)}30`,
                }}>{f.severity}</span>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ height:4, borderRadius:99, background:"#e8f0e8", overflow:"hidden", marginBottom:3 }}>
              <div style={{
                height:"100%", borderRadius:99,
                width: f.level,
                background: statusColor(f.severity),
                transition:"width 1s",
              }}/>
            </div>
            <p style={{ fontSize:11, color:"#456045" }}>{f.impact}</p>
            <p style={{ fontSize:11, color:"#1a6e1a", fontWeight:500, marginTop:2 }}>💡 {f.remedy}</p>
          </div>
        ))}
      </SectionCard>

      {/* Crop performance */}
      <SectionCard icon="🌾" title="Crop Performance" accent="#a0d0a0">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
          {[
            { label:"Photosynthesis",  status: data.cropPerformance?.photosynthesisStatus, note: data.cropPerformance?.photosynthesisNote },
            { label:"Nutrient Uptake", status: data.cropPerformance?.nutrientUptakeStatus, note: data.cropPerformance?.nutrientUptakeNote  },
          ].map(({ label, status, note }) => (
            <div key={label} style={{ padding:"8px 10px", borderRadius:8, background:"#f2f5f2", border:"1px solid #e0ece0" }}>
              <p style={{ fontSize:10, color:"#84a084", fontWeight:600, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</p>
              <p style={{ fontSize:13, fontWeight:700, color: statusColor(status), marginTop:2 }}>{status ?? "--"}</p>
              <p style={{ fontSize:11, color:"#456045", marginTop:2 }}>{note}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize:12, color:"#456045" }}>
          <b>Growth:</b> {data.cropPerformance?.overallGrowth}
        </p>
        <p style={{ fontSize:12, color:"#456045", marginTop:3 }}>
          <b>Yield forecast:</b> {data.cropPerformance?.yieldForecast}
        </p>
      </SectionCard>

      {/* Today's schedule */}
      {data.todaySchedule?.length > 0 && (
        <SectionCard icon="📅" title="Today's Schedule" accent="#b0c8f0">
          {data.todaySchedule.map((item, i) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:7, alignItems:"flex-start" }}>
              <span style={{
                fontSize:10, fontWeight:700, color:"#1260a0", background:"#e6f2fd",
                border:"1px solid #b0d0f0", padding:"2px 7px", borderRadius:99,
                whiteSpace:"nowrap", flexShrink:0, marginTop:1,
              }}>{item.time}</span>
              <p style={{ fontSize:12, color:"#456045" }}>{item.task}</p>
            </div>
          ))}
        </SectionCard>
      )}

      {/* Immediate actions */}
      <SectionCard icon="🚀" title="Immediate Actions" accent="#f0c0a0">
        {data.immediateActions?.map((action, i) => (
          <div key={i} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"flex-start" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#c97a1a", flexShrink:0 }}>{i+1}.</span>
            <p style={{ fontSize:12, color:"#456045", lineHeight:1.5 }}>{action}</p>
          </div>
        ))}
      </SectionCard>

      {/* Warnings & tips */}
      <SectionCard icon="🍄" title="Disease & Pest Warnings" accent="#d0c0e8">
        <p style={{ fontSize:12, color:"#456045", lineHeight:1.6 }}>{data.diseaseWarnings}</p>
      </SectionCard>

      <SectionCard icon="🌱" title="Fertilizer Advice" accent="#c0d4a0">
        <p style={{ fontSize:12, color:"#456045", lineHeight:1.6 }}>{data.fertilizerAdvice}</p>
      </SectionCard>

      <SectionCard icon="🌤️" title="Weather Impact on Crops" accent="#b0d4f0">
        <p style={{ fontSize:12, color:"#456045", lineHeight:1.6 }}>{data.weatherImpact}</p>
        {data.waterSavingTip && (
          <p style={{ fontSize:12, color:"#1260a0", marginTop:6, fontWeight:500 }}>
            💧 Water-saving tip: {data.waterSavingTip}
          </p>
        )}
      </SectionCard>

      {/* Weekly tips */}
      <SectionCard icon="📆" title="Tips for This Week" accent="#a0d0a0">
        {data.weeklyTips?.map((tip, i) => (
          <div key={i} style={{ display:"flex", gap:7, marginBottom:5 }}>
            <span style={{ color:"#27a627", fontSize:13, flexShrink:0 }}>✓</span>
            <p style={{ fontSize:12, color:"#456045", lineHeight:1.5 }}>{tip}</p>
          </div>
        ))}
      </SectionCard>

    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────
function Bubble({ role, text }) {
  const isUser = role === "user";
  return (
    <div style={{ display:"flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div style={{
        maxWidth:"84%", padding:"9px 13px",
        borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
        background: isUser ? "#27a627" : "#f2f5f2",
        color:      isUser ? "#fff"    : "#182818",
        border:     isUser ? "none"    : "1px solid #e0ece0",
        fontSize:13, lineHeight:1.65,
      }}>
        {text}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function AIChat({
  chatMsgs, chatLoading,
  analysis, analyzing, analysisErr,
  onSend, onAnalyze,
}) {
  const [input,    setInput]   = useState("");
  const [tab,      setTab]     = useState("chat");   // "chat" | "report"
  const chatRef                = useRef(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [chatMsgs, chatLoading]);

  // Switch to report tab when analysis comes in
  useEffect(() => {
    if (analysis) setTab("report");
  }, [analysis]);

  const send = () => {
    const q = input.trim();
    if (!q || chatLoading) return;
    setInput("");
    onSend(q);
    setTab("chat");
  };

  return (
    <div className="card fade-up" style={{ padding:0, animationDelay:"540ms", display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{
        padding:"13px 18px", borderBottom:"1px solid #e0ece0",
        display:"flex", alignItems:"center", gap:10,
      }}>
        <div style={{
          width:38, height:38, borderRadius:11, flexShrink:0,
          background:"linear-gradient(135deg,#c97a1a,#e8b040)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:18, boxShadow:"0 3px 10px rgba(201,122,26,.3)",
        }}>🤖</div>
        <div>
          <p style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:13, color:"#182818" }}>
            Farmer AI Expert
          </p>
          <p style={{ fontSize:11, color:"#84a084" }}>
            Reads your LIVE sensor data · Groq LLaMA
          </p>
        </div>
        <span style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700,
          background:"#fdf4e6", color:"#a06010", border:"1px solid #f0d090" }}>
          GROQ AI
        </span>
      </div>

      {/* Analyze button */}
      <div style={{ padding:"10px 14px", borderBottom:"1px solid #e0ece0" }}>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          style={{
            width:"100%", padding:"10px 0", borderRadius:10,
            background: analyzing ? "#f2f5f2" : "linear-gradient(135deg,#1a6e1a,#27a627)",
            color: analyzing ? "#84a084" : "#fff",
            border: analyzing ? "1px solid #e0ece0" : "none",
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            fontSize:13, fontWeight:700, cursor: analyzing ? "not-allowed" : "pointer",
            boxShadow: analyzing ? "none" : "0 3px 12px rgba(39,166,39,.3)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all .2s",
          }}
        >
          {analyzing ? (
            <>
              <span style={{ display:"inline-flex", gap:4 }}>
                <span className="d1" style={{ width:6, height:6, borderRadius:"50%", background:"#84a084", display:"inline-block" }}/>
                <span className="d2" style={{ width:6, height:6, borderRadius:"50%", background:"#84a084", display:"inline-block" }}/>
                <span className="d3" style={{ width:6, height:6, borderRadius:"50%", background:"#84a084", display:"inline-block" }}/>
              </span>
              Analyzing your crops with live data…
            </>
          ) : (
            <>🔬 Analyze My Crops with Live Data</>
          )}
        </button>
        {analysisErr && (
          <p style={{ fontSize:11, color:"#b22020", marginTop:5, textAlign:"center" }}>{analysisErr}</p>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", borderBottom:"1px solid #e0ece0" }}>
        {[
          { id:"chat",   label:"💬 Chat" },
          { id:"report", label:`🔬 Full Report${analysis ? " ✓" : ""}` },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:"8px 0", fontSize:12, fontWeight:600, cursor:"pointer",
            background:"transparent", border:"none",
            borderBottom: tab === t.id ? "2px solid #27a627" : "2px solid transparent",
            color: tab === t.id ? "#27a627" : "#84a084",
            transition:"all .15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Chat tab */}
      {tab === "chat" && (
        <>
          <div ref={chatRef} style={{
            flex:1, overflowY:"auto", padding:"12px 14px",
            display:"flex", flexDirection:"column", gap:9,
            minHeight:220, maxHeight:340,
          }}>
            {chatMsgs.map((m, i) => <Bubble key={i} role={m.role} text={m.text} />)}
            {chatLoading && (
              <div style={{ display:"flex" }}>
                <div style={{ background:"#f2f5f2", border:"1px solid #e0ece0",
                  borderRadius:"14px 14px 14px 2px", padding:"8px 12px" }}>
                  <Dots />
                </div>
              </div>
            )}
          </div>

          {/* Quick questions */}
          <div style={{ padding:"8px 14px", borderTop:"1px solid #e0ece0" }}>
            <p style={{ fontSize:10, color:"#84a084", marginBottom:5, fontWeight:600 }}>QUICK ASK:</p>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
              {QUICK_QUESTIONS.map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  style={{
                    fontSize:11, padding:"3px 8px", borderRadius:7, cursor:"pointer",
                    background:"#f2f5f2", color:"#456045",
                    border:"1px solid #e0ece0", transition:"all .15s",
                    lineHeight:1.5,
                  }}
                  onMouseEnter={(e) => { e.target.style.borderColor="#a0d0a0"; e.target.style.color="#1a6e1a"; }}
                  onMouseLeave={(e) => { e.target.style.borderColor="#e0ece0"; e.target.style.color="#456045"; }}
                >{q}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:7 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about your farm (uses live sensor data)…"
                style={{
                  flex:1, padding:"8px 12px", borderRadius:9,
                  border:"1px solid #e0ece0", background:"#f2f5f2",
                  fontSize:13, color:"#182818", outline:"none",
                  fontFamily:"'Plus Jakarta Sans',sans-serif",
                  transition:"border-color .2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#a0d0a0"}
                onBlur={(e)  => e.target.style.borderColor = "#e0ece0"}
              />
              <button onClick={send} disabled={chatLoading || !input.trim()}
                style={{
                  padding:"8px 16px", borderRadius:9,
                  background:"#27a627", color:"#fff",
                  border:"none", fontWeight:700, fontSize:13, cursor:"pointer",
                  boxShadow:"0 2px 8px rgba(39,166,39,.25)",
                  opacity: (chatLoading || !input.trim()) ? 0.5 : 1,
                }}>Ask</button>
            </div>
          </div>
        </>
      )}

      {/* Full report tab */}
      {tab === "report" && (
        <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", maxHeight:600 }}>
          {analysis ? (
            <AnalysisReport data={analysis} />
          ) : (
            <div style={{ padding:"30px 0", textAlign:"center", color:"#84a084" }}>
              <p style={{ fontSize:28, marginBottom:10 }}>🔬</p>
              <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>No analysis yet</p>
              <p style={{ fontSize:12 }}>Click "Analyze My Crops with Live Data" above</p>
              <p style={{ fontSize:11, marginTop:4 }}>The AI will read your actual sensor values and give a complete report</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
