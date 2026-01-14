
import React, { useState } from 'react';
import { Bell, BellOff, ArrowUp, ArrowDown, Loader2, X, Pin, PinOff, Accessibility, Users, Info } from 'lucide-react';
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
  const getLevel = () => {
    if (load === 'SEA') return 1; // Seats
    if (load === 'SDA') return 2; // Standing
    if (load === 'LSD') return 3; // Limited Standing
    return 0;
  };
  const level = getLevel();
  
  return (
    <div className="flex gap-0.5" title={load === 'SEA' ? 'Seats Available' : load === 'SDA' ? 'Standing Available' : 'Limited Standing'}>
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className={`w-1.5 h-3 rounded-full transition-colors ${
            i <= level 
              ? level === 3 ? 'bg-red-500' : level === 2 ? 'bg-amber-500' : 'bg-emerald-500' 
              : 'bg-slate-200 dark:bg-slate-800'
          }`} 
        />
      ))}
    </div>
  );
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
            <div className="flex items-center gap-2 mb-1">
               <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${status.color}`}>
                {status.icon}
                {status.label}
              </div>
              {service.NextBus.Feature === 'WAB' && <Accessibility className="w-3.5 h-3.5 text-blue-500" />}
              {service.NextBus.Type === 'DD' && <div className="text-[8px] font-bold px-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">DD</div>}
            </div>
            {subtitle ? (
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate">
                {subtitle}
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate italic">
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
