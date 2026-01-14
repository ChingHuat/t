
import React, { useState } from 'react';
import { Bell, BellOff, Zap, Clock, Loader2, X, Pin, PinOff, Info, Activity } from 'lucide-react';
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

const getMinutesFromNow = (arrivalInfo: BusArrivalInfo): number | 'Arr' | null => {
  if (!arrivalInfo?.EstimatedArrival) return null;
  const arrival = new Date(arrivalInfo.EstimatedArrival).getTime();
  if (isNaN(arrival)) return null;
  const now = Date.now();
  const diff = Math.floor((arrival - now) / 60000);
  return diff <= 0 ? 'Arr' : diff;
};

const LoadIndicator: React.FC<{ load?: string }> = ({ load }) => {
  if (load === 'SEA') {
    return (
      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
        SEATS
      </span>
    );
  }
  if (load === 'SDA') {
    return (
      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800">
        STAND
      </span>
    );
  }
  if (load === 'LSD') {
    return (
      <span className="text-[10px] font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-800">
        FULL
      </span>
    );
  }
  return null;
};

const getReliabilityStatus = (s: BusService) => {
  if (s.confidence === 'LOW') return { label: 'Estimate', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', icon: null };
  if (s.stability === 'UNSTABLE') return { label: 'Unstable', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: null };
  
  const driftIcon = s.drift === 'DOWN' ? <Zap className="w-3 h-3" /> : s.drift === 'UP' ? <Clock className="w-3 h-3" /> : <Activity className="w-3 h-3" />;
  
  if (s.confidence === 'MEDIUM') return { label: 'Likely', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: driftIcon };
  return { label: 'Reliable', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: driftIcon };
};

const ServiceRow: React.FC<ServiceRowProps> = ({ service, busStopCode, telegramId, alertId, isPinned, onPinToggle, onAlertChange, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  
  const eta1 = service.eta;
  const eta2 = getMinutesFromNow(service.NextBus2);
  const eta3 = getMinutesFromNow(service.NextBus3);

  const isArriving = eta1 !== 'NA' && (eta1 === 'Arr' || Number(eta1) <= 1);
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
    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="relative shrink-0">
            <div className="w-16 h-12 bg-slate-900 dark:bg-slate-800 flex items-center justify-center rounded-xl font-black text-xl text-white shadow-lg">
              {service.ServiceNo}
            </div>
            {onPinToggle && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPinToggle(); }}
                className={`absolute -top-1.5 -right-1.5 p-1.5 rounded-full border shadow-sm transition-all ${isPinned ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
              >
                {isPinned ? <Pin className="w-3 h-3 fill-current" /> : <PinOff className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
               <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${status.color}`}>
                {status.icon}
                {status.label}
              </div>
              {service.NextBus.Type === 'DD' && (
                <div className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800">
                  DD
                </div>
              )}
              {service.NextBus.Type === 'SD' && (
                <div className="text-[8px] font-black px-1.5 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-md border border-teal-200 dark:border-teal-800">
                  SD
                </div>
              )}
            </div>
            {subtitle ? (
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate">
                {subtitle}
              </div>
            ) : (
              <div className={`text-[10px] font-black uppercase truncate italic ${
                service.drift === 'DOWN' ? 'text-emerald-500' : 
                service.drift === 'UP' ? 'text-red-500' : 
                'text-blue-500'
              }`}>
                {service.drift === 'DOWN' ? 'Catching up' : service.drift === 'UP' ? 'Falling behind' : 'Steady pace'}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-2">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-3">
              <LoadIndicator load={service.NextBus.Load} />
              <div className="flex items-baseline gap-1">
                <div className={`text-3xl font-black tabular-nums leading-none ${isArriving ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : isApproaching ? 'text-orange-500 dark:text-orange-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {eta1 === 'NA' ? '-' : eta1 === 0 || eta1 === 'Arr' ? 'Arr' : eta1}
                </div>
                {typeof eta1 === 'number' && eta1 > 0 && <span className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase">m</span>}
              </div>
            </div>
            {(eta2 !== null || eta3 !== null) && (
              <div className="flex gap-2 mt-1.5">
                {eta2 !== null && (
                  <div className="flex items-center gap-1">
                    <div className={`w-1 h-1 rounded-full ${service.NextBus2.Load === 'SEA' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{eta2}m</span>
                  </div>
                )}
                {eta3 !== null && (
                  <div className="flex items-center gap-1">
                    <div className={`w-1 h-1 rounded-full ${service.NextBus3.Load === 'SEA' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">{eta3}m</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button 
            onClick={handleToggleAlert}
            disabled={loading}
            className={`p-3 rounded-2xl transition-all border ${
              alertId 
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]' 
                : showThresholds
                  ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-slate-200 dark:border-slate-800'
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
        <div className="flex items-center justify-between gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl animate-in slide-in-from-top-2 duration-200 mt-1 border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3 text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase">Alert me when:</span>
          </div>
          <div className="flex gap-2">
            {[3, 5, 8, 10].map(m => (
              <button
                key={m}
                onClick={() => handleRegister(m)}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
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
