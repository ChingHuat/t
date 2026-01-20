
import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Loader2, X, Pin, AlertCircle, CalendarCheck, Info, Zap, Clock, ShieldCheck, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BusService, BusArrivalInfo } from '../types';
import { registerAlert, cancelAlert, scheduleAlert, ApiError } from '../services/busApi';
import { getStatusTheme, mapTelemetryToStatus } from '../services/statusMapper';
import { resolveStableLabel, StabilizerState } from '../services/labelStabilizer';

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

const ServiceRow: React.FC<ServiceRowProps> = ({ service, busStopCode, telegramId, alertId, isPinned, onPinToggle, onAlertChange, subtitle }) => {
  const [loading, setLoading] = useState(false);
  const [showUnifiedPicker, setShowUnifiedPicker] = useState(false);
  const [alertMode, setAlertMode] = useState<'IMMEDIATE' | 'PLANNED' | null>(null);
  const [immediateThreshold, setImmediateThreshold] = useState(5);
  const [plannedTime, setPlannedTime] = useState("");
  const [plannedDate, setPlannedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showIdPrompt, setShowIdPrompt] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [alertConflict, setAlertConflict] = useState(false);
  const navigate = useNavigate();
  
  const stabilizerRef = useRef<StabilizerState>({
    currentLabel: mapTelemetryToStatus(service.confidence, service.drift, service.stability),
    candidateLabel: null,
    candidateCount: 0,
    lastChangeTs: Date.now()
  });

  const [stableLabel, setStableLabel] = useState(stabilizerRef.current.currentLabel);

  useEffect(() => {
    const rawLabel = mapTelemetryToStatus(service.confidence, service.drift, service.stability);
    const resolved = resolveStableLabel(stabilizerRef.current, rawLabel);
    setStableLabel(resolved);
  }, [service.drift, service.confidence, service.stability]);

  const eta1 = (service.eta === 'Arr' || service.eta === 0) ? 'ARR' : service.eta;
  const eta2 = getMinutes(service.NextBus2);
  const loadInfo = getLoadStatus(service.NextBus.Load);
  const theme = getStatusTheme(stableLabel);

  const handleOpenAlertPicker = () => {
    if (!telegramId) {
      setShowIdPrompt(true);
    } else if (alertId) {
      handleStopAlert();
    } else {
      const future = new Date(Date.now() + 35 * 60000);
      setPlannedTime(future.toTimeString().slice(0, 5));
      setAlertMode(null);
      setAlertConflict(false);
      setShowUnifiedPicker(true);
    }
  };

  const handleStopAlert = async () => {
    if (!alertId) return;
    setLoading(true);
    try {
      await cancelAlert({ chatId: telegramId, alertId });
      onAlertChange(null);
    } catch {} finally { setLoading(false); }
  };

  const handleStartAlert = async () => {
    if (!alertMode) return;
    setLoading(true);
    setAlertConflict(false);
    try {
      if (alertMode === 'IMMEDIATE') {
        const res = await registerAlert({ 
          chatId: telegramId, 
          busStopCode, 
          serviceNo: service.ServiceNo, 
          threshold: immediateThreshold 
        });
        onAlertChange(res.alertId);
      } else {
        await scheduleAlert({
          chatId: telegramId,
          busStopCode,
          serviceNo: service.ServiceNo,
          targetTime: `${plannedDate}T${plannedTime}:00+08:00`
        });
      }
      setShowUnifiedPicker(false);
      setAlertSuccess(true);
      setTimeout(() => setAlertSuccess(false), 3000);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setAlertConflict(true);
      } else {
        console.error("Alert setup failed", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const getEtaColor = () => {
    if (eta1 === 'ARR' || (typeof eta1 === 'number' && eta1 <= 2)) return 'text-emerald-400';
    if (typeof eta1 === 'number' && eta1 <= 5) return 'text-amber-400';
    return 'text-white';
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <div className="relative mb-2 last:mb-0 group">
      <div className={`flex items-stretch bg-[#1a1a1e] border border-white/5 rounded-2xl overflow-hidden shadow-md transition-all ${isPinned ? 'ring-1 ring-indigo-500/30 bg-[#1e1e24]' : ''}`}>
        
        {/* Arrival Telemetry */}
        <div className="w-16 shrink-0 flex flex-col items-center justify-center bg-white/[0.03] border-r border-white/5 py-4">
          <span className={`text-2xl font-black tabular-nums tracking-tighter leading-none ${getEtaColor()} ${eta1 === 'ARR' ? 'animate-pulse' : ''}`}>
            {eta1}
          </span>
          {typeof eta1 === 'number' && (
            <span className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em] mt-1.5">Minutes</span>
          )}
        </div>

        {/* Identity & Status */}
        <div className="flex-1 min-w-0 px-6 py-6 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[22px] font-black text-white tabular-nums tracking-tighter leading-none">
              {service.ServiceNo}
            </span>
            <span 
              style={{ color: theme.hex, borderColor: `${theme.hex}40`, backgroundColor: `${theme.hex}15` }}
              className="text-[7px] font-black uppercase px-2 py-0.5 rounded border tracking-[0.15em] transition-all min-w-[75px] text-center"
            >
              {stableLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${loadInfo.color}`}>
              {loadInfo.label}
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Next: <span className="text-slate-200 tabular-nums font-black ml-1">{eta2 || '--'}m</span>
            </span>
          </div>
        </div>

        {/* Unified Action Controls */}
        <div className="w-14 shrink-0 flex flex-col border-l border-white/5 bg-white/[0.01]">
          <button 
            onClick={handleOpenAlertPicker}
            disabled={loading}
            className={`flex-1 flex items-center justify-center border-b border-white/5 active:bg-white/10 transition-colors ${alertId ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : alertId ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          <button 
            onClick={onPinToggle}
            className={`flex-1 flex items-center justify-center active:bg-white/10 transition-colors ${isPinned ? 'text-white bg-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pop-out Unified Alert Picker Modal */}
      {showUnifiedPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300"
            onClick={() => setShowUnifiedPicker(false)}
          />
          
          <div className="relative w-full max-w-md bg-[#121215] border border-white/10 rounded-[2.5rem] shadow-2xl p-7 flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Set Bus Alert</h4>
                <p className="text-white text-base font-black tracking-tight uppercase">Monitoring Schedule</p>
              </div>
              <button 
                onClick={() => setShowUnifiedPicker(false)} 
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-8">
              {/* Option A: Immediate */}
              <div 
                onClick={() => { setAlertMode('IMMEDIATE'); setAlertConflict(false); }}
                className={`w-full p-5 rounded-3xl border transition-all cursor-pointer ${alertMode === 'IMMEDIATE' ? 'bg-indigo-600/10 border-indigo-500/50 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${alertMode === 'IMMEDIATE' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500'}`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[12px] font-black text-white uppercase tracking-widest block">When the bus is close</span>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">Best if you’re leaving soon.</p>
                    </div>
                  </div>
                  {alertMode === 'IMMEDIATE' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-slate-700" />}
                </div>
                
                {alertMode === 'IMMEDIATE' && (
                  <div className="mt-5 pt-5 border-t border-indigo-500/20 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3">Notify me when bus is within:</p>
                    <div className="grid grid-cols-4 gap-2.5">
                      {[2, 5, 8, 12].map(m => (
                        <button 
                          key={m} 
                          onClick={(e) => { e.stopPropagation(); setImmediateThreshold(m); }}
                          className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${immediateThreshold === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 border-white/10 text-slate-400'}`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Option B: Planned */}
              <div 
                onClick={() => { setAlertMode('PLANNED'); setAlertConflict(false); }}
                className={`w-full p-5 rounded-3xl border transition-all cursor-pointer ${alertMode === 'PLANNED' ? 'bg-indigo-600/10 border-indigo-500/50 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${alertMode === 'PLANNED' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500'}`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[12px] font-black text-white uppercase tracking-widest block">At a planned time</span>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">Best if planning ahead.</p>
                    </div>
                  </div>
                  {alertMode === 'PLANNED' ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-slate-700" />}
                </div>
                
                {alertMode === 'PLANNED' && (
                  <div className="mt-5 pt-5 border-t border-indigo-500/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block ml-1">Date</span>
                        <input type="date" min={todayStr} max={tomorrowStr} value={plannedDate} onChange={e => setPlannedDate(e.target.value)} onClick={e => e.stopPropagation()} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white text-[11px] font-black focus:ring-1 focus:ring-indigo-500" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block ml-1">Time</span>
                        <input type="time" value={plannedTime} onChange={e => setPlannedTime(e.target.value)} onClick={e => e.stopPropagation()} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white text-[11px] font-black focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="flex gap-4 p-4 bg-indigo-600/5 rounded-2xl border border-indigo-500/20">
                      <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
                      <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                        We don’t notify you at an exact time. We monitor live conditions and alert you when action is needed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Conflict Alert State */}
            {alertConflict && (
              <div className="mb-6 p-5 bg-amber-500/10 border border-amber-500/30 rounded-3xl animate-in slide-in-from-bottom-2">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-white uppercase tracking-widest leading-relaxed">
                      Duplicate Alert Found
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1 leading-relaxed">
                      An alert for this bus is already running or scheduled.
                    </p>
                    <button 
                      onClick={() => navigate('/')}
                      className="mt-3 text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors"
                    >
                      View Existing Alerts →
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={handleStartAlert}
              disabled={loading || alertMode === null || alertConflict || (alertMode === 'PLANNED' && (!plannedTime || !plannedDate))}
              className={`w-full py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-3 ${
                alertMode === null || alertConflict ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Bus Alert'}
            </button>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {alertSuccess && (
        <div className="absolute inset-x-0 -bottom-1 z-40 px-2 animate-in slide-in-from-bottom-2 duration-300">
           <div className="bg-emerald-600 text-white py-1.5 px-4 rounded-lg flex items-center gap-2 shadow-xl border border-emerald-500/50">
             <CalendarCheck className="w-3.5 h-3.5" />
             <span className="text-[9px] font-black uppercase tracking-widest">Alert active & linked to telemetry</span>
           </div>
        </div>
      )}

      {/* Setup Prompt */}
      {showIdPrompt && (
        <div className="absolute inset-0 z-40 bg-[#0a0a0c]/95 backdrop-blur-2xl flex items-center px-6 rounded-2xl border border-amber-500/30 animate-in slide-in-from-bottom-2 duration-300 shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 mr-4">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0 mr-2">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Alerts Disabled</p>
            <p className="text-[11px] font-bold text-white leading-tight">Link your Telegram ID in Settings to enable live arrival alerts.</p>
          </div>
          <button onClick={() => navigate('/settings')} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">Link</button>
        </div>
      )}
    </div>
  );
};

export default ServiceRow;
