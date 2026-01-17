
import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, Loader2, MapPin, Send, AlertCircle, Bug, Copy, X, Globe, ArrowRightLeft, Terminal, FileJson, Info, Search, ChevronRight
} from 'lucide-react';
import { searchAddresses } from '../services/busApi';
import { fetchBackendJourney, BackendError } from '../services/oneMapService';
import { JourneyResponse, Itinerary } from '../types';
import JourneyResultCard from '../components/JourneyResultCard';

interface AddressResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

type JourneyMode = 'bus' | 'mrt' | 'transit';

const JourneyPlanner: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[] | null>(null);
  const [selectedMode, setSelectedMode] = useState<JourneyMode>('transit');
  
  // Debug & Overlay States
  const [debugTrace, setDebugTrace] = useState<any>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Address Inputs
  const [originQuery, setOriginQuery] = useState('');
  const [originResults, setOriginResults] = useState<AddressResult[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<AddressResult | null>(null);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const originTimeout = useRef<number | null>(null);

  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState<AddressResult[]>([]);
  const [selectedDest, setSelectedDest] = useState<AddressResult | null>(null);
  const [searchingDest, setSearchingDest] = useState(false);
  const destTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (originTimeout.current) window.clearTimeout(originTimeout.current);
    const trimmed = originQuery.trim();
    if (trimmed.length >= 2 && !selectedOrigin) {
      setSearchingOrigin(true);
      originTimeout.current = window.setTimeout(async () => {
        try {
          const res = await searchAddresses(trimmed);
          setOriginResults(res.results || []);
        } catch { setOriginResults([]); } finally { setSearchingOrigin(false); }
      }, 300);
    } else { setOriginResults([]); setSearchingOrigin(false); }
  }, [originQuery, selectedOrigin]);

  useEffect(() => {
    if (destTimeout.current) window.clearTimeout(destTimeout.current);
    const trimmed = destQuery.trim();
    if (trimmed.length >= 2 && !selectedDest) {
      setSearchingDest(true);
      destTimeout.current = window.setTimeout(async () => {
        try {
          const res = await searchAddresses(trimmed);
          setDestResults(res.results || []);
        } catch { setDestResults([]); } finally { setSearchingDest(false); }
      }, 300);
    } else { setDestResults([]); setSearchingDest(false); }
  }, [destQuery, selectedDest]);

  const handlePlanJourney = async () => {
    if (!selectedOrigin || !selectedDest) return;
    setLoading(true);
    setError(null);
    setItineraries(null);
    setDebugTrace(null);

    try {
      const result = await fetchBackendJourney({
        fromLat: selectedOrigin.lat,
        fromLng: selectedOrigin.lng,
        toLat: selectedDest.lat,
        toLng: selectedDest.lng,
        transport: selectedMode
      });
      
      setDebugTrace({
        status: 'SUCCESS',
        ...result.debug,
        payload: result.data
      });
      
      setItineraries(result.data.itineraries);
      setShowResults(true);
    } catch (err: any) {
      const msg = err.message || "Failed to establish route connection.";
      setError(msg);
      if (err instanceof BackendError) {
        setDebugTrace({ status: 'FAILURE', ...(err.debug || {}), error: err.message, payload: err.payload });
      } else {
        setDebugTrace({ status: 'FATAL', error: msg, timestamp: new Date().toISOString() });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearOrigin = () => { setOriginQuery(''); setSelectedOrigin(null); setOriginResults([]); };
  const handleClearDest = () => { setDestQuery(''); setSelectedDest(null); setDestResults([]); };

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="max-w-xl mx-auto px-4 pb-48 animate-in fade-in duration-500 relative">
      <div className="mb-10 px-1">
        <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Planner</h2>
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-3">Advanced Routing Engine</p>
      </div>

      {/* Network Trace Inspector (Modal) */}
      {showInspector && (
        <div className="fixed inset-0 z-[100] bg-[#050507]/98 backdrop-blur-3xl overflow-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
           <div className="max-w-2xl mx-auto px-6 py-12">
             <div className="flex justify-between items-center mb-12 sticky top-0 bg-[#050507]/60 py-4 z-10 border-b border-white/5">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-2xl ${debugTrace?.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    <Terminal className="w-6 h-6" />
                   </div>
                   <h3 className="text-xs font-black text-white uppercase tracking-widest">Network Inspector</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyToClipboard(debugTrace)} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
                    <Copy className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowInspector(false)} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
             </div>
             
             <div className="space-y-12 font-mono text-[11px] pb-24">
               <div className="bg-black/40 border border-white/5 p-6 rounded-2xl">
                 <p className="text-indigo-400 font-black mb-4 uppercase text-[9px]">Endpoint</p>
                 <p className="text-slate-200 break-all">{debugTrace?.url}</p>
               </div>
               <div>
                 <p className="text-slate-500 font-black mb-4 uppercase text-[9px]">Request Headers</p>
                 <pre className="text-indigo-300/80 bg-black/40 p-4 rounded-xl overflow-x-auto">{JSON.stringify(debugTrace?.requestHeaders, null, 2)}</pre>
               </div>
               <div>
                 <p className="text-slate-500 font-black mb-4 uppercase text-[9px]">Response JSON</p>
                 <pre className="text-slate-300 bg-black/40 p-4 rounded-xl overflow-x-auto">{JSON.stringify(debugTrace?.payload, null, 2)}</pre>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Results Overlay Page */}
      {showResults && itineraries && (
        <div className="fixed inset-0 z-[80] bg-[#070709] overflow-y-auto animate-in slide-in-from-right duration-500">
           <div className="max-w-xl mx-auto px-6 py-12 pb-32">
              <div className="flex justify-between items-start mb-12 sticky top-0 z-10 bg-[#070709]/80 backdrop-blur-md py-4 border-b border-white/5">
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Options</h3>
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-2">{itineraries.length} Routes Identified</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowInspector(true)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    <Bug className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowResults(false)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {itineraries.map((it, i) => (
                  <div key={i} className="animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="mb-2 px-2 flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded bg-indigo-600/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Option 0{i+1}</div>
                      {i === 0 && <div className="px-2 py-0.5 rounded bg-emerald-600/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">Recommended</div>}
                    </div>
                    <JourneyResultCard itinerary={it} />
                  </div>
                ))}
              </div>

              <div className="mt-12 p-8 bg-indigo-600/5 border border-white/5 rounded-[2.5rem] flex items-start gap-4">
                 <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                 <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                   Telemetry is real-time. Fares and ETAs are subject to change based on actual LTA and SMRT conditions. Use the Bug icon above to see raw JSON.
                 </p>
              </div>
           </div>
        </div>
      )}

      {/* Inputs View */}
      <div className="space-y-4 mb-8">
        <div className="relative">
           <div className={`relative transition-all duration-300 ${selectedOrigin ? 'opacity-40 grayscale' : ''}`}>
              <input 
                type="text" value={originQuery} onChange={(e) => setOriginQuery(e.target.value)}
                placeholder={selectedOrigin ? selectedOrigin.name : "Starting Point..."}
                disabled={!!selectedOrigin}
                className="w-full pl-14 pr-12 py-5 bg-[#18181b] border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm font-bold text-white placeholder:text-slate-700 shadow-xl"
              />
              <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
              {searchingOrigin && <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
           </div>
           {selectedOrigin && (
              <button onClick={handleClearOrigin} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-rose-500">
                <X className="w-4 h-4" />
              </button>
           )}
           {!selectedOrigin && originResults.length > 0 && (
             <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-[#1c1c1f] border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto no-scrollbar">
                {originResults.map((res, i) => (
                  <button key={i} onClick={() => { setSelectedOrigin(res); setOriginQuery(res.name); setOriginResults([]); }} className="w-full px-6 py-4 text-left border-b border-white/5 hover:bg-white/5 text-xs font-bold text-slate-300 flex items-center gap-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-700" />
                    <span className="truncate">{res.name}</span>
                  </button>
                ))}
             </div>
           )}
        </div>

        <div className="relative">
           <div className={`relative transition-all duration-300 ${selectedDest ? 'opacity-40 grayscale' : ''}`}>
              <input 
                type="text" value={destQuery} onChange={(e) => setDestQuery(e.target.value)}
                placeholder={selectedDest ? selectedDest.name : "Destination..."}
                disabled={!!selectedDest}
                className="w-full pl-14 pr-12 py-5 bg-[#18181b] border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all text-sm font-bold text-white placeholder:text-slate-700 shadow-xl"
              />
              <Navigation className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
              {searchingDest && <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />}
           </div>
           {selectedDest && (
              <button onClick={handleClearDest} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-rose-500">
                <X className="w-4 h-4" />
              </button>
           )}
           {!selectedDest && destResults.length > 0 && (
             <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-[#1c1c1f] border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto no-scrollbar">
                {destResults.map((res, i) => (
                  <button key={i} onClick={() => { setSelectedDest(res); setDestQuery(res.name); setDestResults([]); }} className="w-full px-6 py-4 text-left border-b border-white/5 hover:bg-white/5 text-xs font-bold text-slate-300 flex items-center gap-3">
                    <Navigation className="w-3.5 h-3.5 text-slate-700" />
                    <span className="truncate">{res.name}</span>
                  </button>
                ))}
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {(['transit', 'bus', 'mrt'] as JourneyMode[]).map(mode => (
          <button 
            key={mode} 
            onClick={() => setSelectedMode(mode)}
            className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
              selectedMode === mode ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-[#18181b] border-white/5 text-slate-500 hover:border-white/20'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <button 
        onClick={handlePlanJourney}
        disabled={loading || !selectedOrigin || !selectedDest}
        className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] transition-all active:scale-95 flex items-center justify-center gap-3"
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5" /> Execute Plan</>}
      </button>

      {error && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl mb-12 animate-in shake">
           <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Plan Failed</p>
                <p className="text-[13px] font-bold text-white mt-0.5">{error}</p>
              </div>
           </div>
           <button 
             onClick={() => setShowInspector(true)}
             className="w-full py-3 bg-white/5 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest border border-white/10 hover:text-white transition-colors flex items-center justify-center gap-2"
           >
             <Bug className="w-3.5 h-3.5" /> Inspect Network Request
           </button>
        </div>
      )}
    </div>
  );
};

export default JourneyPlanner;
