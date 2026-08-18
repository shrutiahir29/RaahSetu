import React, { useEffect, useState } from 'react';
import { fetchTrafficSegments, fetchIncidents, deleteIncident, triggerMLRetrain, fetchMLMetrics, fetchDiversionPlan, runSimulation } from '../services/api';
import { IncidentModal } from '../components/IncidentModal';
import { ShieldCheck, Plus, RefreshCw, ShieldAlert, Cpu, CheckCircle2, Trash2, Sliders, ArrowRight, Play, Sparkles } from 'lucide-react';
import { CongestionBadge } from '../components/CongestionBadge';

export const AdminDashboard: React.FC = () => {
  const [segments, setSegments] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [mlMetrics, setMlMetrics] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  // Diversion Engine State
  const [peakWindow, setPeakWindow] = useState<'morning' | 'evening'>('evening');
  const [targetHour, setTargetHour] = useState<number>(18);
  const [diversionPlan, setDiversionPlan] = useState<any>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [diversionLoading, setDiversionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [segs, incs, metrics, plan] = await Promise.all([
        fetchTrafficSegments(),
        fetchIncidents(),
        fetchMLMetrics(),
        fetchDiversionPlan(peakWindow, targetHour)
      ]);
      setSegments(segs);
      setIncidents(incs);
      setMlMetrics(metrics);
      setDiversionPlan(plan);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeneratePlan = async () => {
    setDiversionLoading(true);
    try {
      const plan = await fetchDiversionPlan(peakWindow, targetHour);
      setDiversionPlan(plan);
    } catch (err) {
      console.error(err);
    } finally {
      setDiversionLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    setDiversionLoading(true);
    try {
      const res = await runSimulation({
        peak_window: peakWindow,
        target_hour: targetHour,
        strategies: ['Route Redistribution', 'Capacity Balancing', 'Alternative Corridor Selection']
      });
      setSimulationResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDiversionLoading(false);
    }
  };

  const handleDeleteIncident = async (id: number) => {
    try {
      await deleteIncident(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainSuccess(false);
    try {
      const res = await triggerMLRetrain();
      setMlMetrics(res.metrics);
      setRetrainSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
            <ShieldCheck className="w-6 h-6" />
            <span>Nagpur Traffic Management & Admin Command Panel</span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time incident management, road closures, and automated ML model retraining interface
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Report Road Incident</span>
          </button>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
            <span>Retrain XGBoost Model</span>
          </button>
        </div>
      </div>

      {retrainSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>Model retrained successfully! Saved new XGBoost joblib model and metrics.</span>
        </div>
      )}

      {/* CITY-LEVEL TRAFFIC DIVERSION & REDISTRIBUTION CONTROL PANEL */}
      <div className="bg-slate-900/90 backdrop-blur border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
              <Sliders className="w-5 h-5" />
              <span>CITY-LEVEL TRAFFIC DIVERSION & REDISTRIBUTION ENGINE</span>
            </div>
            <p className="text-xs text-slate-400">
              City-level volume diversion recommendations for Planning Authority's Jurisdiction
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={peakWindow}
              onChange={(e) => setPeakWindow(e.target.value as 'morning' | 'evening')}
              className="bg-slate-950 text-cyan-400 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none"
            >
              <option value="morning">Morning Peak (9-12 PM)</option>
              <option value="evening">Evening Peak (4-7 PM)</option>
            </select>

            <select
              value={targetHour}
              onChange={(e) => setTargetHour(Number(e.target.value))}
              className="bg-slate-950 text-cyan-400 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none"
            >
              <option value={9}>09:00 AM</option>
              <option value={10}>10:00 AM</option>
              <option value={11}>11:00 AM</option>
              <option value={12}>12:00 PM</option>
              <option value={16}>04:00 PM</option>
              <option value={17}>05:00 PM</option>
              <option value={18}>06:00 PM</option>
              <option value={19}>07:00 PM</option>
            </select>

            <button
              onClick={handleGeneratePlan}
              disabled={diversionLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>GENERATE PLAN</span>
            </button>

            <button
              onClick={handleRunSimulation}
              disabled={diversionLoading}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN SIMULATION</span>
            </button>
          </div>
        </div>

        {/* Simulation Output Banner */}
        {simulationResult && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Simulation Executed! Overloaded Corridors Relieved: {simulationResult.measurable_improvements?.overloaded_reduction} | Traffic Balance Improvement: +{simulationResult.measurable_improvements?.traffic_balance_improvement_pct}%</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono">
              {simulationResult.measurable_improvements?.redistributed_volume_total_pcu} PCU/hr shifted
            </span>
          </div>
        )}

        {/* City Level Dynamic Narrative Summary */}
        {diversionPlan?.city_level_narrative && diversionPlan.city_level_narrative.length > 0 && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
              City-Level Recommendation Summary ({diversionPlan.peak_window.toUpperCase()} PEAK - {String(diversionPlan.target_hour).padStart(2, '0')}:00 HRS)
            </span>
            <div className="space-y-1.5 text-xs text-slate-200">
              {diversionPlan.city_level_narrative.map((narrative: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>{narrative}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Diversion Allocations per Overloaded Corridor */}
        <div className="space-y-3">
          {(diversionPlan?.recommendations || []).map((rec: any) => (
            <div key={rec.overloaded_segment_id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
                <div>
                  <span className="font-bold text-sm text-rose-400 block">{rec.overloaded_road_name}</span>
                  <span className="text-[10px] text-slate-400">{rec.corridor} • Capacity: {rec.road_capacity_pcu_hr} PCU/hr</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-rose-400 font-extrabold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    Util: {rec.current_utilization_pct}% ({rec.status})
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Util After: {rec.utilization_after_diversion_pct}%
                  </span>
                </div>
              </div>

              {/* Recommended Candidate Corridor Allocations */}
              <div className="space-y-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Recommended Diverted Volumes (Total: {rec.total_diverted_pcu_hr} PCU/hr)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {rec.recommended_allocations.map((alloc: any) => (
                    <div key={alloc.candidate_id} className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-200 block">{alloc.candidate_name}</span>
                        <span className="text-[10px] text-slate-400">
                          Util: {alloc.utilization_before_pct}% → <strong className="text-emerald-400">{alloc.utilization_after_pct}%</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-cyan-400 block">
                          Divert {alloc.divert_vehicles_pcu_hr} PCU/hr
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Score: {alloc.score}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Incidents & Congested Roads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Incidents Table */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Active Road Incidents ({incidents.length})</span>
            </div>
          </div>

          <div className="space-y-3">
            {incidents.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No active incidents reported.</p>
            ) : (
              incidents.map((inc) => (
                <div key={inc.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">{inc.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold">
                        {inc.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{inc.description}</p>
                    <span className="text-[10px] text-slate-500 block">Segment ID: {inc.segment_id}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteIncident(inc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                    title="Resolve Incident"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Currently Congested Corridors */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>High Density Road Corridors</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Nagpur Live Monitor</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {segments.map((seg) => (
              <div key={seg.id} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-200 block">{seg.name}</span>
                  <span className="text-[10px] text-slate-400">{seg.corridor} • Limit: {seg.speed_limit_kmh} km/h</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-semibold">{seg.current_traffic?.avg_speed_kmh} km/h</span>
                  <CongestionBadge level={seg.current_traffic?.congestion_level} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ML Model Performance Summary */}
      {mlMetrics && (
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Cpu className="w-4 h-4" />
              <span>Loaded ML Model Metadata & Training Details</span>
            </div>
            <span className="text-xs text-slate-400">Last Trained: {mlMetrics.last_trained_at}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Primary Model</span>
              <span className="text-base font-extrabold text-white">{mlMetrics.selected_model}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Test R² Accuracy Score</span>
              <span className="text-base font-extrabold text-emerald-400">{mlMetrics.best_metrics?.r2}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Training Record Volume</span>
              <span className="text-base font-extrabold text-cyan-400">{mlMetrics.training_samples} samples</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      <IncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        segments={segments}
      />
    </div>
  );
};
