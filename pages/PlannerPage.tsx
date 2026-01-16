
import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Loader2, MapPin, Send, AlertCircle, Terminal, Search, Bus, Train, MoveRight, Clock, Footprints, Crosshair } from 'lucide-react';
import { fetchOneMapRoute, searchOneMapAddress } from '../services/oneMapService';

interface LocationResult {
  SEARCHVAL: string;
  LATITUDE: string;
  LONGITUDE: string;
  ADDRESS: string;
}

const JourneyPlanner: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Search state
  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState<LocationResult[]>([]);
  const [selectedDest, setSelectedDest] = useState<LocationResult | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<number | null>(null);

  // Geolocation state
  const [userCoords, setUserCoords] = useState<{lat: string, lng: string} | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    if (destQuery.length > 2 && !selectedDest) {
      setSearching(true);
      searchTimeout.current = window.setTimeout(async () => {
        try {
          const res = await searchOneMapAddress(destQuery);
          setDestSuggestions(res.results || []);
        } catch {
          setDestSuggestions([]);
        } finally {
          setSearching(false);
        }
      }, 500);
    } else {
      setDestSuggestions([]);
    }
  }, [destQuery, selectedDest]);

  const handleMyLocation = () => {
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude.toString(),
          lng: pos.coords.longitude.toString()
        });
        setGeoLoading(false);
      },
      () => {
        setError("Location permission denied. Please allow access or use a fixed start point.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handlePlanJourney = async () => {
    if (!selectedDest) {
      setError("Please select a destination from the search results.");
      return;
    }

    const start = userCoords ? `${userCoords.lat},${userCoords.lng}` : '1.3081592,103.8551479'; // Fallback to Orchard
    const end = `${selectedDest.LATITUDE},${selectedDest.LONGITUDE}`;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchOneMapRoute({
        start,
        end,
        routeType: 'pt',
        mode: 'TRANSIT',
        numItineraries: 1
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected routing error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const getLegIcon = (mode: string) => {
    switch (mode.toUpperCase()) {
      case 'WALK': return <Footprints className="w-5 h-5 text-amber-400" />;
      case 'BUS': return <Bus className="w-5 h-5 text-indigo-400" />;
      case 'SUBWAY':
      case 'TRAM':
      case 'RAIL': return <Train className="w-5 h-5 text-emerald-400" />;
      default: return <Navigation className="w-5 h-5 text-slate-400" />;
    }
  };

  const getLegDescription = (leg: any) => {
    const mode = leg.mode.toUpperCase();
    if (mode === 'WALK') return `Walk to ${leg.to.name || 'next stop'}`;
    if (mode === 'BUS') return `Take Bus ${leg.route} to ${leg.to.name}`;
    return `Take ${leg.route || 'Train'} to ${leg.to.name}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-[#111114] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[60px] rounded-full -mr-16 -mt-16" />
        
        <div className="flex items-center gap-4 relative">
          <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-600/20">
            <Navigation className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Smart Planner</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Real-time OneMap Routing</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Origin Section */}
          <div className="flex items-center gap-4 p-5 bg-black/40 border border-white/5 rounded-2xl relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${userCoords ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
              <div className={`w-2 h-2 rounded-full ${userCoords ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Origin</p>
              <p className="text-xs font-bold text-slate-300 truncate">
                {userCoords ? `Current Location (${parseFloat(userCoords.lat).toFixed(3)}, ${parseFloat(userCoords.lng).toFixed(3)})` : "Orchard (Default Start)"}
              </p>
            </div>
            <button 
              onClick={handleMyLocation}
              className={`p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-all active:scale-95 ${geoLoading ? 'animate-spin' : ''}`}
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Section */}
          <div className="space-y-2">
            <div className="relative group">
              <input 
                type="text" 
                value={destQuery}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  if (selectedDest) setSelectedDest(null);
                }}
                placeholder="Where to? (e.g. Marina Bay Sands)"
                className="w-full pl-12 pr-4 py-5 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm font-bold text-white placeholder:text-slate-600 shadow-inner"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
            </div>

            {/* Suggestions list */}
            {destSuggestions.length > 0 && !selectedDest && (
              <div className="bg-[#1c1c1f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto no-scrollbar">
                {destSuggestions.map((res, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setSelectedDest(res);
                      setDestQuery(res.SEARCHVAL);
                    }}
                    className="w-full text-left px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <p className="text-xs font-black text-white uppercase truncate group-hover:text-indigo-400">{res.SEARCHVAL}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 truncate">{res.ADDRESS}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handlePlanJourney}
          disabled={loading || !selectedDest}
          className="w-full py-6 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.4em] text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Mapping Route...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Plan Journey
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
          <p className="text-sm font-bold text-rose-200 leading-tight">{error}</p>
        </div>
      )}

      {result && result.itineraries && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8">
          {result.itineraries.map((itinerary: any, iIndex: number) => (
            <div key={iIndex} className="bg-[#111114] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Travel Time</h3>
                    <p className="text-lg font-black text-white">{formatTime(itinerary.duration * 1000)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Transfers</p>
                  <p className="text-lg font-black text-white">{itinerary.transfers || 0}</p>
                </div>
              </div>

              <div className="space-y-0 relative">
                {itinerary.legs.map((leg: any, lIndex: number) => (
                  <div key={lIndex} className="relative pl-12 pb-8 last:pb-0">
                    {lIndex < itinerary.legs.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-0 w-[2px] bg-gradient-to-b from-indigo-500/20 to-transparent" />
                    )}
                    <div className="absolute left-0 top-0 w-10 h-10 bg-[#1a1a1e] border border-white/10 rounded-xl flex items-center justify-center z-10">
                      {getLegIcon(leg.mode)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-black text-white uppercase tracking-tight">{getLegDescription(leg)}</p>
                        <span className="text-[10px] font-bold text-slate-500">{formatTime(leg.duration * 1000)}</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{leg.from.name} <MoveRight className="inline w-3 h-3 mx-1 opacity-30" /> {leg.to.name}</p>
                    </div>
                  </div>
                ))}
              </div>

              <details className="pt-6 border-t border-white/5">
                <summary className="cursor-pointer list-none flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
                  <Terminal className="w-3 h-3" />
                  View Route Data
                </summary>
                <div className="mt-4 bg-black/60 p-6 rounded-2xl border border-white/10 overflow-x-auto">
                  <pre className="text-[10px] font-mono text-emerald-400/70 whitespace-pre">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JourneyPlanner;
