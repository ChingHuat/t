
import React, { useState } from 'react';
import { Search, Heart, Loader2, Info, MessageSquare, AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { fetchBusArrival, fetchWeather } from '../services/busApi';
import { getSmartTransitAdvice } from '../services/geminiService';
import { BusStopArrivalResponse, FavoriteBusStop, WeatherResponse, FavoriteService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

const WeatherIndicator: React.FC<{ weather: WeatherResponse }> = ({ weather }) => {
  const isRaining = weather.rain_mm > 0 || weather.level !== 'NONE';
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${isRaining ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
      {isRaining ? '🌧️ Rain' : '☀️ Sunny'}
    </div>
  );
};

interface SearchPageProps {
  favorites: FavoriteBusStop[];
  pinnedServices: FavoriteService[];
  toggleFavorite: (stop: FavoriteBusStop) => void;
  togglePinnedService: (pinned: FavoriteService) => void;
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ favorites, pinnedServices, toggleFavorite, togglePinnedService, telegramId, activeAlerts, onAlertChange }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BusStopArrivalResponse | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query || query.length < 5) return;

    setLoading(true);
    setError(null);
    setIsNetworkError(false);
    setData(null);
    setWeather(null);
    setAiAdvice(null);

    try {
      const arrivalRes = await fetchBusArrival(query);
      setData(arrivalRes);
      
      try {
        const weatherRes = await fetchWeather(query);
        setWeather(weatherRes);
      } catch (wErr) {
        console.warn('Weather data fetch failed:', wErr);
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      setError(err.message);
      setIsNetworkError(err.message.toLowerCase().includes('network') || err.message.toLowerCase().includes('reach'));
    } finally {
      setLoading(false);
    }
  };

  const isFavorited = data ? favorites.some(f => f.code === data.busStopCode) : false;

  const getAIHelp = async () => {
    if (!data) return;
    setAiLoading(true);
    try {
      const context = `Bus Stop ${data.busStopName} (${data.busStopCode}). Services: ${data.services.map(s => `${s.ServiceNo} (ETA: ${s.eta}m)`).join(', ')}. Weather: ${weather?.level || 'Unknown'}`;
      const advice = await getSmartTransitAdvice("What is the quickest way to get moving from here?", context);
      setAiAdvice(advice || "I'm having trouble thinking right now.");
    } catch (e) {
      setAiAdvice("AI advice unavailable. Please try again later.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ActiveAlertsBanner 
        activeAlerts={activeAlerts} 
        telegramId={telegramId} 
        onCancelAlert={onAlertChange} 
      />

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Where to?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Enter a 5-digit bus stop code to see live timings.</p>
      </div>

      <form onSubmit={handleSearch} className="relative group">
        <input 
          type="text" 
          inputMode="numeric"
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="e.g. 64619"
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-lg tracking-widest font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
      </form>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 animate-pulse text-sm font-medium">Connecting to transit network...</p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-2xl shadow-sm flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            {isNetworkError ? <WifiOff className="w-7 h-7 text-red-500" /> : <AlertTriangle className="w-7 h-7 text-red-500" />}
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{isNetworkError ? 'Connection Issue' : 'Search Error'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">{error}</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-[200px]">
            <button 
              onClick={() => handleSearch()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Station
                  </div>
                  {weather && <WeatherIndicator weather={weather} />}
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{data.busStopName}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-slate-600 dark:text-slate-400">{data.busStopCode}</span>
                  • {data.roadName}
                </p>
              </div>
              <button 
                onClick={() => toggleFavorite({ code: data.busStopCode, name: data.busStopName, road: data.roadName })}
                className={`p-3 rounded-full transition-all ${isFavorited ? 'bg-red-50 dark:bg-red-900/30 text-red-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500'}`}
              >
                <Heart className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>
            
            <div className="mt-4 flex gap-2">
               <button 
                onClick={getAIHelp}
                disabled={aiLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-semibold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50 transition-colors"
               >
                 {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                 Ask Smart Advisor
               </button>
            </div>
          </div>

          {aiAdvice && (
            <div className="p-4 bg-white dark:bg-slate-900 border-l-4 border-emerald-500 rounded-r-2xl shadow-sm text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic animate-in fade-in zoom-in-95 duration-300">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase mb-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Transit Expert Insight
              </div>
              {aiAdvice}
            </div>
          )}

          <div className="grid gap-3">
            {data.services.length > 0 ? (
              data.services.map((service) => (
                <ServiceRow 
                  key={service.ServiceNo} 
                  service={service} 
                  busStopCode={data.busStopCode}
                  telegramId={telegramId}
                  alertId={activeAlerts[`${data.busStopCode}-${service.ServiceNo}`]}
                  onAlertChange={(aid) => onAlertChange(data.busStopCode, service.ServiceNo, aid)}
                  isPinned={pinnedServices.some(p => p.busStopCode === data.busStopCode && p.serviceNo === service.ServiceNo)}
                  onPinToggle={() => togglePinnedService({ busStopCode: data.busStopCode, busStopName: data.busStopName, serviceNo: service.ServiceNo })}
                />
              ))
            ) : (
              <div className="text-center py-12 px-6 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 dark:text-slate-600 font-medium">No active bus services found for this stop.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
