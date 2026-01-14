
import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Loader2, Pin, Star, RefreshCw, Clock } from 'lucide-react';
import { fetchBusArrival, fetchWeather } from '../services/busApi';
import { FavoriteBusStop, BusStopArrivalResponse, WeatherResponse, FavoriteService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

const FavoriteStopCard: React.FC<{ 
  stop: FavoriteBusStop; 
  onRemove: () => void; 
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
  pinnedServices: FavoriteService[];
  onPinToggle: (pinned: FavoriteService) => void;
}> = ({ stop, onRemove, telegramId, activeAlerts, onAlertChange, pinnedServices, onPinToggle }) => {
  const [data, setData] = useState<BusStopArrivalResponse | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else if (!data) setLoading(true);
    
    try {
      const arrivalRes = await fetchBusArrival(stop.code);
      setData(arrivalRes);
      setLastUpdated(new Date());
      setError(false);
      try {
        const weatherRes = await fetchWeather(stop.code);
        setWeather(weatherRes);
      } catch (wErr) {
        console.warn(`Weather fetch failed for favorite ${stop.code}:`, wErr);
      }
    } catch (err) {
      console.error(`Failed to fetch favorite ${stop.code}:`, err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, [stop.code]);

  const isRaining = weather && (weather.rain_mm > 0 || weather.level !== 'NONE');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all flex flex-col h-fit">
      <div className="p-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex-1 min-w-0 pr-5">
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="font-black text-xl md:text-3xl text-slate-900 dark:text-slate-100 truncate tracking-tighter">{stop.name}</h3>
            {weather && <span className="shrink-0 text-xl">{isRaining ? '🌧️' : '☀️'}</span>}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs md:text-base font-black font-mono text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">
              {stop.code}
            </p>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" />
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
           <button 
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={`p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-xl border border-slate-200 dark:border-slate-700 transition-all ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-3 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-95"
          >
            <Heart className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
      
      <div className="p-6 md:p-8">
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing...</p>
          </div>
        )}
        
        {error && !data && (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-4">
             <p className="text-xs font-black uppercase tracking-widest">Link Lost</p>
             <button onClick={() => loadData(true)} className="px-8 py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Reconnect</button>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-6">
            {data.services.length > 0 ? (
              data.services.map(service => (
                <ServiceRow 
                  key={service.ServiceNo} 
                  service={service} 
                  busStopCode={stop.code}
                  telegramId={telegramId}
                  alertId={activeAlerts[`${stop.code}-${service.ServiceNo}`]}
                  onAlertChange={(aid) => onAlertChange(stop.code, service.ServiceNo, aid)}
                  isPinned={pinnedServices.some(p => p.busStopCode === stop.code && p.serviceNo === service.ServiceNo)}
                  onPinToggle={() => onPinToggle({ busStopCode: stop.code, busStopName: stop.name, serviceNo: service.ServiceNo })}
                />
              ))
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No active departures</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PinnedServicesSection: React.FC<{
  pinnedServices: FavoriteService[];
  onPinToggle: (pinned: FavoriteService) => void;
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
}> = ({ pinnedServices, onPinToggle, telegramId, activeAlerts, onAlertChange }) => {
  const [liveData, setLiveData] = useState<Record<string, BusStopArrivalResponse>>({});
  const [loading, setLoading] = useState(true);

  const stopCodes = useMemo(() => Array.from(new Set(pinnedServices.map(p => p.busStopCode))), [pinnedServices]);

  const fetchAllData = async () => {
    if (stopCodes.length === 0) {
      setLoading(false);
      return;
    }
    
    const results: Record<string, BusStopArrivalResponse> = {};
    await Promise.all(stopCodes.map(async (code) => {
      try {
        results[code] = await fetchBusArrival(code);
      } catch (e) {
        console.error(`Failed to fetch pinned stop ${code}`, e);
      }
    }));
    setLiveData(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [stopCodes]);

  if (pinnedServices.length === 0) return null;

  return (
    <div className="space-y-8 mb-16">
      <div className="flex items-center gap-5 px-3">
        <div className="p-4 bg-emerald-500 rounded-[1.5rem] shadow-xl shadow-emerald-500/20">
          <Pin className="w-6 h-6 text-white fill-current" />
        </div>
        <div>
          <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter leading-none">Priority Feed</h3>
          <p className="text-[10px] md:text-xs font-black text-emerald-500 uppercase tracking-[0.3em] mt-2">Active Tracker</p>
        </div>
      </div>
      
      {loading && Object.keys(liveData).length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {pinnedServices.map((pinned) => {
            const stopData = liveData[pinned.busStopCode];
            const serviceData = stopData?.services.find(s => s.ServiceNo === pinned.serviceNo);
            
            if (!serviceData) {
              return <div key={`${pinned.busStopCode}-${pinned.serviceNo}`} className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] animate-pulse" />;
            }

            return (
              <ServiceRow 
                key={`${pinned.busStopCode}-${pinned.serviceNo}`}
                service={serviceData}
                busStopCode={pinned.busStopCode}
                telegramId={telegramId}
                alertId={activeAlerts[`${pinned.busStopCode}-${pinned.serviceNo}`]}
                onAlertChange={(aid) => onAlertChange(pinned.busStopCode, pinned.serviceNo, aid)}
                isPinned={true}
                onPinToggle={() => onPinToggle(pinned)}
                subtitle={`${pinned.busStopName}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface FavoritesPageProps {
  favorites: FavoriteBusStop[];
  pinnedServices: FavoriteService[];
  toggleFavorite: (stop: FavoriteBusStop) => void;
  togglePinnedService: (pinned: FavoriteService) => void;
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ favorites, pinnedServices, toggleFavorite, togglePinnedService, telegramId, activeAlerts, onAlertChange }) => {
  const hasContent = favorites.length > 0 || pinnedServices.length > 0;

  return (
    <div className="space-y-10 md:space-y-16 animate-in fade-in duration-700">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />

      <div className="px-3">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">Command Center</h2>
        <p className="text-[10px] md:text-xs font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.4em] mt-2">Active Station Hub</p>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-8">
          <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-[3rem] flex items-center justify-center shadow-2xl border-6 border-slate-50 dark:border-slate-800">
            <Heart className="w-12 h-12 text-slate-200 dark:text-slate-700" />
          </div>
          <div className="space-y-3">
            <h3 className="font-black text-slate-900 dark:text-slate-100 text-2xl uppercase tracking-tight">Hub Offline</h3>
            <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm font-black uppercase tracking-[0.2em] leading-relaxed">No favored terminals or priority feeds detected in local storage.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-20">
          {/* Favorites Terminals moved to top */}
          {favorites.length > 0 && (
            <div className="space-y-10">
              <div className="flex items-center gap-5 px-3">
                <div className="p-4 bg-amber-500 rounded-[1.5rem] shadow-xl shadow-amber-500/20">
                  <Star className="w-6 h-6 text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter leading-none">Terminals</h3>
                  <p className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-[0.3em] mt-2">Station Watch</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-10 items-start">
                {favorites.map((stop) => (
                  <FavoriteStopCard 
                    key={stop.code} 
                    stop={stop} 
                    onRemove={() => toggleFavorite(stop)} 
                    telegramId={telegramId}
                    activeAlerts={activeAlerts}
                    onAlertChange={onAlertChange}
                    pinnedServices={pinnedServices}
                    onPinToggle={togglePinnedService}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Priority Feed Section moved below Terminals */}
          <PinnedServicesSection 
            pinnedServices={pinnedServices}
            onPinToggle={togglePinnedService}
            telegramId={telegramId}
            activeAlerts={activeAlerts}
            onAlertChange={onAlertChange}
          />
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
