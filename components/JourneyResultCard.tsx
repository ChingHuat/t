
import React, { useState, useMemo } from 'react';
import { Bus, Train, Footprints, ChevronDown, ChevronUp, Clock, DollarSign, MoveRight } from 'lucide-react';

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

    const steps = (itinerary.steps || []).map((step: any) => ({
      ...step,
      type: (['SUBWAY', 'RAIL', 'TRAM', 'METRO', 'MRT'].includes(step.type?.toUpperCase())) ? 'MRT' : step.type
    }));

    const summary = itinerary.summary || { totalMinutes: 0, modes: [] };
    const fare = itinerary.fare || "$ 2.02"; 
    
    const now = new Date();
    const departTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

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
    <div className="bg-[#1a1a1e] rounded-[2.5rem] border border-white/5 shadow-2xl mb-4 overflow-hidden transition-all duration-300 hover:border-white/10">
      <div className="p-7">
        {/* Main Info Area: Flow on Left, Stats on Right */}
        <div className="flex justify-between items-start gap-4 mb-8">
          
          {/* Journey Flow Container - Scrollable on mobile if too long */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
            {steps.filter((s: any) => s.type !== 'WALK' || steps.length === 1).map((step: any, idx: number, arr: any[]) => {
              const isLast = idx === arr.length - 1;
              const isBus = step.type === 'BUS';
              const isMrt = step.type === 'MRT';
              const isWalk = step.type === 'WALK';

              return (
                <React.Fragment key={idx}>
                  <div className="flex items-center shrink-0">
                    {isBus && (
                      <div className="flex items-center gap-2 bg-white/5 pr-3 pl-2 py-1.5 rounded-2xl border border-white/5 shadow-inner">
                        <Bus className="w-4 h-4 text-indigo-400" />
                        <span className="text-[14px] font-black text-white tabular-nums">
                          {step.service?.replace(/[^0-9]/g, '') || 'Bus'}
                        </span>
                      </div>
                    )}
                    {isMrt && (
                      <div className="flex items-center gap-2 bg-white/5 pr-2 pl-2 py-1.5 rounded-2xl border border-white/5 shadow-inner">
                        <Train className="w-4 h-4 text-emerald-400" />
                        {(() => {
                          const info = getMrtInfo(step.service);
                          return (
                            <span className={`px-2 py-0.5 ${info.color} text-white text-[10px] font-black rounded-lg min-w-[28px] text-center shadow-lg shadow-black/40`}>
                              {info.code}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                    {isWalk && (
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                        <Footprints className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                  </div>
                  
                  {/* Arrow Indicator between segments */}
                  {!isLast && (
                    <div className="flex items-center justify-center px-0.5 shrink-0">
                      <MoveRight className="w-4 h-4 text-rose-600/60 drop-shadow-[0_0_5px_rgba(225,29,72,0.4)]" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Time & Fare - Aligned Right */}
          <div className="text-right shrink-0">
            <p className="text-[26px] font-black text-white tabular-nums tracking-tighter leading-none mb-1">
              {summary.totalMinutes}
              <span className="text-[11px] text-indigo-400 font-black ml-1 uppercase">Min</span>
            </p>
            <div className="flex items-center justify-end gap-1 opacity-40">
               <DollarSign className="w-2.5 h-2.5 text-slate-400" />
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">
                 {fare.replace('$', '').trim()}
               </p>
            </div>
          </div>
        </div>

        {/* Secondary Info Row */}
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex items-center gap-2.5">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
               DEPART <span className="text-white ml-2 tabular-nums">{departTime}</span>
             </p>
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              TRANSFERS <span className="text-indigo-400 ml-2 tabular-nums">{summary.transferCount}X</span>
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white/[0.03] border border-white/5 rounded-[1.5rem] text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] hover:bg-white/5 transition-all active:scale-[0.98] shadow-lg"
        >
          {isExpanded ? 'Hide Trace' : 'Trace Route'}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Details Timeline */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-black/40 p-10 space-y-10 animate-in slide-in-from-top-2 duration-300">
          {steps.map((step: any, index: number) => {
            const isLast = index === steps.length - 1;
            const isMrt = step.type === 'MRT';
            const info = isMrt ? getMrtInfo(step.service) : null;

            return (
              <div key={index} className="flex gap-8">
                <div className="w-10 flex flex-col items-center shrink-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-2xl ${step.type === 'BUS' ? 'bg-indigo-600' : isMrt ? info?.color : 'bg-slate-800'}`}>
                    {step.type === 'BUS' ? <Bus className="w-5 h-5" /> : isMrt ? <Train className="w-5 h-5" /> : <Footprints className="w-5 h-5 text-slate-400" />}
                  </div>
                  {!isLast && <div className="w-[1px] flex-1 bg-white/5 my-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{step.type}</span>
                    {step.service && (
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black text-white shadow-md ${step.type === 'BUS' ? 'bg-indigo-600' : info?.color}`}>
                        {step.service}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 shrink-0" />
                      <p className="text-[13px] font-bold text-slate-500 leading-tight">
                        Node: <span className="text-slate-100">{step.from}</span>
                      </p>
                    </div>
                    {step.to && (
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 shrink-0" />
                        <p className="text-[13px] font-bold text-slate-500 leading-tight">
                          Alight: <span className="text-slate-100">{step.to}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-4">
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
                       <Clock className="w-3 h-3 text-indigo-400" />
                       <span className="text-[10px] font-black text-white uppercase tabular-nums tracking-widest">{step.minutes} Min</span>
                    </div>
                    {step.stops !== undefined && (
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{step.stops} Intervals</p>
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
