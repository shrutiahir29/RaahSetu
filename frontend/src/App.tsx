import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { SimulationPage } from './pages/SimulationPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { MLAnalyticsPage } from './pages/MLAnalyticsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { AlertsPage } from './pages/AlertsPage';
import { HistoryFeedbackPage } from './pages/HistoryFeedbackPage';
import { RoutePlanner } from './components/RoutePlanner';
import { NagpurMap } from './components/NagpurMap';
import { fetchTrafficSegments, fetchIncidents } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [segments, setSegments] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [routeData, setRouteData] = useState<any>(null);

  React.useEffect(() => {
    Promise.all([fetchTrafficSegments(), fetchIncidents()])
      .then(([s, i]) => {
        setSegments(s);
        setIncidents(i);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'simulation' && <SimulationPage />}

        {activeTab === 'planner' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5">
              <RoutePlanner onRouteCalculated={(data) => setRouteData(data)} />
            </div>
            <div className="lg:col-span-7 h-[600px]">
              <NagpurMap segments={segments} routeData={routeData} incidents={incidents} />
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="h-[750px] w-full">
            <NagpurMap segments={segments} routeData={routeData} incidents={incidents} />
          </div>
        )}

        {activeTab === 'incidents' && <IncidentsPage />}
        {activeTab === 'alerts' && <AlertsPage />}
        {activeTab === 'analytics' && <MLAnalyticsPage />}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <AdminDashboard />
            <SimulationPage />
          </div>
        )}
        {activeTab === 'history' && <HistoryFeedbackPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>RAAHSETU Nagpur Smart Traffic Management & Peak-Hour Simulation System • Powered by XGBoost & Network-Aware A* Algorithm</p>
      </footer>
    </div>
  );
}

export default App;
