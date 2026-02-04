
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MemoryRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Search, LayoutGrid, Cpu, Bus, RefreshCw, AlertCircle, X, Navigation, Bell } from 'lucide-react';
import SearchPage from './pages/SearchPage';
import FavoritesPage from './pages/FavoritesPage';
import SettingsPage from './pages/SettingsPage';
import JourneyPlanner from './pages/PlannerPage';
import AlertsPage from './pages/AlertsPage';
import CommuteModePage from './pages/CommuteModePage';
import { FavoriteBusStop, FavoriteService, CommuteService, ScheduledAlertStatus } from './types';
import { fetchAlertStatus, checkApiStatus, fetchScheduledAlertStatus } from './services/busApi';

const App: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteBusStop[]>(() => {
    const saved = localStorage.getItem('sg_bus_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [pinnedServices, setPinnedServices] = useState<FavoriteService[]>(() => {
    const saved = localStorage.getItem('sg_bus_pinned_services');
    return saved ? JSON.parse(saved) : [];
  });

  const [commuteServices, setCommuteServices] = useState<CommuteService[]>(() => {
    const saved = localStorage.getItem('sg_bus_commute_services');
    return saved ? JSON.parse(saved) : [];
  });

  const [telegramId, setTelegramId] = useState<string>(() => {
    return localStorage.getItem('sg_bus_telegram_id') || '';
  });

  const [activeAlerts, setAlerts] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('sg_bus_active_alerts');
    return saved ? JSON.parse(saved) : {};
  });

  const [autoHomeAlert, setAutoHomeAlert] = useState<boolean>(() => {
    return localStorage.getItem('sg_bus_auto_home_alert') === 'true';
  });

  const [autoBackAlert, setAutoBackAlert] = useState<boolean>(() => {
    return localStorage.getItem('sg_bus_auto_back_alert') === 'true';
  });

  const [scheduledAlerts, setScheduledAlerts] = useState<ScheduledAlertStatus[]>([]);

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => setGlobalError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  const handleError = useCallback((err: any) => {
    const message = err instanceof Error ? err.message : 'An unexpected telemetry error occurred.';
    setGlobalError(message);
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
    localStorage.setItem('sg_bus_pinned_services', JSON.stringify(pinnedServices));
    localStorage.setItem('sg_bus_commute_services', JSON.stringify(commuteServices));
    localStorage.setItem('sg_bus_telegram_id', telegramId);
    localStorage.setItem('sg_bus_active_alerts', JSON.stringify(activeAlerts));
    localStorage.setItem('sg_bus_auto_home_alert', String(autoHomeAlert));
    localStorage.setItem('sg_bus_auto_back_alert', String(autoBackAlert));
  }, [favorites, pinnedServices, commuteServices, telegramId, activeAlerts, autoHomeAlert, autoBackAlert]);

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

  const updateCommuteService = (busStopCode: string, serviceNo: string, mode: 'home' | 'back' | undefined, busStopName: string = 'Bus Stop') => {
    setCommuteServices(prev => {
      const filtered = prev.filter(p => !(p.busStopCode === busStopCode && p.serviceNo === serviceNo));
      
      const existing = prev.find(p => p.busStopCode === busStopCode && p.serviceNo === serviceNo);
      
      // Toggle logic: If clicking the same mode, remove it. If different or none, add it.
      if (mode && existing?.mode !== mode) {
        return [...filtered, { busStopCode, busStopName, serviceNo, mode }];
      }
      return filtered;
    });
  };

  const updateAlert = useCallback((stopCode: string, serviceNo: string, alertId: string | null) => {
    setAlerts(prev => {
      const key = `${String(stopCode).trim()}-${String(serviceNo).trim()}`;
      const next = { ...prev };
      if (alertId) next[key] = alertId; else delete next[key];
      return next;
    });
  }, []);

  const syncAlerts = useCallback(async () => {
    if (!telegramId) return;
    
    try {
      const response = await fetchAlertStatus(telegramId);
      const serverAlerts = response.alerts || [];
      const nextLive: Record<string, string> = {};
      
      serverAlerts.forEach(a => {
         const isCompleted = a.firedStages.ready && a.firedStages.leave && a.firedStages.arrived;
         if (!isCompleted) {
           const key = `${String(a.busStopCode).trim()}-${String(a.serviceNo).trim()}`;
           nextLive[key] = String(a.id);
         }
      });

      setAlerts(prev => {
        return JSON.stringify(nextLive) !== JSON.stringify(prev) ? nextLive : prev;
      });

      const schRes = await fetchScheduledAlertStatus(telegramId);
      const schAlerts = schRes.scheduledAlerts || [];
      setScheduledAlerts(schAlerts);
    } catch (err) {
      console.error("Alert Sync Failed:", err);
    }
  }, [telegramId]);

  useEffect(() => {
    if (!telegramId) return;
    const intervalId = setInterval(syncAlerts, 15000);
    syncAlerts();
    return () => clearInterval(intervalId);
  }, [telegramId, syncAlerts]);

  const unifiedAlerts = useMemo(() => {
    const map: Record<string, { id: string, type: 'LIVE' | 'SCHEDULED' }> = {};
    scheduledAlerts.forEach(s => {
      if (s.status === 'SCHEDULED') {
        const key = `${String(s.busStopCode).trim()}-${String(s.serviceNo).trim()}`;
        map[key] = { id: s.id, type: 'SCHEDULED' };
      }
    });
    (Object.entries(activeAlerts) as [string, string][]).forEach(([key, id]) => {
      map[key] = { id, type: 'LIVE' };
    });
    return map;
  }, [activeAlerts, scheduledAlerts]);

  const totalAlertsCount = useMemo(() => Object.keys(unifiedAlerts).length, [unifiedAlerts]);

  const navClasses = ({ isActive }: { isActive: boolean }): string => 
    `w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
      isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'
    }`;

  return (
    <MemoryRouter>
      <div className="min-h-screen bg-[#0a0a0b] text-slate-100 font-sans flex flex-col overflow-hidden">
        
        {globalError && (
          <div className="fixed top-20 left-4 right-4 z-[100] animate-in slide-in-from-top-10 duration-500">
            <div className="bg-rose-500/10 backdrop-blur-3xl border border-rose-500/50 p-4 rounded-2xl flex items-center gap-3 shadow-2xl shadow-rose-500/10">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-0.5">System Exception</p>
                <p className="text-[13px] font-bold text-white leading-tight truncate">{globalError}</p>
              </div>
              <button onClick={() => setGlobalError(null)} className="p-2 text-rose-400/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <header className="fixed top-0 left-0 right-0 z-50 h-16 px-6 bg-[#0a0a0b]/80 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/10">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-[0.2em] uppercase text-white">SG BUS LIVE</h1>
              <div className="flex items-center gap-1.5 leading-none mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${apiOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{apiOnline ? 'Live' : 'Server Offline'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRefreshKey(k => k + 1)} className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center transition-all active:scale-95">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <NavLink 
              to="/alerts" 
              className={({ isActive }) => 
                `relative w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5'}`
              }
            >
              <Bell className="w-4 h-4" />
              {totalAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-[#0a0a0b]">
                  {totalAlertsCount}
                </span>
              )}
            </NavLink>
            <NavLink 
              to="/settings" 
              className={({ isActive }) => 
                `w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-white/5'}`
              }
            >
              <Cpu className="w-4 h-4" />
            </NavLink>
          </div>
        </header>

        <main className="flex-1 pt-20 pb-32 overflow-y-auto no-scrollbar" key={refreshKey}>
          <div className="max-w-xl mx-auto px-4 w-full">
            <Routes>
              <Route path="/" element={
                <FavoritesPage 
                  favorites={favorites} 
                  pinnedServices={pinnedServices}
                  commuteServices={commuteServices}
                  toggleFavorite={toggleFavorite} 
                  togglePinnedService={togglePinnedService} 
                  telegramId={telegramId} 
                  unifiedAlerts={unifiedAlerts} 
                  onAlertChange={updateAlert} 
                  onSyncAlerts={syncAlerts} 
                  onError={handleError} 
                  onUpdateCommute={updateCommuteService}
                  autoHomeAlert={autoHomeAlert}
                  setAutoHomeAlert={setAutoHomeAlert}
                  autoBackAlert={autoBackAlert}
                  setAutoBackAlert={setAutoBackAlert}
                />
              } />
              <Route path="/search" element={<SearchPage favorites={favorites} pinnedServices={pinnedServices} commuteServices={commuteServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} unifiedAlerts={unifiedAlerts} onAlertChange={updateAlert} onSyncAlerts={syncAlerts} onError={handleError} onUpdateCommute={updateCommuteService} />} />
              <Route path="/planner" element={<JourneyPlanner />} />
              <Route path="/alerts" element={<AlertsPage activeAlerts={activeAlerts} scheduledAlerts={scheduledAlerts} telegramId={telegramId} onSyncAlerts={syncAlerts} totalCount={totalAlertsCount} />} />
              <Route path="/settings" element={<SettingsPage telegramId={telegramId} onUpdateId={setTelegramId} apiOnline={apiOnline} commuteServices={commuteServices} onUpdateCommute={updateCommuteService} />} />
              <Route path="/commute/:mode" element={
                <CommuteModePage 
                  commuteServices={commuteServices}
                  pinnedServices={pinnedServices} 
                  telegramId={telegramId} 
                  unifiedAlerts={unifiedAlerts} 
                  onAlertChange={updateAlert} 
                  onSyncAlerts={syncAlerts} 
                  onError={handleError} 
                  autoHomeAlert={autoHomeAlert}
                  autoBackAlert={autoBackAlert}
                />
              } />
            </Routes>
          </div>
        </main>

        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#141417]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <NavLink to="/" className={navClasses}>
            <LayoutGrid className="w-6 h-6" />
          </NavLink>
          <NavLink to="/search" className={navClasses}>
            <Search className="w-6 h-6" />
          </NavLink>
          <NavLink to="/planner" className={navClasses}>
            <Navigation className="w-6 h-6" />
          </NavLink>
        </nav>
      </div>
    </MemoryRouter>
  );
};

export default App;
