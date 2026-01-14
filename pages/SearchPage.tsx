
import React, { useState, useEffect, useRef } from 'react';
import { Search, Heart, Loader2, X, MapPin } from 'lucide-react';
import { fetchBusArrival, fetchWeather, searchBusStops } from '../services/busApi';
import { BusStopArrivalResponse, FavoriteBusStop, WeatherResponse, FavoriteService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

const WeatherIndicator: React.FC<{ weather: WeatherResponse }> = ({ weather }) => {
  const isRaining = weather.rain_mm > 0 || weather.level !== 'NONE';
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight ${isRaining ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600'}`}>
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
  const searchTimeout = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
          setSearchResults(Array.isArray(json?.results) ? json.results : []);
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 350);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  }, [query]);

  const handleFetchArrivals = async (stopCode: string) => {
    setLoading(true);
    setData(null);
    setWeather(null);
    setSearchResults([]); 
    try {
      const arrivalRes = await fetchBusArrival(stopCode);
      setData(arrivalRes);
      try { setWeather(await fetchWeather(stopCode)); } catch {}
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const isFavorited = data ? favorites.some(f => f.code === data.busStopCode) : false;

  return (
    <div className="space-y-3 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />

      <div className="px-1 flex items-baseline justify-between">
        <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">Tracker Feed</h2>
      </div>

      <div className="relative" ref={containerRef}>
        <div className="relative">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Stop name or 5-digit code..."
            className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-bold"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />}
          {query && !searching && (
            <button onClick={() => { setQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto no-scrollbar">
              {searchResults.map((stop) => (
                <button
                  key={stop.busStopCode}
                  onClick={() => { setQuery(stop.busStopCode); handleFetchArrivals(stop.busStopCode); }}
                  className="w-full px-4 py-2 text-left border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase truncate">{stop.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">{stop.busStopCode} • {stop.road}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center py-10 gap-2">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-1 py-0.5 bg-emerald-500 text-[8px] font-black text-white rounded uppercase leading-none">Live</span>
                {weather && <WeatherIndicator weather={weather} />}
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 truncate leading-none uppercase tracking-tight">{data.busStopName}</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-none">{data.busStopCode} • {data.roadName}</p>
            </div>
            <button 
              onClick={() => toggleFavorite({ code: data.busStopCode, name: data.busStopName, road: data.roadName })}
              className={`p-2.5 rounded-lg transition-all shrink-0 active:scale-95 ${isFavorited ? 'bg-red-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
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
