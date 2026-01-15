
import React, { useState, useEffect, useCallback } from 'react';
import { MemoryRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Search, Heart, RefreshCw, Settings, Bus, Home, LayoutDashboard, Database } from 'lucide-react';
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
    document.documentElement.classList.add('dark');
  }, []);

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
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('sg_bus_pinned_services', JSON.stringify(pinnedServices));
  }, [pinnedServices]);

  useEffect(() => {
    localStorage.setItem('sg_bus_telegram_id', telegramId);
  }, [telegramId]);

  useEffect(() => {
    localStorage.setItem('sg_bus_active_alerts', JSON.stringify(activeAlerts));
  }, [activeAlerts]);

  const toggleFavorite = (stop: FavoriteBusStop) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.code === stop.code);
      return exists 
        ? prev.filter(f => f.code !== stop.code)
        : [...prev, stop];
    });
  };

  const togglePinnedService = (pinned: FavoriteService) => {
    setPinnedServices(prev => {
      const exists = prev.find(p => p.busStopCode === pinned.busStopCode && p.serviceNo === pinned.serviceNo);
      return exists
        ? prev.filter(p => !(p.busStopCode === pinned.busStopCode && p.serviceNo === pinned.serviceNo))
        : [...prev, pinned];
    });
  };

  const updateTelegramId = (id: string) => {
    setTelegramId(id);
  };

  const updateAlert = useCallback((stopCode: string, serviceNo: string, alertId: string | null) => {
    setAlerts(prev => {
      const key = `${stopCode}-${serviceNo}`;
      const next = { ...prev };
      if (alertId) {
        next[key] = alertId;
      } else {
        delete next[key];
      }
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
      } catch (err) {
        console.error('Failed to poll alert status', err);
      }
    };

    const intervalId = setInterval(pollStatus, 15000);
    pollStatus();
    return () => clearInterval(intervalId);
  }, [telegramId, activeAlerts]);

  const handleGlobalRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const navClasses = ({ isActive }: { isActive: boolean }) => 
    `relative flex md:flex-row flex-col items-center gap-2 md:gap-4 p-3 md:px-6 md:py-4 transition-all duration-300 ${
      isActive 
        ? 'text-emerald-400' 
        : 'text-slate-500 hover:text-slate-300'
    }`;

  return (
    <MemoryRouter>
      <div className="min-h-[100dvh] bg-[#020617] flex flex-col md:flex-row text-slate-100 selection:bg-emerald-500/30 font-sans">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-72 h-[100dvh] sticky top-0 bg-[#020617] border-r border-slate-900 z-50">
          <div className="p-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-[1000] tracking-tighter text-white uppercase leading-none">Transit Pro</h1>
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-1.5 leading-none">SG LIVE ENGINE</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 mt-8 flex flex-col gap-2">
            <NavLink to="/" className={navClasses}>
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
                  <LayoutDashboard className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Command Center</span>
                </>
              )}
            </NavLink>
            <NavLink to="/search" className={navClasses}>
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
                  <Search className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Fleet Search</span>
                </>
              )}
            </NavLink>
            <NavLink to="/settings" className={navClasses}>
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
                  <Database className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Core Config</span>
                </>
              )}
            </NavLink>
          </nav>

          <div className="p-6 border-t border-slate-900/50">
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`} />
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">API: {apiOnline ? 'SYNCED' : 'FAULT'}</span>
              </div>
              <button onClick={handleGlobalRefresh} className="p-2 text-slate-500 hover:text-emerald-400 transition-all hover:rotate-180">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-[1000] tracking-tighter text-white uppercase">Transit Pro</h1>
          </div>
          <button onClick={handleGlobalRefresh} className="p-2 text-slate-400 bg-slate-900/50 border border-white/5 rounded-xl active:scale-90 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-5xl mx-auto md:px-12 px-4 py-8 md:py-12 pb-32 md:pb-12 overflow-y-auto no-scrollbar" key={refreshKey}>
          <Routes>
            <Route path="/" element={<FavoritesPage favorites={favorites} pinnedServices={pinnedServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} activeAlerts={activeAlerts} onAlertChange={updateAlert} />} />
            <Route path="/search" element={<SearchPage favorites={favorites} pinnedServices={pinnedServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} activeAlerts={activeAlerts} onAlertChange={updateAlert} />} />
            <Route path="/settings" element={<SettingsPage telegramId={telegramId} onUpdateId={updateTelegramId} apiOnline={apiOnline} />} />
          </Routes>
        </main>

        {/* Bottom Mobile Navigation */}
        <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50 bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl safe-bottom shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="flex justify-around items-center px-4">
            <NavLink to="/" className={navClasses}>
              {({ isActive }) => (
                <>
                  <Home className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>Home</span>
                </>
              )}
            </NavLink>
            <NavLink to="/search" className={navClasses}>
              {({ isActive }) => (
                <>
                  <Search className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>Search</span>
                </>
              )}
            </NavLink>
            <NavLink to="/settings" className={navClasses}>
              {({ isActive }) => (
                <>
                  <Settings className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>Config</span>
                </>
              )}
            </NavLink>
          </div>
        </nav>
      </div>
    </MemoryRouter>
  );
};

export default App;
