import React, { useEffect, useState } from 'react';
import { Cloud, Droplets, Wind, Thermometer } from 'lucide-react';
import { fetchCurrentWeather } from '../services/api';

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    fetchCurrentWeather().then(setWeather).catch(console.error);
  }, []);

  if (!weather) {
    return <div className="animate-pulse h-10 w-48 bg-slate-800 rounded-lg"></div>;
  }

  return (
    <div className="flex items-center gap-3 bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-lg px-3.5 py-1.5 text-xs text-slate-300 shadow-md">
      <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
        <Thermometer className="w-4 h-4" />
        <span>{weather.temperature_c}°C</span>
      </div>
      <div className="h-3 w-px bg-slate-700" />
      <div className="flex items-center gap-1 text-sky-400">
        <Cloud className="w-3.5 h-3.5" />
        <span>{weather.condition}</span>
      </div>
      <div className="h-3 w-px bg-slate-700" />
      <div className="flex items-center gap-1 text-slate-400">
        <Droplets className="w-3.5 h-3.5" />
        <span>{weather.humidity_pct}%</span>
      </div>
      <div className="h-3 w-px bg-slate-700" />
      <div className="flex items-center gap-1 text-slate-400">
        <Wind className="w-3.5 h-3.5" />
        <span>{weather.wind_speed_kmh} km/h</span>
      </div>
    </div>
  );
};
