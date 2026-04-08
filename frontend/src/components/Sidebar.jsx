import { useState } from "react";

const ITEMS = [
  { id:"dashboard",  emoji:"⊞",   label:"Dashboard"  },
  { id:"analytics",  emoji:"📈",  label:"Analytics"  },
  { id:"irrigation", emoji:"💧",  label:"Irrigation" },
  { id:"weather",    emoji:"🌤️", label:"Weather"    },
  { id:"settings",   emoji:"⚙️",  label:"Settings"   },
];

export default function Sidebar({ active, setActive }) {
  const [hov, setHov] = useState(null);
  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, height: "100vh", width: 68,
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 18, paddingBottom: 18, gap: 0,
      background: "#fff", borderRight: "1px solid #e0ece0",
      boxShadow: "2px 0 10px rgba(0,0,0,0.04)", zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        width: 42, height: 42, borderRadius: 13, flexShrink: 0,
        background: "linear-gradient(135deg,#1a6e1a,#44c044)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, marginBottom: 28,
        boxShadow: "0 4px 14px rgba(39,166,39,0.3)",
        cursor: "pointer",
      }}>🌱</div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {ITEMS.map((item) => (
          <button
            key={item.id}
            className="nav-btn"
            title={item.label}
            onMouseEnter={() => setHov(item.id)}
            onMouseLeave={() => setHov(null)}
            onClick={() => setActive(item.id)}
            style={{
              background: active === item.id ? "#27a627"
                        : hov    === item.id ? "rgba(39,166,39,.1)"
                        : "transparent",
              color:      active === item.id ? "#fff"
                        : hov    === item.id ? "#27a627"
                        : "#84a084",
              fontSize:   active === item.id ? 18 : 16,
              boxShadow:  active === item.id ? "0 4px 14px rgba(39,166,39,.35)" : "none",
            }}
          >
            {item.emoji}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <button className="nav-btn" style={{ color: "#84a084", fontSize: 15 }} title="Notifications">🔔</button>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg,#a0d4a0,#27a627)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>F</div>
      </div>
    </aside>
  );
}
