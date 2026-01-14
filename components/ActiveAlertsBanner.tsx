import React from 'react';
import { Bell, X, Loader2 } from 'lucide-react';
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
      alert("Could not cancel alert. Please try again.");
    } finally {
      setCancellingKey(null);
    }
  };

  return (
    <div className="mb-6 space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 px-1">
        <Bell className="w-4 h-4 text-emerald-500 dark:text-emerald-400 fill-current" />
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Alerts</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {alertKeys.map((key) => {
          const [stopCode, serviceNo] = key.split('-');
          const alertId = activeAlerts[key];
          const isCancelling = cancellingKey === key;

          return (
            <div 
              key={key} 
              className="flex items-center gap-2 px-3 py-2 bg-emerald-500 dark:bg-emerald-600 text-white rounded-full shadow-sm animate-in zoom-in-95 duration-200"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-black bg-white/20 px-1.5 rounded uppercase leading-none py-0.5">Bus {serviceNo}</span>
                <span className="text-[10px] font-bold opacity-90">at {stopCode}</span>
              </div>
              <button 
                onClick={() => handleCancel(key, alertId)}
                disabled={isCancelling}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveAlertsBanner;