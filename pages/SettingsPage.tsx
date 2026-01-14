
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
    // Basic cleanup: remove spaces or @ if user still types them
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="md:mb-2">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">System Config</h2>
        <p className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.2em] mt-0.5">Alerts & Connectivity</p>
      </div>

      {/* Top Status Grid: Connectivity & Alert Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors h-full ${
          statusLabel === 'online' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 
          statusLabel === 'offline' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 
          'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <Activity className={`w-5 h-5 ${statusLabel === 'online' ? 'text-emerald-500' : statusLabel === 'offline' ? 'text-red-500' : 'text-slate-400 dark:text-slate-600'}`} />
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Proxy Health</p>
              <p className={`text-sm font-black ${statusLabel === 'online' ? 'text-emerald-700 dark:text-emerald-400' : statusLabel === 'offline' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {statusLabel === 'checking' ? 'Connecting...' : statusLabel === 'online' ? 'Systems Nominal' : 'API Link Down'}
              </p>
            </div>
          </div>
          {statusLabel === 'online' ? <Wifi className="w-5 h-5 text-emerald-500" /> : statusLabel === 'offline' ? <WifiOff className="w-5 h-5 text-red-500" /> : <Loader2 className="w-5 h-5 text-slate-300 dark:text-slate-700 animate-spin" />}
        </div>

        <div className={`p-4 rounded-xl border transition-all h-full flex items-center gap-4 ${isConfigured ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : telegramId ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'}`}>
          <div className={`p-2 rounded-lg shrink-0 ${isConfigured ? 'bg-emerald-500 text-white' : telegramId ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
            {isConfigured ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className={`text-sm font-black tracking-tight ${isConfigured ? 'text-emerald-900 dark:text-emerald-300' : telegramId ? 'text-red-900 dark:text-red-300' : 'text-amber-900 dark:text-amber-300'}`}>
              Alert Engine: {isConfigured ? 'Active' : telegramId ? 'Invalid ID' : 'Standby'}
            </h3>
            <p className={`text-[10px] font-bold truncate ${isConfigured ? 'text-emerald-700/70 dark:text-emerald-500/70' : telegramId ? 'text-red-700/70 dark:text-red-500/70' : 'text-amber-700/70 dark:text-amber-500/70'}`}>
              {isConfigured 
                ? `Syncing to ID: ${telegramId}` 
                : telegramId ? 'Handles/Usernames are not supported.' : 'Numeric ID required for notifications.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Configuration & Troubleshooting */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Registration Section */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Protocol Setup</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Telegram numeric Chat ID</label>
                  {!isNumeric && inputValue && (
                    <span className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase">
                      <AlertTriangle className="w-2.5 h-2.5" /> Numeric Only
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter numeric ID (e.g. 12345678)"
                    className={`flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 ${
                      !isNumeric && inputValue ? 'border-red-300 dark:border-red-900 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                  <button 
                    onClick={handleSave}
                    className={`px-8 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${isSaved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:opacity-90 active:scale-95'}`}
                  >
                    {isSaved ? <CheckCircle2 className="w-4 h-4" /> : 'Link ID'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 ml-1 font-medium leading-relaxed">
                  The backend only accepts <b>numeric IDs</b>. Usernames (handles) will result in delivery failure.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  className="w-full py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  onClick={() => window.open(`https://t.me/TransitAI_bot?start=setup`, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Get your ID from @TransitAI_bot
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-100/30 dark:bg-slate-900/30 p-5 md:p-6 rounded-2xl border border-transparent dark:border-slate-800 h-full">
            <div className="flex items-center gap-2.5 mb-4">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Help Center</h3>
            </div>
            <ul className="space-y-4">
              {[
                { id: '1', title: 'Find your ID', text: 'Message /id to @TransitAI_bot on Telegram to get your unique 9-10 digit number.' },
                { id: '2', title: 'Why numeric?', text: 'Handles (@user) are private and cannot be used by the automated delivery system.' },
                { id: '3', title: 'Missed Alerts', text: 'Ensure you have used /start with the bot first to authorize messages.' }
              ].map(item => (
                <li key={item.id} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-[9px] font-black border border-slate-200 dark:border-slate-700 text-slate-400">{item.id}</span>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{item.title}</p>
                    <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-bold">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Meta */}
      <div className="text-center pt-8 md:pt-12">
        <p className="text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.3em]">
          SG Bus Arrival Pro • v1.4.3 • Build 2404
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
