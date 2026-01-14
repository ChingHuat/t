
import React, { useState, useEffect } from 'react';
import { Search, Heart, Loader2, AlertTriangle, RefreshCw, WifiOff, History } from 'lucide-react';
import { fetchBusArrival, fetchWeather } from '../services/busApi';
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
      
      // Update recents
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
    <div className="space-y-6">
      <ActiveAlertsBanner 
        activeAlerts={activeAlerts} 
        telegramId={telegramId} 
        onCancelAlert={onAlertChange} 
      />

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Where to?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Live Singapore bus arrivals at your fingertips.</p>
      </div>

      <div className="space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
          <input 
            type="text" 
            inputMode="numeric"
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Enter 5-digit stop code..."
            className="w-full pl-14 pr-4 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xl tracking-[0.2em] font-black text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-800 placeholder:tracking-normal placeholder:font-medium"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
        </form>

        {recents.length > 0 && !data && !loading && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <History className="w-4 h-4 text-slate-400 shrink-0" />
            {recents.map(r => (
              <button 
                key={r}
                onClick={() => { setQuery(r); handleSearch(r); }}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-colors shrink-0"
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500 animate-pulse" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 animate-pulse text-sm font-bold tracking-wide uppercase">Syncing Transit Data...</p>
        </div>
      )}

      {error && (
        <div className="p-8 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-3xl shadow-sm flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            {isNetworkError ? <WifiOff className="w-10 h-10 text-red-500" /> : <AlertTriangle className="w-10 h-10 text-red-500" />}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{isNetworkError ? 'Network Offline' : 'Invalid Code'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">{error}</p>
          </div>
          <button 
            onClick={() => handleSearch()}
            className="flex items-center justify-center gap-2 px-10 py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Search className="w-32 h-32 rotate-12" />
            </div>
            
            <div className="relative flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Terminal
                  </div>
                  {weather && <WeatherIndicator weather={weather} />}
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{data.busStopName}</h3>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-500 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-emerald-600 dark:text-emerald-400">{data.busStopCode}</span>
                  • {data.roadName}
                </p>
              </div>
              <button 
                onClick={() => toggleFavorite({ code: data.busStopCode, name: data.busStopName, road: data.roadName })}
                className={`p-4 rounded-2xl transition-all ${isFavorited ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 border border-slate-100 dark:border-slate-700'}`}
              >
                <Heart className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid gap-4">
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
              <div className="text-center py-20 px-6 bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-sm">No Active Services Detected</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
