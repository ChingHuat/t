import React, { useState, useMemo } from 'react';
import { X, Loader2, BellRing, CalendarClock } from 'lucide-react';
import { cancelAlert, cancelScheduledAlert } from '../services/busApi';
import { ScheduledAlertStatus } from '../types';

interface AlertBannerProps {
  activeAlerts: Record<string, { id: string, type: 'LIVE' | 'SCHEDULED' }>;
  scheduledAlerts: ScheduledAlertStatus[];
  telegramId: string;
  onUpdate: () => void;
}

interface UnifiedAlert {
  id: string; // Internal unique UI ID
  apiId: string; // Real ID for API
  stopCode: string;
  serviceNo: string;
  type: 'LIVE' | 'SCHEDULED_PENDING';
  targetTime?: string | null;
  windowBeforeMin?: number | null;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ activeAlerts, scheduledAlerts, telegramId, onUpdate }) => {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const hasLiveAlert = useMemo(() => Object.keys(activeAlerts).length > 0, [activeAlerts]);
  const hasScheduledButNotActivated = useMemo(() => 
    scheduledAlerts.some(a => a.status === "SCHEDULED"), 
    [scheduledAlerts]
  );
  
  const bannerOn = hasLiveAlert || hasScheduledButNotActivated;

  const allAlerts = useMemo(() => {
    if (!bannerOn) return [];

    const list: UnifiedAlert[] = [];

    // Process Live Alerts
    // Use Object.keys to ensure correct type inference of alertObj from activeAlerts Record.
    // This avoids "Property 'id' does not exist on type 'unknown'" errors sometimes seen with Object.entries.
    Object.keys(activeAlerts).forEach((key) => {
      const alertObj = activeAlerts[key];
      const lastDash = key.lastIndexOf('-');
      const stopCode = key.substring(0, lastDash);
      const serviceNo = key.substring(lastDash + 1);
      
      list.push({
        id: `live-${alertObj.id}`,
        apiId: alertObj.id,
        stopCode,
        serviceNo,
        type: 'LIVE',
      });
    });

    // Process Scheduled Alerts
    scheduledAlerts.forEach(s => {
      if (s.status === 'SCHEDULED') {
        list.push({
          id: `sch-pending-${s.id}`,
          apiId: s.id,
          stopCode: String(s.busStopCode),
          serviceNo: String(s.serviceNo),
          type: 'SCHEDULED_PENDING',
          targetTime: s.targetTime,
          windowBeforeMin: s.windowBeforeMin,
        });
      }
    });

    return list.filter(alert => !processingIds.has(alert.id));
  }, [activeAlerts, scheduledAlerts, processingIds, bannerOn]);

  if (!bannerOn || allAlerts.length === 0) return null;

  const handleStopAlert = async (alert: UnifiedAlert) => {
    setProcessingIds(prev => new Set(prev).add(alert.id));
    
    try {
      if (alert.type === 'LIVE') {
        await cancelAlert({ chatId: telegramId, alertId: alert.apiId });
      } else {
        await cancelScheduledAlert({ chatId: telegramId, scheduledAlertId: alert.apiId });
      }
      onUpdate();
    } catch (err) {
      console.error(`[Alert System] Deletion failed:`, err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  };

  const getActivationTimeStr = (targetTime: string, buffer: number) => {
    try {
      const date = new Date(targetTime);
      const activationDate = new Date(date.getTime() - (buffer * 60000));
      return activationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return "soon";
    }
  };

  return (
    <div className="mb-10 px-1 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-2.5">
        <BellRing className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-none">Telemetry Dashboard</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {allAlerts.map((alert) => {
          const isLive = alert.type === 'LIVE';
          const isProcessing = processingIds.has(alert.id);

          return (
            <div 
              key={alert.id} 
              className={`flex items-center gap-4 pl-5 pr-2 py-4 border rounded-[1.8rem] shadow-2xl transition-all duration-500 animate-in zoom-in-95 ${isLive ? 'bg-indigo-600/10 border-indigo-500/40' : 'bg-white/5 border-white/10'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2.5 mb-1.5">
                  <span className={`text-[20px] font-black tabular-nums tracking-tighter leading-none ${isLive ? 'text-indigo-400' : 'text-white'}`}>
                    {alert.serviceNo}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{alert.stopCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isLive ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none">Live Telemetry Active</span>
                    </>
                  ) : (
                    <>
                      <CalendarClock className="w-2.5 h-2.5 text-slate-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        Starts @ {getActivationTimeStr(alert.targetTime!, alert.windowBeforeMin!)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button 
                onClick={() => handleStopAlert(alert)}
                disabled={isProcessing}
                className="h-12 px-5 flex items-center justify-center bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-2xl transition-all active:scale-90 group"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertBanner;