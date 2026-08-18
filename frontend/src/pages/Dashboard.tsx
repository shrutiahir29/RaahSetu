import React, { useEffect, useState } from 'react';
import { NagpurMap } from '../components/NagpurMap';
import { RoutePlanner } from '../components/RoutePlanner';
import { TrafficCharts } from '../components/TrafficCharts';
import { RecommendationPanel } from '../components/RecommendationPanel';
import { SignalOptimizerModal } from '../components/SignalOptimizerModal';
import { WhatIfSimulator } from '../components/WhatIfSimulator';
import { fetchTrafficDistribution, fetchIncidents, fetchTrafficAnalytics, fetchPredictionAnalytics, fetchAlerts, fetchDiversionPlan } from '../services/api';
import { AlertTriangle, Radio, Layers, Navigation, ShieldCheck, Clock } from 'lucide-react';

export const Dashboard: React.FC = () => {
  // Operational Level Mode State: LEVEL 1 (Commuter A->B) vs LEVEL 2 (Planning Authority)
  const [operationalLevel, setOperationalLevel] = useState<'commuter' | 'planning_authority'>('planning_authority');

  const [peakWindow, setPeakWindow] = useState<'morning' | 'evening'>('evening');
  const [targetHour, setTargetHour] = useState<number>(18);
  const [filterClass, setFilterClass] = useState<string>('ALL');

  const [distributionData, setDistributionData] = useState<any>(null);
  const [diversionPlan, setDiversionPlan] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [trafficAnalytics, setTrafficAnalytics] = useState<any>(null);
  const [predAnalytics, setPredAnalytics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [calculatedRoute, setCalculatedRoute] = useState<any>(null);

  // Modals
  const [isSignalModalOpen, setIsSignalModalOpen] = useState(false);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, [peakWindow, targetHour]);

  const loadData = async () => {
    try {
      const [dist, plan, incs, tAnalytics, pAnalytics, alrts] = await Promise.all([
        fetchTrafficDistribution(peakWindow, targetHour),
        fetchDiversionPlan(peakWindow, targetHour),
        fetchIncidents(),
        fetchTrafficAnalytics(),
        fetchPredictionAnalytics(),
        fetchAlerts()
      ]);
      setDistributionData(dist);
      setDiversionPlan(plan);
      setIncidents(incs);
      setTrafficAnalytics(tAnalytics);
      setPredAnalytics(pAnalytics);
      setAlerts(alrts);
    } catch (err) {
      console.error(err);
    }
  };

  const allSegments = distributionData?.segments || [];
  const filteredSegments = allSegments.filter((s: any) => {
    if (filterClass === 'ALL') return true;
    return s.classification === filterClass;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Command Center Title Banner with Dual Intelligence Mode Selector */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
              <h1 className="text-xl font-extrabold text-white tracking-wide">
                RAAHSETU NAGPUR SMART TRAFFIC COMMAND CENTER
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              AI-Powered Traffic Prediction, Diversion Engine & Traffic-Aware A* Routing for Nagpur, Maharashtra
            </p>
          </div>

          {/* DUAL INTELLIGENCE LEVEL SELECTOR TABS */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setOperationalLevel('commuter')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition ${
                operationalLevel === 'commuter'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>LEVEL 1 — COMMUTER (A → B)</span>
            </button>

            <button
              onClick={() => setOperationalLevel('planning_authority')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition ${
                operationalLevel === 'planning_authority'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>LEVEL 2 — PLANNING AUTHORITY</span>
            </button>
          </div>
        </div>

        {/* Peak Window & Hour Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => {
                  setPeakWindow('morning');
                  setTargetHour(9);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  peakWindow === 'morning' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Morning Peak (9 AM–12 PM)
              </button>

              <button
                onClick={() => {
                  setPeakWindow('evening');
                  setTargetHour(18);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  peakWindow === 'evening' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Evening Peak (4 PM–7 PM)
              </button>
            </div>

            <div className="flex items-center gap-2 px-2 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold">Simulated Hour:</span>
              <select
                value={targetHour}
                onChange={(e) => setTargetHour(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-cyan-400 font-bold rounded-lg px-2.5 py-1"
              >
                {peakWindow === 'morning' ? (
                  <>
                    <option value={9}>09:00 AM</option>
                    <option value={10}>10:00 AM</option>
                    <option value={11}>11:00 AM</option>
                    <option value={12}>12:00 PM</option>
                  </>
                ) : (
                  <>
                    <option value={16}>04:00 PM</option>
                    <option value={17}>05:00 PM</option>
                    <option value={18}>06:00 PM</option>
                    <option value={19}>07:00 PM</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Quick Action Button for Signal Recommendations */}
          <button
            onClick={() => setIsSignalModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs flex items-center gap-2 transition"
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>ADAPTIVE SIGNAL TIMINGS</span>
          </button>
        </div>
      </div>

      {/* Dynamic Command Center Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-3.5 shadow-xl">
          <span className="text-[11px] text-slate-400 font-semibold block">Total Monitored</span>
          <span className="text-xl font-extrabold text-white mt-1 block">
            {distributionData?.total_segments_monitored || 24}
          </span>
          <span className="text-[10px] text-slate-500 block">Nagpur road network</span>
        </div>

        <div className="bg-slate-900/90 backdrop-blur border border-rose-500/30 rounded-2xl p-3.5 shadow-xl">
          <span className="text-[11px] text-rose-400 font-semibold block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Overloaded Roads
          </span>
          <span className="text-xl font-extrabold text-rose-400 mt-1 block">
            {distributionData?.overloaded_count || 4}
          </span>
          <span className="text-[10px] text-rose-300 block">V/C ratio &ge; 0.90</span>
        </div>

        <div className="bg-slate-900/90 backdrop-blur border border-amber-500/30 rounded-2xl p-3.5 shadow-xl">
          <span className="text-[11px] text-amber-400 font-semibold block">Balanced Roads</span>
          <span className="text-xl font-extrabold text-amber-400 mt-1 block">
            {distributionData?.balanced_count || 12}
          </span>
          <span className="text-[10px] text-amber-300 block">0.50 &le; V/C &lt; 0.75</span>
        </div>

        <div className="bg-slate-900/90 backdrop-blur border border-emerald-500/30 rounded-2xl p-3.5 shadow-xl">
          <span className="text-[11px] text-emerald-400 font-semibold block">Underutilized Roads</span>
          <span className="text-xl font-extrabold text-emerald-400 mt-1 block">
            {distributionData?.underutilized_count || 8}
          </span>
          <span className="text-[10px] text-emerald-300 block">Available capacity &gt; 50%</span>
        </div>

        <div className="bg-slate-900/90 backdrop-blur border border-cyan-500/30 rounded-2xl p-3.5 shadow-xl">
          <span className="text-[11px] text-cyan-400 font-semibold block">Avg Network Util</span>
          <span className="text-xl font-extrabold text-cyan-400 mt-1 block">
            {distributionData?.avg_network_utilization_pct || 62.4}%
          </span>
          <span className="text-[10px] text-cyan-300 block">Capacity utilization</span>
        </div>

        <div className="bg-slate-900/90 backdrop-blur border border-indigo-500/30 rounded-2xl p-3.5 shadow-xl">
          <span className="text-[11px] text-indigo-400 font-semibold block">Imbalance Index</span>
          <span className="text-xl font-extrabold text-indigo-400 mt-1 block">
            {distributionData?.network_imbalance_index || 0.284}
          </span>
          <span className="text-[10px] text-indigo-300 block">V/C ratio variance</span>
        </div>
      </div>

      {/* Traffic Filter & Classification Toolbar */}
      <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-bold">Road Network Classification Filter:</span>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Roads' },
            { id: 'OVERLOADED', label: '🔴 Overloaded Only' },
            { id: 'BALANCED', label: '🟡 Balanced Only' },
            { id: 'UNDERUTILIZED', label: '🟢 Underutilized Only' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterClass(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterClass === f.id
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map & Mode-Specific Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Panel: Level 1 Commuter vs Level 2 Planning Authority */}
        <div className="lg:col-span-4 space-y-4">
          {operationalLevel === 'commuter' ? (
            /* LEVEL 1 COMMUTER A -> B ROUTE PLANNER */
            <div className="space-y-4">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3 text-xs text-cyan-300 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span><strong>Commuter Mode Active:</strong> Enter Place A to Place B to calculate the best traffic-aware route with Explainable AI reasoning.</span>
              </div>
              <RoutePlanner onRouteCalculated={(data) => setCalculatedRoute(data)} />
            </div>
          ) : (
            /* LEVEL 2 PLANNING AUTHORITY RECOMMENDATION PANEL */
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 text-xs text-blue-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span><strong>Planning Authority Mode Active:</strong> Network-wide traffic redistribution, dynamic volume diversion %, and What-If simulation.</span>
              </div>

              <RecommendationPanel
                recommendations={diversionPlan?.recommendations || []}
              />
            </div>
          )}

          {/* Live Advisories Stream */}
          <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Command Center Live Alerts</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                Peak Hour
              </span>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1 text-xs">
              {alerts.slice(0, 3).map((alrt) => (
                <div key={alrt.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-[11px]">{alrt.title}</span>
                    <span className="text-[10px] text-slate-400">{alrt.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{alrt.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Google Maps Component (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="h-[520px] w-full">
            <NagpurMap
              segments={filteredSegments}
              routeData={calculatedRoute}
              incidents={incidents}
            />
          </div>

          {/* Interactive What-If Simulator embedded below Map in Planning Authority mode */}
          {operationalLevel === 'planning_authority' && (
            <WhatIfSimulator segments={allSegments} />
          )}
        </div>
      </div>

      {/* Traffic Charts & Distribution Analytics */}
      <TrafficCharts
        trafficAnalytics={trafficAnalytics}
        predictionAnalytics={predAnalytics}
      />

      {/* Adaptive Signal Optimizer Modal */}
      <SignalOptimizerModal
        isOpen={isSignalModalOpen}
        onClose={() => setIsSignalModalOpen(false)}
      />
    </div>
  );
};
