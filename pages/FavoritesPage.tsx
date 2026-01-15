
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Heart, Loader2, Pin, RefreshCw, Bus, MapPin, Star, Zap } from 'lucide-react';
import { fetchBusArrival } from '../services/busApi';
import { FavoriteBusStop, BusStopArrivalResponse, FavoriteService, BusService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

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
  actions?: React.ReactNode; 
 }> = ({ code, name, road, actions }) => {
  let fontSizeClass = 'text-[12px]';
  let trackingClass = 'tracking-[0.1em]';

  // Dynamic font sizing to ensure all names display, scaling down for extreme lengths
  if (name.length > 55) fontSizeClass = 'text-[7px]';
  else if (name.length > 45) fontSizeClass = 'text-[8px]';
  else if (name.length > 35) fontSizeClass = 'text-[9.5px]';
  else if (name.length > 25) fontSizeClass = 'text-[11px]';

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-3xl px-3 flex items-center min-h-[3.5rem] mb-1 mt-1">
        {/* Left Rail (Fixed 96px) */}
        <div className="w-24 shrink-0 flex items-center justify-center">
          <span className="text-[10px] font-black bg-slate-900 text-emerald-500 px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] tracking-tighter">
            {code}
          </span>
        </div>
        {/* Center Content (Flex-1) */}
        <div className="flex-1 px-4 min-w-0 flex flex-col justify-center items-center text-center">
          <h3 className={`font-[1000] ${fontSizeClass} ${trackingClass} text-white uppercase leading-[1.1] w-full line-clamp-2`}>
            {name}
          </h3>
          {road && (
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] truncate mt-1 leading-none opacity-60 w-full">
              {road}
            </p>
          )}
        </div>
        {/* Right Rail (Fixed 96px) */}
        <div className="w-24 shrink-0 flex items-center justify-center gap-1.5">
          {actions}
        </div>
      </div>
    </div>
  );
};

type PinnedServiceWithData = BusService & { busStopCode: string; busStopName: string; roadName: string };

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
    const stopsToFetch: string[] = Array.from(new Set(pinnedServices.map(p => p.busStopCode)));
    
    try {
      const arrivalPromises = stopsToFetch.map(code => fetchBusArrival(code));
      const arrivalResults = await Promise.allSettled(arrivalPromises);

      const allServices: PinnedServiceWithData[] = [];
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
      setServicesData(allServices);
    } catch (err) {
      console.error('PinnedServicesSection fetch error:', err);
    } finally { setLoading(false); }
  }, [pinnedServices]);

  useEffect(() => {
    setLoading(true); fetchAllData();
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
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex justify-center mb-2">
        <div className="w-full max-w-3xl px-3 flex items-center gap-4">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
             <Zap className="w-4 h-4 text-amber-500 fill-current" />
          </div>
          <h2 className="text-[12px] font-[1000] text-amber-500 tracking-[0.4em] uppercase">Priority Hub</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-amber-500/20 to-transparent" />
        </div>
      </div>
      
      {loading && servicesData.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.entries(groupedServices) as [string, { name: string; roadName: string; services: PinnedServiceWithData[] }][]).map(([stopCode, group]) => (
            <div key={stopCode} className="flex flex-col border-t border-white/5 first:border-t-0 pt-2 first:pt-0">
              <StopHeader code={stopCode} name={group.name} road={group.roadName} />
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else if (!data) setLoading(true);
    try {
      const results = await fetchBusArrival(stop.code);
      setData(results);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); const interval = setInterval(loadData, 30000); return () => clearInterval(interval); }, [stop.code]);

  return (
    <div className="flex flex-col border-t border-white/5 first:border-t-0 pt-6 first:pt-0">
      <StopHeader 
        code={stop.code} 
        name={stop.name} 
        road={stop.road || data?.roadName} 
        actions={
          <div className="flex items-center gap-1.5">
            <button onClick={() => loadData(true)} className={`w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all ${refreshing ? 'animate-spin text-emerald-400' : ''}`}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRemove} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-red-500 hover:border-red-500/30 transition-all">
              <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
            </button>
          </div>
        }
      />
      
      <div className="flex flex-col gap-3">
        {loading && !data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin opacity-50" />
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
    <div className="space-y-12 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />
      
      <PinnedServicesSection 
        pinnedServices={pinnedServices}
        telegramId={telegramId}
        activeAlerts={activeAlerts}
        onAlertChange={onAlertChange}
        onPinToggle={togglePinnedService}
      />

      {favorites.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-full max-w-3xl px-3 flex items-center gap-4">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                 <Bus className="w-4 h-4 text-emerald-500" />
              </div>
              <h2 className="text-[12px] font-[1000] text-emerald-500 tracking-[0.4em] uppercase">Terminals Linked</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
            </div>
          </div>
          <div className="space-y-10">
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
        <div className="flex flex-col items-center justify-center py-40 text-center space-y-8 animate-pulse">
          <div className="w-24 h-24 bg-slate-900 border border-white/5 rounded-[2.5rem] flex items-center justify-center">
             <Bus className="w-12 h-12 text-slate-800" />
          </div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.8em] leading-loose">
            SYSTEM IDLE<br/>NO STATION LINKS DETECTED
          </p>
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
