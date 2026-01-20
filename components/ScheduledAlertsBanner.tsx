
import React, { useState, useEffect } from 'react';
import { X, Loader2, CalendarClock, Lock, AlertCircle } from 'lucide-react';
import { cancelScheduledAlert } from '../services/busApi';
import { ScheduledAlertStatus } from '../types';

interface ScheduledAlertsBannerProps {
  scheduledAlerts: ScheduledAlertStatus[];
  telegramId: string;
  onUpdate: () => void;
}

const ScheduledAlertsBanner: React.FC<ScheduledAlertsBannerProps> = ({ scheduledAlerts, telegramId, onUpdate }) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [lockWarningId, setLockWarningId] = useState<string | null>(null);

  useEffect(() => {
    if (lockWarningId) {
      const timer = setTimeout(() => setLockWarningId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lockWarningId]);

  if (!scheduledAlerts || scheduledAlerts.length === 0) return null;

  const handleCancelAttempt = async (alert: ScheduledAlertStatus) => {
    if (alert.status === 'ACTIVE') {
      setLockWarningId(alert.id);
      return;
    }

    if (!alert.id) return;

    setCancellingId(alert.id);
    try {
      await cancelScheduledAlert({ chatId: telegramId, scheduledAlertId: alert.id });
      onUpdate();
    } catch (err) {
      console.error(`[Alert System] Failed to cancel scheduled mission ${alert.serviceNo}:`, err);
    } finally {
      setCancellingId(null);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return iso;
    }
  };

  return (
    <div className="mb-8 px-1 space-y-3.5 animate-in fade-in duration-500">
      <div className="flex items-center gap-2.5">
        <CalendarClock className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-none">Mission Plans</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {scheduledAlerts.map((s) => {
          const isCancelling = cancellingId === s.id;
          const isActive = s.status === 'ACTIVE';
          const isWarning = lockWarningId === s.id;

          return (
            <div 
              key={s.id} 
              className={`relative flex items-center gap-3 pl-4 pr-1.5 py-1.5 border rounded-xl animate-in zoom-in-95 shadow-lg transition-all duration-300 ${isActive ? 'bg-indigo-600/10 border-indigo-500/40' : 'bg-white/5 border-white/10'}`}
            >
              {isWarning && (
                <div className="absolute inset-0 z-10 bg-[#121214]/95 backdrop-blur-md rounded-xl flex items-center justify-center px-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Active Mission Locked</span>
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[14px] font-black tracking-tighter transition-colors ${isActive ? 'text-indigo-400' : 'text-white'}`}>{s.serviceNo}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{s.busStopCode}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                   {isActive ? (
                     <div className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">TRACKING LIVE</span>
                     </div>
                   ) : (
                     <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">SCHEDULED: {formatTime(s.targetTime)}</span>
                   )}
                </div>
              </div>

              <button 
                onClick={() => handleCancelAttempt(s)}
                disabled={isCancelling}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  isActive 
                    ? 'bg-transparent text-slate-600 cursor-not-allowed' 
                    : 'bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 active:scale-90'
                }`}
              >
                {isCancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isActive ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduledAlertsBanner;
