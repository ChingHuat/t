
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Heart, Loader2, Pin, RefreshCw, Bus, MapPin, Star } from 'lucide-react';
import { fetchBusArrival, fetchWeather } from '../services/busApi';
import { FavoriteBusStop, BusStopArrivalResponse, FavoriteService, WeatherResponse, BusService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

const WeatherIndicator: React.FC<{ weather: WeatherResponse }> = ({ weather }) => {
  const isRaining = weather.rain_mm > 0 || weather.level !== 'NONE';
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-900/40 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest text-amber-500 shrink-0">
      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
      {isRaining ? 'RAIN' : 'CLEAR'}
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

const StopHeader: React.FC<{ 
  code: string; 
  name: string; 
  road?: string; 
  weather?: WeatherResponse | null; 
  actions?: React.ReactNode; 
 }> = ({ code, name, road, weather, actions }) => (
  <div className="w-full flex justify-center">
    <div className="w-full max-w-3xl px-3 flex items-start min-h-[3rem] mb-2 pt-4">
      {/* Code Badge Rail */}
      <div className="w-24 shrink-0 flex items-center justify-center">
        <span className="text-[9px] font-black bg-slate-800 text-slate-400 px-2 py-1 rounded-md border border-slate-700/50 tracking-tighter">
          {code}
        </span>
      </div>
      
      {/* Content Engine */}
      <div className="flex-1 px-6 min-w-0">
        <div className="flex items-start gap-3">
          <h3 className="font-bold text-[11px] text-slate-100 uppercase tracking-widest line-clamp-2 leading-snug">
            {name}
          </h3>
          {weather && (
            <div className="shrink-0 mt-0.5">
              <WeatherIndicator weather={weather} />
            </div>
          )}
        </div>
        {road && (
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] truncate mt-1 leading-none">
            {road}
          </p>
        )}
      </div>

      {/* Actions Rail */}
      <div className="w-20 shrink-0 flex items-center justify-center gap-2">
        {actions}
      </div>
    </div>
  </div>
);

type PinnedServiceWithData = BusService & { busStopCode: string; busStopName: string; roadName: string };

const PinnedServicesSection: React.FC<{
  pinnedServices: FavoriteService[];
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
  onPinToggle: (pinned: FavoriteService) => void;
}> = ({ pinnedServices, telegramId, activeAlerts, onAlertChange, onPinToggle }) => {
  const [servicesData, setServicesData] = useState<PinnedServiceWithData[]>([]);
  const [weatherData, setWeatherData] = useState<Record<string, WeatherResponse>>({});
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (pinnedServices.length === 0) {
      setLoading(false);
      setServicesData([]);
      return;
    }
    const stopsToFetch: string[] = Array.from(new Set(pinnedServices.map(p => p.busStopCode)));
    
    try {
      const arrivalPromises = stopsToFetch.map(code => fetchBusArrival(code));
      const weatherPromises = stopsToFetch.map(code => fetchWeather(code).catch(() => null));
      
      const [arrivalResults, weatherResults] = await Promise.all([
        Promise.allSettled(arrivalPromises),
        Promise.all(weatherPromises)
      ]);

      const allServices: PinnedServiceWithData[] = [];
      const newWeatherMap: Record<string, WeatherResponse> = {};

      arrivalResults.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          const stopCode = stopsToFetch[index];
          const arrivalData = res.value;
          const relevantPinned = pinnedServices.filter(p => p.busStopCode === stopCode);
          arrivalData.services.forEach(service => {
            if (relevantPinned.some(p => p.serviceNo === service.ServiceNo)) {
              allServices.push({ 
                ...service, 
                busStopCode: stopCode, 
                busStopName: arrivalData.busStopName,
                roadName: arrivalData.roadName
              });
            }
          });
        }
      });

      weatherResults.forEach((res, index) => {
        if (res) {
          newWeatherMap[stopsToFetch[index]] = res;
        }
      });

      setServicesData(allServices);
      setWeatherData(newWeatherMap);
    } catch (err) {
      console.error('PinnedServicesSection fetch error:', err);
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

  const groupedServices = useMemo(() => {
    const groups: Record<string, { name: string; roadName: string; services: PinnedServiceWithData[] }> = {};
    servicesData.forEach(s => {
      if (!groups[s.busStopCode]) {
        groups[s.busStopCode] = { name: s.busStopName, roadName: s.roadName, services: [] };
      }
      groups[s.busStopCode].services.push(s);
    });
    return groups;
  }, [servicesData]);

  if (pinnedServices.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="w-full max-w-3xl px-3 flex items-center gap-3 mb-2">
          <Star className="w-4 h-4 text-amber-500 fill-current" />
          <h2 className="text-[13px] font-[1000] text-amber-500 tracking-[0.25em] uppercase">Priority Fleet</h2>
        </div>
      </div>
      {loading && servicesData.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-12">
          {(Object.entries(groupedServices) as [string, { name: string; roadName: string; services: PinnedServiceWithData[] }][]).map(([stopCode, group]) => (
            <div key={stopCode} className="flex flex-col border-t border-slate-900 first:border-t-0 pt-6 first:pt-0">
              <StopHeader 
                code={stopCode} 
                name={group.name} 
                road={group.roadName} 
                weather={weatherData[stopCode]}
              />
              <div className="flex flex-col gap-3">
                {group.services.map(s => (
                  <ServiceRow 
                    key={`${s.busStopCode}-${s.ServiceNo}`}
                    service={s}
                    busStopCode={s.busStopCode}
                    telegramId={telegramId}
                    alertId={activeAlerts[`${s.busStopCode}-${s.ServiceNo}`]}
                    onAlertChange={(aid) => onAlertChange(s.busStopCode, s.ServiceNo, aid)}
                    isPinned={true}
                    onPinToggle={() => onPinToggle({ busStopCode: s.busStopCode, busStopName: s.busStopName, serviceNo: s.ServiceNo })}
                  />
                ))}
              </div>
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
      const results = await Promise.allSettled([fetchBusArrival(stop.code), fetchWeather(stop.code)]);
      if (results[0].status === 'fulfilled') setData(results[0].value);
      if (results[1].status === 'fulfilled') setWeather(results[1].value);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); const interval = setInterval(loadData, 30000); return () => clearInterval(interval); }, [stop.code]);

  return (
    <div className="flex flex-col border-t border-slate-900 first:border-t-0 pt-10 first:pt-0">
      <StopHeader 
        code={stop.code} 
        name={stop.name} 
        road={stop.road || data?.roadName} 
        weather={weather}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => loadData(true)} className={`p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-emerald-400 transition-colors ${refreshing ? 'animate-spin text-emerald-400' : ''}`}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRemove} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-red-900/60 hover:text-red-500 transition-colors">
              <Heart className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        }
      />
      
      <div className="flex flex-col gap-3">
        {loading && !data ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
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
    <div className="space-y-20 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />
      
      <PinnedServicesSection 
        pinnedServices={pinnedServices}
        telegramId={telegramId}
        activeAlerts={activeAlerts}
        onAlertChange={onAlertChange}
        onPinToggle={togglePinnedService}
      />

      {favorites.length > 0 && (
        <div className="space-y-10 pt-10 border-t border-slate-900/50">
          <div className="flex justify-center">
            <div className="w-full max-w-3xl px-3 flex items-center gap-3 mb-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              <h2 className="text-[13px] font-[1000] text-emerald-500 tracking-[0.25em] uppercase">Saved Terminals</h2>
            </div>
          </div>
          <div className="space-y-12">
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
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 opacity-20 px-6">
          <Bus className="w-16 h-16 text-slate-700" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] leading-relaxed">
            SYSTEM IDLE<br/>LINK STATIONS TO BEGIN MONITORING
          </p>
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
