
import React from 'react';
import { Bell, X, Loader2, Radio } from 'lucide-react';
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
    } catch (err) {
      console.error('Failed to cancel alert', err);
    } finally {
      setCancellingKey(null);
    }
  };

  return (
    <div className="mb-10 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3 px-1">
        <div className="w-6 h-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center">
          <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
        </div>
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Telemetry Active</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {alertKeys.map((key) => {
          const [stopCode, serviceNo] = key.split('-');
          const alertId = activeAlerts[key];
          const isCancelling = cancellingKey === key;

          return (
            <div 
              key={key} 
              className="group flex items-center gap-3 px-4 py-2.5 bg-emerald-500 text-white rounded-[1.2rem] shadow-[0_10px_20px_rgba(16,185,129,0.2)] animate-in zoom-in-95 duration-300 border border-emerald-400/50"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-black bg-white/20 px-2 py-1 rounded-lg uppercase leading-none">BUS {serviceNo}</span>
                <span className="text-[10px] font-bold tracking-tight opacity-90">STATION {stopCode}</span>
              </div>
              <button 
                onClick={() => handleCancel(key, alertId)}
                disabled={isCancelling}
                className="w-7 h-7 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded-lg transition-all active:scale-90"
              >
                {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveAlertsBanner;
