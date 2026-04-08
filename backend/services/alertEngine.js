/**
 * alertEngine.js
 *
 * Generates sensor alerts based on thresholds.
 * No motor / irrigation control — that was removed.
 */

const SOIL_DRY     = parseFloat(process.env.SOIL_DRY_THRESHOLD || 30);
const TEMP_STRESS  = parseFloat(process.env.TEMP_HEAT_STRESS   || 38);
const HUM_LOW      = parseFloat(process.env.HUMIDITY_LOW       || 25);

function generateAlerts(sensor) {
  const alerts = [];
  if (!sensor) return alerts;

  const { temperature: t, humidity: h, soilMoisture: s } = sensor;

  // Soil moisture
  if (s !== null) {
    if (s < 15)          alerts.push({ level: "critical", message: `Soil critically dry: ${s}%`,  field: "soilMoisture" });
    else if (s < SOIL_DRY) alerts.push({ level: "warning",  message: `Soil moisture low: ${s}%`,    field: "soilMoisture" });
    else if (s > 85)     alerts.push({ level: "warning",  message: `Soil waterlogged: ${s}%`,      field: "soilMoisture" });
    else if (s > 70)     alerts.push({ level: "info",     message: `Soil well saturated: ${s}%`,   field: "soilMoisture" });
  }

  // Temperature
  if (t !== null) {
    if (t > TEMP_STRESS) alerts.push({ level: "critical", message: `Heat stress: ${t}°C`,           field: "temperature" });
    else if (t > 34)     alerts.push({ level: "warning",  message: `High temperature: ${t}°C`,      field: "temperature" });
    else if (t < 10)     alerts.push({ level: "warning",  message: `Low temperature: ${t}°C`,       field: "temperature" });
  }

  // Humidity
  if (h !== null) {
    if (h < HUM_LOW)     alerts.push({ level: "warning",  message: `Low humidity: ${h}%`,           field: "humidity" });
    else if (h > 90)     alerts.push({ level: "info",     message: `Very high humidity: ${h}%`,     field: "humidity" });
  }

  return alerts;
}

module.exports = { generateAlerts };
