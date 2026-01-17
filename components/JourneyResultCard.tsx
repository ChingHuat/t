
import React, { useState, useMemo } from 'react';
import { Bus, Train, Footprints, ChevronRight, ChevronDown, ChevronUp, Clock, DollarSign } from 'lucide-react';
import { JourneyStep } from '../types';

interface JourneyResultCardProps {
  itinerary: any; 
}

// Helper to map line names to Singapore MRT codes and colors
const getMrtInfo = (serviceName: string = "") => {
  const name = serviceName.toUpperCase();
  if (name.includes('NORTH SOUTH')) return { code: 'NS', color: 'bg-[#ee2e24]' };
  if (name.includes('EAST WEST')) return { code: 'EW', color: 'bg-[#00953a]' };
  if (name.includes('NORTH EAST')) return { code: 'NE', color: 'bg-[#9900aa]' };
  if (name.includes('CIRCLE')) return { code: 'CC', color: 'bg-[#ff9a00]' };
  if (name.includes('DOWNTOWN')) return { code: 'DT', color: 'bg-[#0054a6]' };
  if (name.includes('THOMSON')) return { code: 'TE', color: 'bg-[#9d5b25]' };
  return { code: 'MRT', color: 'bg-emerald-600' };
};

const JourneyResultCard: React.FC<JourneyResultCardProps> = ({ itinerary }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalize data for the horizontal flow
  const data = useMemo(() => {
    if (!itinerary) return null;

    // Convert any 'SUBWAY', 'METRO', 'TRAM' to 'MRT' for local context
    const steps = (itinerary.steps || []).map((step: any) => ({
      ...step,
      type: (['SUBWAY', 'RAIL', 'TRAM', 'METRO', 'MRT'].includes(step.type?.toUpperCase())) ? 'MRT' : step.type
    }));

    const summary = itinerary.summary || { totalMinutes: 0, modes: [] };
    
    // Extract fare - assume it might be in itinerary.fare or calculate a dummy for UI completeness
    const fare = itinerary.fare || "$2.02"; 
    
    // Format a departure time (simulated based on now if not provided)
    const now = new Date();
    const departTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

    return {
      summary,
      steps,
      fare,
      departTime
    };
  }, [itinerary]);

  if (!data) return null;

  const { summary, steps, fare, departTime } = data;

  return (
    <div className="bg-[#1a1a1e] rounded-[2rem] border border-white/5 shadow-2xl mb-4 overflow-hidden transition-all duration-300 hover:border-white/10">
      <div className="p-6">
        {/* Header Row: Icons + Duration/Fare */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-wrap items-center gap-2.5">
            {steps.filter((s: any) => s.type !== 'WALK' || steps.length === 1).map((step: any, idx: number, arr: any[]) => {
              const isLast = idx === arr.length - 1;
              const isBus = step.type === 'BUS';
              const isMrt = step.type === 'MRT';
              const isWalk = step.type === 'WALK';

              return (
                <React.Fragment key={idx}>
                  <div className="flex items-center gap-2">
                    {isBus && (
                      <div className="flex items-center gap-1.5 bg-white/5 pr-2 pl-1.5 py-1 rounded-xl border border-white/5">
                        <Bus className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[13px] font-black text-white tabular-nums">
                          {step.service?.replace(/[^0-9]/g, '') || 'Bus'}
                        </span>
                      </div>
                    )}
                    {isMrt && (
                      <div className="flex items-center gap-1.5 bg-white/5 pr-2 pl-1.5 py-1 rounded-xl border border-white/5">
                        <Train className="w-3.5 h-3.5 text-emerald-400" />
                        {(() => {
                          const info = getMrtInfo(step.service);
                          return (
                            <span className={`px-1.5 py-0.5 ${info.color} text-white text-[9px] font-black rounded-md min-w-[24px] text-center shadow-lg shadow-black/20`}>
                              {info.code}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                    {isWalk && (
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                        <Footprints className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                  </div>
                  {(!isLast || (idx === arr.length - 1 && steps[steps.length-1].type === 'WALK' && !isWalk)) && (
                    <ChevronRight className="w-4 h-4 text-slate-800" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="text-right shrink-0 ml-4">
            <p className="text-[22px] font-black text-white tabular-nums tracking-tighter leading-none mb-1">
              {summary.totalMinutes}
              <span className="text-[10px] text-indigo-400 ml-1">MIN</span>
            </p>
            <div className="flex items-center justify-end gap-1 opacity-60">
               <DollarSign className="w-2.5 h-2.5 text-slate-400" />
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{fare.replace('$', '')}</p>
            </div>
          </div>
        </div>

        {/* Info Row: Contextual Metadata */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
               DEPART <span className="text-white ml-1">{departTime}</span>
             </p>
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
            TRANSFERS <span className="text-indigo-400 ml-1">{summary.transferCount}X</span>
          </p>
        </div>

        {/* Details CTA */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] hover:bg-white/5 transition-all active:scale-[0.98]"
        >
          {isExpanded ? 'Hide Stream' : 'Trace Route'}
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Content: Step Timeline */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-black/40 p-8 space-y-8 animate-in slide-in-from-top-2 duration-300">
          {steps.map((step: any, index: number) => {
            const isLast = index === steps.length - 1;
            const isMrt = step.type === 'MRT';
            const info = isMrt ? getMrtInfo(step.service) : null;

            return (
              <div key={index} className="flex gap-6">
                <div className="w-8 flex flex-col items-center shrink-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white border border-white/10 shadow-lg ${step.type === 'BUS' ? 'bg-indigo-600' : isMrt ? info?.color : 'bg-slate-800'}`}>
                    {step.type === 'BUS' ? <Bus className="w-4 h-4" /> : isMrt ? <Train className="w-4 h-4" /> : <Footprints className="w-4 h-4 text-slate-400" />}
                  </div>
                  {!isLast && <div className="w-[1px] flex-1 bg-white/5 my-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{step.type}</span>
                    {step.service && (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black text-white shadow-sm ${step.type === 'BUS' ? 'bg-indigo-600' : info?.color}`}>
                        {step.service}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-slate-800 mt-1.5 shrink-0" />
                      <p className="text-xs font-bold text-slate-500 leading-tight">
                        Node: <span className="text-slate-200">{step.from}</span>
                      </p>
                    </div>
                    {step.to && (
                      <div className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-slate-800 mt-1.5 shrink-0" />
                        <p className="text-xs font-bold text-slate-500 leading-tight">
                          Alight: <span className="text-slate-200">{step.to}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="px-2 py-1 rounded-md bg-white/5 border border-white/5 flex items-center gap-1.5">
                       <Clock className="w-2.5 h-2.5 text-indigo-400" />
                       <span className="text-[9px] font-black text-white uppercase tabular-nums">{step.minutes} MINS</span>
                    </div>
                    {step.stops !== undefined && (
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{step.stops} INTERVALS</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JourneyResultCard;
