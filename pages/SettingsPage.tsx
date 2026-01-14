
import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, HelpCircle, Activity, Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

interface SettingsPageProps {
  telegramId: string;
  onUpdateId: (id: string) => void;
  apiOnline: boolean | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ telegramId, onUpdateId, apiOnline }) => {
  const [inputValue, setInputValue] = useState(telegramId);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    const cleanValue = inputValue.replace(/[@\s]/g, '');
    onUpdateId(cleanValue);
    setInputValue(cleanValue);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const isNumeric = /^\d+$/.test(telegramId);
  const isConfigured = telegramId.length > 3 && isNumeric;
  const statusLabel = apiOnline === null ? 'checking' : apiOnline ? 'online' : 'offline';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="px-1 mb-2">
        <h2 className="text-xl md:text-2xl font-[1000] text-white tracking-tighter uppercase leading-none">Global Config</h2>
        <p className="text-[9px] font-black text-white uppercase tracking-widest mt-1.5 block leading-none">Operational Status & Network Link</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
          statusLabel === 'online' ? 'bg-emerald-900/10 border-emerald-800' : 
          statusLabel === 'offline' ? 'bg-red-900/10 border-red-800' : 
          'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${statusLabel === 'online' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">System Proxy</p>
              <p className={`text-sm font-[1000] uppercase tracking-tighter ${statusLabel === 'online' ? 'text-white' : 'text-slate-500'}`}>
                {statusLabel === 'checking' ? 'Establishing Link...' : statusLabel === 'online' ? 'Protocol Nominal' : 'Network Fault'}
              </p>
            </div>
          </div>
          {statusLabel === 'online' ? <Wifi className="w-5 h-5 text-emerald-500 animate-pulse" /> : <WifiOff className="w-5 h-5 text-red-500" />}
        </div>

        <div className={`p-4 rounded-xl border shadow-sm transition-all flex items-center gap-3 ${isConfigured ? 'bg-emerald-900/10 border-emerald-800' : 'bg-amber-900/10 border-amber-800'}`}>
          <div className={`p-2 rounded-lg ${isConfigured ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'}`}>
            {isConfigured ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Alert Protocol</p>
            <h3 className={`text-sm font-[1000] uppercase tracking-tighter ${isConfigured ? 'text-white' : 'text-amber-400'}`}>
              {isConfigured ? 'Linked & Monitoring' : 'No Active Recipient'}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2">
        <div className="lg:col-span-3">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="bg-slate-800 text-white px-2 py-0.5 rounded font-[1000] text-[10px] tracking-tighter uppercase">Phase 01</span>
              <h3 className="text-[11px] font-[1000] text-slate-100 uppercase tracking-widest">Notification Setup</h3>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Telegram numeric Chat ID</label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g. 12345678"
                    className="flex-1 px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-[1000] tracking-tight text-white"
                  />
                  <button 
                    onClick={handleSave}
                    className={`px-8 py-3.5 rounded-xl font-[1000] text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-100 text-slate-900 shadow-black/10'}`}
                  >
                    {isSaved ? 'Identity Saved' : 'Commit Link'}
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <button 
                  className="w-full py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  onClick={() => window.open(`https://t.me/TransitAI_bot?start=setup`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Request Bot Authorization
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 h-full flex flex-col">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Support Reference</h3>
            <ul className="space-y-6 flex-1">
              {[
                { id: '01', title: 'Registry', text: 'Initiate a message to @TransitAI_bot to fetch your system ID.' },
                { id: '02', title: 'Format', text: 'IDs must be strictly numeric sequences without characters.' },
                { id: '03', title: 'Security', text: 'All tracking data remains local; only alerts utilize Telegram.' }
              ].map(item => (
                <li key={item.id} className="flex gap-4 items-start">
                  <span className="shrink-0 font-[1000] text-[11px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded leading-none">{item.id}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-[1000] text-slate-100 uppercase tracking-tight mb-1">{item.title}</p>
                    <p className="text-[11px] leading-snug text-slate-400 font-bold">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-slate-800/50">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Diagnostic Log Ready</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-10 pb-4 opacity-50">
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.6em] leading-none">
          SG BUS LIVE • SYSTEM CORE TERMINAL v1.5.0
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
