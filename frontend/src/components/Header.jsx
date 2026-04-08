import { useState, useEffect } from "react";
import { LiveDot } from "./UI";
import { LOCATION } from "../config";

export default function Header({ isLive, isDemoWeather }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);

  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 24px",
      background: "#fff", borderBottom: "1px solid #e0ece0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 14px", borderRadius: 10,
        background: "#f2f5f2", border: "1px solid #e0ece0",
        flex: 1, maxWidth: 280,
      }}>
        <span style={{ fontSize: 13, color: "#84a084" }}>🔍</span>
        <input placeholder="Search…" style={{
          background: "transparent", border: "none", outline: "none",
          fontSize: 13, color: "#182818", width: "100%",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
        }} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Date */}
      <span style={{ fontSize: 12, color: "#456045" }}>
        📅 {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </span>

      {/* Location */}
      <span style={{ fontSize: 12, fontWeight: 500, color: "#456045" }}>📍 {LOCATION.name}</span>

      {/* Live badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "4px 11px", borderRadius: 99, fontSize: 11, fontWeight: 600,
        background: isLive ? "#eef8ee" : "#fdf4e6",
        color:      isLive ? "#1a6e1a" : "#a06010",
        border:     `1px solid ${isLive ? "#a0d0a0" : "#f0d090"}`,
      }}>
        <LiveDot live={isLive} />
        {isLive ? "Firebase Live" : "Demo Mode"}
      </div>

      {isDemoWeather && (
        <span style={{
          padding: "3px 9px", borderRadius: 99, fontSize: 10, fontWeight: 600,
          background: "#fdf4e6", color: "#a06010", border: "1px solid #f0d090",
        }}>⚠ Weather: demo</span>
      )}

      <span style={{ fontSize: 11, color: "#84a084", fontFamily: "monospace" }}>
        {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
      </span>

      <button style={{
        width: 36, height: 36, borderRadius: 10, border: "1px solid #e0ece0",
        background: "#f2f5f2", cursor: "pointer", fontSize: 15,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        🔔
        <span style={{ position:"absolute", top:7, right:7, width:6, height:6, borderRadius:"50%", background:"#d94f4f" }} />
      </button>

      <button style={{
        width: 36, height: 36, borderRadius: 10, border: "1px solid #e0ece0",
        background: "#f2f5f2", cursor: "pointer", fontSize: 15,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>🌙</button>
    </header>
  );
}
