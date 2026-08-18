import React, { useEffect, useState } from 'react';
import { fetchIncidents } from '../services/api';
import { ShieldAlert, Clock } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    fetchIncidents().then(setIncidents).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-lg">
          <ShieldAlert className="w-6 h-6" />
          <span>Active Nagpur Road Incidents & Advisories</span>
        </div>
        <p className="text-xs text-slate-400">
          Incidents directly impact live road costs, A* route calculations, and map alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {incidents.map((inc) => (
          <div key={inc.id} className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {inc.type}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> {inc.created_at}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{inc.title}</h3>
              <p className="text-xs text-slate-300 mt-1">{inc.description}</p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Segment: <strong className="text-cyan-400">{inc.segment_id}</strong></span>
              <span>Severity: <strong className="text-rose-400">Level {inc.severity}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
