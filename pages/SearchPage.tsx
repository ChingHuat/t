
import React, { useState, useEffect, useRef } from 'react';
import { Search, Heart, Loader2, X, MapPin, Scan } from 'lucide-react';
import { fetchBusArrival, searchBusStops } from '../services/busApi';
import { BusStopArrivalResponse, FavoriteBusStop, FavoriteService } from '../types';
import ServiceRow from '../components/ServiceRow';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

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
    setLoading(true); setData(null); setSearchResults([]); 
    try {
      const arrivalRes = await fetchBusArrival(stopCode);
      setData(arrivalRes);
    } catch {} finally { setLoading(false); }
  };

  const isFavorited = data ? favorites.some(f => f.code === data.busStopCode) : false;

  return (
    <div className="space-y-16 animate-in fade-in duration-500 max-w-5xl mx-auto pb-16">
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />

      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="w-full max-w-3xl px-3 flex items-center gap-4">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
               <Scan className="w-4 h-4 text-emerald-500" />
            </div>
            <h2 className="text-[12px] font-[1000] text-emerald-500 tracking-[0.4em] uppercase">Fleet Scanner</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
          </div>
        </div>

        <div className="relative flex justify-center" ref={containerRef}>
          <div className="relative w-full max-w-3xl px-3">
            <div className="relative group">
              <input 
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Station ID or Keyword..."
                className="w-full pl-14 pr-14 py-6 bg-[#0f172a]/60 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-sm font-black tracking-widest text-white placeholder:text-slate-700"
                onKeyDown={(e) => e.key === 'Enter' && /^\d{5}$/.test(query.trim()) && handleFetchArrivals(query.trim())}
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
              {searching && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 animate-spin" />}
              {query && !searching && (
                <button onClick={() => { setQuery(''); setSearchResults([]); }} className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-3 right-3 z-50 mt-4 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden">
                <div className="max-h-80 overflow-y-auto no-scrollbar py-2">
                  {searchResults.map((stop) => (
                    <button key={stop.busStopCode} onClick={() => { setQuery(stop.busStopCode); handleFetchArrivals(stop.busStopCode); }}
                      className="w-full px-6 py-4 text-left border-b border-white/5 hover:bg-emerald-500/10 flex items-center justify-between group transition-all">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-[1000] text-white uppercase tracking-tight group-hover:text-emerald-400 truncate">{stop.name}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2 group-hover:text-slate-400">{stop.busStopCode} • {stop.road}</p>
                      </div>
                      <MapPin className="w-5 h-5 text-slate-700 group-hover:text-emerald-500 ml-4 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-24">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-6 animate-pulse">Establishing Connection</p>
        </div>
      )}

      {data && (
        <div className="flex flex-col animate-in slide-in-from-bottom-6 duration-500">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-3xl px-3 flex items-center min-h-[4rem] mb-6 pt-6">
              {/* Left Rail (Fixed 80px to match rows) */}
              <div className="w-[80px] shrink-0 flex items-center justify-center">
                <span className="text-[10px] font-black bg-slate-900 text-emerald-500 px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] tracking-tighter">
                  {data.busStopCode}
                </span>
              </div>
              {/* Center Content (Flex-1) */}
              <div className="flex-1 px-2 min-w-0 flex flex-col justify-center items-center text-center">
                <h3 className={`font-[1000] text-white uppercase truncate leading-tight w-full ${data.busStopName.length > 25 ? 'text-[11px]' : 'text-[14px]'}`}>
                  {data.busStopName}
                </h3>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] truncate mt-1.5 opacity-60 leading-none w-full">{data.roadName}</p>
              </div>
              {/* Right Rail (Fixed 80px to match rows) */}
              <div className="w-[80px] shrink-0 flex items-center justify-center">
                <button 
                  onClick={() => toggleFavorite({ code: data.busStopCode, name: data.busStopName, road: data.roadName })}
                  className={`w-11 h-11 flex items-center justify-center rounded-[1.2rem] transition-all active:scale-90 ${isFavorited ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-slate-900 text-slate-500 border border-white/10'}`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
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
