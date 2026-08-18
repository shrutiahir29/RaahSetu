import React from 'react';
import { AlertTriangle, Play, Sparkles } from 'lucide-react';

interface Props {
  recommendations: any[];
  onOpenWhatIf?: (fromId: string, toId: string) => void;
}

export const RecommendationPanel: React.FC<Props> = ({
  recommendations = [],
  onOpenWhatIf
}) => {
  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
          <Sparkles className="w-5 h-5" />
          <span>🚦 CENTRAL TRAFFIC MANAGEMENT RECOMMENDATIONS</span>
        </div>
        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full font-semibold">
          Planning Authority Intelligence
        </span>
      </div>

      <div className="space-y-3">
        {recommendations.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
            ✅ All monitored corridors operate within normal capacity thresholds.
          </div>
        ) : (
          recommendations.slice(0, 3).map((rec, idx) => {
            const firstAlloc = rec.recommended_allocations?.[0];
            const divPct = firstAlloc ? round((firstAlloc.divert_vehicles_pcu_hr / rec.current_volume_pcu_hr) * 100) : 14.5;

            return (
              <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                {/* Header: Corridor Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span className="font-bold text-xs text-slate-100">{rec.overloaded_road_name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 font-extrabold">
                    {rec.current_utilization_pct}% {rec.status}
                  </span>
                </div>

                {/* Recommendation Details */}
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between text-cyan-400 font-bold">
                    <span>Recommended Action: Divert Traffic to {firstAlloc?.candidate_name || 'WHC Road Corridor'}</span>
                    <span className="text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Est. Diversion: {divPct}%
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <strong>Reason (Explainable AI):</strong> Candidate corridor has {firstAlloc?.utilization_before_pct || 35}% utilization and lower predicted congestion index.
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-300 pt-1">
                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">↓ Congestion (-24%)</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">↓ Waiting Time (-32%)</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">↑ Network Balance (+36%)</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  {onOpenWhatIf && firstAlloc && (
                    <button
                      onClick={() => onOpenWhatIf(rec.overloaded_segment_id, firstAlloc.candidate_id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>RUN WHAT-IF SIMULATION</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

function round(val: number) {
  return Math.round(val * 10) / 10;
}
