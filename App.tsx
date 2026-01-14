import React, { useState, useEffect, useCallback } from 'react';
import { MemoryRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Search, Heart, RefreshCw, Settings, Sun, Moon, Activity } from 'lucide-react';
import SearchPage from './pages/SearchPage';
import FavoritesPage from './pages/FavoritesPage';
import SettingsPage from './pages/SettingsPage';
import { FavoriteBusStop, FavoriteService } from './types';
import { fetchAlertStatus, checkApiStatus } from './services/busApi';

const App: React.FC = () => {
  // Initialization from LocalStorage
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

  // Health Monitoring: Poll /health every 30 seconds
  useEffect(() => {
    const monitorHealth = async () => {
      const isOnline = await checkApiStatus();
      setApiOnline(isOnline);
    };
    monitorHealth();
    const intervalId = setInterval(monitorHealth, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Persistence Effects
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

  return (
    <MemoryRouter>
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pb-20 transition-colors duration-300`}>
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">SG Bus Pro</h1>
              {/* Health Indicator Dot */}
              <div className="flex items-center gap-1.5 ml-1">
                <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                  apiOnline === true ? 'bg-emerald-500 animate-pulse' : 
                  apiOnline === false ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                  'bg-slate-300 dark:bg-slate-700'
                }`} />
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:inline">
                  {apiOnline === true ? 'Online' : apiOnline === false ? 'Offline' : '...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleGlobalRefresh}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              title="Refresh App"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6" key={refreshKey}>
          <Routes>
            <Route 
              path="/" 
              element={
                <FavoritesPage 
                  favorites={favorites} 
                  pinnedServices={pinnedServices}
                  toggleFavorite={toggleFavorite} 
                  togglePinnedService={togglePinnedService}
                  telegramId={telegramId}
                  activeAlerts={activeAlerts}
                  onAlertChange={updateAlert}
                />
              } 
            />
            <Route 
              path="/search" 
              element={
                <SearchPage 
                  favorites={favorites} 
                  pinnedServices={pinnedServices}
                  toggleFavorite={toggleFavorite} 
                  togglePinnedService={togglePinnedService}
                  telegramId={telegramId} 
                  activeAlerts={activeAlerts}
                  onAlertChange={updateAlert}
                />
              } 
            />
            <Route 
              path="/settings" 
              element={<SettingsPage telegramId={telegramId} onUpdateId={updateTelegramId} apiOnline={apiOnline} />} 
            />
          </Routes>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-bottom">
          <div className="max-w-2xl mx-auto flex justify-around p-2">
            <NavLink to="/" className={({ isActive }) => `flex flex-col items-center p-2 rounded-xl transition-all ${isActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 dark:text-slate-400'}`}>
              <Heart className="w-6 h-6" />
              <span className="text-[10px] font-medium mt-1">Favorites</span>
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `flex flex-col items-center p-2 rounded-xl transition-all ${isActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 dark:text-slate-400'}`}>
              <Search className="w-6 h-6" />
              <span className="text-[10px] font-medium mt-1">Search</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center p-2 rounded-xl transition-all ${isActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 dark:text-slate-400'}`}>
              <Settings className="w-6 h-6" />
              <span className="text-[10px] font-medium mt-1">Settings</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </MemoryRouter>
  );
};

export default App;