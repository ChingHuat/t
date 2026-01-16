
import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Loader2, RefreshCw, MapPin } from 'lucide-react';
import { fetchBusArrival } from '../services/busApi';
import { FavoriteBusStop, BusStopArrivalResponse, FavoriteService, BusService } from '../types';
import ServiceRow from './ServiceRow';

interface StationCardProps {
  stop: FavoriteBusStop;
  pinnedServices: FavoriteService[];
  toggleFavorite?: () => void;
  onPinToggle: (pinned: FavoriteService) => void;
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
  onDataLoaded?: (code: string, services: BusService[]) => void;
  onlyShowPinned?: boolean;
  isFavorite?: boolean;
  showTelemetryPulse?: boolean;
}

const StationCard: React.FC<StationCardProps> = ({ 
  stop, pinnedServices, toggleFavorite, onPinToggle, 
  telegramId, activeAlerts, onAlertChange, onDataLoaded, 
  onlyShowPinned, isFavorite, showTelemetryPulse 
}) => {
  const [data, setData] = useState<BusStopArrivalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else if (!data) setLoading(true);
    try {
      const res = await fetchBusArrival(stop.code);
      setData(res);
      if (onDataLoaded) onDataLoaded(stop.code, res.services);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { 
    load(); 
    const itv = setInterval(load, 30000); 
    return () => clearInterval(itv); 
  }, [stop.code]);

  const filteredServices = useMemo(() => {
    if (!data?.services) return [];
    if (onlyShowPinned) {
      return data.services.filter(s => 
        pinnedServices.some(p => p.busStopCode === stop.code && p.serviceNo === s.ServiceNo)
      );
    }
    return data.services;
  }, [data, onlyShowPinned, pinnedServices, stop.code]);

  if (onlyShowPinned && filteredServices.length === 0) return null;

  return (
    <div className="mb-10 animate-in fade-in duration-500 last:mb-0">
      {/* Station Header */}
      <div className="flex items-end justify-between mb-4 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
             {showTelemetryPulse ? (
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
             ) : (
                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-widest border border-indigo-500/10">
                  {stop.code}
                </span>
             )}
             <h3 className="text-[15px] font-black text-white uppercase tracking-tight truncate">
               {stop.name}
             </h3>
          </div>
          <div className="flex items-center gap-1.5 opacity-50">
            <MapPin className="w-3 h-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest truncate">
              {stop.road || data?.roadName} {showTelemetryPulse ? `• ${stop.code}` : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => load(true)} className={`p-2.5 rounded-xl text-slate-500 hover:text-indigo-400 transition-colors ${refreshing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
          {toggleFavorite && (
            <button 
              onClick={toggleFavorite} 
              className={`p-2.5 rounded-xl transition-all active:scale-90 ${isFavorite ? 'text-rose-500' : 'text-slate-600 hover:bg-white/5'}`}
            >
              <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="py-10 bg-white/[0.02] border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center">
             <Loader2 className="w-6 h-6 animate-spin text-slate-700 mb-2" />
             <span className="text-[9px] font-black uppercase text-slate-700 tracking-widest">Polling Live Stream</span>
          </div>
        ) : (
          filteredServices.map(s => (
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

export default StationCard;
