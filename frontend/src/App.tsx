import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitor } from './pages/LiveMonitor';
import { Inspections } from './pages/Inspections';
import { Tools } from './pages/Tools';
import { Analytics } from './pages/Analytics';
import { Models } from './pages/Models';
import { FaceDetection } from './pages/FaceDetection';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ManufacturingInsights } from './pages/ManufacturingInsights';
import { EconomicImpact } from './pages/EconomicImpact';
import { DowntimeAvoided } from './pages/DowntimeAvoided';
import { RootCauseAnalysis } from './pages/RootCauseAnalysis';
import { getAlerts } from './services/api';

export const App: React.FC = () => {
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);

  const fetchAlertsCount = async () => {
    try {
      const alerts = await getAlerts(false);
      setActiveAlertsCount(alerts.length);
    } catch (err) {
      console.error('Failed to fetch alerts count:', err);
    }
  };

  useEffect(() => {
    fetchAlertsCount();
    const interval = setInterval(fetchAlertsCount, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F5F7FA] text-slate-900 antialiased">
        {/* Left Sidebar */}
        <Sidebar activeAlertsCount={activeAlertsCount} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#F5F7FA]">
          <Header />
          <main className="flex-1 pb-10">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/live-monitor" element={<LiveMonitor />} />
              <Route path="/inspections" element={<Inspections />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/insights" element={<ManufacturingInsights />} />
              <Route path="/economics" element={<EconomicImpact />} />
              <Route path="/downtime" element={<DowntimeAvoided />} />
              <Route path="/root-cause" element={<RootCauseAnalysis />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/models" element={<Models />} />
              <Route path="/face-detection" element={<FaceDetection />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
