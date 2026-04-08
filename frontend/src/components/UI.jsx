import { useEffect, useRef, useState } from "react";

// ── Animated number ────────────────────────────────────────────────
export function Num({ v, d = 1, unit = "" }) {
  const [val, setVal] = useState(v);
  const [fl,  setFl]  = useState(false);
  const prev = useRef(v);
  useEffect(() => {
    if (v !== prev.current && v != null) {
      setFl(true);
      const t = setTimeout(() => setFl(false), 700);
      prev.current = v;
      return () => clearTimeout(t);
    }
    setVal(v);
  }, [v]);
  useEffect(() => setVal(v), [v]);
  return (
    <span className={fl ? "flash" : ""} style={fl ? { color: "#27a627" } : {}}>
      {val != null ? Number(val).toFixed(d) : "--"}{unit}
    </span>
  );
}

// ── SVG Ring gauge ─────────────────────────────────────────────────
export function Ring({ val, max = 100, color = "#27a627", size = 90, sw = 8, unit, label }) {
  const r    = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - Math.min(1, Math.max(0, (val ?? 0) / max)));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e6f0e6" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1.15s cubic-bezier(.4,0,.2,1), stroke .4s" }} />
        <g style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
          <text x={size/2} y={unit ? size/2 - 3 : size/2 + 5} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Sora',sans-serif", fill: "#182818" }}>
            {val != null ? Math.round(val) : "--"}
          </text>
          {unit && <text x={size/2} y={size/2 + 12} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 9, fill: "#84a084" }}>{unit}</text>}
        </g>
      </svg>
      {label && (
        <span style={{ fontSize: 10, fontWeight: 600, color: "#84a084", textTransform: "uppercase", letterSpacing: 1 }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────
export function Bar({ val, max = 100, color = "#27a627", h = 6 }) {
  const pct = Math.min(100, Math.max(0, ((val ?? 0) / max) * 100));
  return (
    <div className="prog" style={{ height: h }}>
      <div className="prog-fill" style={{ width: `${pct}%`, background: color, height: h }} />
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────
export function Toggle({ on, onChange, disabled }) {
  return (
    <label className="tog" style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      <input type="checkbox" checked={on} onChange={onChange} disabled={disabled} />
      <span className="tog-slider" />
    </label>
  );
}

// ── Live status dot ────────────────────────────────────────────────
export function LiveDot({ live }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      {live && <span className="live-ring" />}
      <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: live ? "#27a627" : "#c97a1a", display: "inline-block" }} />
    </span>
  );
}

// ── Section heading ────────────────────────────────────────────────
export function SHead({ title, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <p style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 13, color: "#182818" }}>{title}</p>
        {sub && <p style={{ fontSize: 11, color: "#84a084", marginTop: 2 }}>{sub}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

// ── Alert banner ───────────────────────────────────────────────────
export function AlertBanner({ items }) {
  if (!items?.length) return null;
  const palette = {
    danger:  { bg: "#fdf0f0", c: "#b22020", b: "#eec0c0" },
    warn:    { bg: "#fdf4e6", c: "#a06010", b: "#f0d090" },
    info:    { bg: "#e6f2fd", c: "#1260a0", b: "#b0d0f0" },
    success: { bg: "#eef8ee", c: "#1a6e1a", b: "#a0d0a0" },
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
      {items.map((a, i) => {
        const p = palette[a.type] ?? palette.info;
        return (
          <div key={i} className="fade-up" style={{
            display: "flex", alignItems: "center", gap: 7, padding: "7px 13px",
            borderRadius: 10, background: p.bg, color: p.c, border: `1px solid ${p.b}`,
            fontSize: 12, fontWeight: 500,
          }}>
            <span>{a.icon}</span><span>{a.text}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Card wrapper ───────────────────────────────────────────────────
export function Card({ children, accent, delay = 0, style = {} }) {
  return (
    <div className="card fade-up" style={{
      padding: 18,
      borderTop: accent ? `3px solid ${accent}` : undefined,
      animationDelay: `${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── AI thinking dots ───────────────────────────────────────────────
export function Dots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "6px 2px" }}>
      {["d1","d2","d3"].map((c) => (
        <span key={c} className={c} style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#27a627" }} />
      ))}
    </div>
  );
}

// ── Weather icon ───────────────────────────────────────────────────
export function WIcon({ code, size = 32 }) {
  if (!code) return <span style={{ fontSize: size * 0.75 }}>🌤️</span>;
  return <img src={`https://openweathermap.org/img/wn/${code}@2x.png`} width={size} height={size} alt="" style={{ objectFit: "contain" }} />;
}
