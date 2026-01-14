
import React, { useState, useEffect, useRef } from 'react';
import { Search, Heart, Loader2, AlertTriangle, RefreshCw, WifiOff, History, MapPin, Navigation, X, Trash2 } from 'lucide-react';
import { fetchBusArrival, fetchWeather, searchBusStops } from '../services/busApi';
import { BusStopArrivalResponse, FavoriteBusStop, WeatherResponse, FavoriteService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

const WeatherIndicator: React.FC<{ weather: WeatherResponse }> = ({ weather }) => {
  const isRaining = weather.rain_mm > 0 || weather.level !== 'NONE';
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${isRaining ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800'}`}>
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
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [data, setData] = useState<BusStopArrivalResponse | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const searchTimeout = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [recents, setRecents] = useState<string[]>(() => {
    const saved = localStorage.getItem('sg_bus_recents');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sg_bus_recents', JSON.stringify(recents));
  }, [recents]);

  // Handle clicks outside the search container to hide the results list
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);

    // If query looks like a bus stop code, we don't necessarily need to trigger search
    const isCode = /^\d{5}$/.test(query.trim());

    if (query.trim().length >= 2 && !isCode) {
      setSearching(true);
      searchTimeout.current = window.setTimeout(async () => {
        try {
          const json = await searchBusStops(query.trim());
          const results = Array.isArray(json?.results) ? json.results : [];
          setSearchResults(results);
        } catch (err) {
          console.error("Search failed", err);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 350);
    } else {
      setSearchResults([]);
      setSearching(false);
    }

    return () => {
      if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    };
  }, [query]);

  const handleFetchArrivals = async (stopCode: string) => {
    setLoading(true);
    setError(null);
    setIsNetworkError(false);
    setData(null);
    setWeather(null);
    setSearchResults([]); // Hide list after selection

    try {
      const arrivalRes = await fetchBusArrival(stopCode);
      setData(arrivalRes);
      setRecents(prev => [stopCode, ...prev.filter(r => r !== stopCode)].slice(0, 5));
      try {
        const weatherRes = await fetchWeather(stopCode);
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{5}$/.test(query.trim())) {
      handleFetchArrivals(query.trim());
    } else if (searchResults.length > 0) {
      const first = searchResults[0];
      setQuery(first.busStopCode);
      handleFetchArrivals(first.busStopCode);
    }
  };

  const clearRecents = () => {
    setRecents([]);
    localStorage.removeItem('sg_bus_recents');
  };

  const isFavorited = data ? favorites.some(f => f.code === data.busStopCode) : false;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />

      <div className="md:mb-2">
        <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Bus Stop Discovery</h2>
        <p className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.2em]">Real-time Satellite Feed</p>
      </div>

      <div className="space-y-4 relative" ref={containerRef}>
        <form onSubmit={handleFormSubmit} className="relative group">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stop name, road, or 5-digit code..."
            className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[1.25rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-base font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searching && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />}
            {query && !searching && (
              <button 
                type="button"
                onClick={() => { setQuery(''); setSearchResults([]); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </form>

        {/* Floating Search Results List */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-[100] mt-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="max-h-[50vh] overflow-y-auto no-scrollbar py-1">
              {searchResults.map((stop) => (
                <button
                  key={stop.busStopCode}
                  onClick={() => {
                    setQuery(stop.busStopCode);
                    handleFetchArrivals(stop.busStopCode);
                  }}
                  className="w-full px-5 py-4 text-left border-b border-slate-100 dark:border-slate-800/80 last:border-0 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight mb-0.5 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        {stop.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                        <span className="truncate">{stop.road}</span>
                        <span className="opacity-30">•</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black tracking-widest">{stop.busStopCode}</span>
                      </div>
                    </div>
                  </div>
                  <Navigation className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
            <div className="px-5 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Tap a location to view live data</p>
            </div>
          </div>
        )}

        {/* Recent Search History with Clear Button */}
        {recents.length > 0 && !data && !loading && !searchResults.length && (
          <div className="flex items-center justify-between px-1 pt-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {recents.map(r => (
                <button 
                  key={r}
                  onClick={() => { setQuery(r); handleFetchArrivals(r); }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all whitespace-nowrap"
                >
                  {r}
                </button>
              ))}
            </div>
            <button 
              onClick={clearRecents}
              className="ml-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
              title="Clear History"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-[9px] font-black tracking-[0.2em] uppercase animate-pulse">Establishing Live Link...</p>
        </div>
      )}

      {error && (
        <div className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm flex flex-col items-center gap-4 text-center max-w-sm mx-auto animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Sync Failed</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{error}</p>
          </div>
          <button onClick={() => handleFetchArrivals(query)} className="w-full py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all">Retry Uplink</button>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-5 animate-in slide-in-from-bottom-4 duration-700">
          {/* Station Header Card */}
          <div className="bg-white dark:bg-slate-900 p-5 md:px-8 md:py-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-row items-center justify-between gap-6">
            <div className="space-y-2.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex px-2 py-0.5 bg-emerald-500 rounded-lg text-[8px] font-black text-white uppercase tracking-widest leading-none shadow-sm shadow-emerald-500/20">
                  Live Station
                </span>
                {weather && <WeatherIndicator weather={weather} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight tracking-tight truncate">
                  {data.busStopName}
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2.5 truncate">
                  <span className="font-mono text-emerald-500 dark:text-emerald-400 font-black tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-md leading-none">{data.busStopCode}</span>
                  <span className="opacity-30">•</span>
                  <span className="truncate uppercase tracking-tight">{data.roadName}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={() => toggleFavorite({ code: data.busStopCode, name: data.busStopName, road: data.roadName })}
              className={`p-4 rounded-2xl transition-all shrink-0 active:scale-90 ${isFavorited ? 'bg-red-500 text-white shadow-xl shadow-red-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-700'}`}
            >
              <Heart className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="col-span-full text-center py-20 bg-slate-100/30 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Transmission Zero</p>
                  <p className="text-xs text-slate-500 dark:text-slate-600 font-bold">No active bus services reported at this time.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
