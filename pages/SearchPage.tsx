
import React, { useState, useEffect, useRef } from 'react';
import { Search, Heart, Loader2, X, MapPin } from 'lucide-react';
import { fetchBusArrival, fetchWeather, searchBusStops } from '../services/busApi';
import { BusStopArrivalResponse, FavoriteBusStop, WeatherResponse, FavoriteService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

const WeatherIndicator: React.FC<{ weather: WeatherResponse }> = ({ weather }) => {
  const isRaining = weather.rain_mm > 0 || weather.level !== 'NONE';
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight ${isRaining ? 'bg-blue-900/40 text-blue-400 border border-blue-500/20' : 'bg-orange-900/40 text-orange-400 border border-orange-500/20'}`}>
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
    const trimmed = query.trim();
    if (trimmed.length >= 2 && !/^\d{5}$/.test(trimmed)) {
      setSearching(true);
      searchTimeout.current = window.setTimeout(async () => {
        try {
          const json = await searchBusStops(trimmed);
          setSearchResults(Array.isArray(json?.results) ? json.results : []);
        } catch { setSearchResults([]); } finally { setSearching(false); }
      }, 350);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  }, [query]);

  const handleFetchArrivals = async (stopCode: string) => {
    setLoading(true); setData(null); setWeather(null); setSearchResults([]); 
    try {
      const arrivalRes = await fetchBusArrival(stopCode);
      setData(arrivalRes);
      try { setWeather(await fetchWeather(stopCode)); } catch {}
    } catch {} finally { setLoading(false); }
  };

  const isFavorited = data ? favorites.some(f => f.code === data.busStopCode) : false;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto pb-12">
      <div className="mx-2 md:mx-0">
        <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />
      </div>

      <div className="space-y-4 px-2 md:px-0">
        <div className="px-1 flex items-baseline justify-between mb-2">
          <h2 className="text-[10px] font-black text-amber-500 tracking-[0.2em] uppercase">Transit Search</h2>
        </div>
        <div className="relative" ref={containerRef}>
          <div className="relative">
            <input 
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Stop name or 5-digit code..."
              className="w-full pl-10 pr-10 py-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm font-black tracking-tight text-slate-100 placeholder:text-slate-600"
              onKeyDown={(e) => e.key === 'Enter' && /^\d{5}$/.test(query.trim()) && handleFetchArrivals(query.trim())}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />}
            {query && (
              <button onClick={() => { setQuery(''); setSearchResults([]); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:bg-slate-800 rounded-lg">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto no-scrollbar">
                {searchResults.map((stop) => (
                  <button key={stop.busStopCode} onClick={() => { setQuery(stop.busStopCode); handleFetchArrivals(stop.busStopCode); }}
                    className="w-full px-4 py-3.5 text-left border-b border-slate-800/50 hover:bg-emerald-900/10 flex items-center justify-between group transition-colors">
                    <div>
                      <p className="text-[11px] font-[1000] text-slate-100 uppercase tracking-tight group-hover:text-emerald-400">{stop.name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-1.5">{stop.busStopCode} • {stop.road}</p>
                    </div>
                    <MapPin className="w-4 h-4 text-slate-700 group-hover:text-emerald-500" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-16"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div>
      )}

      {data && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden mx-2 md:mx-0">
          <div className="flex items-center min-h-[4rem] bg-slate-800/20">
            <div className="w-20 shrink-0 flex items-center justify-center">
              <span className="text-[10px] font-[1000] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 tracking-tighter">
                {data.busStopCode}
              </span>
            </div>
            <div className="flex-1 px-4 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-[1000] text-[13px] text-slate-100 uppercase tracking-tighter truncate">{data.busStopName}</h3>
                {weather && <WeatherIndicator weather={weather} />}
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide truncate">{data.roadName}</p>
            </div>
            <div className="pr-3 shrink-0">
              <button 
                onClick={() => toggleFavorite({ code: data.busStopCode, name: data.busStopName, road: data.roadName })}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isFavorited ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700/50'}`}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            {data.services.map(s => (
              <ServiceRow 
                key={s.ServiceNo} service={s} busStopCode={data.busStopCode} telegramId={telegramId}
                alertId={activeAlerts[`${data.busStopCode}-${s.ServiceNo}`]}
                onAlertChange={(aid) => onAlertChange(data.busStopCode, s.ServiceNo, aid)}
                isPinned={pinnedServices.some(p => p.busStopCode === data.busStopCode && p.serviceNo === s.ServiceNo)}
                onPinToggle={() => togglePinnedService({ busStopCode: data.busStopCode, busStopName: data.busStopName, serviceNo: s.ServiceNo })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
