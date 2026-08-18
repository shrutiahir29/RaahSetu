import React, { useEffect, useState } from 'react';
import { fetchSignalRecommendations } from '../services/api';
import { Clock, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SignalOptimizerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSignalData();
    }
  }, [isOpen]);

  const loadSignalData = async () => {
    setLoading(true);
    try {
      const res = await fetchSignalRecommendations();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <Clock className="w-5 h-5" />
            <span>ADAPTIVE TRAFFIC SIGNAL RECOMMENDATIONS</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-cyan-400 font-bold space-y-2">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <span>Optimizing Signal Cycle Times...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((int: any) => (
              <div key={int.intersection_id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="font-bold text-sm text-white block">{int.intersection_name}</span>
                    <span className="text-[10px] text-slate-400">{int.corridor} • Cycle: {int.cycle_length_sec} sec</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                      -24.5% Waiting Time
                    </span>
                  </div>
                </div>

                {/* Approaches Grid: CURRENT vs RECOMMENDED */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {Object.entries(int.current_vs_recommended || {}).map(([dir, app]: [string, any]) => (
                    <div key={dir} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>{dir.toUpperCase()} APPROACH</span>
                        <span className="text-cyan-400">{app.current_volume_pcu_hr} PCU</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-200 block truncate" title={app.street_name}>
                        {app.street_name}
                      </span>
                      <div className="pt-1 flex items-baseline justify-between text-xs">
                        <span className="text-slate-400">Curr: {app.current_green_sec}s</span>
                        <span className="text-emerald-400 font-extrabold">Rec: {app.recommended_green_sec}s</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Explainable AI Reason */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-cyan-500/20 text-xs text-slate-300 flex items-start gap-2">
                  <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-cyan-400 block text-[10px] uppercase">Explainable AI Signal Optimization Reason:</strong>
                    <span>{int.explainable_ai_reason}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Close Recommendations
          </button>
        </div>
      </div>
    </div>
  );
};
