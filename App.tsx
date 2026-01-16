
import React, { useState, useEffect, useCallback } from 'react';
import { MemoryRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Search, LayoutGrid, Cpu, Bus, RefreshCw } from 'lucide-react';
import SearchPage from './pages/SearchPage';
import FavoritesPage from './pages/FavoritesPage';
import SettingsPage from './pages/SettingsPage';
import { FavoriteBusStop, FavoriteService } from './types';
import { fetchAlertStatus, checkApiStatus } from './services/busApi';

const App: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteBusStop[]>(() => {
    const saved = localStorage.getItem('sg_bus_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [pinnedServices, setPinnedServices] = useState<FavoriteService[]>(() => {
    const saved = localStorage.getItem('sg_bus_pinned_services');
    return saved ? JSON.parse(saved) : [];
  });

  const [telegramId, setTelegramId] = useState<string>(() => {
    return localStorage.getItem('sg_bus_telegram_id') || '';
  });

  const [activeAlerts, setAlerts] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('sg_bus_active_alerts');
    return saved ? JSON.parse(saved) : {};
  });

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const monitorHealth = async () => {
      const isOnline = await checkApiStatus();
      setApiOnline(isOnline);
    };
    monitorHealth();
    const intervalId = setInterval(monitorHealth, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    localStorage.setItem('sg_bus_favorites', JSON.stringify(favorites));
    localStorage.setItem('sg_bus_pinned_services', JSON.stringify(pinnedServices));
    localStorage.setItem('sg_bus_telegram_id', telegramId);
    localStorage.setItem('sg_bus_active_alerts', JSON.stringify(activeAlerts));
  }, [favorites, pinnedServices, telegramId, activeAlerts]);

  const toggleFavorite = (stop: FavoriteBusStop) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.code === stop.code);
      return exists ? prev.filter(f => f.code !== stop.code) : [...prev, stop];
    });
  };

  const togglePinnedService = (pinned: FavoriteService) => {
    setPinnedServices(prev => {
      const exists = prev.find(p => p.busStopCode === pinned.busStopCode && p.serviceNo === pinned.serviceNo);
      return exists ? prev.filter(p => !(p.busStopCode === pinned.busStopCode && p.serviceNo === pinned.serviceNo)) : [...prev, pinned];
    });
  };

  const updateAlert = useCallback((stopCode: string, serviceNo: string, alertId: string | null) => {
    setAlerts(prev => {
      const key = `${stopCode}-${serviceNo}`;
      const next = { ...prev };
      if (alertId) next[key] = alertId; else delete next[key];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!telegramId || Object.keys(activeAlerts).length === 0) return;
    const pollStatus = async () => {
      try {
        const response = await fetchAlertStatus(telegramId);
        const serverAlerts = response.alerts || [];
        setAlerts(prev => {
          let hasChanged = false;
          const next = { ...prev };
          for (const [key, alertId] of Object.entries(next)) {
            const serverAlert = serverAlerts.find(a => a.id === alertId);
            if (!serverAlert || serverAlert.firedStages.arrived) {
              delete next[key];
              hasChanged = true;
            }
          }
          return hasChanged ? next : prev;
        });
      } catch {}
    };
    const intervalId = setInterval(pollStatus, 15000);
    pollStatus();
    return () => clearInterval(intervalId);
  }, [telegramId, activeAlerts]);

  const navClasses = ({ isActive }: { isActive: boolean }) => 
    `w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
      isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'
    }`;

  return (
    <MemoryRouter>
      <div className="min-h-screen bg-[#0a0a0b] text-slate-100 font-sans flex flex-col overflow-hidden">
        
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 right-0 z-50 h-16 px-6 bg-[#0a0a0b]/80 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/10">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-[0.2em] uppercase text-white">Orbit Transit</h1>
              <div className="flex items-center gap-1.5 leading-none mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${apiOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{apiOnline ? 'Live' : 'Server Syncing'}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)} className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center transition-all active:scale-95">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </header>

        {/* Scrollable Container */}
        <main className="flex-1 pt-20 pb-32 overflow-y-auto no-scrollbar" key={refreshKey}>
          <div className="max-w-xl mx-auto px-4 w-full">
            <Routes>
              <Route path="/" element={<FavoritesPage favorites={favorites} pinnedServices={pinnedServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} activeAlerts={activeAlerts} onAlertChange={updateAlert} />} />
              <Route path="/search" element={<SearchPage favorites={favorites} pinnedServices={pinnedServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} activeAlerts={activeAlerts} onAlertChange={updateAlert} />} />
              <Route path="/settings" element={<SettingsPage telegramId={telegramId} onUpdateId={setTelegramId} apiOnline={apiOnline} />} />
            </Routes>
          </div>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#141417]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <NavLink to="/" className={navClasses}>
            <LayoutGrid className="w-6 h-6" />
          </NavLink>
          <NavLink to="/search" className={navClasses}>
            <Search className="w-6 h-6" />
          </NavLink>
          <NavLink to="/settings" className={navClasses}>
            <Cpu className="w-6 h-6" />
          </NavLink>
        </nav>
      </div>
    </MemoryRouter>
  );
};

export default App;
