import { useState, useEffect, useCallback } from "react";
import { OWM_KEY, LOCATION } from "./config";

export function useWeather() {
  const [weather,  setWeather]  = useState(null);
  const [forecast, setForecast] = useState([]);
  const [wDemo,    setWDemo]    = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, f] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LOCATION().lat}&lon=${LOCATION().lon}&appid=${OWM_KEY}&units=metric`).then((r) => r.json()),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${LOCATION().lat}&lon=${LOCATION().lon}&appid=${OWM_KEY}&units=metric`).then((r) => r.json()),
      ]);

      if (c.cod === 200) {
        setWeather({
          temp:  Math.round(c.main.temp),
          feels: Math.round(c.main.feels_like),
          hum:   c.main.humidity,
          wind:  Math.round((c.wind?.speed ?? 0) * 3.6),
          deg:   c.wind?.deg ?? 0,
          press: c.main.pressure,
          vis:   c.visibility ? Math.round(c.visibility / 1000) : "--",
          desc:  c.weather[0].description,
          icon:  c.weather[0].icon,
          rain1h: c.rain?.["1h"] ?? 0,
          clouds: c.clouds?.all ?? 0,
        });
        setWDemo(false);
      }

      if (f.cod === "200") {
        // Pick one slot near noon per day
        const days = {};
        f.list.forEach((item) => {
          const day = item.dt_txt.slice(0, 10);
          const h   = parseInt(item.dt_txt.slice(11, 13));
          if (!days[day] || Math.abs(h - 13) < Math.abs(parseInt((days[day].dt_txt ?? "00").slice(11, 13)) - 13))
            days[day] = item;
        });
        setForecast(
          Object.values(days).slice(0, 5).map((d) => ({
            day:     new Date(d.dt * 1000).toLocaleDateString("en-IN", { weekday: "short" }),
            hi:      Math.round(d.main.temp_max),
            lo:      Math.round(d.main.temp_min),
            icon:    d.weather[0].icon,
            desc:    d.weather[0].description,
            hum:     d.main.humidity,
            wind:    Math.round((d.wind?.speed ?? 0) * 3.6),
            rainPct: Math.round((d.pop ?? 0) * 100),
          }))
        );
      }
    } catch {
      // Demo fallback
      setWDemo(true);
      setWeather({ temp:33, feels:36, hum:42, wind:14, deg:225, press:1008, vis:9, desc:"clear sky", icon:"01d", rain1h:0, clouds:5 });
      setForecast([
        { day:"Wed", hi:34, lo:23, icon:"01d", desc:"Sunny",        hum:40, wind:14, rainPct:5  },
        { day:"Thu", hi:35, lo:24, icon:"01d", desc:"Sunny",        hum:38, wind:12, rainPct:8  },
        { day:"Fri", hi:36, lo:23, icon:"10d", desc:"Light Rain",   hum:68, wind:18, rainPct:62 },
        { day:"Sat", hi:37, lo:24, icon:"01d", desc:"Sunny",        hum:37, wind:10, rainPct:5  },
        { day:"Sun", hi:35, lo:23, icon:"02d", desc:"Partly Cloudy",hum:43, wind:11, rainPct:12 },
      ]);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  // Highest rain probability in next 5 days
  const maxRainPct = forecast.reduce((m, d) => Math.max(m, d.rainPct), 0);

  return { weather, forecast, wDemo, maxRainPct };
}
