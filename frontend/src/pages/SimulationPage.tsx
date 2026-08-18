import React, { useState, useEffect } from 'react';
import { runSimulation, fetchTrafficDistribution } from '../services/api';
import { Play, Sliders, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { NagpurMap } from '../components/NagpurMap';

export const SimulationPage: React.FC = () => {
  const [peakWindow, setPeakWindow] = useState<'morning' | 'evening'>('evening');
  const [targetHour, setTargetHour] = useState<number>(18);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([
    'Route Redistribution',
    'Capacity Balancing',
    'Alternative Corridor Selection'
  ]);

  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [distributionData, setDistributionData] = useState<any>(null);

  useEffect(() => {
    // Default hour when switching window
    if (peakWindow === 'morning' && (targetHour < 9 || targetHour > 12)) {
      setTargetHour(9);
    } else if (peakWindow === 'evening' && (targetHour < 16 || targetHour > 19)) {
      setTargetHour(18);
    }
    loadCurrentDistribution();
  }, [peakWindow, targetHour]);

  const loadCurrentDistribution = async () => {
    try {
      const data = await fetchTrafficDistribution(peakWindow, targetHour);
      setDistributionData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      const res = await runSimulation({
        peak_window: peakWindow,
        target_hour: targetHour,
        strategies: selectedStrategies
      });
      setSimulationResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStrategy = (strat: string) => {
    if (selectedStrategies.includes(strat)) {
      setSelectedStrategies(selectedStrategies.filter(s => s !== strat));
    } else {
      setSelectedStrategies([...selectedStrategies, strat]);
    }
  };

  const before = simulationResult?.before_simulation;
  const after = simulationResult?.after_simulation;
  const improvements = simulationResult?.measurable_improvements;

  // Chart data for Before vs After comparison
  const beforeAfterChartData = (before?.segments || []).slice(0, 8).map((bSeg: any) => {
    const aSeg = (after?.segments || []).find((s: any) => s.segment_id === bSeg.segment_id) || bSeg;
    return {
      name: bSeg.name.split('(')[0].trim(),
      Before_Utilization: bSeg.utilization_pct,
      After_Utilization: aSeg.utilization_pct,
      Before_Speed: bSeg.avg_speed_kmh,
      After_Speed: aSeg.avg_speed_kmh
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
            <Sliders className="w-6 h-6" />
            <span>Peak-Hour Traffic Management & Redistribution Simulator</span>
          </div>
          <p className="text-xs text-slate-400">
            Official Simulation outcome for Morning Peak (9 AM - 12 PM) & Evening Peak (4 PM - 7 PM)
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Peak-Hour Traffic Redistribution Simulation</span>
            </>
          )}
        </button>
      </div>

      {/* Control Panel: Window, Hour, Strategies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Peak Window Selector */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <label className="text-xs font-bold text-white uppercase tracking-wider block">
            1. Select Peak Window
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPeakWindow('morning')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                peakWindow === 'morning'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-2 ring-amber-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span>Morning Peak</span>
              <span className="text-[10px] opacity-80 font-normal">9:00 AM – 12:00 PM</span>
            </button>

            <button
              onClick={() => setPeakWindow('evening')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                peakWindow === 'evening'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 ring-2 ring-cyan-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span>Evening Peak</span>
              <span className="text-[10px] opacity-80 font-normal">4:00 PM – 7:00 PM</span>
            </button>
          </div>
        </div>

        {/* 2. Target Hour Slider */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white uppercase tracking-wider">
              2. Select Simulation Hour
            </label>
            <span className="text-xs font-bold text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {String(targetHour).padStart(2, '0')}:00 Hrs
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min={peakWindow === 'morning' ? 9 : 16}
              max={peakWindow === 'morning' ? 12 : 19}
              step={1}
              value={targetHour}
              onChange={(e) => setTargetHour(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              {peakWindow === 'morning' ? (
                <>
                  <span>09:00</span>
                  <span>10:00</span>
                  <span>11:00</span>
                  <span>12:00</span>
                </>
              ) : (
                <>
                  <span>16:00 (4 PM)</span>
                  <span>17:00 (5 PM)</span>
                  <span>18:00 (6 PM)</span>
                  <span>19:00 (7 PM)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3. Traffic Management Strategies */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <label className="text-xs font-bold text-white uppercase tracking-wider block">
            3. Active Traffic Management Strategies
          </label>
          <div className="space-y-1.5 text-xs">
            {[
              'Route Redistribution',
              'Capacity Balancing',
              'Incident Avoidance',
              'Alternative Corridor Selection'
            ].map((strat) => (
              <label key={strat} className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedStrategies.includes(strat)}
                  onChange={() => toggleStrategy(strat)}
                  className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span>{strat}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Google Maps Simulation Visualizer Layer */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Google Maps Interactive Redistribution Visualizer</h3>
          </div>
          <span className="text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 font-semibold">
            {simulationResult ? 'Displaying AFTER Redistribution Layer + Flow Arrows' : 'Displaying Baseline Traffic Layer'}
          </span>
        </div>

        <div className="h-[480px] w-full">
          <NagpurMap
            segments={after?.segments || distributionData?.segments || []}
            redistributionFlows={simulationResult?.flow_redistributions || []}
          />
        </div>
      </div>

      {/* Measurable Improvement Banner */}
      {improvements && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
          <div className="bg-slate-900/90 backdrop-blur border border-emerald-500/30 rounded-2xl p-4 shadow-xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Overloaded Roads Reduction</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-400">
                -{improvements.overloaded_reduction}
              </span>
              <span className="text-xs text-slate-300">corridors relieved</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium mt-1 block">
              Shifted to underutilized roads
            </span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur border border-cyan-500/30 rounded-2xl p-4 shadow-xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Average Speed Improvement</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-cyan-400">
                +{improvements.speed_improvement_pct}%
              </span>
              <span className="text-xs text-slate-300">faster flow</span>
            </div>
            <span className="text-[10px] text-cyan-300 font-medium mt-1 block">
              {before?.avg_network_speed_kmh} → {after?.avg_network_speed_kmh} km/h
            </span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur border border-indigo-500/30 rounded-2xl p-4 shadow-xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Travel Time Savings</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-indigo-400">
                -{Math.abs(improvements.travel_time_reduction_pct)}%
              </span>
              <span className="text-xs text-slate-300">delay reduction</span>
            </div>
            <span className="text-[10px] text-indigo-300 font-medium mt-1 block">
              Network-wide commute savings
            </span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur border border-amber-500/30 rounded-2xl p-4 shadow-xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Traffic Balance Score</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-400">
                +{improvements.traffic_balance_improvement_pct}%
              </span>
              <span className="text-xs text-slate-300">imbalance score</span>
            </div>
            <span className="text-[10px] text-amber-300 font-medium mt-1 block">
              Better road utilization variance
            </span>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Tables (BEFORE vs AFTER) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BEFORE Simulation Table */}
        <div className="bg-slate-900/90 backdrop-blur border border-rose-500/30 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>BEFORE Traffic Management (Unbalanced)</span>
            </div>
            <span className="text-xs font-semibold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              {before?.overloaded_count || distributionData?.overloaded_count || 0} Overloaded Roads
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
            {(before?.segments || distributionData?.segments || []).map((seg: any) => (
              <div key={seg.segment_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block">{seg.name}</span>
                  <span className="text-[10px] text-slate-400">{seg.corridor} • Vol: {seg.volume_pcu_hr} PCU/hr</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-semibold">{seg.utilization_pct}% Util</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    seg.classification === 'OVERLOADED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    seg.classification === 'BALANCED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {seg.classification}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AFTER Simulation Table */}
        <div className="bg-slate-900/90 backdrop-blur border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>AFTER Redistribution Simulation (Balanced)</span>
            </div>
            <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {after ? `${after.overloaded_count} Overloaded Roads` : 'Click Run Simulation'}
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
            {after ? (
              after.segments.map((seg: any) => (
                <div key={seg.segment_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block">{seg.name}</span>
                    <span className="text-[10px] text-slate-400">{seg.corridor} • Vol: {seg.volume_pcu_hr} PCU/hr</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-semibold">{seg.utilization_pct}% Util</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      seg.classification === 'OVERLOADED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      seg.classification === 'BALANCED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {seg.classification}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-xs italic p-4 text-center">
                Click 'Run Peak-Hour Traffic Redistribution Simulation' to compute post-redistribution network metrics.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* BEFORE vs AFTER Utilization Chart */}
      {beforeAfterChartData.length > 0 && (
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white">Road Segment Utilization (%) BEFORE vs AFTER Redistribution</h3>
            <span className="text-xs text-slate-400">Peak Window: {peakWindow.toUpperCase()} ({String(targetHour).padStart(2, '0')}:00)</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={beforeAfterChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Before_Utilization" fill="#f43f5e" name="Before Redistribution (%)" />
                <Bar dataKey="After_Utilization" fill="#10b981" name="After Redistribution (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
