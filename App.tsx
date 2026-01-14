
import React, { useState, useEffect, useCallback } from 'react';
import { MemoryRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Search, Heart, RefreshCw, Settings, Bus, Home } from 'lucide-react';
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

  // Force dark mode on mount as we are moving to a single dark theme
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
    `flex md:flex-row flex-col items-center gap-1.5 md:gap-3 p-2 md:px-5 md:py-3 rounded-xl transition-all duration-200 ${
      isActive 
        ? 'text-emerald-400 bg-emerald-500/10 font-[1000] uppercase' 
        : 'text-slate-500 font-[900] uppercase hover:bg-slate-800/50'
    }`;

  return (
    <MemoryRouter>
      <div className="min-h-[100dvh] bg-slate-950 flex flex-col md:flex-row text-slate-100 selection:bg-emerald-500/30">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 h-[100dvh] sticky top-0 bg-slate-900 border-r border-slate-800 z-50">
          <div className="relative p-7 overflow-hidden bg-slate-900">
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="bg-emerald-600 text-white px-2.5 py-1.5 rounded font-[1000] text-sm tracking-tighter border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                SG
              </div>
              <div className="flex flex-col">
                <h1 className="text-[15px] font-[1000] tracking-tighter text-white leading-none uppercase">BUS LIVE</h1>
                <span className="text-[7px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1.5 block leading-none">TRANSIT ENGINE</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 mt-8 space-y-2">
            <NavLink to="/" className={navClasses}>
              <Home className="w-4 h-4" />
              <span className="text-[9px] tracking-tight">Dashboard</span>
            </NavLink>
            <NavLink to="/search" className={navClasses}>
              <Search className="w-4 h-4" />
              <span className="text-[9px] tracking-tight">Transit Search</span>
            </NavLink>
            <NavLink to="/settings" className={navClasses}>
              <Settings className="w-4 h-4" />
              <span className="text-[9px] tracking-tight">System Config</span>
            </NavLink>
          </nav>

          <div className="p-5 border-t border-slate-800">
            <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none">Status: {apiOnline ? 'Nominal' : 'Error'}</span>
               </div>
               <button onClick={handleGlobalRefresh} className="p-2.5 text-slate-500 hover:text-emerald-400 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
               </button>
            </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white px-2 py-1.5 rounded font-[1000] text-[13px] tracking-tighter leading-none border border-emerald-500/20">
              SG
            </div>
            <div className="flex flex-col">
              <h1 className="text-[14px] font-[1000] tracking-tighter text-white uppercase leading-none">BUS LIVE</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
                <span className="text-[7px] font-[1000] text-emerald-500 tracking-[0.15em] uppercase leading-none">Live Monitoring</span>
              </div>
            </div>
          </div>
          <button onClick={handleGlobalRefresh} className="p-2.5 text-slate-400 bg-slate-800/50 border border-slate-700 rounded-xl active:scale-95 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto md:px-10 px-4 py-6 md:py-10 pb-28 md:pb-10 overflow-y-auto" key={refreshKey}>
          <Routes>
            <Route path="/" element={<FavoritesPage favorites={favorites} pinnedServices={pinnedServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} activeAlerts={activeAlerts} onAlertChange={updateAlert} />} />
            <Route path="/search" element={<SearchPage favorites={favorites} pinnedServices={pinnedServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} activeAlerts={activeAlerts} onAlertChange={updateAlert} />} />
            <Route path="/settings" element={<SettingsPage telegramId={telegramId} onUpdateId={updateTelegramId} apiOnline={apiOnline} />} />
          </Routes>
        </main>

        {/* Bottom Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 safe-bottom shadow-[0_-8px_20px_rgba(0,0,0,0.4)]">
          <div className="flex justify-around py-2 px-6">
            <NavLink to="/" className={navClasses}>
              <Home className="w-5 h-5" />
              <span className="text-[8px] mt-1 tracking-tighter uppercase font-[1000]">Home</span>
            </NavLink>
            <NavLink to="/search" className={navClasses}>
              <Search className="w-5 h-5" />
              <span className="text-[8px] mt-1 tracking-tighter uppercase font-[1000]">Search</span>
            </NavLink>
            <NavLink to="/settings" className={navClasses}>
              <Settings className="w-5 h-5" />
              <span className="text-[8px] mt-1 tracking-tighter uppercase font-[1000]">Config</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </MemoryRouter>
  );
};

export default App;
