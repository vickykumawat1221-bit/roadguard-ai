import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import DetectPotholes from './pages/DetectPotholes';
import RoadDamageMap from './pages/RoadDamageMap';
import DetectionHistory from './pages/DetectionHistory';
import Reports from './pages/Reports';
import AboutProject from './pages/AboutProject';
import Settings from './pages/Settings';
import { checkHealth, getStatistics } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState({ isOnline: false, info: null });
  const [stats, setStats] = useState(null);
  const [mapFocusLocation, setMapFocusLocation] = useState(null);

  const syncAppTelemetry = async () => {
    try {
      const [health, statistics] = await Promise.all([
        checkHealth().catch(() => ({ status: 'offline' })),
        getStatistics().catch(() => null),
      ]);
      setSystemStatus({
        isOnline: health.status === 'healthy',
        info: health,
      });
      if (statistics) {
        setStats(statistics);
      }
    } catch (err) {
      console.error('Error synchronizing telemetry:', err);
    }
  };

  useEffect(() => {
    syncAppTelemetry();
    // Poll telemetry every 30 seconds
    const interval = setInterval(syncAppTelemetry, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigateToMap = (locationRecord) => {
    setMapFocusLocation(locationRecord);
    setActiveTab('map');
  };

  return (
    <div className="flex h-screen bg-[#0B132B] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          systemStatus={systemStatus}
          onRefresh={syncAppTelemetry}
          stats={stats}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/60">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              onNavigate={setActiveTab}
              onRefresh={syncAppTelemetry}
            />
          )}

          {activeTab === 'detect' && (
            <DetectPotholes
              onScanComplete={syncAppTelemetry}
              onNavigateToMap={handleNavigateToMap}
            />
          )}

          {activeTab === 'map' && (
            <RoadDamageMap initialFocusLocation={mapFocusLocation} />
          )}

          {activeTab === 'history' && (
            <DetectionHistory onNavigateToMap={handleNavigateToMap} />
          )}

          {activeTab === 'reports' && (
            <Reports />
          )}

          {activeTab === 'about' && (
            <AboutProject />
          )}

          {activeTab === 'settings' && (
            <Settings systemStatus={systemStatus} onRefresh={syncAppTelemetry} />
          )}
        </main>
      </div>
    </div>
  );
}
