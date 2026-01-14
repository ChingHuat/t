
import React, { useState } from 'react';
import { Bell, BellOff, Loader2, X, Pin, PinOff, Info } from 'lucide-react';
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

const Badge: React.FC<{ label: string; value: string; colorClass: string }> = ({ label, value, colorClass }) => (
  <div className="w-full flex flex-col items-center bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg py-1 px-1">
    <span className="text-[6px] md:text-[7px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.15em] leading-none mb-0.5">{label}</span>
    <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest leading-none ${colorClass}`}>{value}</span>
  </div>
);

const getSyncStatus = (s: BusService) => {
  if (s.stability === 'UNSTABLE' || s.confidence === 'LOW') {
    return { text: 'ERRATIC', color: 'text-red-500' };
  }
  if (s.drift === 'UP') {
    return { text: 'DELAYED', color: 'text-amber-500' };
  }
  if (s.confidence === 'MEDIUM') {
    return { text: 'STABLE', color: 'text-blue-500' };
  }
  return { text: 'OPTIMAL', color: 'text-emerald-500' };
};

const ServiceRow: React.FC<ServiceRowProps> = ({ service, busStopCode, telegramId, alertId, isPinned, onPinToggle, onAlertChange, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  
  const rawEta = service.eta;
  const eta1 = (rawEta === 'Arr' || rawEta === 0) ? 'ARR' : rawEta;
  const eta2 = getMinutesFromNow(service.NextBus2);
  const eta3 = getMinutesFromNow(service.NextBus3);

  const sync = getSyncStatus(service);

  // Color logic for ETA - Removed italic as requested
  const getEtaColorClass = () => {
    if (eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 1)) {
      return 'text-emerald-600 dark:text-emerald-400 animate-pulse';
    }
    if (typeof eta1 === 'number' && eta1 <= 5) {
      return 'text-amber-500 dark:text-amber-400';
    }
    return 'text-slate-900 dark:text-slate-50';
  };

  const handleToggleAlert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!telegramId) {
      alert("Please set your Telegram ID in Settings first.");
      return;
    }
    if (alertId) {
      setLoading(true);
      try {
        await cancelAlert({ chatId: telegramId, alertId });
        onAlertChange(null);
      } catch (err) {
        console.error(err);
        alert("Failed to cancel alert.");
      } finally {
        setLoading(false);
      }
    } else {
      setShowThresholds(!showThresholds);
    }
  };

  const handleRegister = async (threshold: number) => {
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
      console.error(err);
      alert("Failed to register alert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 md:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl transition-all duration-300 hover:border-emerald-500/20">
      <div className="flex items-center justify-between gap-2 md:gap-4 w-full">
        
        {/* Left: Service Block (Enlarged) */}
        <div className="shrink-0">
          <div className="w-20 h-20 md:w-28 md:h-28 bg-slate-900 dark:bg-slate-800 flex flex-col items-center justify-center rounded-[1.5rem] md:rounded-[2rem] shadow-xl border border-white/5">
            <span className="font-black text-4xl md:text-6xl text-white leading-none tracking-tighter">{service.ServiceNo}</span>
            <span className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase mt-1.5 tracking-[0.2em]">SERVICE</span>
          </div>
        </div>

        {/* Center: Arrival ETA (Flexible space, centered) */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          {subtitle && (
            <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase truncate tracking-widest mb-1 text-center max-w-full">
              {subtitle}
            </p>
          )}
          <div className="flex items-baseline justify-center">
            <div className={`text-5xl md:text-7xl font-black tabular-nums leading-none tracking-tighter ${getEtaColorClass()}`}>
              {eta1}
            </div>
            {typeof eta1 === 'number' && eta1 > 0 && (
              <span className="text-[10px] md:text-base font-black text-slate-400 ml-1.5 tracking-tighter uppercase">Min</span>
            )}
          </div>
          
          {/* Upcoming timeline mini-badges */}
          <div className="flex items-center gap-2 mt-2">
            {eta2 !== null && (
              <span className="text-[9px] md:text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md">+{eta2}m</span>
            )}
            {eta3 !== null && (
              <span className="text-[9px] md:text-xs font-black text-slate-400/40 tabular-nums px-1.5 py-0.5">+{eta3}m</span>
            )}
          </div>
        </div>

        {/* Right: Indicators & Actions (Grouped on right side) */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Indicator Column */}
          <div className="flex flex-col gap-1 w-14 md:w-18">
            <Badge label="SYNC" value={sync.text} colorClass={sync.color} />
            <Badge 
              label="TYPE" 
              value={service.NextBus.Type === 'DD' ? 'DOUBLE' : 'SINGLE'} 
              colorClass="text-slate-500 dark:text-slate-400" 
            />
            {service.NextBus.Load && (
              <Badge 
                label="LOAD" 
                value={service.NextBus.Load === 'SEA' ? 'SEAT' : service.NextBus.Load === 'SDA' ? 'STAND' : 'FULL'} 
                colorClass={service.NextBus.Load === 'SEA' ? 'text-emerald-500' : service.NextBus.Load === 'SDA' ? 'text-amber-500' : 'text-red-500'} 
              />
            )}
          </div>

          {/* Actions Column */}
          <div className="flex flex-col gap-1">
            <button 
              onClick={handleToggleAlert}
              disabled={loading}
              className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl transition-all border shadow-sm ${
                alertId 
                  ? 'bg-emerald-500 text-white border-emerald-600' 
                  : showThresholds
                    ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : alertId ? <BellOff className="w-4 h-4" /> : showThresholds ? <X className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
            {onPinToggle && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPinToggle(); }}
                className={`w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl transition-all border shadow-sm ${
                  isPinned 
                    ? 'bg-emerald-500 text-white border-emerald-600' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                }`}
              >
                {isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {showThresholds && !alertId && (
        <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-400/5 rounded-xl animate-in slide-in-from-top-2 duration-300 border border-emerald-100 dark:border-emerald-800 mt-1">
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[7px] md:text-[8px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">ALERT:</span>
          </div>
          <div className="flex gap-1.5">
            {[3, 5, 8, 10].map(m => (
              <button
                key={m}
                onClick={() => handleRegister(m)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[8px] font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
              >
                {m}M
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRow;
