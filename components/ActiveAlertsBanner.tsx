
import React from 'react';
import { X, Loader2, BellRing } from 'lucide-react';
import { cancelAlert } from '../services/busApi';

interface ActiveAlertsBannerProps {
  activeAlerts: Record<string, string>;
  telegramId: string;
  onCancelAlert: (stopCode: string, serviceNo: string, alertId: string | null) => void;
}

const ActiveAlertsBanner: React.FC<ActiveAlertsBannerProps> = ({ activeAlerts, telegramId, onCancelAlert }) => {
  const alertKeys = Object.keys(activeAlerts);
  const [cancellingKey, setCancellingKey] = React.useState<string | null>(null);

  if (alertKeys.length === 0) return null;

  const handleCancel = async (key: string, alertId: string) => {
    const [stopCode, serviceNo] = key.split('-');
    setCancellingKey(key);
    try {
      await cancelAlert({ chatId: telegramId, alertId });
      onCancelAlert(stopCode, serviceNo, null);
    } catch {} finally { setCancellingKey(null); }
  };

  return (
    <div className="mb-10 px-1 space-y-3.5 animate-in fade-in duration-500">
      <div className="flex items-center gap-2.5">
        <BellRing className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-none">Alerts Alive</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {alertKeys.map((key) => {
          const [stopCode, serviceNo] = key.split('-');
          const alertId = activeAlerts[key];
          const isCancelling = cancellingKey === key;

          return (
            <div 
              key={key} 
              className="flex items-center gap-3 pl-4 pr-1.5 py-1.5 bg-white/5 border border-white/10 rounded-xl animate-in zoom-in-95 shadow-lg"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-black text-white tracking-tighter">{serviceNo}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{stopCode}</span>
              </div>
              <button 
                onClick={() => handleCancel(key, alertId)}
                disabled={isCancelling}
                className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded-lg transition-all"
              >
                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveAlertsBanner;
