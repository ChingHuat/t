
import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Loader2, MapPin, Send, AlertCircle, Bus, Train, MoveRight, Clock, Footprints, Crosshair, ArrowUpDown } from 'lucide-react';
import { fetchOneMapRoute, searchOneMapAddress, OneMapRouteParams } from '../services/oneMapService';
import JourneyResultCard from '../components/JourneyResultCard';

interface LocationResult {
  SEARCHVAL: string;
  LATITUDE: string;
  LONGITUDE: string;
  ADDRESS: string;
}

type JourneyMode = 'TRANSIT' | 'BUS' | 'RAIL';

const JourneyPlanner: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const [selectedMode, setSelectedMode] = useState<JourneyMode>('TRANSIT');

  const [originQuery, setOriginQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<LocationResult[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<LocationResult | null>(null);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const originSearchTimeout = useRef<number | null>(null);

  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState<LocationResult[]>([]);
  const [selectedDest, setSelectedDest] = useState<LocationResult | null>(null);
  const [searchingDest, setSearchingDest] = useState(false);
  const destSearchTimeout = useRef<number | null>(null);

  const [geoLoading, setGeoLoading] = useState(false);
  
  const resultsTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (originSearchTimeout.current) window.clearTimeout(originSearchTimeout.current);
    const trimmed = originQuery.trim();
    if (trimmed.length > 2 && !selectedOrigin) {
      setSearchingOrigin(true);
      originSearchTimeout.current = window.setTimeout(async () => {
        try {
          const res = await searchOneMapAddress(trimmed);
          setOriginSuggestions(res.results || []);
        } catch { setOriginSuggestions([]); } finally { setSearchingOrigin(false); }
      }, 400);
    } else { setOriginSuggestions([]); }
  }, [originQuery, selectedOrigin]);

  useEffect(() => {
    if (destSearchTimeout.current) window.clearTimeout(destSearchTimeout.current);
    const trimmed = destQuery.trim();
    if (trimmed.length > 2 && !selectedDest) {
      setSearchingDest(true);
      destSearchTimeout.current = window.setTimeout(async () => {
        try {
          const res = await searchOneMapAddress(trimmed);
          setDestSuggestions(res.results || []);
        } catch { setDestSuggestions([]); } finally { setSearchingDest(false); }
      }, 400);
    } else { setDestSuggestions([]); }
  }, [destQuery, selectedDest]);

  useEffect(() => {
    if (result && resultsTopRef.current) {
      resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const handleMyLocation = () => {
    setGeoLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedOrigin({ SEARCHVAL: "My Current Location", ADDRESS: "GPS Position", LATITUDE: pos.coords.latitude.toString(), LONGITUDE: pos.coords.longitude.toString() });
        setOriginQuery("My Current Location");
        setGeoLoading(false);
      },
      () => { setError("Location access denied."); setGeoLoading(false); },
      { enableHighAccuracy: true }
    );
  };

  const handleSwap = () => {
    const tempD = selectedDest; const tempDQ = destQuery;
    setSelectedDest(selectedOrigin); setDestQuery(originQuery);
    setSelectedOrigin(tempD); setOriginQuery(tempDQ);
  };

  const handlePlanJourney = async () => {
    if (!selectedOrigin || !selectedDest) {
      setError("Please select locations from the search dropdown.");
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const isPublicTransport = ['TRANSIT', 'BUS', 'RAIL'].includes(selectedMode);
      
      const routeParams: OneMapRouteParams = {
        start: `${selectedOrigin.LATITUDE},${selectedOrigin.LONGITUDE}`, 
        end: `${selectedDest.LATITUDE},${selectedDest.LONGITUDE}`,
        routeType: isPublicTransport ? 'pt' : 'walk',
        mode: isPublicTransport ? selectedMode : undefined,
        maxWalkDistance: 1000
      };
      
      const response = await fetchOneMapRoute(routeParams);

      const ptItineraries = response.data?.plan?.itineraries;

      if (isPublicTransport && ptItineraries && ptItineraries.length > 0) {
        setResult(response);
        setError(null);
      } else if (!isPublicTransport && response.data?.route_summary) {
        const summary = response.data.route_summary;
        const synthesizedItinerary = {
          duration: summary.total_time,
          walkDistance: summary.total_distance,
          fare: 0,
          startTime: Date.now(),
          legs: [{ mode: 'WALK', distance: summary.total_distance, duration: summary.total_time, from: { name: 'Origin' }, to: { name: 'Destination' } }]
        };
        setResult({ data: { plan: { itineraries: [synthesizedItinerary] } } });
        setError(null);
      } else {
        setResult(null);
        setError(response.error || "No viable route found.");
      }

    } catch (err: any) { 
        setError(err.message); 
        setResult(null);
    } finally { 
        setLoading(false); 
    }
  };

  const itineraries = result?.data?.plan?.itineraries || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-40">
      
      <div ref={resultsTopRef} className="space-y-4">
        {itineraries.length > 0 && (
          <div className="space-y-3">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-2 mb-4">Journey Options</p>
             {itineraries.map((itinerary: any, idx: number) => (
                <JourneyResultCard key={idx} itinerary={itinerary} />
             ))}
          </div>
        )}
      </div>

      <div className="bg-[#121215] p-6 rounded-[2rem] border border-white/5 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[60px] rounded-full -mr-16 -mt-16" />
        
        <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-600/5">
                <Navigation className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Trip Planner</h2>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Real-time Transit Engine</p>
            </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar relative z-10">
          {(['TRANSIT', 'BUS', 'RAIL'] as JourneyMode[]).map((mode) => (
            <button key={mode} onClick={() => setSelectedMode(mode)} className={`flex-1 min-w-[70px] py-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${selectedMode === mode ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-slate-500'}`}>
              {mode === 'TRANSIT' ? <Navigation className="w-4 h-4" /> : mode === 'BUS' ? <Bus className="w-4 h-4" /> : <Train className="w-4 h-4" />}
              <span className="text-[7px] font-black uppercase tracking-widest">{mode}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1 relative z-10">
          <div className="relative">
            <input type="text" value={originQuery} onChange={(e) => { setOriginQuery(e.target.value); setSelectedOrigin(null); }} placeholder="From: Start point..." className="w-full pl-10 pr-12 py-4 bg-[#1a1a1e] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/40 transition-all text-xs font-bold text-white placeholder:text-slate-700" />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full border-2 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            </div>
            <button onClick={handleMyLocation} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-600 hover:text-indigo-400 transition-colors">{geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}</button>
            {originSuggestions.length > 0 && !selectedOrigin && (
              <div className="absolute top-full left-0 right-0 z-[60] mt-2 bg-[#1c1c21] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto no-scrollbar">
                {originSuggestions.map((res, i) => (
                  <button key={i} onClick={() => { setSelectedOrigin(res); setOriginQuery(res.SEARCHVAL); }} className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5">
                    <p className="text-[10px] font-black text-white uppercase truncate">{res.SEARCHVAL}</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 truncate">{res.ADDRESS}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end pr-8 -my-2 relative z-20">
            <button onClick={handleSwap} className="w-8 h-8 bg-[#121215] border border-white/10 rounded-full flex items-center justify-center text-slate-500 hover:text-white shadow-xl active:scale-90 transition-all"><ArrowUpDown className="w-3.5 h-3.5" /></button>
          </div>
          <div className="relative">
            <input type="text" value={destQuery} onChange={(e) => { setDestQuery(e.target.value); setSelectedDest(null); }} placeholder="To: Destination..." className="w-full pl-10 pr-4 py-4 bg-[#1a1a1e] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/40 transition-all text-xs font-bold text-white placeholder:text-slate-700" />
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><MapPin className="w-3.5 h-3.5 text-rose-500" strokeWidth={3} /></div>
            {destSuggestions.length > 0 && !selectedDest && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-[#1c1c21] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto no-scrollbar">
                {destSuggestions.map((res, i) => (
                  <button key={i} onClick={() => { setSelectedDest(res); setDestQuery(res.SEARCHVAL); }} className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5">
                    <p className="text-[10px] font-black text-white uppercase truncate">{res.SEARCHVAL}</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 truncate">{res.ADDRESS}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button onClick={handlePlanJourney} disabled={loading || !destQuery || !originQuery} className="w-full py-5 bg-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2 relative z-10">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Plan Journey</>}
        </button>
      </div>

      {error && (
        <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 mx-1 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-xs font-bold text-rose-100 leading-tight">{error}</p>
        </div>
      )}
    </div>
  );
};

export default JourneyPlanner;
