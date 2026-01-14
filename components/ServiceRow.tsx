
import React, { useState } from 'react';
import { Bell, BellOff, ArrowUp, ArrowDown, Loader2, X, Pin, PinOff } from 'lucide-react';
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
  subtitle?: string; // Added for context when shown outside of a stop card
}

const getMinutesFromNow = (arrivalInfo: BusArrivalInfo): number | 'Arr' | null => {
  if (!arrivalInfo?.EstimatedArrival) return null;
  const arrival = new Date(arrivalInfo.EstimatedArrival).getTime();
  if (isNaN(arrival)) return null;
  const now = Date.now();
  const diff = Math.floor((arrival - now) / 60000);
  return diff <= 0 ? 'Arr' : diff;
};

const getReliabilityStatus = (s: BusService) => {
  if (s.confidence === 'LOW') return { label: 'Estimate', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', icon: null };
  if (s.stability === 'UNSTABLE') return { label: 'Unstable', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: null };
  const driftIcon = s.drift === 'DOWN' ? <ArrowDown className="w-3 h-3" /> : s.drift === 'UP' ? <ArrowUp className="w-3 h-3" /> : null;
  if (s.confidence === 'MEDIUM') return { label: 'Likely', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: driftIcon };
  return { label: 'Reliable', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: driftIcon };
};

const ServiceRow: React.FC<ServiceRowProps> = ({ service, busStopCode, telegramId, alertId, isPinned, onPinToggle, onAlertChange, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  
  const eta1 = service.eta;
  const eta2 = getMinutesFromNow(service.NextBus2);
  const eta3 = getMinutesFromNow(service.NextBus3);

  const isArriving = eta1 !== 'NA' && Number(eta1) <= 1;
  const isApproaching = eta1 !== 'NA' && Number(eta1) <= 5;
  const status = getReliabilityStatus(service);

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
    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="relative shrink-0">
            <div className="w-14 h-11 bg-slate-900 dark:bg-slate-800 flex items-center justify-center rounded-lg font-bold text-lg text-white">
              {service.ServiceNo}
            </div>
            {onPinToggle && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPinToggle(); }}
                className={`absolute -top-1 -right-1 p-1 rounded-full border shadow-sm transition-all ${isPinned ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
              >
                {isPinned ? <Pin className="w-2.5 h-2.5 fill-current" /> : <PinOff className="w-2.5 h-2.5" />}
              </button>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide w-fit ${status.color}`}>
              {status.icon}
              {status.label}
            </div>
            {subtitle ? (
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase truncate">
                {subtitle}
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium truncate">
                {service.drift === 'DOWN' ? 'Catching up' : service.drift === 'UP' ? 'Falling behind' : 'Steady pace'}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1">
              <div className={`text-2xl font-black tabular-nums leading-none ${isArriving ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : isApproaching ? 'text-orange-500 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {eta1 === 'NA' ? '-' : eta1 === 0 ? 'Arr' : eta1}
              </div>
              {eta1 !== 'NA' && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">m</span>}
            </div>
            {(eta2 !== null || eta3 !== null) && (
              <div className="flex gap-1.5 mt-1">
                {eta2 !== null && <div className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded tabular-nums">{eta2}m</div>}
                {eta3 !== null && <div className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold rounded tabular-nums">{eta3}m</div>}
              </div>
            )}
          </div>
          
          <button 
            onClick={handleToggleAlert}
            disabled={loading}
            className={`p-2.5 rounded-full transition-all border ${
              alertId 
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-inner' 
                : showThresholds
                  ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-transparent hover:border-emerald-100 dark:hover:border-emerald-800'
            }`}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : alertId ? (
              <BellOff className="w-5 h-5" />
            ) : showThresholds ? (
              <X className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {showThresholds && !alertId && (
        <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-in slide-in-from-top-2 duration-200 mt-1 border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Alert when:</span>
          <div className="flex gap-2">
            {[5, 8, 10].map(m => (
              <button
                key={m}
                onClick={() => handleRegister(m)}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 hover:border-emerald-600 transition-all active:scale-95"
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRow;
