
import React, { useState, useEffect, useCallback } from 'react';
import { MemoryRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Search, Heart, RefreshCw, Settings, Sun, Moon, Bus } from 'lucide-react';
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

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sg_bus_dark_mode');
    if (saved !== null) return saved === 'true';
    return true; 
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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sg_bus_dark_mode', String(darkMode));
  }, [darkMode]);

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
    `flex md:flex-row flex-col items-center gap-1.5 p-2 md:px-5 md:py-3 rounded-xl transition-all ${
      isActive 
        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 font-black' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
    }`;

  return (
    <MemoryRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
          <div className="p-6 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">SG BUS PRO</h1>
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5 block">TRANSIT ENGINE</span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <NavLink to="/" className={navClasses}>
              <Heart className="w-5 h-5" />
              <span className="text-sm">Favorites</span>
            </NavLink>
            <NavLink to="/search" className={navClasses}>
              <Search className="w-5 h-5" />
              <span className="text-sm">Live Search</span>
            </NavLink>
            <NavLink to="/settings" className={navClasses}>
              <Settings className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </NavLink>
          </nav>

          <div className="p-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Status</span>
               </div>
               <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-transform active:scale-95">
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
               </button>
            </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md shadow-emerald-500/10">
              <Bus className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase leading-none">SG BUS PRO</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[8px] font-black text-slate-400 tracking-wider uppercase">Live</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleGlobalRefresh} className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto md:px-8 px-4 py-6 md:py-10 pb-24 md:pb-10 overflow-y-auto" key={refreshKey}>
          <Routes>
            <Route path="/" element={<FavoritesPage favorites={favorites} pinnedServices={pinnedServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} activeAlerts={activeAlerts} onAlertChange={updateAlert} />} />
            <Route path="/search" element={<SearchPage favorites={favorites} pinnedServices={pinnedServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} activeAlerts={activeAlerts} onAlertChange={updateAlert} />} />
            <Route path="/settings" element={<SettingsPage telegramId={telegramId} onUpdateId={updateTelegramId} apiOnline={apiOnline} />} />
          </Routes>
        </main>

        {/* Bottom Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 safe-bottom shadow-[0_-3px_12px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around py-1.5 px-2">
            <NavLink to="/" className={navClasses}>
              <Heart className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-wider">Home</span>
            </NavLink>
            <NavLink to="/search" className={navClasses}>
              <Search className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-wider">Live</span>
            </NavLink>
            <NavLink to="/settings" className={navClasses}>
              <Settings className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-wider">Config</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </MemoryRouter>
  );
};

export default App;
