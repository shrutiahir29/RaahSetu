import React, { useEffect, useState } from 'react';
import { fetchAlerts } from '../services/api';
import { AlertTriangle, Bell } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchAlerts().then(setAlerts).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
          <Bell className="w-6 h-6" />
          <span>Real-time Traffic Alerts & City Bulletins</span>
        </div>
        <p className="text-xs text-slate-400">
          Automated warnings triggered by high-density bottlenecks, weather events, and traffic signals.
        </p>
      </div>

      <div className="space-y-3">
        {alerts.map((alrt) => (
          <div key={alrt.id} className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-white">{alrt.title}</span>
              </div>
              <span className="text-xs text-slate-400">{alrt.timestamp}</span>
            </div>
            <p className="text-xs text-slate-300 pl-6">{alrt.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
