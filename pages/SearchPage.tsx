
import React, { useState, useEffect } from 'react';
import { Search, Heart, Loader2, AlertTriangle, RefreshCw, WifiOff, History } from 'lucide-react';
import { fetchBusArrival, fetchWeather } from '../services/busApi';
import { BusStopArrivalResponse, FavoriteBusStop, WeatherResponse, FavoriteService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

const WeatherIndicator: React.FC<{ weather: WeatherResponse }> = ({ weather }) => {
  const isRaining = weather.rain_mm > 0 || weather.level !== 'NONE';
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isRaining ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800'}`}>
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
  
  const [recents, setRecents] = useState<string[]>(() => {
    const saved = localStorage.getItem('sg_bus_recents');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sg_bus_recents', JSON.stringify(recents));
  }, [recents]);

  const handleSearch = async (targetQuery?: string) => {
    const q = targetQuery || query;
    if (!q || q.length < 5) return;

    setLoading(true);
    setError(null);
    setIsNetworkError(false);
    setData(null);
    setWeather(null);

    try {
      const arrivalRes = await fetchBusArrival(q);
      setData(arrivalRes);
      setRecents(prev => [q, ...prev.filter(r => r !== q)].slice(0, 5));
      try {
        const weatherRes = await fetchWeather(q);
        setWeather(weatherRes);
      } catch (wErr) {
        console.warn('Weather data fetch failed:', wErr);
      }
    } catch (err: any) {
      setError(err.message);
      setIsNetworkError(err.message.toLowerCase().includes('network') || err.message.toLowerCase().includes('reach'));
    } finally {
      setLoading(false);
    }
  };

  const isFavorited = data ? favorites.some(f => f.code === data.busStopCode) : false;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />

      <div className="md:mb-4">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Live Tracker</h2>
        <p className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.2em] mt-0.5">Satellite Synced</p>
      </div>

      <div className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group max-w-md">
          <input 
            type="text" 
            inputMode="numeric"
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Search Stop Code..."
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-lg font-black text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 placeholder:font-bold"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
        </form>

        {recents.length > 0 && !data && !loading && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar px-1">
            <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {recents.map(r => (
              <button 
                key={r}
                onClick={() => { setQuery(r); handleSearch(r); }}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-500 transition-all"
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-[9px] font-black tracking-widest uppercase animate-pulse">Syncing...</p>
        </div>
      )}

      {error && (
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col items-center gap-4 text-center max-w-md mx-auto">
          <WifiOff className="w-8 h-8 text-red-500" />
          <div className="space-y-1">
            <h3 className="text-md font-black text-slate-800 dark:text-slate-100 uppercase">Search Error</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{error}</p>
          </div>
          <button onClick={() => handleSearch()} className="px-8 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-xl font-black text-xs uppercase">Retry Sync</button>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Compact Station Header Card */}
          <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-row items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex px-2 py-0.5 bg-emerald-500 rounded-md text-[8px] font-black text-white uppercase tracking-widest">
                  Live Station
                </span>
                {weather && <WeatherIndicator weather={weather} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight tracking-tight truncate">
                  {data.busStopName}
                </h3>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-2 truncate">
                  <span className="font-mono text-emerald-500 font-black">{data.busStopCode}</span>
                  <span className="opacity-50">•</span>
                  <span className="truncate">{data.roadName}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={() => toggleFavorite({ code: data.busStopCode, name: data.busStopName, road: data.roadName })}
              className={`p-4 rounded-xl transition-all shrink-0 ${isFavorited ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 border border-slate-100 dark:border-slate-700'}`}
            >
              <Heart className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              <div className="col-span-full text-center py-16 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Active Services</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
