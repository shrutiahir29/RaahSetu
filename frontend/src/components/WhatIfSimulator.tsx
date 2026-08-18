import React, { useState } from 'react';
import { runWhatIfSimulation } from '../services/api';
import { Sliders, Play } from 'lucide-react';

interface Props {
  segments: any[];
  defaultFromId?: string;
  defaultToId?: string;
}

export const WhatIfSimulator: React.FC<Props> = ({
  segments = [],
  defaultFromId,
  defaultToId
}) => {
  const [fromSegId, setFromSegId] = useState(defaultFromId || 'seg_sitabuldi_rahate');
  const [toSegId, setToSegId] = useState(defaultToId || 'seg_lawcollege_dharampeth');
  const [diversionPct, setDiversionPct] = useState<number>(15);
  const [timePeriod, setTimePeriod] = useState('04:00 PM - 07:00 PM');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await runWhatIfSimulation({
        from_segment_id: fromSegId,
        to_segment_id: toSegId,
        diversion_pct: diversionPct,
        time_period: timePeriod
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
          <Sliders className="w-5 h-5" />
          <span>INTERACTIVE WHAT-IF TRAFFIC SIMULATOR</span>
        </div>
        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full font-semibold">
          Planning Authority Tool
        </span>
      </div>

      {/* Control Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="text-slate-400 block mb-1 font-semibold">From Road (Overloaded):</label>
          <select
            value={fromSegId}
            onChange={(e) => setFromSegId(e.target.value)}
            className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-2.5 font-bold focus:outline-none"
          >
            {segments.map((s) => (
              <option key={s.segment_id || s.id} value={s.segment_id || s.id}>
                {s.name} ({s.utilization_pct || 90}%)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-semibold">To Road (Bypass):</label>
          <select
            value={toSegId}
            onChange={(e) => setToSegId(e.target.value)}
            className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-2.5 font-bold focus:outline-none"
          >
            {segments.map((s) => (
              <option key={s.segment_id || s.id} value={s.segment_id || s.id}>
                {s.name} ({s.utilization_pct || 40}%)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-semibold">Time Window:</label>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="w-full bg-slate-950 text-cyan-400 border border-slate-800 rounded-xl p-2.5 font-bold focus:outline-none"
          >
            <option value="09:00 AM - 12:00 PM">Morning Peak (9 AM - 12 PM)</option>
            <option value="04:00 PM - 07:00 PM">Evening Peak (4 PM - 7 PM)</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-semibold">Traffic Diversion %:</label>
          <div className="flex items-center gap-1">
            {[5, 10, 15, 20, 25, 30].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setDiversionPct(pct)}
                className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition ${
                  diversionPct === pct
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleRun}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 hover:brightness-110 transition"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{loading ? 'Simulating What-If Scenario...' : `RUN WHAT-IF SIMULATION (${diversionPct}%)`}</span>
        </button>
      </div>

      {/* BEFORE vs AFTER Simulation Output Card */}
      {result && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-xs text-cyan-400 uppercase tracking-wider">
              {result.scenario} Results
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Shifted: {result.shifted_volume_pcu_hr} PCU/hr
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BEFORE Card */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-rose-500/30 space-y-2">
              <span className="text-xs font-extrabold text-rose-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
                BEFORE (Unmanaged Baseline)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Avg Waiting Time:</span>
                  <span className="font-bold">{result.before.avg_waiting_time_sec} sec</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Avg Queue Length:</span>
                  <span className="font-bold">{result.before.avg_queue_length_vehicles} vehicles</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Overloaded Corridors:</span>
                  <span className="font-bold text-rose-400">{result.before.overloaded_roads_count} roads</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Source Road Util:</span>
                  <span className="font-bold text-rose-400">{result.before.from_road_utilization_pct}%</span>
                </div>
              </div>
            </div>

            {/* AFTER Card */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/30 space-y-2">
              <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
                AFTER ({diversionPct}% Traffic Diversion)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Avg Waiting Time:</span>
                  <span className="font-bold text-emerald-400">{result.after.avg_waiting_time_sec} sec</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Avg Queue Length:</span>
                  <span className="font-bold text-emerald-400">{result.after.avg_queue_length_vehicles} vehicles</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Overloaded Corridors:</span>
                  <span className="font-bold text-emerald-400">{result.after.overloaded_roads_count} roads</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Source Road Util:</span>
                  <span className="font-bold text-emerald-400">{result.after.from_road_utilization_pct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explainable AI Reason */}
          <div className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/30 text-xs text-cyan-200">
            <strong className="text-cyan-400 block text-[10px] uppercase mb-0.5">Explainable AI Simulation Summary:</strong>
            <span>{result.explainable_ai_reason}</span>
          </div>
        </div>
      )}
    </div>
  );
};
