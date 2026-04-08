// ═══════════════════════════════════════════════════════════════════
//  Agronomic Engine  –  every crop-health number in plain English
// ═══════════════════════════════════════════════════════════════════

const svp = (t) => 0.6108 * Math.exp((17.27 * t) / (t + 237.3));

/** Vapour Pressure Deficit — "how thirsty is the air?" (kPa) */
export function calcVPD(t, h) {
  if (t == null || h == null) return null;
  const es = svp(t);
  return parseFloat(Math.max(0, es - (h / 100) * es).toFixed(2));
}

/** FAO-56 Penman–Monteith reference ET₀ (mm/day) */
export function calcETo(t, h, windKmh = 10, solarMJ = 18) {
  if (t == null) return null;
  const vpd   = Math.max(0.01, calcVPD(t, h) ?? 1);
  const delta = (4098 * svp(t)) / Math.pow(t + 237.3, 2);
  const gamma = 0.067;
  const wMs   = windKmh / 3.6;
  const rn    = solarMJ * 0.408;
  const top   = 0.408 * delta * rn + gamma * (900 / (t + 273)) * wMs * vpd;
  const bot   = delta + gamma * (1 + 0.34 * wMs);
  return parseFloat(Math.max(0, top / bot).toFixed(2));
}

/** Crop Water Need (mm/day) — Kc = 1.15 mid-season */
export function calcCWN(et0, kc = 1.15) {
  if (et0 == null) return null;
  return parseFloat((et0 * kc).toFixed(2));
}

/** Dew-point (°C) */
export function calcDew(t, h) {
  if (t == null || h == null) return null;
  return parseFloat((t - (100 - h) / 5).toFixed(1));
}

/** Heat Stress Index 0–100 */
export function calcHeat(t) {
  if (t == null) return 0;
  if (t <= 28) return 0;
  if (t >= 46) return 100;
  return Math.round(((t - 28) / 18) * 100);
}

/** Drought Stress Index 0–100 */
export function calcDrought(s) {
  if (s == null) return 0;
  if (s >= 55) return 0;
  if (s <= 8)  return 100;
  return Math.round(((55 - s) / 47) * 100);
}

/** Disease Risk Index 0–100 (Blight-index inspired) */
export function calcDisease(h, t) {
  if (h == null || t == null) return 0;
  let r = 0;
  if (h > 80) r += 55; else if (h > 65) r += 30; else if (h > 55) r += 15;
  if (t >= 18 && t <= 28) r += 45; else if (t > 28 && t <= 34) r += 22;
  return Math.min(100, r);
}

/** Photosynthesis Efficiency 0–100 */
export function calcPhoto(t, s, h) {
  if (t == null) return null;
  let e = 100;
  if (t < 12 || t > 42) e -= 45;
  else if (t < 17 || t > 37) e -= 22;
  else if (t < 22 || t > 33) e -= 8;
  if (s != null) {
    if (s < 12) e -= 40;
    else if (s < 22) e -= 22;
    else if (s < 32) e -= 9;
  }
  if (h != null && h < 25) e -= 10;
  return Math.max(0, Math.min(100, Math.round(e)));
}

/** Nutrient Uptake Efficiency 0–100 */
export function calcNutrient(s) {
  if (s == null) return null;
  if (s >= 38 && s <= 70) return 100;
  if (s < 38) return Math.round((s / 38) * 100);
  return Math.max(0, Math.round(100 - ((s - 70) / 30) * 40));
}

/** Hours until wilting at current evaporation rate */
export function calcWiltHours(s, vpd) {
  if (s == null) return null;
  if (s <= 10) return 0;
  const drainRate = 0.4 + (vpd ?? 1) * 1.1;
  return Math.round(Math.max(0, (s - 10) / drainRate));
}

/** Overall Crop Health Score 0–100 */
export function calcHealth(t, h, s) {
  if (t == null && h == null && s == null) return null;
  const hs = calcHeat(t);
  const ds = calcDrought(s);
  const dr = calcDisease(h, t);
  return Math.max(0, Math.min(100, Math.round(100 - hs * 0.35 - ds * 0.45 - dr * 0.20)));
}

