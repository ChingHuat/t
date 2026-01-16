
import React, { useState } from 'react';
import { Bell, BellOff, Loader2, X, Pin, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  isPinnedStack?: boolean;
}

const getMinutes = (arrivalInfo: BusArrivalInfo): number | 'ARR' | null => {
  if (!arrivalInfo?.EstimatedArrival) return null;
  const arrival = new Date(arrivalInfo.EstimatedArrival).getTime();
  const diff = Math.floor((arrival - Date.now()) / 60000);
  return diff <= 0 ? 'ARR' : diff;
};

const getLoadStatus = (load?: string) => {
  switch (load) {
    case 'SEA': return { label: 'Seats', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' };
    case 'SDA': return { label: 'Stand', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
    case 'LSD': return { label: 'Full', color: 'bg-rose-500/15 text-rose-400 border-rose-500/20' };
    default: return { label: 'N/A', color: 'bg-white/5 text-slate-500 border-white/5' };
  }
};

const getStabilityStyle = (stability?: string) => {
  switch (stability) {
    case 'STABLE': 
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
    case 'UNSTABLE': 
      return 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.1)]';
    default: 
      return 'bg-white/5 text-slate-500 border-white/10';
  }
};

const ServiceRow: React.FC<ServiceRowProps> = ({ service, busStopCode, telegramId, alertId, isPinned, onPinToggle, onAlertChange, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  const [showIdPrompt, setShowIdPrompt] = useState(false);
  const navigate = useNavigate();
  
  const eta1 = (service.eta === 'Arr' || service.eta === 0) ? 'ARR' : service.eta;
  const eta2 = getMinutes(service.NextBus2);
  const loadInfo = getLoadStatus(service.NextBus.Load);

  const handleToggleAlert = async () => {
    if (alertId) {
      setLoading(true);
      try {
        await cancelAlert({ chatId: telegramId, alertId });
        onAlertChange(null);
      } catch {} finally { setLoading(false); }
    } else {
      // Check if Telegram ID exists before showing thresholds
      if (!telegramId) {
        setShowIdPrompt(true);
      } else {
        setShowThresholds(true);
      }
    }
  };

  const handleRegister = async (threshold: number) => {
    if (!telegramId) return;
    setLoading(true);
    setShowThresholds(false);
    try {
      const res = await registerAlert({ chatId: telegramId, busStopCode, serviceNo: service.ServiceNo, threshold });
      onAlertChange(res.alertId);
    } catch {} finally { setLoading(false); }
  };

  const getEtaColor = () => {
    if (eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 2)) return 'text-emerald-400';
    if (typeof eta1 === 'number' && eta1 <= 5) return 'text-amber-400';
    return 'text-white';
  };

  return (
    <div className="relative mb-2 last:mb-0 group">
      <div className={`flex items-stretch bg-[#1a1a1e] border border-white/5 rounded-2xl overflow-hidden shadow-md transition-all ${isPinned ? 'ring-1 ring-indigo-500/30 bg-[#1e1e24]' : ''}`}>
        
        {/* Col 1: Bus Service Identity (Left) */}
        <div className="w-16 shrink-0 flex items-center justify-center bg-white/[0.02] border-r border-white/5">
          <span className="text-xl font-black text-white tabular-nums tracking-tighter">
            {service.ServiceNo}
          </span>
        </div>

        {/* Col 2: Telemetry Data (Center) */}
        <div className="flex-1 min-w-0 px-6 py-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black leading-none tracking-tighter transition-all ${getEtaColor()} ${eta1 === 'ARR' ? 'animate-pulse' : ''}`}>
                {eta1 === 'ARR' ? 'ARR' : eta1}
              </span>
              {typeof eta1 === 'number' && (
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Min</span>
              )}
            </div>
            {service.stability && service.stability !== 'UNKNOWN' && (
              <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border tracking-widest transition-all ${getStabilityStyle(service.stability)}`}>
                {service.stability}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${loadInfo.color}`}>
              {loadInfo.label}
            </div>
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-widest">
              Next: <span className="text-slate-200 tabular-nums font-black ml-1">{eta2 || '--'}m</span>
            </span>
          </div>
        </div>

        {/* Col 3: Action Controls */}
        <div className="w-14 shrink-0 flex flex-col border-l border-white/5 bg-white/[0.01]">
          <button 
            onClick={handleToggleAlert}
            disabled={loading}
            className={`flex-1 flex items-center justify-center border-b border-white/5 active:bg-white/10 transition-colors ${alertId ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : alertId ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </button>
          <button 
            onClick={onPinToggle}
            className={`flex-1 flex items-center justify-center active:bg-white/10 transition-colors ${isPinned ? 'text-white bg-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Pin className={`w-5 h-5 ${isPinned ? 'fill-current text-white' : ''}`} />
          </button>
        </div>
      </div>

      {/* Threshold Sheet Overlay */}
      {showThresholds && (
        <div className="absolute inset-0 z-20 bg-[#121214]/98 backdrop-blur-xl flex items-center justify-around px-3 rounded-2xl border border-indigo-500/40 animate-in fade-in zoom-in-95 duration-200">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Notify @</span>
          {[2, 5, 8, 12].map(m => (
            <button key={m} onClick={() => handleRegister(m)} className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 text-base font-black active:bg-indigo-600 active:text-white transition-all shadow-lg">
              {m}
            </button>
          ))}
          <button onClick={() => setShowThresholds(false)} className="w-12 h-12 flex items-center justify-center text-slate-400"><X className="w-6 h-6" /></button>
        </div>
      )}

      {/* Missing ID Prompt Overlay */}
      {showIdPrompt && (
        <div className="absolute inset-0 z-30 bg-[#0a0a0c]/95 backdrop-blur-2xl flex items-center px-6 rounded-2xl border border-amber-500/30 animate-in slide-in-from-bottom-2 duration-300 shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 mr-4">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0 mr-2">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Configuration Required</p>
            <p className="text-[11px] font-bold text-white leading-tight">Link your Telegram ID in Settings to enable live arrival alerts.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/settings')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              Setup <ArrowRight className="w-3 h-3" />
            </button>
            <button 
              onClick={() => setShowIdPrompt(false)}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRow;
