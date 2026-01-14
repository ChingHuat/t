
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
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-xl group">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 truncate tracking-tight">{stop.name}</h3>
            {weather && <span className="shrink-0 text-xl">{isRaining ? '🌧️' : '☀️'}</span>}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-black font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter bg-emerald-50 dark:bg-emerald-900/20 px-2 rounded-md">
              {stop.code}
            </p>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" />
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={`p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-xl border border-slate-200 dark:border-slate-700 transition-all ${refreshing ? 'animate-spin' : 'hover:scale-110'}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-3 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-xl hover:bg-red-500 hover:text-white transition-all hover:scale-110 shadow-sm"
          >
            <Heart className="w-6 h-6 fill-current" />
          </button>
        </div>
      </div>
      
      <div className="p-5">
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fetching Arrivals</span>
          </div>
        )}
        
        {error && !data && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-600 flex flex-col items-center gap-4">
             <AlertCircle className="w-10 h-10 text-slate-200 dark:text-slate-800" />
             <p className="text-sm font-bold">Live connection interrupted.</p>
             <button onClick={() => loadData(true)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">Reconnect Now</button>
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-4">
            {data.services.length > 0 ? (
              (isExpanded ? data.services : data.services.slice(0, 4)).map(service => (
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
              <p className="text-center py-8 text-slate-400 dark:text-slate-600 text-sm font-black uppercase tracking-widest italic">No Active Services</p>
            )}
            
            {data.services.length > 4 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-center gap-2 py-4 mt-2 text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-2xl transition-all active:scale-95 border-2 border-dotted border-emerald-500/20"
              >
                {isExpanded ? (
                  <>Collapse List <ChevronUp className="w-5 h-5" /></>
                ) : (
                  <>View {data.services.length - 4} More Services <ChevronDown className="w-5 h-5" /></>
                )}
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
    <div className="space-y-5 mb-10">
      <div className="flex items-center gap-2 px-1">
        <div className="p-2.5 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
          <Pin className="w-6 h-6 text-white fill-current" />
        </div>
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.15em]">Pinned Departures</h3>
      </div>
      
      {loading && Object.keys(liveData).length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-5">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Updating pinned routes...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {pinnedServices.map((pinned) => {
            const stopData = liveData[pinned.busStopCode];
            const serviceData = stopData?.services.find(s => s.ServiceNo === pinned.serviceNo);
            
            if (!serviceData) {
              return (
                <div key={`${pinned.busStopCode}-${pinned.serviceNo}`} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.75rem] flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    <div className="space-y-2">
                      <div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                      <div className="w-32 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                </div>
              );
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
    <div className="space-y-8">
      <ActiveAlertsBanner 
        activeAlerts={activeAlerts} 
        telegramId={telegramId} 
        onCancelAlert={onAlertChange} 
      />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Personalized Hub</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[11px]">Track your daily routes and hubs.</p>
        </div>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-40 text-center space-y-8">
          <div className="w-36 h-36 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center shadow-inner relative">
            <Heart className="w-20 h-20 text-slate-300 dark:text-slate-700" />
            <Star className="absolute top-4 right-4 w-8 h-8 text-emerald-500/20 animate-pulse" />
          </div>
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-2xl tracking-tight uppercase">Dashboard Empty</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[300px] leading-relaxed">Search for a stop and pin services or whole stops to personalize your transit hub.</p>
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
              <div className="flex items-center gap-2 px-1">
                <div className="p-2.5 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20">
                  <Star className="w-6 h-6 text-white fill-current" />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.15em]">Favorite Hubs</h3>
              </div>
              <div className="flex flex-col gap-8">
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