/** Auto-irrigation decision */
export function irrDecision(s, vpd, rainPct = 0, t = 30) {
  if (rainPct > 50) return { on:false, urg:"none",   icon:"🌧️", msg:`Rain coming (${rainPct}%) — skip watering today`, mm:0 };
  if (s == null)    return { on:false, urg:"none",   icon:"❓", msg:"No soil data yet",                                 mm:0 };
  if (s < 15)       return { on:true,  urg:"high",   icon:"🚨", msg:"Soil critically dry — water immediately!",         mm:30 };
  if (s < 25)       return { on:true,  urg:"high",   icon:"🔴", msg:"Soil very dry — water your crops today",           mm:20 };
  if (s < 32)       return { on:true,  urg:"medium", icon:"🟡", msg:"Soil getting dry — water soon",                   mm:12 };
  if (s < 40 && t > 35) return { on:true, urg:"medium", icon:"🟡", msg:"Hot + low soil moisture — water today",          mm:10 };
  if (s < 40 && (vpd??0) > 2.5) return { on:true, urg:"low", icon:"🟡", msg:"Dry air pulling moisture — water now",      mm:8  };
  if (s > 70)       return { on:false, urg:"none",   icon:"💧", msg:"Soil already wet — no watering needed",            mm:0  };
  return              { on:false, urg:"none",   icon:"✅", msg:"Moisture is good — no watering needed",              mm:0  };
}

// ── Plain-English label helpers ────────────────────────────────────
export const lSoil = (v) => {
  if (v == null) return { t:"No data",            c:"#888",    bg:"#f5f5f5" };
  if (v < 15)    return { t:"Critically Dry 🔴",  c:"#b22020", bg:"#fdf0f0" };
  if (v < 30)    return { t:"Dry 🟡",             c:"#a06010", bg:"#fdf4e6" };
  if (v < 65)    return { t:"Good Moisture ✅",   c:"#1a6e1a", bg:"#eef8ee" };
  return               { t:"Very Wet 💧",         c:"#1260a0", bg:"#e6f2fd" };
};

export const lTemp = (v) => {
  if (v == null) return { t:"No data",               c:"#888" };
  if (v > 40)    return { t:"Dangerously Hot 🌡️",   c:"#8b0000" };
  if (v > 35)    return { t:"Very Hot — Watch crops", c:"#b22020" };
  if (v > 30)    return { t:"Warm",                  c:"#a06010" };
  if (v < 12)    return { t:"Too Cold 🌨️",           c:"#1260a0" };
  return               { t:"Comfortable ✓",          c:"#1a6e1a" };
};

export const lHum = (v) => {
  if (v == null) return { t:"No data",              c:"#888" };
  if (v < 20)    return { t:"Very Dry Air 💨",      c:"#b22020" };
  if (v < 35)    return { t:"Dry Air",              c:"#a06010" };
  if (v > 85)    return { t:"Fungus Risk 🍄",       c:"#6b2fa0" };
  return               { t:"Good Air ✓",            c:"#1a6e1a" };
};

export const lHealth = (s) => {
  if (s == null) return { t:"Unknown",               c:"#888",    ring:"#ccc" };
  if (s >= 85)   return { t:"Excellent 🌟",          c:"#1a6e1a", ring:"#27a627" };
  if (s >= 70)   return { t:"Good 👍",               c:"#27a627", ring:"#5cc05c" };
  if (s >= 50)   return { t:"Needs Attention ⚠️",    c:"#a06010", ring:"#d49030" };
  if (s >= 30)   return { t:"Stressed 😟",           c:"#b22020", ring:"#d95050" };
  return                { t:"Critical 🚨",           c:"#7a0000", ring:"#ff2828" };
};

export const lVPD = (v) => {
  if (v == null) return { t:"No data",                  c:"#888" };
  if (v < 0.4)   return { t:"Very Humid — Disease risk",c:"#6b2fa0" };
  if (v < 1.2)   return { t:"Ideal for crops ✓",        c:"#1a6e1a" };
  if (v < 2.0)   return { t:"Slightly dry air",          c:"#a06010" };
  if (v < 3.0)   return { t:"Crops are thirsty",         c:"#b22020" };
  return               { t:"Extreme stress 🚨",          c:"#7a0000" };
};
