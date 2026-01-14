
import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Loader2, AlertCircle, Pin, Star, RefreshCw, Clock } from 'lucide-react';
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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md flex flex-col h-fit">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-black text-base text-slate-800 dark:text-slate-100 truncate tracking-tight">{stop.name}</h3>
            {weather && <span className="shrink-0 text-[10px]">{isRaining ? '🌧️' : '☀️'}</span>}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[9px] font-black font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter bg-emerald-50 dark:bg-emerald-900/20 px-1.5 rounded-md">
              {stop.code}
            </p>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                <Clock className="w-2.5 h-2.5" />
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
           <button 
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={`p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-lg border border-slate-200 dark:border-slate-700 transition-all ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-2 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>
      
      <div className="p-3">
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          </div>
        )}
        
        {error && !data && (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600 flex flex-col items-center gap-2">
             <p className="text-[10px] font-bold">Connection lost.</p>
             <button onClick={() => loadData(true)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[8px] font-black uppercase tracking-widest">Retry</button>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-2.5">
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
              <p className="text-center py-6 text-slate-400 dark:text-slate-600 text-[9px] font-black uppercase tracking-widest italic">No Buses</p>
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
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2 px-1">
        <div className="p-2 bg-emerald-500 rounded-lg shadow-sm">
          <Pin className="w-3.5 h-3.5 text-white fill-current" />
        </div>
        <div>
          <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">Pinned Routes</h3>
          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Direct Monitoring</p>
        </div>
      </div>
      
      {loading && Object.keys(liveData).length === 0 ? (
        <div className="flex flex-col items-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {pinnedServices.map((pinned) => {
            const stopData = liveData[pinned.busStopCode];
            const serviceData = stopData?.services.find(s => s.ServiceNo === pinned.serviceNo);
            
            if (!serviceData) {
              return <div key={`${pinned.busStopCode}-${pinned.serviceNo}`} className="h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />;
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />

      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Hub Dashboard</h2>
        <p className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.2em]">Real-time Hub</p>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center">
            <Heart className="w-10 h-10 text-slate-300 dark:text-slate-700" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg uppercase">Hub is Empty</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs">Favorite stops or pin services in search to build your dashboard.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <PinnedServicesSection 
            pinnedServices={pinnedServices}
            onPinToggle={togglePinnedService}
            telegramId={telegramId}
            activeAlerts={activeAlerts}
            onAlertChange={onAlertChange}
          />

          {favorites.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="p-2 bg-amber-500 rounded-lg shadow-sm">
                  <Star className="w-3.5 h-3.5 text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">Terminals</h3>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Multi-Route Stations</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
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
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
