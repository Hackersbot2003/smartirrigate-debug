// ── Firebase ──────────────────────────────────────────────────────
export const FB_URL = "https://minor-project-mt-default-rtdb.asia-southeast1.firebasedatabase.app";

// ── OpenWeatherMap (free — 1 000 calls/day) ───────────────────────
// Replace with your own key from https://openweathermap.org/api
export const OWM_KEY  = "bd5e378503939ddaee76f12ad7a97608";

// ── Backend API ───────────────────────────────────────────────────
export const BACKEND_URL = "http://localhost:5000";

// ── Location ──────────────────────────────────────────────────────
// Location will be determined dynamically from browser geolocation
let _LOCATION = { lat: 23.2599, lon: 77.4126, name: "Bhopal, MP" };

// Function to update location dynamically
export const updateLocation = (lat, lon, name) => {
  _LOCATION = { lat, lon, name };
};

// Getter for current location
export const LOCATION = () => _LOCATION;

// Initialize location from browser if available
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      updateLocation(latitude, longitude, "Current Location");
      console.log(`Location updated to: ${latitude}, ${longitude}`);
    },
    (error) => {
      console.warn('Geolocation error:', error.message);
      // Fallback to default location
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    }
  );
}

// ── Thresholds ────────────────────────────────────────────────────
export const THRESH = {
  soilDry:    30,   // % → irrigate
  soilWet:    70,   // % → too wet
  heatStress: 38,   // °C
  humLow:     25,   // %
  humHigh:    80,   // % → disease risk
};
