
import React, { useState, useEffect, useRef } from 'react';
import { Search, Heart, Loader2, RefreshCw, WifiOff, History, MapPin, Navigation, X, Trash2 } from 'lucide-react';
import { fetchBusArrival, fetchWeather, searchBusStops } from '../services/busApi';
import { BusStopArrivalResponse, FavoriteBusStop, WeatherResponse, FavoriteService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

const WeatherIndicator: React.FC<{ weather: WeatherResponse }> = ({ weather }) => {
  const isRaining = weather.rain_mm > 0 || weather.level !== 'NONE';
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest ${isRaining ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800'}`}>
      {isRaining ? '🌧️ RAIN' : '☀️ CLEAR'}
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
  const searchTimeout = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [recents, setRecents] = useState<string[]>(() => {
    const saved = localStorage.getItem('sg_bus_recents');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sg_bus_recents', JSON.stringify(recents));
  }, [recents]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);

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
    setData(null);
    setWeather(null);
    setSearchResults([]); 

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

  const isFavorited = data ? favorites.some(f => f.code === data.busStopCode) : false;

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />

      <div className="px-1">
        <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">Live Tracker</h2>
        <p className="text-[10px] md:text-xs font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.3em] mt-1.5">Satellite Sync active</p>
      </div>

      <div className="space-y-5 relative" ref={containerRef}>
        <form onSubmit={handleFormSubmit} className="relative group">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stops or codes..."
            className="w-full pl-14 pr-14 py-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[1.5rem] shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-base md:text-xl font-bold text-slate-900 dark:text-slate-100"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-400" />
          
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searching && <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />}
            {query && !searching && (
              <button 
                type="button"
                onClick={() => { setQuery(''); setSearchResults([]); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </form>

        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-[100] mt-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="max-h-[50vh] overflow-y-auto no-scrollbar py-1">
              {searchResults.map((stop) => (
                <button
                  key={stop.busStopCode}
                  onClick={() => {
                    setQuery(stop.busStopCode);
                    handleFetchArrivals(stop.busStopCode);
                  }}
                  className="w-full px-6 py-4 text-left border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:bg-emerald-100 transition-colors">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight truncate uppercase tracking-tight">
                        {stop.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <span className="truncate">{stop.road}</span>
                        <span className="opacity-30">•</span>
                        <span className="font-mono text-emerald-600 font-black tracking-widest">{stop.busStopCode}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {recents.length > 0 && !data && !loading && !searchResults.length && (
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <History className="w-4 h-4 text-slate-400 shrink-0" />
              {recents.map(r => (
                <button 
                  key={r}
                  onClick={() => { setQuery(r); handleFetchArrivals(r); }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  {r}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setRecents([])}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Uplinking...</p>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-5 duration-700">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-row items-center justify-between gap-6">
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-emerald-500 rounded-lg text-[9px] font-black text-white uppercase tracking-widest">Active Terminal</span>
                {weather && <WeatherIndicator weather={weather} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-slate-100 leading-none tracking-tighter truncate">
                  {data.busStopName}
                </h3>
                <p className="text-xs md:text-base font-bold text-slate-500 mt-2 flex items-center gap-3 truncate uppercase tracking-tight">
                  <span className="font-mono text-emerald-500 font-black tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg">{data.busStopCode}</span>
                  <span className="opacity-30">•</span>
                  <span className="truncate">{data.roadName}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={() => toggleFavorite({ code: data.busStopCode, name: data.busStopName, road: data.roadName })}
              className={`p-6 md:p-8 rounded-[1.75rem] transition-all shrink-0 active:scale-90 ${isFavorited ? 'bg-red-500 text-white shadow-xl shadow-red-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}
            >
              <Heart className={`w-8 h-8 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {data.services.map((service) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
