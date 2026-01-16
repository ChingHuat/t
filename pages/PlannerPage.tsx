
import React, { useState } from 'react';
import { Navigation, Loader2, MapPin, Send, AlertCircle, Terminal, ChevronRight, Bus, Train, MoveRight, Clock, Footprints } from 'lucide-react';
import { fetchOneMapRoute } from '../services/oneMapService';

const JourneyPlanner: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handlePlanJourney = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Hardcoded sample coordinates: Orchard to Alexandra
      const start = '1.3081592,103.8551479';
      const end = '1.2739864,103.8012642';

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
    if (mode === 'SUBWAY' || mode === 'RAIL' || mode === 'TRAM') return `Take ${leg.route || 'Train'} towards ${leg.to.name}`;
    return `Travel to ${leg.to.name}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Input Section */}
      <div className="bg-[#111114] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-indigo-600/10 transition-colors" />
        
        <div className="flex items-center gap-4 relative">
          <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-600/20">
            <Navigation className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">OneMap Routing</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Journey Planner Engine</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-5 bg-black/40 border border-white/5 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Origin</p>
              <p className="text-xs font-bold text-slate-300 truncate tracking-tight">Orchard (1.308, 103.855)</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 bg-black/40 border border-white/5 rounded-2xl relative">
            <div className="absolute -top-4 left-[23px] w-px h-4 bg-slate-800" />
            <MapPin className="w-5 h-5 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Destination</p>
              <p className="text-xs font-bold text-slate-300 truncate tracking-tight">Alexandra (1.273, 103.801)</p>
            </div>
          </div>
        </div>

        <button
          onClick={handlePlanJourney}
          disabled={loading}
          className="w-full py-6 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.4em] text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Calculating Route...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Plan Journey
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
          <p className="text-sm font-bold text-rose-200 leading-tight">{error}</p>
        </div>
      )}

      {/* Visualization of Result */}
      {result && result.itineraries && result.itineraries.length > 0 && (
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

              {/* Transit Timeline */}
              <div className="space-y-0 relative">
                {itinerary.legs.map((leg: any, lIndex: number) => (
                  <div key={lIndex} className="relative pl-12 pb-8 last:pb-0">
                    {/* Vertical line connector */}
                    {lIndex < itinerary.legs.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-0 w-[2px] bg-gradient-to-b from-indigo-500/20 to-transparent" />
                    )}
                    
                    {/* Mode Icon Node */}
                    <div className="absolute left-0 top-0 w-10 h-10 bg-[#1a1a1e] border border-white/10 rounded-xl flex items-center justify-center z-10">
                      {getLegIcon(leg.mode)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-black text-white uppercase tracking-tight">
                          {getLegDescription(leg)}
                        </p>
                        <span className="text-[10px] font-bold text-slate-500">
                          {formatTime(leg.duration * 1000)}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        {leg.from.name} <MoveRight className="inline w-3 h-3 mx-1 opacity-30" /> {leg.to.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Collapsible Technical Metadata */}
              <details className="pt-6 border-t border-white/5">
                <summary className="cursor-pointer list-none flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-slate-400 transition-colors">
                  <Terminal className="w-3 h-3" />
                  Show Technical Telemetry
                </summary>
                <div className="mt-4 bg-black/60 p-6 rounded-2xl border border-white/10 overflow-x-auto shadow-inner">
                  <pre className="text-[10px] font-mono text-emerald-400/70 leading-relaxed whitespace-pre">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      {/* Placeholder if no result */}
      {!result && !loading && !error && (
        <div className="py-20 flex flex-col items-center justify-center opacity-10 text-center space-y-6">
           <Navigation className="w-16 h-16 text-white" />
           <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Ready for route acquisition...</p>
        </div>
      )}
    </div>
  );
};

export default JourneyPlanner;
