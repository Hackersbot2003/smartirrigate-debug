import { SHead, WIcon } from "./UI";
import { LOCATION } from "../config";

const windDir = (deg) => {
  const d = ["N","NE","E","SE","S","SW","W","NW"];
  return d[Math.round((deg ?? 0) / 45) % 8];
};

export default function WeatherPanel({ weather, forecast, wDemo }) {
  if (!weather) {
    return (
      <div className="card fade-up" style={{ padding: 18, animationDelay: "420ms" }}>
        <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 8, color: "#84a084" }}>
          <span style={{ fontSize: 26 }}>🌤️</span>
          <p style={{ fontSize: 12 }}>Loading weather data…</p>
        </div>
      </div>
    );
  }

  const rainDay = forecast?.find((d) => d.rainPct > 50);

  return (
    <div className="card fade-up" style={{ padding: 18, animationDelay: "420ms" }}>
      <SHead
        title={`🌤️ Weather — ${LOCATION().name}`}
        sub={wDemo ? "⚠ Demo data — replace OWM_KEY in config.js for live data" : "Live from OpenWeatherMap"}
      />

      {/* Current conditions */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        paddingBottom: 14, marginBottom: 14,
        borderBottom: "1px solid #e0ece0",
      }}>
        <WIcon code={weather.icon} size={52} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 34, fontWeight: 700, fontFamily: "'Sora',sans-serif", color: "#2f86d4", lineHeight: 1 }}>
            {weather.temp}°C
          </p>
          <p style={{ fontSize: 12, color: "#456045", textTransform: "capitalize", marginTop: 3 }}>
            {weather.desc} · Feels {weather.feels}°C
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: 11 }}>
          {[
            ["💧 Humidity",    `${weather.hum}%`],
            ["💨 Wind",        `${weather.wind} km/h ${windDir(weather.deg)}`],
            ["🔽 Pressure",    `${weather.press} hPa`],
            ["👁️ Visibility",  `${weather.vis} km`],
          ].map(([k, v]) => (
            <div key={k}>
              <span style={{ color: "#84a084" }}>{k}: </span>
              <span style={{ color: "#182818", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5-day forecast */}
      <p style={{ fontSize: 10, fontWeight: 700, color: "#84a084", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        5-Day Forecast
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
        {forecast?.map((d, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "8px 4px", borderRadius: 10,
            background: d.rainPct > 50 ? "#e6f2fd" : "#f2f5f2",
            border: `1px solid ${d.rainPct > 50 ? "#b0d0f0" : "#e0ece0"}`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#456045" }}>{d.day}</p>
            <WIcon code={d.icon} size={26} />
            <p style={{ fontSize: 12, fontWeight: 700, color: "#182818" }}>{d.hi}°</p>
            <p style={{ fontSize: 10, color: "#84a084" }}>{d.lo}°</p>
            {d.rainPct > 20 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "#1260a0" }}>💧{d.rainPct}%</span>
            )}
          </div>
        ))}
      </div>

      {/* Rain alert */}
      {rainDay && (
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 9,
          background: "#e6f2fd", border: "1px solid #b0d0f0",
          fontSize: 12, color: "#1260a0", fontWeight: 500,
        }}>
          🌧️ Rain expected {rainDay.day} ({rainDay.rainPct}% chance) — consider holding irrigation for 24h
        </div>
      )}
    </div>
  );
}
