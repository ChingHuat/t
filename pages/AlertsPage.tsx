
import React from 'react';
import { Bell, ShieldCheck, AlertCircle } from 'lucide-react';
import AlertBanner from '../components/AlertBanner';
import { ScheduledAlertStatus } from '../types';

interface AlertsPageProps {
  activeAlerts: Record<string, { id: string, type: 'LIVE' | 'SCHEDULED' }>;
  scheduledAlerts: ScheduledAlertStatus[];
  telegramId: string;
  onSyncAlerts: () => void;
  totalCount: number;
}

const AlertsPage: React.FC<AlertsPageProps> = ({ activeAlerts, scheduledAlerts, telegramId, onSyncAlerts, totalCount }) => {
  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <div className="mb-10 px-1 flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase">Alerts</h2>
          <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-3">Monitoring Dashboard</p>
        </div>
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl px-4 py-2 flex flex-col items-center">
           <span className="text-[18px] font-black text-white tabular-nums">{totalCount}</span>
           <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Active</span>
        </div>
      </div>

      {!telegramId ? (
        <div className="bg-[#18181b] border border-amber-500/20 rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-2xl">
           <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-amber-500" />
           </div>
           <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Telegram Link Required</h3>
           <p className="text-slate-500 text-sm font-bold leading-relaxed mb-8">
             Alerts cannot be monitored without a verified Telegram ID. Please link your account in the system settings.
           </p>
           <button 
             onClick={() => window.location.hash = '#/settings'} 
             className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all"
           >
             Configure Telegram
           </button>
        </div>
      ) : totalCount === 0 ? (
        <div className="bg-white/[0.01] border border-white/5 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center text-center">
           <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
              <Bell className="w-8 h-8 text-slate-800" />
           </div>
           <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] leading-loose">
             No active missions detected.<br/>Start a bus alert to begin monitoring.
           </p>
        </div>
      ) : (
        <div className="space-y-8">
           <div className="flex items-start gap-4 p-5 bg-indigo-600/5 border border-indigo-500/20 rounded-3xl">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                Telemetric monitoring is currently active for your linked Telegram account. We'll notify you when your bus is within the configured window.
              </p>
           </div>
           
           <AlertBanner 
             activeAlerts={activeAlerts} 
             scheduledAlerts={scheduledAlerts} 
             telegramId={telegramId} 
             onUpdate={onSyncAlerts} 
           />
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
