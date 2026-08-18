import React from 'react';
import { Navigation, MapPin, ShieldAlert, AlertTriangle, History, ShieldCheck, Cpu, Sliders, LayoutDashboard } from 'lucide-react';
import { WeatherWidget } from './WeatherWidget';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'simulation', label: 'Simulation Engine', icon: Sliders },
    { id: 'planner', label: 'Network Route', icon: MapPin },
    { id: 'map', label: 'Nagpur Map', icon: Navigation },
    { id: 'incidents', label: 'Incidents', icon: ShieldAlert },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'analytics', label: 'ML Analytics', icon: Cpu },
    { id: 'admin', label: 'Admin Panel', icon: ShieldCheck },
    { id: 'history', label: 'History', icon: History }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/30">
            <Navigation className="w-5 h-5 text-white transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                RAAHSETU
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                NAGPUR SMART CITY
              </span>
            </div>
            <p className="text-[11px] text-slate-400">AI Traffic Optimization & A* Routing</p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 px-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Weather & Live Status */}
        <div className="hidden lg:flex items-center gap-3">
          <WeatherWidget />
        </div>
      </div>
    </header>
  );
};
