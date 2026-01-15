
import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Loader2, Pin, Star, RefreshCw, Bus } from 'lucide-react';
import { fetchBusArrival, fetchWeather } from '../services/busApi';
import { FavoriteBusStop, BusStopArrivalResponse, FavoriteService, WeatherResponse, BusService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

const WeatherIndicator: React.FC<{ weather: WeatherResponse }> = ({ weather }) => {
  const isRaining = weather.rain_mm > 0 || weather.level !== 'NONE';
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight ${isRaining ? 'bg-blue-900/40 text-blue-400 border border-blue-500/20' : 'bg-orange-900/40 text-orange-400 border border-orange-500/20'}`}>
      {isRaining ? '🌧️ RAIN' : '☀️ CLEAR'}
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

const PinnedServicesSection: React.FC<{
  pinnedServices: FavoriteService[];
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
  onPinToggle: (pinned: FavoriteService) => void;
}> = ({ pinnedServices, telegramId, activeAlerts, onAlertChange, onPinToggle }) => {
  
  type PinnedServiceWithData = BusService & { busStopCode: string; busStopName: string };

  const [servicesData, setServicesData] = useState<PinnedServiceWithData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (pinnedServices.length === 0) {
      setLoading(false);
      setServicesData([]);
      return;
    }
    const stopsToFetch: string[] = Array.from(new Set(pinnedServices.map(p => p.busStopCode)));
    const promises = stopsToFetch.map(code => fetchBusArrival(code));
    
    try {
      const results = await Promise.allSettled(promises);
      const allServices: PinnedServiceWithData[] = [];
      results.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value) {
          const stopCode = stopsToFetch[index];
          const arrivalData = res.value as BusStopArrivalResponse;
          const relevantPinnedForStop = pinnedServices.filter(p => p.busStopCode === stopCode);
          
          arrivalData.services.forEach(service => {
            if (relevantPinnedForStop.some(p => p.serviceNo === service.ServiceNo)) {
              allServices.push({ 
                ...service, 
                busStopCode: stopCode,
                busStopName: arrivalData.busStopName 
              });
            }
          });
        }
      });
      setServicesData(allServices);
    } catch (err) {
      console.error("Error fetching pinned services:", err);
    } finally {
      setLoading(false);
    }
  }, [pinnedServices]);

  useEffect(() => {
    setLoading(true);
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); 
    return () => clearInterval(interval);
  }, [fetchAllData]);

  return (
    <div className="space-y-4">
      <div className="px-1 flex items-baseline justify-between mb-2">
        <h2 className="text-base md:text-lg font-[1000] text-amber-400 tracking-tighter uppercase leading-none">Priority Fleet</h2>
      </div>
      {loading && servicesData.length === 0 ? (
        <div className="flex justify-center py-8 bg-slate-900 rounded-xl border border-slate-800">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {servicesData.map(s => (
            <div key={`${s.busStopCode}-${s.ServiceNo}`} className="space-y-1.5 group">
              {/* External Stop Name Label: High-contrast neutral color (slate-200) */}
              <div className="flex items-center gap-2 px-1">
                <div className="h-[1px] w-2 bg-slate-700/50" />
                <span className="text-[9px] font-[1000] text-slate-200 uppercase tracking-widest leading-none">
                  {s.busStopName}
                </span>
                <div className="h-[1px] flex-1 bg-slate-800/30" />
              </div>
              <ServiceRow 
                service={s}
                busStopCode={s.busStopCode}
                telegramId={telegramId}
                alertId={activeAlerts[`${s.busStopCode}-${s.ServiceNo}`]}
                onAlertChange={(aid) => onAlertChange(s.busStopCode, s.ServiceNo, aid)}
                isPinned={true}
                onPinToggle={() => onPinToggle({ busStopCode: s.busStopCode, busStopName: s.busStopName, serviceNo: s.ServiceNo })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


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

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else if (!data) setLoading(true);
    try {
      const [arrivalRes, weatherRes] = await Promise.allSettled([
        fetchBusArrival(stop.code),
        fetchWeather(stop.code)
      ]);
      if (arrivalRes.status === 'fulfilled') setData(arrivalRes.value);
      if (weatherRes.status === 'fulfilled') setWeather(weatherRes.value);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, [stop.code]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg overflow-hidden flex flex-col">
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-[1000] bg-slate-800 text-white px-1.5 rounded uppercase tracking-tighter">
              {stop.code}
            </span>
            {weather && <WeatherIndicator weather={weather} />}
          </div>
          <h3 className="font-[1000] text-[12px] text-slate-100 uppercase tracking-tighter leading-none">
            {stop.name}
          </h3>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide mt-1 leading-none">
            {stop.road}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
           <button onClick={() => loadData(true)} className={`p-2 text-slate-400 transition-colors rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 ${refreshing ? 'animate-spin text-emerald-400 border-emerald-400' : ''}`}>
             <RefreshCw className="w-3.5 h-3.5" />
           </button>
           <button onClick={onRemove} className="p-2 text-red-500 hover:scale-105 rounded-lg bg-slate-800 border border-slate-700 hover:bg-red-900/20 transition-all">
             <Heart className="w-3.5 h-3.5 fill-current" />
           </button>
        </div>
      </div>
      
      <div className="p-1.5 flex flex-col gap-1.5">
        {loading && !data ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : (
          (data?.services || []).map(s => (
            <ServiceRow 
              key={s.ServiceNo} 
              service={s} 
              busStopCode={stop.code}
              telegramId={telegramId}
              alertId={activeAlerts[`${stop.code}-${s.ServiceNo}`]}
              onAlertChange={(aid) => onAlertChange(stop.code, s.ServiceNo, aid)}
              isPinned={pinnedServices.some(p => p.busStopCode === stop.code && p.serviceNo === s.ServiceNo)}
              onPinToggle={() => onPinToggle({ busStopCode: stop.code, busStopName: stop.name, serviceNo: s.ServiceNo })}
            />
          ))
        )}
      </div>
    </div>
  );
};

const FavoritesPage: React.FC<FavoritesPageProps> = ({ favorites, pinnedServices, toggleFavorite, togglePinnedService, telegramId, activeAlerts, onAlertChange }) => {
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />
      
      {pinnedServices.length > 0 && (
        <PinnedServicesSection 
          pinnedServices={pinnedServices}
          telegramId={telegramId}
          activeAlerts={activeAlerts}
          onAlertChange={onAlertChange}
          onPinToggle={togglePinnedService}
        />
      )}

      {favorites.length > 0 && (
        <div className="space-y-4">
          <div className="px-1 flex items-baseline justify-between mb-2">
            <h2 className="text-base md:text-lg font-[1000] text-amber-400 tracking-tighter uppercase">Saved Terminals</h2>
          </div>
          <div className="space-y-5">
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

      {favorites.length === 0 && pinnedServices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
          <Bus className="w-12 h-12 text-slate-700" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
            Monitor is Idle<br/>Search and star bus stops to begin
          </p>
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
