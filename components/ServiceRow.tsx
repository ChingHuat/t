
import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Loader2, X, Pin, PinOff } from 'lucide-react';
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
  if (val === 'ARR' || (typeof val === 'number' && val <= 3)) return 'text-emerald-400';
  if (typeof val === 'number' && val <= 10) return 'text-amber-400';
  return 'text-slate-400'; 
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
    <div className="relative w-full group">
      <div className="flex flex-row items-center min-h-[4.5rem] bg-slate-900/40 hover:bg-slate-800/40 transition-colors border-t border-slate-800/30 first:border-t-0">
        
        {/* Fixed Width Left Col (Matches Stop Code Width) */}
        <div className="flex flex-col items-center justify-center w-20 shrink-0">
          <div className={`text-3xl font-[1000] tabular-nums leading-none tracking-tighter flex items-baseline ${getEtaColorClass()} ${isUrgent ? 'animate-pulse' : ''}`}>
            <span>{eta1}</span>
            {typeof eta1 === 'number' && (
              <span className="text-[10px] font-black uppercase text-slate-500 ml-0.5">M</span>
            )}
          </div>
          {subtitle && (
            <span className="text-[7px] font-black text-slate-600 uppercase mt-1 tracking-widest text-center truncate px-1">
              {subtitle}
            </span>
          )}
        </div>

        {/* Flexible Center Col */}
        <div className="flex-1 flex flex-col justify-center px-4 min-w-0">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-[1000] text-white leading-none tracking-tight">
              {service.ServiceNo}
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className={`text-[8px] font-[1000] uppercase tracking-wider ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
              {loadInfo && (
                <span className={`text-[8px] font-[1000] uppercase tracking-wider ${loadInfo.color}`}>
                  {loadInfo.text}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-baseline">
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">NEXT</span>
              <span className={`text-[10px] font-black ${getSecondaryEtaColor(min2)} ml-1.5 tabular-nums`}>{ts2}</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">3RD</span>
              <span className={`text-[10px] font-black ${getSecondaryEtaColor(min3)} ml-1.5 tabular-nums`}>{ts3}</span>
            </div>
          </div>
        </div>

        {/* Fixed Width Right Col (Normalized Action Grid) */}
        <div className="flex items-center gap-1.5 pr-3 shrink-0">
          <button 
            onClick={handleToggleAlert} 
            disabled={loading} 
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${alertId ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700/50'}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : alertId ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          
          {onPinToggle && (
            <button 
              onClick={(e) => { e.stopPropagation(); onPinToggle(); }} 
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${isPinned ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700/50'}`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {showThresholds && !alertId && (
        <div className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center gap-1.5 rounded-xl animate-in fade-in duration-150">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1">NOTIFY:</span>
          {[3, 5, 8, 10].map(m => (
            <button key={m} onClick={() => handleRegister(m)} className="w-9 h-9 bg-slate-800 text-white border border-slate-700 rounded-lg text-[9px] font-[1000] hover:bg-emerald-500 transition-colors">
              {m}m
            </button>
          ))}
          <button onClick={() => setShowThresholds(false)} className="p-2 text-slate-500 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceRow;
