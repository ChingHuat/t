
import React, { useState, useEffect } from 'react';
import { Heart, Loader2, Pin, Star, RefreshCw } from 'lucide-react';
import { fetchBusArrival } from '../services/busApi';
import { FavoriteBusStop, BusStopArrivalResponse, FavoriteService } from '../types';
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
      const res = await fetchBusArrival(stop.code);
      setData(res);
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
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-800/20">
        <div className="min-w-0">
          <h3 className="font-black text-[11px] text-slate-900 dark:text-slate-100 truncate uppercase tracking-tight">{stop.name}</h3>
          <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">{stop.code} • {stop.road}</p>
        </div>
        <div className="flex items-center gap-1">
           <button onClick={() => loadData(true)} className={`p-1 text-slate-400 transition-colors ${refreshing ? 'animate-spin text-emerald-500' : ''}`}><RefreshCw className="w-3 h-3" /></button>
           <button onClick={onRemove} className="p-1 text-red-500 hover:scale-105"><Heart className="w-3 h-3 fill-current" /></button>
        </div>
      </div>
      
      <div className="p-1.5 flex flex-col gap-1">
        {loading && !data ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /></div>
        ) : (
          data?.services.map(s => (
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

const PinnedServicesSection: React.FC<{
  pinnedServices: FavoriteService[];
  onPinToggle: (pinned: FavoriteService) => void;
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
}> = ({ pinnedServices, onPinToggle, telegramId, activeAlerts, onAlertChange }) => {
  const [liveData, setLiveData] = useState<Record<string, BusStopArrivalResponse>>({});
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    const codes = Array.from(new Set(pinnedServices.map(p => p.busStopCode)));
    if (codes.length === 0) { setLoading(false); return; }
    const results: Record<string, BusStopArrivalResponse> = {};
    await Promise.all(codes.map(async (code) => {
      try { results[code] = await fetchBusArrival(code); } catch {}
    }));
    setLiveData(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [pinnedServices]);

  if (pinnedServices.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Pin className="w-3.5 h-3.5 text-emerald-500" />
        <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Pinboard</h3>
      </div>
      <div className="flex flex-col gap-1">
        {pinnedServices.map((p) => {
          const s = liveData[p.busStopCode]?.services.find(s => s.ServiceNo === p.serviceNo);
          return s ? (
            <ServiceRow 
              key={`${p.busStopCode}-${p.serviceNo}`}
              service={s}
              busStopCode={p.busStopCode}
              telegramId={telegramId}
              alertId={activeAlerts[`${p.busStopCode}-${p.serviceNo}`]}
              onAlertChange={(aid) => onAlertChange(p.busStopCode, p.serviceNo, aid)}
              isPinned={true}
              onPinToggle={() => onPinToggle(p)}
              subtitle={p.busStopName}
            />
          ) : <div key={`${p.busStopCode}-${p.serviceNo}`} className="h-[52px] bg-slate-50 dark:bg-slate-800 rounded-lg animate-pulse" />;
        })}
      </div>
    </div>
  );
};

const FavoritesPage: React.FC<FavoritesPageProps> = ({ favorites, pinnedServices, toggleFavorite, togglePinnedService, telegramId, activeAlerts, onAlertChange }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />
      
      <div className="px-1 flex items-baseline justify-between">
        <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">Saved Station Hub</h2>
      </div>

      <PinnedServicesSection 
        pinnedServices={pinnedServices}
        onPinToggle={togglePinnedService}
        telegramId={telegramId}
        activeAlerts={activeAlerts}
        onAlertChange={onAlertChange}
      />

      {favorites.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Terminal List</h3>
          </div>
          <div className="flex flex-col gap-3">
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
  );
};

export default FavoritesPage;
