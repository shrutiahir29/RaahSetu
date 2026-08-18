import React, { useState } from 'react';
import { MapPin, Navigation, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { findRoute } from '../services/api';
import { CongestionBadge } from './CongestionBadge';

interface Props {
  onRouteCalculated: (data: any) => void;
}

export const RoutePlanner: React.FC<Props> = ({ onRouteCalculated }) => {
  const [fromLoc, setFromLoc] = useState('Sitabuldi Interchange');
  const [toLoc, setToLoc] = useState('MIHAN IT & SEZ Hub');
  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nagpurLocations = [
    'Sitabuldi Interchange',
    'MIHAN IT & SEZ Hub',
    'Zero Mile Freedom Park',
    'Sadar Residency Road Sq',
    'Mankapur Square',
    'Automotive Square (Kamptee Rd)',
    'Central Avenue (Cotton Market)',
    'HB Town Square (Bhandara Rd)',
    'Medical College Square',
    'Ramdaspeth Sq',
    'Rahate Colony Square',
    'Ajni Square (Wardha Rd)',
    'Chhatrapati Square (Wardha Rd)',
    'Airport Square (Pride Hotel Sq)',
    'Nagpur Airport Terminal',
    'Khapri Metro Station Sq',
    'Dharampeth Zenda Chowk',
    'Law College Square',
    'Shankarnagar Square',
    'Nagpur IT Park (Parsodi)',
    'Hingna Naka / MIDC'
  ];

  const handleSearch = async (from = fromLoc, to = toLoc) => {
    if (from === to) {
      setErrorMsg('Start and Destination locations must be different.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await findRoute({ from_location: from, to_location: to });
      setRouteResult(data);
      onRouteCalculated(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to compute optimal route.');
    } finally {
      setLoading(false);
    }
  };

  const rec = routeResult?.recommended_route;
  const alt = routeResult?.alternative_routes?.[0];

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Traffic-Aware A* Route Optimization</h2>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
          Nagpur ML Engine
        </span>
      </div>

      {/* Preset Quick Actions */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
          Quick Test Corridors
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setFromLoc('Sitabuldi Interchange');
              setToLoc('MIHAN IT & SEZ Hub');
              handleSearch('Sitabuldi Interchange', 'MIHAN IT & SEZ Hub');
            }}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition flex items-center gap-1.5 font-medium"
          >
            <span>Sitabuldi → MIHAN</span>
            <ArrowRight className="w-3 h-3 text-cyan-400" />
          </button>
          <button
            onClick={() => {
              setFromLoc('Sadar Residency Road Sq');
              setToLoc('Nagpur Airport Terminal');
              handleSearch('Sadar Residency Road Sq', 'Nagpur Airport Terminal');
            }}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 font-medium"
          >
            <span>Sadar → Airport</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={() => {
              setFromLoc('Law College Square');
              setToLoc('HB Town Square (Bhandara Rd)');
              handleSearch('Law College Square', 'HB Town Square (Bhandara Rd)');
            }}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 font-medium"
          >
            <span>Amravati Rd → HB Town</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Search Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-emerald-400" /> From (Origin)
          </label>
          <select
            value={fromLoc}
            onChange={(e) => {
              setFromLoc(e.target.value);
              setErrorMsg(null);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {nagpurLocations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400" /> To (Destination)
          </label>
          <select
            value={toLoc}
            onChange={(e) => {
              setToLoc(e.target.value);
              setErrorMsg(null);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {nagpurLocations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={() => handleSearch()}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Navigation className="w-4 h-4 transform -rotate-45" />
            <span>Find Best Traffic-Aware Route</span>
          </>
        )}
      </button>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Recommended Route Results Card */}
      {rec && (
        <div className="space-y-4 pt-2 border-t border-slate-800 animate-fadeIn">
          {/* Primary Recommended Card */}
          <div className="bg-slate-950/80 border border-cyan-500/40 rounded-xl p-4 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 px-3 py-1 rounded-bl-xl text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> BEST ROUTE (A*)
            </div>

            <div className="pr-24">
              <span className="text-[11px] text-cyan-400 font-semibold uppercase tracking-wider block">
                {rec.label}
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {routeResult.from_location} → {routeResult.to_location}
              </h3>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Distance</span>
                <span className="text-sm font-extrabold text-slate-100">{rec.distance_km} km</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ETA</span>
                <span className="text-sm font-extrabold text-cyan-400">{rec.eta_minutes} min</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">Congestion</span>
                <CongestionBadge level={rec.overall_congestion} size="sm" />
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Route Score</span>
                <span className="text-sm font-extrabold text-emerald-400">{rec.route_score}/100</span>
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2.5 text-xs text-cyan-300">
              <span className="font-semibold block text-[11px] mb-0.5">Recommendation Reason:</span>
              <p className="text-slate-300 text-[11px]">{rec.reason}</p>
            </div>
          </div>

          {/* Alternative Corridor Card */}
          {alt && (
            <div className="bg-slate-950/40 border border-purple-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider">
                  Alternative Corridor (Bypass)
                </span>
                <CongestionBadge level={alt.overall_congestion} size="sm" />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Distance: <strong className="text-white">{alt.distance_km} km</strong></span>
                <span>ETA: <strong className="text-purple-300">{alt.eta_minutes} min</strong></span>
                <span>Score: <strong className="text-purple-300">{alt.route_score}/100</strong></span>
              </div>
            </div>
          )}

          {/* Turn by Turn Directions */}
          {rec.turn_by_turn && rec.turn_by_turn.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200 block">Turn-by-Turn Navigation</span>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {rec.turn_by_turn.map((step: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="h-5 w-5 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-300 pt-0.5">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
