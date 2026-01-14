import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, HelpCircle, Activity, Wifi, WifiOff, Loader2 } from 'lucide-react';

interface SettingsPageProps {
  telegramId: string;
  onUpdateId: (id: string) => void;
  apiOnline: boolean | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ telegramId, onUpdateId, apiOnline }) => {
  const [inputValue, setInputValue] = useState(telegramId);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onUpdateId(inputValue);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const isConfigured = telegramId.length > 3;
  const statusLabel = apiOnline === null ? 'checking' : apiOnline ? 'online' : 'offline';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your notifications and system preferences.</p>
      </div>

      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
        statusLabel === 'online' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50' : 
        statusLabel === 'offline' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50' : 
        'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <Activity className={`w-5 h-5 ${statusLabel === 'online' ? 'text-emerald-500' : statusLabel === 'offline' ? 'text-red-500' : 'text-slate-400 dark:text-slate-600'}`} />
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Server Connectivity</p>
            <p className={`text-sm font-bold ${statusLabel === 'online' ? 'text-emerald-700 dark:text-emerald-400' : statusLabel === 'offline' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
              {statusLabel === 'checking' ? 'Checking network...' : statusLabel === 'online' ? 'System Online' : 'Server Unreachable'}
            </p>
          </div>
        </div>
        {statusLabel === 'online' ? <Wifi className="w-5 h-5 text-emerald-500" /> : statusLabel === 'offline' ? <WifiOff className="w-5 h-5 text-red-500" /> : <Loader2 className="w-5 h-5 text-slate-300 dark:text-slate-700 animate-spin" />}
      </div>

      <div className={`p-5 rounded-2xl border transition-all ${isConfigured ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isConfigured ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
            {isConfigured ? <ShieldCheck className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div className="space-y-1">
            <h3 className={`font-bold ${isConfigured ? 'text-emerald-900 dark:text-emerald-300' : 'text-amber-900 dark:text-amber-300'}`}>
              Telegram Alerts: {isConfigured ? 'Active' : 'Not Configured'}
            </h3>
            <p className={`text-sm ${isConfigured ? 'text-emerald-700 dark:text-emerald-500' : 'text-amber-700 dark:text-amber-500'}`}>
              {isConfigured 
                ? `System is ready to send alerts to @${telegramId.replace('@', '')}.`
                : 'Link your Telegram ID to receive bus arrival notifications.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Send className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Link Telegram</h3>
        </div>
        
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Telegram Username or ID</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="@your_username"
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-800 dark:text-slate-100"
            />
            <button 
              onClick={handleSave}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${isSaved ? 'bg-emerald-500 text-white' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200'}`}
            >
              {isSaved ? <CheckCircle2 className="w-5 h-5" /> : 'Save'}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            className="w-full py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2"
            onClick={() => window.open(`https://t.me/SGBusProBot?start=setup`, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
            Open Telegram Bot
          </button>
        </div>
      </div>

      <div className="bg-slate-100/50 dark:bg-slate-900/30 p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-slate-400 dark:text-slate-600" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">Troubleshooting</h3>
        </div>
        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500">1</span>
            If you get <strong>Network Error</strong>, check if your VPN or AdBlocker is blocking access to the API.
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500">2</span>
            Ensure your 5-digit bus stop code is correct.
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-500">3</span>
            Type <strong>/start</strong> to the bot if alerts are not arriving.
          </li>
        </ul>
      </div>

      <div className="text-center py-4">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium uppercase tracking-[0.2em]">SG Bus Pro • Version 1.4.1 (Health Monitor)</p>
      </div>
    </div>
  );
};

export default SettingsPage;