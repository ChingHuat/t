
import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, HelpCircle, Activity, Wifi, WifiOff, Loader2, AlertTriangle, Terminal } from 'lucide-react';

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
    <div className="space-y-12 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      <div className="px-1 mb-2">
        <h2 className="text-2xl font-[1000] text-white tracking-tighter uppercase leading-none">Global Link Console</h2>
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-2 block leading-none">CORE OPERATIONAL PARAMETERS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-6 rounded-[2rem] border backdrop-blur-md shadow-2xl transition-all duration-300 flex items-center justify-between ${
          statusLabel === 'online' ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5' : 
          statusLabel === 'offline' ? 'bg-red-500/5 border-red-500/20 shadow-red-500/5' : 
          'bg-slate-900 border-white/5'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${statusLabel === 'online' ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-800 text-slate-500'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-1.5">Proxy Protocol</p>
              <p className={`text-base font-[1000] uppercase tracking-tighter ${statusLabel === 'online' ? 'text-white' : 'text-slate-500'}`}>
                {statusLabel === 'checking' ? 'SYNCING...' : statusLabel === 'online' ? 'LINK SECURE' : 'LINK OFFLINE'}
              </p>
            </div>
          </div>
          {statusLabel === 'online' ? <Wifi className="w-6 h-6 text-emerald-500 animate-pulse" /> : <WifiOff className="w-6 h-6 text-red-500" />}
        </div>

        <div className={`p-6 rounded-[2rem] border backdrop-blur-md shadow-2xl transition-all duration-300 flex items-center gap-4 ${isConfigured ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5' : 'bg-amber-500/5 border-amber-500/20 shadow-amber-500/5'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isConfigured ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]'}`}>
            {isConfigured ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-1.5">Alert Integrity</p>
            <h3 className={`text-base font-[1000] uppercase tracking-tighter ${isConfigured ? 'text-white' : 'text-amber-500'}`}>
              {isConfigured ? 'MONITORING ACTIVE' : 'AWAITING RECIPIENT'}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-[#0f172a]/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center gap-4">
              <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg font-black text-[10px] tracking-widest uppercase shadow-lg shadow-emerald-500/20">MODULE 01</span>
              <h3 className="text-[12px] font-[1000] text-white uppercase tracking-[0.3em]">TELEMETRY LINK</h3>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Telegram Protocol ID</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Enter numeric identity..."
                      className="w-full px-6 py-5 bg-slate-900 border border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-sm font-black tracking-widest text-white placeholder:text-slate-700"
                    />
                    <Terminal className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
                  </div>
                  <button 
                    onClick={handleSave}
                    className={`px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white text-slate-900 shadow-white/10'}`}
                  >
                    {isSaved ? 'LINK ESTABLISHED' : 'COMMIT IDENTITY'}
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <button 
                  className="w-full py-5 bg-slate-800/40 border border-white/5 rounded-2xl text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95"
                  onClick={() => window.open(`https://t.me/TransitAI_bot?start=setup`, '_blank')}
                >
                  <ExternalLink className="w-5 h-5 text-emerald-500" />
                  Request Protocol Auth
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-[#0f172a]/20 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5 h-full flex flex-col shadow-xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8">SETUP SCHEMATICS</h3>
            <ul className="space-y-8 flex-1">
              {[
                { id: 'I', title: 'ACCESS BOT', text: 'Search @userinfobot on Telegram and initiate "Start".' },
                { id: 'II', title: 'ID RETRIEVAL', text: 'Copy the numeric string returned by the bot interface.' },
                { id: 'III', title: 'PERMISSION', text: 'Open @TransitAI_bot and click "Start" to permit alerts.' }
              ].map(item => (
                <li key={item.id} className="flex gap-5 items-start">
                  <span className="shrink-0 font-[1000] text-[12px] text-emerald-500 bg-emerald-500/10 w-10 h-10 flex items-center justify-center rounded-xl border border-emerald-500/20">{item.id}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-[1000] text-white uppercase tracking-tight mb-1.5">{item.title}</p>
                    <p className="text-[12px] leading-relaxed text-slate-400 font-bold">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-8 border-t border-white/5">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] leading-none">Diagnostic Stream Ready</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-16 pb-6 opacity-30">
        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.8em] leading-none">
          TRANSIT ENGINE • PRO v1.6.2 BUILD 8421
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
