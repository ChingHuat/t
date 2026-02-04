
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MemoryRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, LayoutGrid, Cpu, Bus, RefreshCw, AlertCircle, X, Navigation, Bell, Home, Building2, Settings, Footprints, Zap, Loader2, Info } from 'lucide-react';
import SearchPage from './pages/SearchPage';
import FavoritesPage from './pages/FavoritesPage';
import SettingsPage from './pages/SettingsPage';
import JourneyPlanner from './pages/PlannerPage';
import AlertsPage from './pages/AlertsPage';
import CommuteModePage from './pages/CommuteModePage';
import { FavoriteBusStop, FavoriteService, CommuteService, ScheduledAlertStatus } from './types';
import { fetchAlertStatus, checkApiStatus, fetchScheduledAlertStatus, triggerCommute, cancelCommute } from './services/busApi';

const CommuteFab: React.FC<{
  mode: 'home' | 'back';
  config: CommuteService | null;
  activeAlert: any | null;
  telegramId: string;
  onConfigOpen: (mode: 'home' | 'back') => void;
  onRefresh: () => void;
  onLog: (msg: string, type?: 'info' | 'error' | 'success') => void;
  onError: (err: any) => void;
  setLocalAlerts: React.Dispatch<React.SetStateAction<any[]>>;
}> = ({ mode, config, activeAlert, telegramId, onConfigOpen, onRefresh, onLog, onError, setLocalAlerts }) => {
  const [loading, setLoading] = useState(false);
  const isHome = mode === 'home';
  
  const isTracking = !!activeAlert;
  const isWarningYellow = activeAlert?.firedStages?.ready;
  const isWarningRed = activeAlert?.firedStages?.leave;

  const handleTap = async () => {
    if (!telegramId) {
      onError("Link Telegram in Settings first");
      return;
    }
    if (!config || !config.busStopCode || !config.serviceNos) {
      onConfigOpen(mode);
      return;
    }

    if ('vibrate' in navigator) navigator.vibrate(50);
    setLoading(true);

    const services = config.serviceNos.split(',').map(s => s.trim()).filter(s => s !== "");

    try {
      if (isTracking) {
        onLog(`Aborting ${mode} mission...`, 'info');
        
        // Optimistically clear local state for instant UI update
        setLocalAlerts(prev => prev.filter(a => 
          !(String(a.busStopCode) === String(config.busStopCode) && services.includes(String(a.serviceNo)))
        ));

        for (const s of services) {
          try {
            await cancelCommute({ 
              chatId: telegramId, 
              mode,
              stopCode: config.busStopCode,
              serviceNo: s 
            });
          } catch (e) {
            console.debug(`Cancel skip for ${s}`);
          }
        }
        onLog(`✅ Mission Cleared`, 'success');
      } else {
        let urgentCount = 0;
        let trackingCount = 0;
        let errors: string[] = [];

        for (const s of services) {
          try {
            const res = await triggerCommute({
              chatId: telegramId,
              stopCode: config.busStopCode,
              serviceNo: s,
              walkTime: config.walkingTime || 5,
              mode
            });
            
            if (res?.status === 'URGENT') urgentCount++;
            else if (res?.status === 'TRACKING') trackingCount++;
          } catch (err: any) {
            errors.push(`${s}: ${err.message || "Bus not found"}`);
          }
        }
        
        if (errors.length > 0 && trackingCount === 0 && urgentCount === 0) {
          onLog(errors[0], 'error');
        } else {
          const statusMsg = [];
          if (trackingCount > 0) statusMsg.push(`${trackingCount} Active`);
          if (urgentCount > 0) statusMsg.push(`${urgentCount} Urgent`);
          onLog(`🚀 Sync: ${statusMsg.join(' + ')}`, urgentCount > 0 ? 'error' : 'success');
        }
        
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      }
      onRefresh();
    } catch (err: any) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  const getButtonColor = () => {
    if (isWarningRed) return 'bg-rose-600 border-rose-400 shadow-rose-900/40';
    if (isWarningYellow) return 'bg-amber-500 border-amber-300 shadow-amber-900/40';
    if (isTracking) return 'bg-emerald-600 border-emerald-400 shadow-emerald-900/40';
    return isHome 
      ? 'bg-blue-600 border-blue-400 shadow-blue-900/40' 
      : 'bg-orange-600 border-orange-400 shadow-orange-900/40';
  };

  return (
    <div className="relative group">
      <button
        onClick={handleTap}
        disabled={loading}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_12px_40px_rgba(0,0,0,0.8)] border-2 z-20 active:scale-90 ${getButtonColor()} ${isTracking ? 'animate-pulse ring-4 ring-emerald-500/30' : ''}`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : isTracking ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          isHome ? <Home className="w-6 h-6 text-white" /> : <Building2 className="w-6 h-6 text-white" />
        )}
      </button>
      
      <button
        onClick={(e) => { e.stopPropagation(); onConfigOpen(mode); }}
        className="absolute -top-1 -right-1 w-7 h-7 bg-[#1a1a1e] border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-indigo-400 hover:rotate-90 transition-all shadow-xl active:scale-75 z-30"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      <span className={`absolute right-16 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-colors duration-300 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/5 ${isTracking ? 'text-emerald-400' : 'text-slate-500'}`}>
        {isTracking ? 'TRACKING' : (isHome ? 'HOME' : 'OFFICE')}
      </span>
    </div>
  );
};

const AppContent: React.FC = () => {
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

  const [rawAlerts, setRawAlerts] = useState<any[]>([]);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<{ msg: string; type: 'info' | 'error' | 'success' } | null>(null);

  const [configMode, setConfigMode] = useState<'home' | 'back' | null>(null);
  const [modalData, setModalData] = useState({ stopCode: '', serviceNos: '', walkingTime: '5' });

  const handleError = useCallback((err: any) => {
    if (!err) return;
    const message = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
    setGlobalError(message);
    setTimeout(() => setGlobalError(null), 5000);
  }, []);

  const handleLog = useCallback((msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setStatusLog({ msg, type });
    setTimeout(() => setStatusLog(null), 6000);
  }, []);

  useEffect(() => {
    if (configMode) {
      const existing = commuteServices.find(s => s.mode === configMode);
      setModalData({
        stopCode: existing?.busStopCode || '',
        serviceNos: existing?.serviceNos || '',
        walkingTime: String(existing?.walkingTime || '5')
      });
    }
  }, [configMode, commuteServices]);

  const handleSaveConfig = () => {
    if (!configMode) return;
    const { stopCode, serviceNos, walkingTime } = modalData;
    setCommuteServices(prev => {
      const filtered = prev.filter(p => p.mode !== configMode);
      if (!stopCode || !serviceNos) return filtered;
      return [...filtered, {
        busStopCode: stopCode,
        serviceNos: serviceNos.toUpperCase().replace(/\s+/g, ''),
        busStopName: `Node ${stopCode}`,
        mode: configMode,
        walkingTime: parseInt(walkingTime) || 5
      }];
    });
    setConfigMode(null);
    handleLog(`Protocol Updated`, 'success');
  };

  const syncAlerts = useCallback(async () => {
    if (!telegramId) return;
    try {
      const response = await fetchAlertStatus(telegramId);
      setRawAlerts(response.alerts || []);
    } catch (err) {
      console.error("Alert Sync Failed:", err);
    }
  }, [telegramId]);

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
    if (!telegramId) return;
    const intervalId = setInterval(syncAlerts, 10000);
    syncAlerts();
    return () => clearInterval(intervalId);
  }, [telegramId, syncAlerts]);

  useEffect(() => {
    localStorage.setItem('sg_bus_favorites', JSON.stringify(favorites));
    localStorage.setItem('sg_bus_pinned_services', JSON.stringify(pinnedServices));
    localStorage.setItem('sg_bus_commute_services', JSON.stringify(commuteServices));
    localStorage.setItem('sg_bus_telegram_id', telegramId);
  }, [favorites, pinnedServices, commuteServices, telegramId]);

  const toggleFavorite = useCallback((stop: FavoriteBusStop) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.code === stop.code);
      return exists ? prev.filter(f => f.code !== stop.code) : [...prev, stop];
    });
  }, []);

  const togglePinnedService = useCallback((pinned: FavoriteService) => {
    setPinnedServices(prev => {
      const exists = prev.find(p => p.busStopCode === pinned.busStopCode && p.serviceNo === pinned.serviceNo);
      return exists ? prev.filter(p => !(p.busStopCode === pinned.busStopCode && p.serviceNo === pinned.serviceNo)) : [...prev, pinned];
    });
  }, []);

  const updateCommuteService = useCallback((busStopCode: string, serviceNo: string, mode: 'home' | 'back' | undefined, busStopName: string = 'Bus Stop') => {
    setCommuteServices(prev => {
      if (mode) {
        return [...prev.filter(p => p.mode !== mode), { 
          busStopCode, 
          busStopName, 
          serviceNos: serviceNo, 
          mode, 
          walkingTime: 5 
        }];
      }
      return prev.filter(p => !(p.busStopCode === busStopCode && p.serviceNos.includes(serviceNo)));
    });
  }, []);

  const activeAlertsMap = useMemo(() => {
    const map: Record<string, { id: string, type: 'LIVE' | 'SCHEDULED' }> = {};
    rawAlerts.forEach(a => {
      if (!a.firedStages.ready || !a.firedStages.leave || !a.firedStages.arrived) {
         map[`${a.busStopCode}-${a.serviceNo}`] = { id: a.id, type: 'LIVE' };
      }
    });
    return map;
  }, [rawAlerts]);

  const getFabAlert = (mode: 'home' | 'back') => {
    const config = commuteServices.find(s => s.mode === mode);
    if (!config) return null;
    const candidates = config.serviceNos.split(',').map(c => c.trim().toUpperCase());
    return rawAlerts.find(a => 
      String(a.busStopCode) === String(config.busStopCode) && 
      candidates.includes(String(a.serviceNo).toUpperCase())
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-100 font-sans flex flex-col overflow-hidden">
      {globalError && (
        <div className="fixed top-20 left-4 right-4 z-[110] animate-in slide-in-from-top-10 duration-500">
          <div className="bg-rose-500 border border-rose-400 p-4 rounded-2xl flex items-center gap-3 shadow-2xl">
            <AlertCircle className="w-6 h-6 text-white" />
            <p className="text-[13px] font-bold text-white leading-tight truncate flex-1">{globalError}</p>
            <button onClick={() => setGlobalError(null)}><X className="w-5 h-5 text-white/50" /></button>
          </div>
        </div>
      )}

      {statusLog && (
        <div className="fixed top-20 left-4 right-4 z-[110] animate-in slide-in-from-top-10 duration-500">
          <div className={`border p-4 rounded-2xl flex items-center gap-3 shadow-2xl ${
            statusLog.type === 'error' ? 'bg-rose-600/20 border-rose-500' :
            statusLog.type === 'success' ? 'bg-emerald-600/20 border-emerald-500' :
            'bg-indigo-600/20 border-indigo-500'
          }`}>
            <Info className={`w-6 h-6 ${
              statusLog.type === 'error' ? 'text-rose-400' :
              statusLog.type === 'success' ? 'text-emerald-400' :
              'text-indigo-400'
            }`} />
            <p className="text-[12px] font-black uppercase tracking-tight text-white leading-tight truncate flex-1">{statusLog.msg}</p>
            <button onClick={() => setStatusLog(null)}><X className="w-5 h-5 text-white/30" /></button>
          </div>
        </div>
      )}

      {configMode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setConfigMode(null)} />
          <div className="relative w-full max-w-sm bg-[#1a1a1e] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${configMode === 'home' ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.3)]'}`}>
                {configMode === 'home' ? <Home className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Mission Sync</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{configMode === 'home' ? 'Origin' : 'Return'} Config</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">5-Digit Stop Code</label>
                <input 
                  type="text" value={modalData.stopCode} 
                  onChange={e => setModalData({...modalData, stopCode: e.target.value.replace(/\D/g, '').slice(0, 5)})} 
                  placeholder="e.g. 64121" 
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white font-black tracking-widest text-lg focus:ring-1 focus:ring-indigo-500/50" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Service Numbers (CSV)</label>
                <input 
                  type="text" value={modalData.serviceNos} 
                  onChange={e => setModalData({...modalData, serviceNos: e.target.value})} 
                  placeholder="e.g. 190, 972" 
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white font-black tracking-widest text-lg focus:ring-1 focus:ring-indigo-500/50" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Walking Time (Mins)</label>
                <input 
                  type="number" value={modalData.walkingTime} 
                  onChange={e => setModalData({...modalData, walkingTime: e.target.value})} 
                  placeholder="5" min="1" max="30" 
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white font-black tracking-widest text-lg focus:ring-1 focus:ring-indigo-500/50" 
                />
              </div>
              <button 
                onClick={handleSaveConfig} 
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
              >
                UPDATE ROUTE
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-50 h-16 px-6 bg-[#0a0a0b]/80 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center"><Bus className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-xs font-black tracking-[0.2em] uppercase text-white">SG BUS LIVE</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${apiOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{apiOnline ? 'Live Hub' : 'Offline'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRefreshKey(k => k + 1)} className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center"><RefreshCw className="w-4 h-4 text-slate-400" /></button>
          <NavLink to="/alerts" className={({ isActive }) => `relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}><Bell className="w-4 h-4" /></NavLink>
          <NavLink to="/settings" className={({ isActive }) => `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}><Cpu className="w-4 h-4" /></NavLink>
        </div>
      </header>

      <main className="flex-1 pt-20 pb-48 overflow-y-auto no-scrollbar" key={refreshKey}>
        <div className="max-w-xl mx-auto px-4 w-full">
          <Routes>
            <Route path="/" element={<FavoritesPage favorites={favorites} pinnedServices={pinnedServices} commuteServices={commuteServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} unifiedAlerts={activeAlertsMap} onAlertChange={() => {}} onSyncAlerts={syncAlerts} onError={handleError} onUpdateCommute={updateCommuteService} autoHomeAlert={false} setAutoHomeAlert={() => {}} autoBackAlert={false} setAutoBackAlert={() => {}} />} />
            <Route path="/search" element={<SearchPage favorites={favorites} pinnedServices={pinnedServices} commuteServices={commuteServices} toggleFavorite={toggleFavorite} togglePinnedService={togglePinnedService} telegramId={telegramId} unifiedAlerts={activeAlertsMap} onAlertChange={() => {}} onSyncAlerts={syncAlerts} onError={handleError} onUpdateCommute={updateCommuteService} />} />
            <Route path="/planner" element={<JourneyPlanner />} />
            <Route path="/alerts" element={<AlertsPage activeAlerts={activeAlertsMap} scheduledAlerts={[]} telegramId={telegramId} onSyncAlerts={syncAlerts} totalCount={rawAlerts.length} />} />
            <Route path="/settings" element={<SettingsPage telegramId={telegramId} onUpdateId={setTelegramId} apiOnline={apiOnline} commuteServices={commuteServices} onUpdateCommute={updateCommuteService} />} />
          </Routes>
        </div>
      </main>

      {/* Grouped Edge Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] pb-10 px-6 pointer-events-none">
        <div className="max-w-2xl mx-auto relative flex flex-col items-end">
          
          {/* Right-Aligned Vertical Command Stack */}
          <div className="flex flex-col gap-4 mb-4 pointer-events-auto items-end">
            <CommuteFab 
              mode="home" 
              config={commuteServices.find(s => s.mode === 'home') || null} 
              activeAlert={getFabAlert('home')} 
              telegramId={telegramId} 
              onConfigOpen={setConfigMode} 
              onRefresh={syncAlerts} 
              onLog={handleLog} 
              onError={handleError}
              setLocalAlerts={setRawAlerts}
            />
            <CommuteFab 
              mode="back" 
              config={commuteServices.find(s => s.mode === 'back') || null} 
              activeAlert={getFabAlert('back')} 
              telegramId={telegramId} 
              onConfigOpen={setConfigMode} 
              onRefresh={syncAlerts} 
              onLog={handleLog} 
              onError={handleError}
              setLocalAlerts={setRawAlerts}
            />
          </div>

          {/* Centralized Global Nav */}
          <div className="w-full flex justify-center pointer-events-none">
            <nav className="bg-[#141417]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-2 flex items-center gap-2 shadow-[0_25px_60px_rgba(0,0,0,0.9)] pointer-events-auto">
              <NavLink to="/" className={({ isActive }) => `w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid className="w-6 h-6" /></NavLink>
              <NavLink to="/search" className={({ isActive }) => `w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' : 'text-slate-500 hover:text-slate-300'}`}><Search className="w-6 h-6" /></NavLink>
              <NavLink to="/planner" className={({ isActive }) => `w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' : 'text-slate-500 hover:text-slate-300'}`}><Navigation className="w-6 h-6" /></NavLink>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <MemoryRouter>
    <AppContent />
  </MemoryRouter>
);

export default App;
