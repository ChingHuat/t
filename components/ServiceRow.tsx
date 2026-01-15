
import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Loader2, X, Pin } from 'lucide-react';
import { BusService, BusArrivalInfo } from '../types';
import { registerAlert, cancelAlert } from '../services/busApi';

interface ServiceRowProps {
  service: BusService;
  busStopCode: string;
  telegramId: string;
  alertId?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
  onAlertChange: (alertId: string | null) => void;
  subtitle?: string; 
}

const getMinutesFromNow = (arrivalInfo: BusArrivalInfo): number | 'ARR' | null => {
  if (!arrivalInfo?.EstimatedArrival) return null;
  const arrival = new Date(arrivalInfo.EstimatedArrival).getTime();
  if (isNaN(arrival)) return null;
  const now = Date.now();
  const diff = Math.floor((arrival - now) / 60000);
  return diff <= 0 ? 'ARR' : diff;
};

const getTimestamp = (arrivalInfo: BusArrivalInfo): string => {
  if (!arrivalInfo?.EstimatedArrival) return '--:--';
  const arrival = new Date(arrivalInfo.EstimatedArrival);
  if (isNaN(arrival.getTime())) return '--:--';
  const hh = arrival.getHours().toString().padStart(2, '0');
  const mm = arrival.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const getLoadInfo = (load?: string) => {
  switch (load) {
    case 'SEA': return { text: 'SEATS', color: 'text-cyan-400' };
    case 'SDA': return { text: 'STANDING', color: 'text-amber-400' };
    case 'LSD': return { text: 'FULL', color: 'text-red-400' };
    default: return null;
  }
};

const getStatusInfo = (s: BusService) => {
  if (s.stability === 'UNSTABLE' || s.confidence === 'LOW') {
    return { text: 'UNCERTAIN', color: 'text-red-400' };
  }
  return { text: 'ON TRACK', color: 'text-emerald-400' };
};

const getSecondaryEtaColor = (val: number | 'ARR' | null) => {
  if (val === 'ARR' || (typeof val === 'number' && val <= 15)) return 'text-amber-400';
  return 'text-slate-500'; 
};

const ServiceRow: React.FC<ServiceRowProps> = ({ service, busStopCode, telegramId, alertId, isPinned, onPinToggle, onAlertChange, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  
  const [displayedStatus, setDisplayedStatus] = useState(() => getStatusInfo(service));
  const lastSeenRawStatusText = useRef(displayedStatus.text);

  useEffect(() => {
    const currentRaw = getStatusInfo(service);
    if (currentRaw.text === lastSeenRawStatusText.current) {
      setDisplayedStatus(currentRaw);
    }
    lastSeenRawStatusText.current = currentRaw.text;
  }, [service]);

  const rawEta = service.eta;
  const eta1 = (rawEta === 'Arr' || rawEta === 0) ? 'ARR' : rawEta;
  const ts2 = getTimestamp(service.NextBus2);
  const ts3 = getTimestamp(service.NextBus3);
  const min2 = getMinutesFromNow(service.NextBus2);
  const min3 = getMinutesFromNow(service.NextBus3);

  const loadInfo = getLoadInfo(service.NextBus.Load);
  const statusInfo = displayedStatus;

  const handleToggleAlert = async () => {
    if (alertId) {
      setLoading(true);
      try {
        await cancelAlert({ chatId: telegramId, alertId });
        onAlertChange(null);
      } catch (err) {
        console.error('Failed to cancel alert', err);
      } finally {
        setLoading(false);
      }
    } else {
      setShowThresholds(true);
    }
  };

  const handleRegister = async (threshold: number) => {
    if (!telegramId) return;
    setLoading(true);
    setShowThresholds(false);
    try {
      const res = await registerAlert({ chatId: telegramId, busStopCode, serviceNo: service.ServiceNo, threshold });
      onAlertChange(res.alertId);
    } catch (err) {
      console.error('Failed to register alert', err);
    } finally {
      setLoading(false);
    }
  };

  const getEtaColorClass = () => {
    if (eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 1)) return 'text-emerald-400';
    if (typeof eta1 === 'number' && eta1 <= 5) return 'text-amber-400';
    return 'text-white';
  };

  const isUrgent = eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 1);

  return (
    <div className="w-full flex justify-center">
      <div className="relative w-full max-w-3xl px-3 group">
        <div className="relative flex flex-row items-stretch min-h-[7rem] bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden group-hover:bg-slate-800/80 transition-all">
          
          {/* Section 1: ETA Rail (Left) - Fixed Width (96px) */}
          <div className="w-24 shrink-0 flex flex-col items-center justify-center border-r border-slate-800/50">
            <div className={`text-4xl font-[1000] tabular-nums leading-none tracking-tighter flex items-baseline ${getEtaColorClass()} ${isUrgent ? 'animate-pulse' : ''}`}>
              <span>{eta1}</span>
              {typeof eta1 === 'number' && (
                <span className="text-[12px] font-black uppercase text-slate-600 ml-1">M</span>
              )}
            </div>
            {subtitle && (
              <span className="text-[7px] font-black text-slate-600 uppercase mt-2 tracking-[0.2em] text-center truncate px-1">
                {subtitle}
              </span>
            )}
          </div>

          {/* Section 2: Main Bus Info (Center) - Flexible and Centered */}
          <div className="flex-1 flex flex-col justify-center px-4 min-w-0">
            {/* Top Row: Service Number and Status Status grouped together for visual centering */}
            <div className="flex items-start justify-center gap-6">
              <div className="text-4xl font-[1000] text-white leading-none tracking-tight">
                {service.ServiceNo}
              </div>
              
              {/* Vertical Status Label Stack */}
              <div className="flex flex-col items-start gap-0.5 shrink-0 mt-0.5">
                <span className={`text-[8px] font-[1000] uppercase tracking-widest ${statusInfo.color} leading-none block`}>
                  {statusInfo.text}
                </span>
                {loadInfo && (
                  <span className={`text-[8px] font-[1000] uppercase tracking-widest ${loadInfo.color} leading-none block`}>
                    {loadInfo.text}
                  </span>
                )}
              </div>
            </div>

            {/* Arrival Schedule Row - Also centered */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">NEXT</span>
                <span className={`text-[11px] font-[1000] ${getSecondaryEtaColor(min2)} ml-2 tabular-nums`}>{ts2}</span>
              </div>
              <div className="flex items-center">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">3RD</span>
                <span className={`text-[11px] font-[1000] ${getSecondaryEtaColor(min3)} ml-2 tabular-nums`}>{ts3}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Action Rail (Right) - Fixed Width matched to Left Rail (96px) for perfect centering */}
          <div className="w-24 shrink-0 flex flex-col items-center justify-center gap-2 border-l border-slate-800/50 bg-slate-900/30">
            <button 
              onClick={(e) => { e.stopPropagation(); handleToggleAlert(); }} 
              disabled={loading} 
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 ${alertId ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:bg-slate-700'}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : alertId ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
            
            {onPinToggle && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPinToggle(); }} 
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 ${isPinned ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:bg-slate-700'}`}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Action Overlay */}
        {showThresholds && !alertId && (
          <div className="absolute inset-x-3 inset-y-0 z-20 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center gap-1.5 rounded-2xl animate-in fade-in duration-150">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">NOTIFY IN:</span>
            {[3, 5, 8, 10].map(m => (
              <button key={m} onClick={() => handleRegister(m)} className="w-10 h-10 bg-slate-800 text-white border border-slate-700 rounded-xl text-[10px] font-[1000] hover:bg-emerald-500 transition-colors">
                {m}m
              </button>
            ))}
            <button onClick={() => setShowThresholds(false)} className="p-2 ml-1 text-slate-500 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRow;
