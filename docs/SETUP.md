# SmartIrrigate — Complete Setup Guide

Your Firebase project is **minor-project-mt** and your ESP32 code is already working.
This guide only covers the backend + frontend setup.

---

## What you already have ✅
- ESP32 writing to `/SensorData/Temperature`, `/SensorData/Humidity`, `/SensorData/SoilMoisture`
- Firebase Realtime Database URL: `https://minor-project-mt-default-rtdb.asia-southeast1.firebasedatabase.app`

## What you need to add
1. Firebase **Service Account** key (different from the ESP32 legacy token)
2. **Groq** API key (free)
3. Add `/SensorHistory`, `/LatestAnalysis`, `/AnalysisHistory` nodes to Firebase

---

## Step 1 — Add missing Firebase nodes

Open your Firebase Console → Realtime Database → click the **+** on the root node and add:

```
SensorHistory     →  (empty object)   {}
LatestAnalysis    →  (empty object)   {}
AnalysisHistory   →  (empty object)   {}
```

Your existing `SensorData` stays exactly as-is.

---

## Step 2 — Update Firebase Database Rules

In Firebase Console → Realtime Database → **Rules** tab, replace with:

```json
{
  "rules": {
    ".read":  "auth != null",
    ".write": "auth != null"
  }
}
```

> **Why?** The Admin SDK (used by the backend) bypasses these rules entirely —
> it always has full access. These rules only affect the ESP32 legacy token connection.
> Your ESP32 already authenticates with the legacy token so it still works fine.

---

## Step 3 — Get the Firebase Service Account key

This is a **different key** from what the ESP32 uses.
The ESP32 uses the Web API Key (legacy token).
The backend uses the Admin SDK Service Account.

### How to get it:

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Select your project: **minor-project-mt**
3. Click the ⚙️ **gear icon** (top left, next to "Project Overview")
4. Click **"Project Settings"**
5. Click the **"Service accounts"** tab
6. Click the blue button: **"Generate new private key"**
7. Click **"Generate key"** in the confirmation popup
8. A `.json` file downloads — open it in a text editor

The file looks like this:
```json
{
  "type": "service_account",
  "project_id": "minor-project-mt",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@minor-project-mt.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

Now open `backend/.env` and fill in:

```env
FIREBASE_PROJECT_ID=minor-project-mt
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@minor-project-mt.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...(copy the whole thing)...\n-----END PRIVATE KEY-----\n"
```

### ⚠️ Private key formatting rules:
- Copy the entire value of `"private_key"` from the JSON file
- It must stay inside **double quotes** in the `.env` file
- The `\n` characters must remain as literal backslash-n (not real newlines)
- Do NOT add extra line breaks

**Correct:**
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n"
```

**Wrong (will fail):**
```
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkq...
-----END PRIVATE KEY-----
```

---

## Step 4 — Get Groq API key (free)

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up with Google or email (free)
3. In the left sidebar click **"API Keys"**
4. Click **"Create API key"**
5. Give it a name like `smartirrigate`
6. Copy the key — it starts with `gsk_`

Add to `backend/.env`:
```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 5 — Install and run the backend

```bash
cd backend
npm install
npm run dev
```

You should see:
```
✅ Firebase Admin SDK connected
   DB URL: https://minor-project-mt-default-rtdb.asia-southeast1.firebasedatabase.app
✅ History snapshot cron started  (every 5 min)
✅ AI analysis cron started       (every 15 min)
🌱 SmartIrrigate backend  →  http://localhost:5000
```

### Test it:
```bash
# Should return your live sensor values
curl http://localhost:5000/api/sensors/live

# Should return 404 until first history builds up
curl http://localhost:5000/api/analytics/latest
```

---

## Step 6 — Install and run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Step 7 — Build history data

The AI analysis needs past data. Here's the timeline:

```
t=0 min   — Backend starts
t=5 min   — First history snapshot saved to Firebase
t=10 min  — Second snapshot saved
t=15 min  — Third snapshot saved + first AI analysis runs automatically
t=15 min  — Dashboard AI card populates

OR: Click "Run AI" on dashboard after 3+ snapshots exist
```

You can check Firebase Console → Realtime Database → `SensorHistory` to see snapshots appearing.

---

## How the data flow works (explained simply)

```
ESP32 (every 5s)
  └──► writes Temperature, Humidity, SoilMoisture to /SensorData
            │
            ├──► Backend Firebase watcher fires immediately
            │         └──► Socket.IO pushes to your browser
            │               └──► Dashboard gauges update live ✅
            │
            └──► (data just sits there until the cron reads it)

Backend cron (every 5 min)
  └──► reads /SensorData  (the current snapshot)
  └──► appends entry to /SensorHistory with timestamp
            └──► SensorHistory grows: 12 entries/hour, 288/day

Backend cron (every 15 min)
  └──► reads all of /SensorHistory from last 24 hours
  └──► sends 24h worth of data to Groq AI (LLaMA 3.1 70B)
  └──► Groq returns: health score, recommendations, soil status, etc.
  └──► saves to /LatestAnalysis
  └──► Socket.IO pushes to your browser
            └──► Dashboard AI card updates ✅
```

**Key insight:** `/SensorData` is always just ONE record (overwritten every 5s).
`/SensorHistory` is the growing log — that's what the AI reads.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Error: Invalid PEM format` | Private key has real newlines instead of `\n`. Re-copy from JSON. |
| `PERMISSION_DENIED` on Firebase | Service account JSON is wrong — regenerate it |
| `401 Unauthorized` on Groq | API key is wrong or not set in `.env` |
| Gauges show `—` | ESP32 offline, or check Firebase `/SensorData` in console |
| "Not enough history" on AI run | Wait 15 min or check that cron is running (see server logs) |
| CORS error in browser | Ensure `FRONTEND_URL=http://localhost:5173` in backend `.env` |

---

## File structure recap

```
smartirrigate/
├── backend/
│   ├── .env                      ← YOUR CREDENTIALS GO HERE
│   ├── server.js                 ← start with: npm run dev
│   ├── config/firebase.js
│   ├── services/
│   │   ├── firebaseService.js    ← all Firebase read/write
│   │   ├── groqService.js        ← AI prompt + Groq API call
│   │   └── alertEngine.js        ← threshold alert logic
│   ├── jobs/scheduler.js         ← cron: history + AI
│   └── routes/
│       ├── sensor.js             ← GET /api/sensors/*
│       └── analytics.js          ← GET/POST /api/analytics/*
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.jsx     ← main layout
    │   │   ├── SensorGauge.jsx   ← animated circular gauges
    │   │   ├── SensorChart.jsx   ← recharts trend chart
    │   │   ├── AIInsights.jsx    ← Groq health score card
    │   │   ├── StatsCard.jsx     ← min/avg/max statistics
    │   │   └── AlertBanner.jsx   ← sensor alert banners
    │   ├── hooks/useSocket.js    ← Socket.IO live state
    │   └── utils/api.js          ← axios REST calls
    └── (start with: npm run dev)
```
