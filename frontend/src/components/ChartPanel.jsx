import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { SHead } from "./UI";

const TABS = [
  { id: "all",  label: "All"      },
  { id: "soil", label: "Soil"     },
  { id: "temp", label: "Temp"     },
  { id: "hum",  label: "Humidity" },
];

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ctip">
      <p style={{ fontWeight: 700, marginBottom: 4, color: "#182818" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontSize: 12 }}>
          {p.name}: <b>{Number(p.value).toFixed(1)}</b>
        </p>
      ))}
    </div>
  );
}

export default function ChartPanel({ data }) {
  const [tab, setTab] = useState("all");
  const showS = tab === "all" || tab === "soil";
  const showT = tab === "all" || tab === "temp";
  const showH = tab === "all" || tab === "hum";

  // safe guard empty data
  const safeData = data?.length ? data : [];

  return (
    <div className="card fade-up" style={{ padding: 18, animationDelay: "360ms" }}>
      <SHead
        title="📈 Field History"
        sub={`${safeData.length} readings from Firebase SensorData`}
        right={
          <div style={{ display: "flex", gap: 5 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "3px 11px", borderRadius: 99,
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: tab === t.id ? "none" : "1px solid #e0ece0",
                  background: tab === t.id ? "#27a627" : "#f2f5f2",
                  color:      tab === t.id ? "#fff"    : "#456045",
                  boxShadow:  tab === t.id ? "0 2px 8px rgba(39,166,39,.3)" : "none",
                  transition: "all .15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      {safeData.length === 0 ? (
        <div style={{
          height: 200, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#84a084", fontSize: 13, flexDirection: "column", gap: 8,
        }}>
          <span style={{ fontSize: 28 }}>📡</span>
          <p>Waiting for SensorHistory data from Firebase…</p>
          <p style={{ fontSize: 11 }}>Make sure /SensorHistory is populated by your backend</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={safeData} margin={{ top: 4, right: 6, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#27a627" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#27a627" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2f86d4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2f86d4" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c97a1a" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#c97a1a" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#e8f0e8" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#84a084" }}
                tickLine={false} axisLine={false}
                interval={Math.max(1, Math.floor(safeData.length / 7))}
              />
              <YAxis tick={{ fontSize: 10, fill: "#84a084" }} tickLine={false} axisLine={false} />
              <Tooltip content={<Tip />} />

              {showS && (
                <ReferenceLine y={30} stroke="#c97a1a" strokeDasharray="4 2" strokeWidth={1}
                  label={{ value: "Dry line", fontSize: 9, fill: "#c97a1a", position: "right" }}
                />
              )}
              {showS && (
                <Area type="monotone" dataKey="soil" name="Soil %" stroke="#27a627"
                  strokeWidth={2} fill="url(#gS)" dot={false} activeDot={{ r: 3 }} />
              )}
              {showH && (
                <Area type="monotone" dataKey="hum" name="Humidity %" stroke="#2f86d4"
                  strokeWidth={1.5} fill="url(#gH)" dot={false} activeDot={{ r: 3 }} />
              )}
              {showT && (
                <Area type="monotone" dataKey="temp" name="Temp °C" stroke="#c97a1a"
                  strokeWidth={1.5} fill="url(#gT)" dot={false} activeDot={{ r: 3 }} />
              )}
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{
            display: "flex", gap: 14, justifyContent: "center",
            marginTop: 8, paddingTop: 8, borderTop: "1px solid #e0ece0",
          }}>
            {showS && <LegItem color="#27a627" label="Soil %" />}
            {showH && <LegItem color="#2f86d4" label="Humidity %" />}
            {showT && <LegItem color="#c97a1a" label="Temp °C" />}
            {showS && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#c97a1a" }}>
                <span style={{ width: 12, borderTop: "2px dashed #c97a1a", display: "inline-block" }} />
                Dry threshold (30%)
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LegItem({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#456045" }}>
      <span style={{ width: 12, height: 3, background: color, borderRadius: 2, display: "inline-block" }} />
      {label}
    </span>
  );
}
