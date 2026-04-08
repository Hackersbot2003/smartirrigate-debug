require("dotenv").config();

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const cors       = require("cors");

const { initFirebase, getDb }         = require("./config/firebase");
const { watchSensorData, getLiveSensorData, getLatestAnalysis } = require("./services/firebaseService");
const { generateAlerts }              = require("./services/alertEngine");
const { startAllJobs }                = require("./jobs/scheduler");

// ── App ───────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
  transports: ["polling", "websocket"],
});

app.set("io", io);

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/sensors",   require("./routes/sensor"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/ai-assistant", require("./routes/ai-assistant"));

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), at: new Date().toISOString() })
);

// DEBUG endpoint — shows exactly what Firebase has in SensorData
app.get("/api/debug/raw", async (_req, res) => {
  try {
    const db   = require("./config/firebase").getDb();
    const snap = await db.ref("SensorData").once("value");
    const raw  = snap.val();
    console.log("[DEBUG /api/debug/raw] Firebase SensorData:", raw);
    res.json({
      raw,
      keys: raw ? Object.keys(raw) : [],
      note: "ESP32 should write Temperature, Humidity, SoilMoisture (capital first letters)",
    });
  } catch (e) {
    console.error("[DEBUG /api/debug/raw] ERROR:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Socket.IO ─────────────────────────────────────────────────────
io.on("connection", async (socket) => {
  console.log(`[Socket] ✅ Client connected: ${socket.id} | transport: ${socket.conn.transport.name}`);
  console.log(`[Socket] Total connected clients: ${io.engine.clientsCount}`);

  // Send current data immediately on connect
  try {
    console.log("[Socket] Fetching initial data for new client...");
    const [live, analysis] = await Promise.all([getLiveSensorData(), getLatestAnalysis()]);

    console.log("[Socket] Initial live data:", live);
    console.log("[Socket] Initial analysis:", analysis ? `healthLabel=${analysis.healthLabel}` : "null");

    if (live) {
      const alerts = generateAlerts(live);
      console.log("[Socket] Emitting 'sensor_data' to", socket.id, "→", { ...live, alerts });
      socket.emit("sensor_data", { ...live, alerts });
    } else {
      console.warn("[Socket] ⚠️  No live sensor data to send on connect — Firebase /SensorData is empty");
    }

    if (analysis) {
      console.log("[Socket] Emitting 'analysis_update' to", socket.id);
      socket.emit("analysis_update", analysis);
    } else {
      console.log("[Socket] No analysis saved yet — skipping analysis_update emit");
    }
  } catch (err) {
    console.error("[Socket] Initial data error:", err.message);
  }

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] ❌ Disconnected: ${socket.id} | reason: ${reason}`);
    console.log(`[Socket] Remaining clients: ${io.engine.clientsCount}`);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] connect_error for", socket.id, ":", err.message);
  });
});

// ── Watch Firebase for live ESP32 changes → push to all clients ──
watchSensorData((data) => {
  const alerts = generateAlerts(data);
  const payload = { ...data, alerts };
  console.log(`[Socket] 📡 Broadcasting sensor_data to all ${io.engine.clientsCount} clients:`, payload);
  io.emit("sensor_data", payload);
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

initFirebase();
startAllJobs(io);

server.listen(PORT, () => {
  console.log(`\n🌱 SmartIrrigate backend  →  http://localhost:${PORT}`);
  console.log(`   Frontend expected at   →  ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
  console.log(`   Firebase DB            →  ${process.env.FIREBASE_DATABASE_URL}\n`);
});
