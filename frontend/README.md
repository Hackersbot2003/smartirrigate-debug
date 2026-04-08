# SmartIrrigate Dashboard

AI-powered crop monitoring dashboard that reads your Firebase sensor data in real time, calculates agronomic metrics, and uses Groq AI for intelligent recommendations.

## Firebase Data Structure Expected

```
SensorData/
  -OosLiSCUa2tDW6TZgut/      ← push keys (multiple entries)
    Humidity:     41.8
    SoilMoisture: 42.0
    Temperature:  29.8
    Timestamp:    2
  -OosLji8IDaz.../
    ...

SensorHistory/                ← same shape, used for charts
  ...

IrrigationState/
  motorOn: false
```

The dashboard automatically picks the entry with the **highest Timestamp** as the latest reading.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Features

- 📡 **Live Firebase SSE** — real-time data from your ESP32
- 🧪 **Agronomic calculations** — VPD, ET₀, Crop Water Need, Heat/Drought/Disease stress, Photosynthesis efficiency
- 🌤️ **Weather integration** — OpenWeatherMap current + 5-day forecast
- 💧 **Auto-irrigation logic** — combines soil, temperature, VPD, and rain forecast
- 🤖 **Groq AI chat** — ask farming questions in plain language
- 📈 **History charts** — trend visualization from SensorHistory
- 🟡 **Demo mode** — animated demo data when Firebase isn't connected

## Configuration

Edit `src/config.js`:

```js
export const FB_URL    = "https://minor-project-mt-default-rtdb...";
export const GROQ_KEY  = "gsk_...";
export const OWM_KEY   = "your_openweathermap_key";   // free at openweathermap.org
export const LOCATION  = { lat: 23.2599, lon: 77.4126, name: "Bhopal, MP" };
```

## Project Structure

```
src/
  config.js          — all credentials & thresholds
  agronomy.js        — all crop science calculations
  firebase.js        — Firebase SSE hooks (reads push-key SensorData)
  weather.js         — OpenWeatherMap hook
  demo.js            — demo sensor generator
  groq.js            — AI chat hook
  App.jsx            — main app + routing
  components/
    Sidebar.jsx
    Header.jsx
    SummaryCards.jsx  — 4 top KPI cards
    SensorPanel.jsx   — live gauges + motor toggle
    AgronomicPanel.jsx — VPD, ET₀, heat/drought/disease metrics
    ChartPanel.jsx    — history area chart
    WeatherPanel.jsx  — weather + 5-day forecast
    IrrigationPanel.jsx — irrigation decision + threshold bars
    AIChat.jsx        — Groq-powered farming assistant
    FieldSummary.jsx  — plain-language daily summary
    TipCard.jsx       — contextual farming tip
    UI.jsx            — shared primitives (Ring, Bar, Toggle, etc.)
```
