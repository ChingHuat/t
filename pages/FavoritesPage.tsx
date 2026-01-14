
import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Loader2, AlertCircle, ChevronDown, ChevronUp, Pin, Star, RefreshCw, Clock } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 truncate tracking-tight">{stop.name}</h3>
            {weather && <span className="shrink-0 text-sm">{isRaining ? '🌧️' : '☀️'}</span>}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter bg-emerald-50 dark:bg-emerald-900/20 px-1.5 rounded-md">
              {stop.code}
            </p>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
           <button 
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={`p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-lg border border-slate-200 dark:border-slate-700 transition-all ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-2.5 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
          >
            <Heart className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        )}
        
        {error && !data && (
          <div className="text-center py-10 text-slate-400 dark:text-slate-600 flex flex-col items-center gap-3">
             <p className="text-xs font-bold">Connection lost.</p>
             <button onClick={() => loadData(true)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest">Retry</button>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-3">
            {data.services.length > 0 ? (
              (isExpanded ? data.services : data.services.slice(0, 3)).map(service => (
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
              <p className="text-center py-8 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest italic">No Buses</p>
            )}
            
            {data.services.length > 3 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-center gap-2 py-2.5 mt-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-all border border-emerald-500/10"
              >
                {isExpanded ? <>Show Less</> : <>View All ({data.services.length})</>}
              </button>
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
    <div className="space-y-4 mb-10">
      <div className="flex items-center gap-2.5 px-1">
        <div className="p-2.5 bg-emerald-500 rounded-xl shadow-md shadow-emerald-500/10">
          <Pin className="w-4 h-4 text-white fill-current" />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">Pinned Routes</h3>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Direct Monitoring</p>
        </div>
      </div>
      
      {loading && Object.keys(liveData).length === 0 ? (
        <div className="flex flex-col items-center py-10">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {pinnedServices.map((pinned) => {
            const stopData = liveData[pinned.busStopCode];
            const serviceData = stopData?.services.find(s => s.ServiceNo === pinned.serviceNo);
            
            if (!serviceData) {
              return <div key={`${pinned.busStopCode}-${pinned.serviceNo}`} className="h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />;
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />

      <div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Hub Dashboard</h2>
        <p className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.2em] mt-0.5">Real-time Commute Center</p>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
          <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center">
            <Heart className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-xl uppercase">Hub is Empty</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">Favorite stops or pin services in search to build your dashboard.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          <PinnedServicesSection 
            pinnedServices={pinnedServices}
            onPinToggle={togglePinnedService}
            telegramId={telegramId}
            activeAlerts={activeAlerts}
            onAlertChange={onAlertChange}
          />

          {favorites.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2.5 px-1">
                <div className="p-2.5 bg-amber-500 rounded-xl shadow-md shadow-amber-500/10">
                  <Star className="w-4 h-4 text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">Terminals</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Multi-Route Stations</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
