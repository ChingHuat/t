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
  // If stability is not stable or confidence is low, we flag it as UNCERTAIN
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
  
  // Display status (what the user sees)
  const [displayedStatus, setDisplayedStatus] = useState(() => getStatusInfo(service));
  // Reference to the raw status from the previous prop update to track consecutive values
  const lastSeenRawStatusText = useRef(displayedStatus.text);

  // Smoothing logic: Update displayedStatus ONLY if the same raw status is seen in 2 consecutive prop updates
  useEffect(() => {
    const currentRaw = getStatusInfo(service);
    
    // If the current status matches what we saw in the previous refresh cycle, we confirm it
    if (currentRaw.text === lastSeenRawStatusText.current) {
      setDisplayedStatus(currentRaw);
    }
    
    // Always track the current status for comparison in the next refresh cycle
    lastSeenRawStatusText.current = currentRaw.text;
  }, [service]); // service prop changes every ~30s poll

  const rawEta = service.eta;
  const eta1 = (rawEta === 'Arr' || rawEta === 0) ? 'ARR' : rawEta;
  
  // Calculate relative minutes for color logic
  const min2 = getMinutesFromNow(service.NextBus2);
  const min3 = getMinutesFromNow(service.NextBus3);
  
  // Get timestamps for display
  const ts2 = getTimestamp(service.NextBus2);
  const ts3 = getTimestamp(service.NextBus3);

  const loadInfo = getLoadInfo(service.NextBus.Load);
  // displayedStatus is smoothed, whereas eta1/min2/min3 update immediately from 'service'
  const statusInfo = displayedStatus;

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
      alert("Failed to register alert.");
    } finally {
      setLoading(false);
    }
  };

  const getEtaColorClass = () => {
    if (eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 1)) {
      return 'text-emerald-400';
    }
    if (typeof eta1 === 'number' && eta1 <= 5) {
      return 'text-amber-400';
    }
    return 'text-white';
  };

  // Determine if the ETA is urgent (ARR or 1 min) for the attention-grabbing pulse
  // animate-pulse is a standard Tailwind utility that creates a fading pulse effect.
  const isUrgent = eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 1);

  return (
    <div className="relative w-full">
      <div className="flex flex-row items-center p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-lg transition-all duration-200 hover:border-slate-700">
        
        {/* Left Section: Primary ETA */}
        <div className="flex flex-col items-center justify-center min-w-[5rem] shrink-0">
          <div className={`text-5xl font-[1000] tabular-nums leading-none tracking-tighter flex items-baseline ${getEtaColorClass()} ${isUrgent ? 'animate-pulse' : ''}`}>
            <span>{eta1}</span>
            {typeof eta1 === 'number' && (
              <span className="text-[12px] font-black uppercase text-slate-500 tracking-tighter ml-1">M</span>
            )}
          </div>
          {subtitle && (
            <span className="text-[8px] font-black text-slate-600 uppercase truncate mt-2 tracking-widest text-center w-full max-w-[4.5rem]">
              {subtitle}
            </span>
          )}
        </div>

        {/* Center Section: Hierarchical Information with Bus Number and Status */}
        <div className="flex-1 flex flex-col justify-center px-4 min-w-0 border-l border-slate-800/50">
          
          {/* Top Row: Bus Service No + Status indicators */}
          <div className="flex items-center justify-between gap-2">
            {/* Bus Service Number */}
            <div className="text-4xl font-[1000] text-white leading-none tracking-tight">
              {service.ServiceNo}
            </div>

            {/* Status Labels */}
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className={`text-[9px] font-[1000] uppercase tracking-wider ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
              {loadInfo && (
                <span className={`text-[9px] font-[1000] uppercase tracking-wider ${loadInfo.color}`}>
                  {loadInfo.text}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Row: Labeled and Colored Next Bus info using Timestamps */}
          <div className="flex items-center gap-6 mt-2.5 pt-2 border-t border-slate-800/50">
            <div className="flex items-baseline whitespace-nowrap">
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">2ND</span>
              <span className={`text-[11px] font-black ${getSecondaryEtaColor(min2)} ml-2 tabular-nums tracking-tight`}>{ts2}</span>
            </div>
            <div className="flex items-baseline whitespace-nowrap">
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">3RD</span>
              <span className={`text-[11px] font-black ${getSecondaryEtaColor(min3)} ml-2 tabular-nums tracking-tight`}>{ts3}</span>
            </div>
          </div>
        </div>

        {/* Right Section: Action icons */}
        <div className="flex flex-col gap-2 ml-1 pl-3 border-l border-slate-800 shrink-0">
          <button 
            onClick={handleToggleAlert} 
            disabled={loading} 
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${alertId ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-700'}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : alertId ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          
          {onPinToggle && (
            <button 
              onClick={(e) => { e.stopPropagation(); onPinToggle(); }} 
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${isPinned ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-700'}`}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Threshold Selector Overlay */}
      {showThresholds && !alertId && (
        <div className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center gap-2 rounded-xl animate-in fade-in duration-150 border border-emerald-500/30">
          <span className="text-[10px] font-black text-slate-500 uppercase mr-1 tracking-widest">NOTIFY AT:</span>
          {[3, 5, 8, 10].map(m => (
            <button 
              key={m} 
              onClick={() => handleRegister(m)} 
              className="w-10 h-10 bg-slate-800 text-white border border-slate-700 rounded-xl text-[10px] font-[1000] hover:bg-emerald-500 hover:border-emerald-400 transition-colors"
            >
              {m}m
            </button>
          ))}
          <button onClick={() => setShowThresholds(false)} className="ml-1 p-2 text-slate-500 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceRow;