
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Heart, Loader2, Pin, RefreshCw, Bus, MapPin, Star } from 'lucide-react';
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

const StopHeader: React.FC<{ 
  code: string; 
  name: string; 
  road?: string; 
  weather?: WeatherResponse | null; 
  actions?: React.ReactNode; 
}> = ({ code, name, road, weather, actions }) => (
  <div className="flex items-center min-h-[3.5rem] bg-slate-800/20">
    <div className="w-20 shrink-0 flex items-center justify-center">
      <span className="text-[10px] font-[1000] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 tracking-tighter">
        {code}
      </span>
    </div>
    <div className="flex-1 px-4 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <h3 className="font-[1000] text-[13px] text-slate-100 uppercase tracking-tighter truncate">
          {name}
        </h3>
        {weather && <WeatherIndicator weather={weather} />}
      </div>
      {road && (
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide truncate">
          {road}
        </p>
      )}
    </div>
    <div className="flex items-center gap-1.5 pr-3 shrink-0">
      {actions}
    </div>
  </div>
);

// Define type outside to ensure stable reference for type inference
type PinnedServiceWithData = BusService & { busStopCode: string; busStopName: string };

const PinnedServicesSection: React.FC<{
  pinnedServices: FavoriteService[];
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
  onPinToggle: (pinned: FavoriteService) => void;
}> = ({ pinnedServices, telegramId, activeAlerts, onAlertChange, onPinToggle }) => {
  const [servicesData, setServicesData] = useState<PinnedServiceWithData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (pinnedServices.length === 0) {
      setLoading(false);
      setServicesData([]);
      return;
    }
    // Added explicit string[] typing to avoid 'unknown' inference in map
    const stopsToFetch: string[] = Array.from(new Set(pinnedServices.map(p => p.busStopCode)));
    const promises = stopsToFetch.map(code => fetchBusArrival(code));
    try {
      const results: PromiseSettledResult<BusStopArrivalResponse>[] = await Promise.allSettled(promises);
      const allServices: PinnedServiceWithData[] = [];
      results.forEach((res, index) => {
        // Addressing 'unknown' error by ensuring res is correctly narrowed as fulfilled
        if (res.status === 'fulfilled') {
          const stopCode = stopsToFetch[index];
          const arrivalData = res.value;
          const relevantPinned = pinnedServices.filter(p => p.busStopCode === stopCode);
          arrivalData.services.forEach(service => {
            if (relevantPinned.some(p => p.serviceNo === service.ServiceNo)) {
              allServices.push({ ...service, busStopCode: stopCode, busStopName: arrivalData.busStopName });
            }
          });
        }
      });
      setServicesData(allServices);
    } catch {} finally { setLoading(false); }
  }, [pinnedServices]);

  useEffect(() => {
    setLoading(true);
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); 
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const groupedServices = useMemo(() => {
    // Explicitly typing the Record to solve potential 'unknown' property access errors
    const groups: Record<string, { name: string; services: PinnedServiceWithData[] }> = {};
    servicesData.forEach(s => {
      if (!groups[s.busStopCode]) groups[s.busStopCode] = { name: s.busStopName, services: [] };
      groups[s.busStopCode].services.push(s);
    });
    return groups;
  }, [servicesData]);

  if (pinnedServices.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="px-2 md:px-0 flex items-center gap-2 mb-2">
        <div className="p-1 bg-amber-500/10 rounded">
          <Star className="w-4 h-4 text-amber-500 fill-current" />
        </div>
        <h2 className="text-[10px] font-black text-amber-500 tracking-[0.2em] uppercase">Priority Fleet</h2>
      </div>
      {loading && servicesData.length === 0 ? (
        <div className="flex justify-center py-10 bg-slate-900 rounded-xl border border-slate-800 mx-2 md:mx-0">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.entries(groupedServices) as [string, { name: string; services: PinnedServiceWithData[] }][]).map(([stopCode, group]) => (
            <div key={stopCode} className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden mx-2 md:mx-0">
              <StopHeader code={stopCode} name={group.name} />
              <div className="flex flex-col">
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
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col mx-2 md:mx-0">
      <StopHeader 
        code={stop.code} 
        name={stop.name} 
        road={stop.road} 
        weather={weather}
        actions={
          <>
            <button onClick={() => loadData(true)} className={`w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700/50 text-slate-500 ${refreshing ? 'animate-spin text-emerald-400' : ''}`}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRemove} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700/50 text-red-500">
              <Heart className="w-3.5 h-3.5 fill-current" />
            </button>
          </>
        }
      />
      
      <div className="flex flex-col">
        {loading && !data ? (
          <div className="flex justify-center py-10 bg-slate-800/10">
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
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="mx-2 md:mx-0">
        <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />
      </div>
      
      <PinnedServicesSection 
        pinnedServices={pinnedServices}
        telegramId={telegramId}
        activeAlerts={activeAlerts}
        onAlertChange={onAlertChange}
        onPinToggle={togglePinnedService}
      />

      {favorites.length > 0 && (
        <div className="space-y-4">
          <div className="px-2 md:px-0 flex items-center gap-2 mb-2">
            <div className="p-1 bg-emerald-500/10 rounded">
              <MapPin className="w-4 h-4 text-emerald-500 fill-current" />
            </div>
            <h2 className="text-[10px] font-black text-emerald-500 tracking-[0.2em] uppercase">Saved Terminals</h2>
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
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50 px-6">
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
