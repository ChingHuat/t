
import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Loader2, ArrowRight } from 'lucide-react';
import { searchBusStops } from '../services/busApi';
import { FavoriteBusStop, FavoriteService } from '../types';
import StationCard from '../components/StationCard';

interface SearchPageProps {
  favorites: FavoriteBusStop[];
  pinnedServices: FavoriteService[];
  toggleFavorite: (stop: FavoriteBusStop) => void;
  togglePinnedService: (pinned: FavoriteService) => void;
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ 
  favorites, pinnedServices, toggleFavorite, togglePinnedService, 
  telegramId, activeAlerts, onAlertChange 
}) => {
  const [query, setQuery] = useState('');
  const [loadingResult, setLoadingResult] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeStop, setActiveStop] = useState<FavoriteBusStop | null>(null);
  const searchTimeout = useRef<number | null>(null);

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

  const handleSelectStop = (stop: any) => {
    setActiveStop({ code: stop.busStopCode, name: stop.name, road: stop.road });
    setSearchResults([]);
    setQuery('');
  };

  const handleQuickFetch = (code: string) => {
    if (/^\d{5}$/.test(code)) {
      setActiveStop({ code, name: `Bus Stop ${code}`, road: '' });
      setSearchResults([]);
      setQuery('');
    }
  };

  const isFav = activeStop ? favorites.some(f => f.code === activeStop.code) : false;

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <div className="mb-10 px-1">
        <h2 className="text-4xl font-black tracking-tighter text-white uppercase">Discovery</h2>
        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-3">Node Acquisition</p>
      </div>

      <div className="relative mb-12 px-1">
        <div className="relative group">
          <input 
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Hub or Stop ID..."
            className="w-full pl-14 pr-12 py-6 bg-[#18181b] border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-lg font-bold text-white placeholder:text-slate-600 shadow-xl"
            onKeyDown={(e) => e.key === 'Enter' && handleQuickFetch(query.trim())}
          />
          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-all" />
          {searching && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin" />}
        </div>

        {searchResults.length > 0 && (
          <div className="absolute top-full left-1 right-1 z-30 mt-3 bg-[#1c1c1f] border border-white/15 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-4">
            {searchResults.map((stop) => (
              <button key={stop.busStopCode} onClick={() => handleSelectStop(stop)}
                className="w-full px-8 py-5 text-left border-b border-white/5 hover:bg-white/5 flex items-center justify-between group transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-black text-white uppercase tracking-tight truncate group-hover:text-indigo-400 transition-colors">{stop.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{stop.busStopCode} • {stop.road}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-500 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>

      {activeStop && (
        <div className="animate-in slide-in-from-bottom-8 duration-700 px-1">
           <div className="bg-[#121215] border border-white/5 rounded-[2rem] p-6 shadow-xl">
             <StationCard 
                stop={activeStop}
                pinnedServices={pinnedServices}
                toggleFavorite={() => toggleFavorite(activeStop)}
                isFavorite={isFav}
                onPinToggle={togglePinnedService}
                telegramId={telegramId}
                activeAlerts={activeAlerts}
                onAlertChange={onAlertChange}
                showTelemetryPulse={true}
             />
           </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
