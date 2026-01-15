
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
    case 'SEA': return { text: 'SEATS', color: 'text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]' };
    case 'SDA': return { text: 'STANDING', color: 'text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]' };
    case 'LSD': return { text: 'FULL', color: 'text-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]' };
    default: return null;
  }
};

const getStatusInfo = (s: BusService, currentEta: number | "ARR" | "NA" | "Arr") => {
  if (s.stability === 'UNSTABLE' || s.confidence === 'LOW') {
    // Soften: Only show "UNCERTAIN" if the bus is within 12 minutes. 
    // Farther buses naturally have higher uncertainty, so we suppress the alert to reduce noise.
    if (typeof currentEta === 'number' && currentEta > 12) return null;
    return { text: 'UNCERTAIN', color: 'text-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.1)]' };
  }
  return { text: 'ON TRACK', color: 'text-emerald-400' };
};

const getSecondaryEtaColor = (val: number | 'ARR' | null) => {
  if (val === 'ARR' || (typeof val === 'number' && val <= 3)) return 'text-emerald-400';
  if (typeof val === 'number' && val <= 10) return 'text-amber-400';
  return 'text-slate-500'; 
};

const ServiceRow: React.FC<ServiceRowProps> = ({ service, busStopCode, telegramId, alertId, isPinned, onPinToggle, onAlertChange, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  
  const rawEta = service.eta;
  const eta1 = (rawEta === 'Arr' || rawEta === 0) ? 'ARR' : rawEta;

  const [displayedStatus, setDisplayedStatus] = useState(() => getStatusInfo(service, eta1));
  const lastSeenRawStatusText = useRef(displayedStatus?.text);

  useEffect(() => {
    const currentRaw = getStatusInfo(service, eta1);
    if (currentRaw?.text !== lastSeenRawStatusText.current) {
      setDisplayedStatus(currentRaw);
      lastSeenRawStatusText.current = currentRaw?.text;
    }
  }, [service, eta1]);

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
    if (eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 1)) return 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]';
    if (typeof eta1 === 'number' && eta1 <= 5) return 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]';
    return 'text-white';
  };

  const isUrgent = eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 1);

  return (
    <div className="w-full flex justify-center">
      <div className="relative w-full max-w-3xl px-3 group">
        <div className="relative flex flex-row items-stretch min-h-[7.5rem] bg-[#0f172a]/40 backdrop-blur-md border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden group-hover:bg-[#1e293b]/60 transition-all duration-300">
          
          {/* Rail 1: ETA (Left Rail - Fixed width 96px) */}
          <div className="w-24 shrink-0 flex flex-col items-center justify-center border-r border-white/5 bg-white/[0.02]">
            <div className={`font-[1000] tabular-nums leading-none tracking-tighter flex items-baseline ${getEtaColorClass()} ${isUrgent ? 'animate-pulse' : ''}`}>
              <span className={eta1 === 'ARR' ? 'text-[28px]' : 'text-[44px]'}>{eta1}</span>
              {typeof eta1 === 'number' && (
                <span className="text-[10px] font-black uppercase text-slate-500 ml-1">MIN</span>
              )}
            </div>
            {subtitle && (
              <span className="text-[6px] font-black text-slate-500 uppercase mt-2 tracking-[0.3em] text-center truncate px-2">
                {subtitle}
              </span>
            )}
          </div>

          {/* Rail 2: Primary Info (Center Rail - Flex-1) */}
          <div className="flex-1 flex flex-col justify-center items-center px-2 min-w-0">
            {/* Bus No and Status Block - Anchored to center */}
            <div className="flex items-start justify-center gap-5 w-full">
              <div className="text-[40px] font-[1000] text-white leading-none tracking-tighter drop-shadow-lg">
                {service.ServiceNo}
              </div>
              <div className="flex flex-col items-start gap-2 shrink-0 mt-1">
                {statusInfo && (
                  <span className={`text-[7px] font-[1000] uppercase tracking-[0.3em] ${statusInfo.color} leading-none block px-1.5 py-0.5 rounded-sm bg-black/20`}>
                    {statusInfo.text}
                  </span>
                )}
                {loadInfo && (
                  <span className={`text-[7px] font-[1000] uppercase tracking-[0.3em] ${loadInfo.color} leading-none block px-1.5 py-0.5 rounded-sm bg-black/20`}>
                    {loadInfo.text}
                  </span>
                )}
              </div>
            </div>

            {/* Timings Row */}
            <div className="flex items-center justify-center gap-6 mt-5 w-full">
              <div className="flex items-center whitespace-nowrap bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                <span className="text-[6px] font-black text-slate-500 uppercase tracking-widest">NEXT</span>
                <span className={`text-[10px] font-[1000] ${getSecondaryEtaColor(min2)} ml-2 tabular-nums`}>{ts2}</span>
              </div>
              <div className="flex items-center whitespace-nowrap bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                <span className="text-[6px] font-black text-slate-500 uppercase tracking-widest">3RD</span>
                <span className={`text-[10px] font-[1000] ${getSecondaryEtaColor(min3)} ml-2 tabular-nums`}>{ts3}</span>
              </div>
            </div>
          </div>

          {/* Rail 3: Actions (Right Rail - Fixed width 96px) */}
          <div className="w-24 shrink-0 flex flex-col items-center justify-center gap-2.5 border-l border-white/5 bg-white/[0.02]">
            <button 
              onClick={(e) => { e.stopPropagation(); handleToggleAlert(); }} 
              disabled={loading} 
              className={`w-10 h-10 flex items-center justify-center rounded-[1.2rem] transition-all active:scale-90 ${alertId ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-800/60 text-slate-400 border border-white/10 hover:border-emerald-500/50 hover:text-emerald-400'}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : alertId ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
            {onPinToggle && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPinToggle(); }} 
                className={`w-10 h-10 flex items-center justify-center rounded-[1.2rem] transition-all active:scale-90 ${isPinned ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-800/60 text-slate-400 border border-white/10 hover:border-emerald-500/50 hover:text-emerald-400'}`}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Interaction Overlay */}
        {showThresholds && !alertId && (
          <div className="absolute inset-x-3 inset-y-0 z-20 bg-[#020617]/95 backdrop-blur-xl flex items-center justify-center gap-2 rounded-[2rem] animate-in zoom-in-95 duration-200 border border-emerald-500/20">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mr-2">NOTIFY IN:</span>
            {[3, 5, 8, 10].map(m => (
              <button key={m} onClick={() => handleRegister(m)} className="w-11 h-11 bg-slate-900 text-white border border-white/10 rounded-2xl text-[10px] font-[1000] hover:bg-emerald-500 hover:border-emerald-400 transition-all active:scale-95">
                {m}m
              </button>
            ))}
            <button onClick={() => setShowThresholds(false)} className="p-2 ml-2 text-slate-500 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRow;
