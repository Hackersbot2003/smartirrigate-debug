import { useState, useEffect } from "react";

const rnd = (v, range) => parseFloat(
  Math.max(range[0], Math.min(range[1], v + (Math.random() - 0.5) * range[2])).toFixed(1)
);

export function useDemoSensor(enabled) {
  const [sensor,  setSensor]  = useState({ temperature:30.2, humidity:47.5, soilMoisture:42.0, timestamp: Date.now() });
  const [history, setHistory] = useState(() => {
    const now = Date.now();
    return Array.from({ length: 48 }, (_, i) => {
      const t = 30 + Math.sin(i * 0.28) * 4;
      const h = 47 + Math.cos(i * 0.22) * 12;
      const s = 42 + Math.sin(i * 0.14) * 18;
      return {
        time: new Date(now - (47 - i) * 5 * 60000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
        temp: parseFloat(t.toFixed(1)),
        hum:  parseFloat(h.toFixed(1)),
        soil: parseFloat(s.toFixed(1)),
      };
    });
  });

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setSensor((p) => {
        const n = {
          temperature:  rnd(p.temperature,  [14, 46, 0.5]),
          humidity:     rnd(p.humidity,     [14, 95, 0.8]),
          soilMoisture: rnd(p.soilMoisture, [ 5, 88, 1.2]),
          timestamp:    Date.now(),
        };
        const timeLabel = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
        setHistory((h) => [...h.slice(-47), { time: timeLabel, temp: n.temperature, hum: n.humidity, soil: n.soilMoisture }]);
        return n;
      });
    }, 2500);
    return () => clearInterval(id);
  }, [enabled]);

  return { sensor, history };
}
