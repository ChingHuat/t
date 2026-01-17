
import React, { useState, useMemo } from 'react';
import { Bus, Train, Footprints, ChevronDown, ChevronUp, Clock, DollarSign, ChevronRight, MapPin } from 'lucide-react';
import { Itinerary } from '../types';

interface JourneyResultCardProps {
  itinerary: Itinerary; 
}

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

  const data = useMemo(() => {
    if (!itinerary) return null;

    const steps = (itinerary.steps || []).map((step: any) => ({
      ...step,
      type: (['SUBWAY', 'RAIL', 'TRAM', 'METRO', 'MRT'].includes(step.type?.toUpperCase())) ? 'MRT' : step.type
    }));

    const summary = itinerary.summary;
    const fare = itinerary.fare || "$ 2.02"; 
    
    // Use walkMeters from the summary object as provided in the JSON
    const totalWalkMeters = summary.walkMeters || 0;
    
    const now = new Date();
    const departTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      summary,
      steps,
      fare,
      departTime,
      totalWalkMeters
    };
  }, [itinerary]);

  if (!data) return null;

  const { summary, steps, fare, departTime, totalWalkMeters } = data;

  return (
    <div className="bg-[#1a1a1e] rounded-[2.2rem] border border-white/5 shadow-2xl mb-4 overflow-hidden transition-all duration-300 hover:border-white/10">
      <div className="p-6 pb-5">
        <div className="flex items-center justify-between gap-3 mb-7">
          <div className="flex-1 min-w-0">
            <div 
              className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1"
              style={{ 
                maskImage: 'linear-gradient(to right, black 94%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 94%, transparent 100%)'
              }}
            >
              {steps.filter((s: any) => s.type !== 'WALK' || steps.length === 1).map((step: any, idx: number, arr: any[]) => {
                const isLast = idx === arr.length - 1;
                const isBus = step.type === 'BUS';
                const isMrt = step.type === 'MRT';
                const isWalk = step.type === 'WALK';

                return (
                  <React.Fragment key={idx}>
                    <div className="flex items-center shrink-0">
                      {isBus && (
                        <div className="flex items-center gap-1 bg-white/5 pr-2 pl-1 py-1 rounded-[0.9rem] border border-white/5 shadow-inner">
                          <Bus className="w-3 h-3 text-indigo-400" />
                          <span className="text-[12px] font-black text-white tabular-nums">
                            {step.service?.replace(/[^0-9]/g, '') || 'Bus'}
                          </span>
                        </div>
                      )}
                      {isMrt && (
                        <div className="flex items-center gap-1 bg-white/5 pr-1 pl-1 py-1 rounded-[0.9rem] border border-white/5 shadow-inner">
                          <Train className="w-3 h-3 text-emerald-400" />
                          {(() => {
                            const info = getMrtInfo(step.service);
                            return (
                              <span className={`px-1 py-0.5 ${info.color} text-white text-[8px] font-black rounded-md min-w-[20px] text-center shadow-lg`}>
                                {info.code}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                      {isWalk && (
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                          <Footprints className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      )}
                    </div>
                    
                    {!isLast && (
                      <div className="flex items-center shrink-0 px-0.5">
                        <ChevronRight className="w-3.5 h-3.5 text-[#ff0044] drop-shadow-[0_0_10px_rgba(255,0,68,0.7)]" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="text-right shrink-0 min-w-[72px] pl-2 border-l border-white/[0.03]">
            <p className="text-[22px] font-black text-white tabular-nums tracking-tighter leading-none mb-0.5">
              {summary.totalMinutes}
              <span className="text-[10px] text-indigo-400 font-black ml-0.5 uppercase">Min</span>
            </p>
            <div className="flex items-center justify-end gap-0.5 opacity-40">
              <DollarSign className="w-2 h-2 text-slate-400" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {fare.replace('$', '').trim()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-7 px-0.5">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
               DEPART <span className="text-white ml-1.5 tabular-nums">{departTime}</span>
             </p>
          </div>
          <div className="flex items-center gap-2.5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
              XFER <span className="text-indigo-400 ml-1 tabular-nums">{summary.transferCount}</span>
            </p>
            <div className="w-[1px] h-2.5 bg-white/10" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
              WALK <span className="text-white ml-1 tabular-nums">{totalWalkMeters}M</span>
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/[0.03] border border-white/5 rounded-[1.2rem] text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] hover:bg-white/5 transition-all active:scale-[0.98] shadow-lg"
        >
          {isExpanded ? 'Hide Trace' : 'Trace Route'}
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-white/5 bg-black/40 p-8 space-y-8 animate-in slide-in-from-top-2 duration-300">
          {steps.map((step: any, index: number) => {
            const isLast = index === steps.length - 1;
            const isMrt = step.type === 'MRT';
            const isWalk = step.type === 'WALK';
            const info = isMrt ? getMrtInfo(step.service) : null;

            return (
              <div key={index} className="flex gap-6">
                <div className="w-9 flex flex-col items-center shrink-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white border border-white/10 shadow-xl ${step.type === 'BUS' ? 'bg-indigo-600' : isMrt ? info?.color : 'bg-slate-800'}`}>
                    {step.type === 'BUS' ? <Bus className="w-4.5 h-4.5" /> : isMrt ? <Train className="w-4.5 h-4.5" /> : <Footprints className="w-4.5 h-4.5 text-slate-400" />}
                  </div>
                  {!isLast && <div className="w-[1px] flex-1 bg-white/5 my-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">{step.type}</span>
                    {step.service && (
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black text-white shadow-md ${step.type === 'BUS' ? 'bg-indigo-600' : info?.color}`}>
                        {step.service}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 shrink-0" />
                      <p className="text-[12px] font-bold text-slate-500 leading-tight">
                        From: <span className="text-slate-100">{step.from}</span>
                      </p>
                    </div>
                    {step.to && (
                      <div className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mt-1.5 shrink-0" />
                        <p className="text-[12px] font-bold text-slate-500 leading-tight">
                          To: <span className="text-slate-100">{step.to}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 flex items-center gap-1.5">
                       <Clock className="w-2.5 h-2.5 text-indigo-400" />
                       <span className="text-[9px] font-black text-white uppercase tabular-nums tracking-widest">{step.minutes} Min</span>
                    </div>
                    {step.meters !== undefined && (
                      <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 flex items-center gap-1.5">
                         <MapPin className="w-2.5 h-2.5 text-rose-500" />
                         <span className="text-[9px] font-black text-white uppercase tabular-nums tracking-widest">{step.meters}M</span>
                      </div>
                    )}
                    {step.stops !== undefined && (
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.15em]">{step.stops} Stops</p>
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
