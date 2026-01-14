
import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Loader2, Info, AlertCircle, ChevronDown, ChevronUp, Pin, Star } from 'lucide-react';
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
  const [error, setError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadData = async () => {
    try {
      const arrivalRes = await fetchBusArrival(stop.code);
      setData(arrivalRes);
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
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, [stop.code]);

  const isRaining = weather && (weather.rain_mm > 0 || weather.level !== 'NONE');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{stop.name}</h3>
            {weather && <span className="shrink-0">{isRaining ? '🌧️' : '☀️'}</span>}
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{stop.code} • {stop.road}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="shrink-0 p-2 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
        >
          <Heart className="w-5 h-5 fill-current" />
        </button>
      </div>
      
      <div className="p-3">
        {loading && !data && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        )}
        
        {error && !data && (
          <div className="text-center py-6 text-slate-400 dark:text-slate-600 text-xs flex flex-col items-center gap-2">
             <AlertCircle className="w-5 h-5 text-slate-300 dark:text-slate-700" />
             <p>Unable to connect to live data.</p>
             <button onClick={loadData} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Try Again</button>
          </div>
        )}

        {data && (
          <div className="space-y-2">
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
              <p className="text-center py-4 text-slate-400 dark:text-slate-600 text-xs italic">No active services detected</p>
            )}
            
            {data.services.length > 4 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-all active:scale-95"
              >
                {isExpanded ? (
                  <>Show fewer services <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>+ {data.services.length - 4} more services <ChevronDown className="w-3 h-3" /></>
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

  // Group unique stop codes to fetch data efficiently
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
        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <Pin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-current" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Pinned Buses</h3>
      </div>
      
      {loading && Object.keys(liveData).length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Updating arrivals...</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pinnedServices.map((pinned) => {
            const stopData = liveData[pinned.busStopCode];
            const serviceData = stopData?.services.find(s => s.ServiceNo === pinned.serviceNo);
            
            if (!serviceData) {
              return (
                <div key={`${pinned.busStopCode}-${pinned.serviceNo}`} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                    <div className="space-y-1">
                      <div className="w-10 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                      <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded" />
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
    <div className="space-y-6">
      <ActiveAlertsBanner 
        activeAlerts={activeAlerts} 
        telegramId={telegramId} 
        onCancelAlert={onAlertChange} 
      />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Favorites</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track pinned buses and favorite stops.</p>
        </div>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
            <Heart className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Nothing saved yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[240px]">Search for a stop and pin specific services or the whole stop to see them here.</p>
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
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Star className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-current" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Favorite Stops</h3>
              </div>
              <div className="grid gap-4">
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
