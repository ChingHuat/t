
import React, { useState } from 'react';
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

const getLoadInfo = (load?: string) => {
  switch (load) {
    case 'SEA': return { text: 'Seats', emoji: '', color: 'text-emerald-600 dark:text-emerald-400' };
    case 'SDA': return { text: 'Stand', emoji: '', color: 'text-amber-600 dark:text-amber-400' };
    case 'LSD': return { text: 'Full', emoji: '', color: 'text-red-600 dark:text-red-400' };
    default: return null;
  }
};

const getStatusInfo = (s: BusService) => {
  if (s.stability === 'UNSTABLE' || s.confidence === 'LOW') {
    return { text: 'Unstable', emoji: '⚠️', color: 'text-red-600 dark:text-red-400' };
  }
  if (s.drift === 'UP') {
    return { text: 'Slower', emoji: '', color: 'text-amber-600 dark:text-amber-400' };
  }
  if (s.drift === 'DOWN') {
    return { text: 'Faster', emoji: '', color: 'text-emerald-600 dark:text-emerald-400' };
  }
  return { text: 'Stable', emoji: '', color: 'text-slate-500 dark:text-slate-400' };
};

const getSecondaryEtaColor = (val: number | 'ARR' | null) => {
  if (val === 'ARR' || (typeof val === 'number' && val <= 3)) return 'text-emerald-500/80 dark:text-emerald-400/80';
  if (typeof val === 'number' && val <= 10) return 'text-amber-500/70 dark:text-amber-400/70';
  return 'text-slate-400/60 dark:text-slate-500/60';
};

const ServiceRow: React.FC<ServiceRowProps> = ({ service, busStopCode, telegramId, alertId, isPinned, onPinToggle, onAlertChange, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  
  const rawEta = service.eta;
  const eta1 = (rawEta === 'Arr' || rawEta === 0) ? 'ARR' : rawEta;
  const eta2 = getMinutesFromNow(service.NextBus2);
  const eta3 = getMinutesFromNow(service.NextBus3);

  const loadInfo = getLoadInfo(service.NextBus.Load);
  const statusInfo = getStatusInfo(service);

  // Added handleToggleAlert to handle alert registration and cancellation
  const handleToggleAlert = async () => {
    if (alertId) {
      setLoading(true);
      try {
        await cancelAlert({ chatId: telegramId, alertId });
        onAlertChange(null);
      } catch (err) {
        console.error('Failed to cancel alert', err);
        alert("Could not cancel alert.");
      } finally {
        setLoading(false);
      }
    } else {
      setShowThresholds(true);
    }
  };

  // Added handleRegister to register a new alert with selected threshold
  const handleRegister = async (threshold: number) => {
    if (!telegramId) {
      alert("Please configure your Telegram ID in Settings first.");
      return;
    }
    setLoading(true);
    setShowThresholds(false);
    try {
      const res = await registerAlert({
        chatId: telegramId,
        busStopCode,
        serviceNo: service.ServiceNo,
        threshold
      });
      onAlertChange(res.alertId);
    } catch (err) {
      console.error('Failed to register alert', err);
      alert("Failed to register alert. Ensure you have started the bot.");
    } finally {
      setLoading(false);
    }
  };

  const getEtaColorClass = () => {
    if (eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 1)) {
      return 'text-emerald-600 dark:text-emerald-400';
    }
    if (typeof eta1 === 'number' && eta1 <= 5) {
      return 'text-amber-500 dark:text-amber-400';
    }
    return 'text-slate-900 dark:text-slate-100';
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-row items-center p-2.5 md:p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700">
        
        <div className="flex-1 min-w-0">
          {/* Primary Row: Service No + Dominant ETA */}
          <div className="flex items-center justify-between mb-1.5 md:mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[1.4rem] md:text-xl font-[900] bg-slate-900 dark:bg-slate-800 text-white px-1.5 py-0.5 rounded leading-none tracking-tight">
                {service.ServiceNo}
              </span>
              {subtitle && (
                <span className="text-[10px] font-bold text-slate-400 uppercase truncate">
                  {subtitle}
                </span>
              )}
            </div>
            <div className={`text-[1.8rem] md:text-2xl font-[1000] tabular-nums leading-none tracking-tighter flex items-baseline gap-0.5 ${getEtaColorClass()}`}>
              <span>{eta1}</span>
              {typeof eta1 === 'number' && <span className="text-[10px] md:text-[11px] font-black uppercase text-slate-400/70 tracking-tighter">min</span>}
            </div>
          </div>

          {/* Secondary Row: Status + Tertiary Timings */}
          <div className="flex items-center justify-between gap-2 overflow-hidden border-t border-slate-50 dark:border-slate-800/50 pt-1.5 md:pt-1">
            <div className="flex items-center gap-3">
              {loadInfo && (
                <div className="flex items-center gap-0.5 whitespace-nowrap">
                  <span className={`text-[11px] font-[900] uppercase tracking-tight ${loadInfo.color}`}>{loadInfo.text}</span>
                </div>
              )}
              {statusInfo && (
                <div className="flex items-center gap-0.5 whitespace-nowrap">
                  <span className={`text-[11px] font-[900] uppercase tracking-tight ${statusInfo.color}`}>{statusInfo.text}</span>
                  {statusInfo.emoji && <span className="text-[12px] leading-none">{statusInfo.emoji}</span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] md:text-[10px] font-black tabular-nums transition-colors ${getSecondaryEtaColor(eta2)}`}>
                +{eta2 ?? '--'}m
              </span>
              <span className={`text-[10px] md:text-[10px] font-black tabular-nums transition-colors ${getSecondaryEtaColor(eta3)}`}>
                +{eta3 ?? '--'}m
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-row items-center gap-1 ml-3 pl-2 border-l border-slate-100 dark:border-slate-800">
          <button onClick={handleToggleAlert} disabled={loading} className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${alertId ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100'}`}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : alertId ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          </button>
          {onPinToggle && (
            <button onClick={(e) => { e.stopPropagation(); onPinToggle(); }} className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isPinned ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100'}`}>
              {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {showThresholds && !alertId && (
        <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-center gap-1.5 rounded-lg animate-in fade-in duration-150">
          <span className="text-[9px] font-black text-slate-500 uppercase mr-1">Notify:</span>
          {[3, 5, 8, 10].map(m => (
            <button key={m} onClick={() => handleRegister(m)} className="px-2 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-[10px] font-black hover:bg-emerald-500 hover:text-white">
              {m}m
            </button>
          ))}
          <button onClick={() => setShowThresholds(false)} className="ml-1 p-1 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
};

export default ServiceRow;
