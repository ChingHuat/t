
import React, { useState } from 'react';
import { BellRing, Wifi, WifiOff, MessageSquare, Bell, Send, Info } from 'lucide-react';

interface SettingsPageProps {
  telegramId: string;
  onUpdateId: (id: string) => void;
  apiOnline: boolean | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ telegramId, onUpdateId, apiOnline }) => {
  const [inputValue, setInputValue] = useState(telegramId);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const clean = inputValue.replace(/[^0-9]/g, '');
    onUpdateId(clean);
    setInputValue(clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="pb-12 space-y-12 animate-in fade-in duration-500">
      <div className="px-1">
        <h2 className="text-4xl font-black tracking-tighter text-white uppercase">Settings</h2>
        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-3">System Configuration</p>
      </div>

      <div className="grid grid-cols-2 gap-4 px-1">
        <div className="bg-[#18181b] p-7 rounded-[2rem] flex flex-col items-center text-center border border-white/5 shadow-lg">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${apiOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {apiOnline ? <Wifi className="w-7 h-7" /> : <WifiOff className="w-7 h-7" />}
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data Stream</span>
          <p className="text-[11px] font-black text-white uppercase tracking-tight">{apiOnline ? 'Online' : 'Offline'}</p>
        </div>
        <div className="bg-[#18181b] p-7 rounded-[2rem] flex flex-col items-center text-center border border-white/5 shadow-lg">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(79,70,229,0.1)] ${telegramId ? 'bg-indigo-600/10 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
            <BellRing className="w-7 h-7" />
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Alert Link</span>
          <p className="text-[11px] font-black text-white uppercase tracking-tight">{telegramId ? 'Linked' : 'Not Set'}</p>
        </div>
      </div>

      <div className="bg-[#131316] p-10 rounded-[2.5rem] border border-white/10 mx-1 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/5 blur-[80px] rounded-full -mr-20 -mt-20" />
        
        <div className="flex items-center gap-4 mb-10">
           <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
             <Bell className="w-6 h-6 text-indigo-400" />
           </div>
           <h3 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Notification Setup</h3>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <input 
              type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
              placeholder="ENTER TELEGRAM ID"
              className="w-full px-14 py-6 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/40 transition-all text-lg font-bold text-white placeholder:text-slate-800 shadow-inner"
            />
            <MessageSquare className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700" />
          </div>
          <button 
            onClick={handleSave}
            className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all active:scale-95 shadow-2xl ${saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}`}
          >
            {saved ? 'ALERT LINKED' : 'LINK TELEGRAM'}
          </button>
        </div>

        <div className="mt-12 pt-10 border-t border-white/5 space-y-6">
           <div className="flex gap-4">
              <Info className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
              <p className="text-[12px] text-slate-500 font-bold leading-relaxed tracking-tight">
                Alerts are sent to your Telegram account. Message <span className="text-indigo-400">@userinfobot</span> to get your ID.
              </p>
           </div>
           <button 
             onClick={() => window.open('https://t.me/TransitAI_bot', '_blank')}
             className="w-full py-5 bg-white/5 rounded-2xl text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 active:scale-95 transition-all border border-white/5"
           >
             <Send className="w-4 h-4" />
             Open System Bot
           </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 opacity-10 py-12">
         <div className="w-16 h-px bg-white" />
         <p className="text-[9px] font-black text-white uppercase tracking-[1em] text-center ml-[1em]">
           SG BUS LIVE v1.0
         </p>
      </div>
    </div>
  );
};

export default SettingsPage;
