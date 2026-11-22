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
import PatrolSimulatorModal from './components/PatrolSimulatorModal';
import { checkHealth, getStatistics } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState({ isOnline: false, info: null });
  const [stats, setStats] = useState(null);
  const [mapFocusLocation, setMapFocusLocation] = useState(null);
  const [isPatrolModalOpen, setIsPatrolModalOpen] = useState(false);

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
    const interval = setInterval(syncAppTelemetry, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigateToMap = (locationRecord) => {
    setMapFocusLocation(locationRecord);
    setActiveTab('map');
  };

  return (
    <div className="flex h-screen bg-[#080D1A] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenPatrol={() => setIsPatrolModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          systemStatus={systemStatus}
          onRefresh={syncAppTelemetry}
          stats={stats}
          onOpenPatrol={() => setIsPatrolModalOpen(true)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#080D1A] to-[#0B132B]">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              onNavigate={setActiveTab}
              onRefresh={syncAppTelemetry}
              onOpenPatrolModal={() => setIsPatrolModalOpen(true)}
            />
          )}

          {activeTab === 'detect' && (
            <DetectPotholes
              onScanComplete={syncAppTelemetry}
              onNavigateToMap={handleNavigateToMap}
              onOpenPatrolModal={() => setIsPatrolModalOpen(true)}
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

      {/* Hackathon Patrol Dashcam Simulator Modal */}
      <PatrolSimulatorModal
        isOpen={isPatrolModalOpen}
        onClose={() => setIsPatrolModalOpen(false)}
        onNewDetectionLogged={syncAppTelemetry}
      />
    </div>
  );
}
