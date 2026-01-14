
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
      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-1 rounded border border-emerald-100 dark:border-emerald-800 leading-none inline-flex items-center">
        SEATS
      </span>
    );
  }
  if (load === 'SDA') {
    return (
      <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-1 rounded border border-amber-100 dark:border-amber-800 leading-none inline-flex items-center">
        STAND
      </span>
    );
  }
  if (load === 'LSD') {
    return (
      <span className="text-[9px] font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-1 rounded border border-red-100 dark:border-red-800 leading-none inline-flex items-center">
        FULL
      </span>
    );
  }
  return null;
};

const getReliabilityStatus = (s: BusService) => {
  if (s.confidence === 'LOW') return { label: 'Estimate', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', icon: null };
  if (s.stability === 'UNSTABLE') return { label: 'Unstable', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: null };
  
  const driftIcon = s.drift === 'DOWN' ? <Zap className="w-2.5 h-2.5" /> : s.drift === 'UP' ? <Clock className="w-2.5 h-2.5" /> : <Activity className="w-2.5 h-2.5" />;
  
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
    <div className="flex flex-col gap-1 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between gap-1.5">
        
        {/* Left: Service Identifier */}
        <div className="flex items-center shrink-0">
          <div className="relative">
            <div className="w-12 h-11 bg-slate-900 dark:bg-slate-800 flex items-center justify-center rounded-2xl font-black text-base text-white shadow-md">
              {service.ServiceNo}
            </div>
            {onPinToggle && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPinToggle(); }}
                className={`absolute -top-1.5 -right-1.5 p-1 rounded-full border shadow-sm transition-all ${isPinned ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
              >
                {isPinned ? <Pin className="w-2.5 h-2.5 fill-current" /> : <PinOff className="w-2.5 h-2.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Middle: Status & Meta */}
        <div className="flex flex-col flex-1 min-w-0 justify-center gap-0.5 ml-1">
          <div className="flex items-center gap-1 flex-wrap">
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${status.color}`}>
              {status.icon}
              {status.label}
            </div>
            {service.NextBus.Type === 'DD' && (
              <div className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800 leading-none">
                DD
              </div>
            )}
            {service.NextBus.Type === 'SD' && (
              <div className="text-[8px] font-black px-1.5 py-0.5 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-md border border-teal-200 dark:border-teal-800 leading-none">
                SD
              </div>
            )}
          </div>
          <div className={`text-[8px] font-black uppercase truncate leading-none ${
            subtitle ? 'text-slate-400 dark:text-slate-600' :
            service.drift === 'DOWN' ? 'text-emerald-500' : 
            service.drift === 'UP' ? 'text-red-500' : 
            'text-blue-500'
          }`}>
            {subtitle ? subtitle : (service.drift === 'DOWN' ? 'CATCHING UP' : service.drift === 'UP' ? 'FALLING BEHIND' : 'STEADY PACE')}
          </div>
        </div>

        {/* Right: Arrival Data & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1.5">
              <LoadIndicator load={service.NextBus.Load} />
              <div className="flex items-baseline">
                <div className={`text-2xl font-black tabular-nums leading-none ${isArriving ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : isApproaching ? 'text-orange-500 dark:text-orange-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {eta1 === 'NA' ? '-' : eta1 === 0 || eta1 === 'Arr' ? 'Arr' : eta1}
                </div>
                {typeof eta1 === 'number' && eta1 > 0 && <span className="text-[9px] font-black text-slate-400 ml-0.5">M</span>}
              </div>
            </div>
            {(eta2 !== null || eta3 !== null) && (
              <div className="flex items-center gap-2">
                {eta2 !== null && (
                  <div className="flex items-center gap-0.5">
                    <div className={`w-1 h-1 rounded-full ${service.NextBus2.Load === 'SEA' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-[8px] font-bold text-slate-400 tabular-nums">{eta2}m</span>
                  </div>
                )}
                {eta3 !== null && (
                  <div className="flex items-center gap-0.5">
                    <div className={`w-1 h-1 rounded-full ${service.NextBus3.Load === 'SEA' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-[8px] font-bold text-slate-400 tabular-nums">{eta3}m</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button 
            onClick={handleToggleAlert}
            disabled={loading}
            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all border ${
              alertId 
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' 
                : showThresholds
                  ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-transparent'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : alertId ? (
              <BellOff className="w-4 h-4" />
            ) : showThresholds ? (
              <X className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {showThresholds && !alertId && (
        <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl animate-in slide-in-from-top-2 duration-200 mt-1.5 border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-1.5">
            <Info className="w-2.5 h-2.5 text-emerald-600" />
            <span className="text-[8px] font-black text-emerald-800 dark:text-emerald-400 uppercase">Alert:</span>
          </div>
          <div className="flex gap-1.5">
            {[3, 5, 8, 10].map(m => (
              <button
                key={m}
                onClick={() => handleRegister(m)}
                className="px-3 py-1 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-[9px] font-black text-emerald-700 dark:text-emerald-300 active:bg-emerald-500 active:text-white transition-all"
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
