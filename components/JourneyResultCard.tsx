
import React, { useState } from 'react';
import { Bus, Train, Clock, DollarSign, ChevronDown, ChevronUp, MoveRight, Footprints } from 'lucide-react';

interface JourneyResultCardProps {
  itinerary: any;
}

const MRT_THEMES: Record<string, { label: string; color: string }> = {
  'NS': { label: 'NSL', color: '#D42E12' }, // Red
  'EW': { label: 'EWL', color: '#009645' }, // Green
  'NE': { label: 'NEL', color: '#891181' }, // Purple
  'CC': { label: 'CCL', color: '#F9A21A' }, // Orange
  'DT': { label: 'DTL', color: '#005EC4' }, // Blue
  'TE': { label: 'TEL', color: '#9D5B25' }, // Brown
  'BP': { label: 'BPL', color: '#748477' }, // LRT Gray
  'STC': { label: 'SKL', color: '#748477' }, // Sengkang LRT
  'PTC': { label: 'PGL', color: '#748477' }, // Punggol LRT
};

const getTrainTheme = (routeShortName: string) => {
  return MRT_THEMES[routeShortName] || { label: routeShortName || 'MRT', color: '#008d36' };
};

const JourneyResultCard: React.FC<JourneyResultCardProps> = ({ itinerary }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!itinerary?.legs?.length) return null;

  // Extract primary stats
  const duration = Math.round(itinerary.duration / 60);
  const numericFare = parseFloat(itinerary.fare);
  const fare = !isNaN(numericFare) && numericFare > 0 ? `$${numericFare.toFixed(2)}` : 'Fare unavailable';
  
  // Get departure time from first leg
  const startTime = new Date(itinerary.startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();

  // Extract transport sequence (Buses/Trains)
  const transportSequence = itinerary.legs.filter((leg: any) => leg.mode !== 'WALK');

  const get = (obj: any, path: string, defaultValue: any = null) =>
    path.split('.').reduce((a, c) => (a && a[c] ? a[c] : defaultValue), obj);

  const relevantLegsForDetails = itinerary.legs.filter((leg: any, idx: number) => {
    if (leg.mode === 'WALK' && (idx === 0 || idx === itinerary.legs.length - 1)) {
        return leg.distance > 10;
    }
    return true;
  });

  return (
    <div className="bg-[#1a1a1e] rounded-2xl border border-white/5 shadow-xl overflow-hidden transition-all duration-300 mx-1">
      {/* Summary Section (Always Visible) */}
      <div 
        className="p-5 cursor-pointer hover:bg-white/[0.03] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start mb-4">
          {/* Transport Sequence */}
          <div className="flex flex-wrap items-center gap-2 max-w-[70%]">
            {transportSequence.length === 0 ? (
               <div className="flex items-center gap-2">
                 <Footprints className="w-5 h-5 text-slate-500" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Walk Only</span>
               </div>
            ) : (
              transportSequence.map((leg: any, idx: number) => {
                const isBus = leg.mode === 'BUS';
                const theme = !isBus ? getTrainTheme(leg.routeShortName) : null;
                
                return (
                  <React.Fragment key={idx}>
                    <div className="flex items-center gap-1.5">
                      {isBus ? (
                        <div className="flex items-center gap-1">
                          <Bus className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                          <span className="bg-[#1a73e8] text-white px-2 py-0.5 rounded text-[11px] font-black min-w-[32px] text-center shadow-lg shadow-blue-900/20">
                            {leg.routeShortName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Train className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                          <span 
                            style={{ backgroundColor: theme?.color }}
                            className="text-white px-2 py-0.5 rounded text-[11px] font-black min-w-[32px] text-center shadow-lg"
                          >
                            {theme?.label}
                          </span>
                        </div>
                      )}
                    </div>
                    {idx < transportSequence.length - 1 && (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-700 -rotate-90" strokeWidth={3} />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Time and Fare */}
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-white tabular-nums">{duration} min</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{fare}</p>
          </div>
        </div>

        <div className="flex justify-between items-end mt-2 pt-4 border-t border-white/[0.03]">
          <div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Depart at {startTime}</p>
          </div>
          <div className="flex items-center gap-1 text-[#1a73e8] hover:text-blue-400 transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest">Details</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-black/20 p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
           {relevantLegsForDetails.map((leg: any, index: number) => {
             const isLastLeg = index === relevantLegsForDetails.length - 1;

             if (leg.mode === 'WALK') {
               return (
                 <div key={index} className="flex gap-4">
                   <div className="w-6 flex flex-col items-center shrink-0">
                     <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-600 border border-white/5">
                       <Footprints className="w-3.5 h-3.5" />
                     </div>
                     {!isLastLeg && <div className="w-px flex-1 bg-white/5 my-2" />}
                   </div>
                   <div className="flex-1 pt-0.5">
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Walk {Math.round(leg.distance)}m</p>
                     <p className="text-[10px] font-black text-slate-600 uppercase mt-1 tracking-widest">
                       → {isLastLeg ? 'Destination' : get(leg, 'to.name', 'Next Point')}
                     </p>
                   </div>
                 </div>
               );
             }

             const stops = get(leg, 'intermediateStops.length', 0);
             const isBus = leg.mode === 'BUS';
             const theme = !isBus ? getTrainTheme(leg.routeShortName) : null;

             return (
               <div key={index} className="flex gap-4">
                 <div className="w-6 flex flex-col items-center shrink-0">
                   <div 
                     style={{ backgroundColor: isBus ? '#1a73e8' : theme?.color }}
                     className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-lg`}
                   >
                     {isBus ? <Bus className="w-3.5 h-3.5" /> : <Train className="w-3.5 h-3.5" />}
                   </div>
                   {!isLastLeg && <div className={`w-px flex-1 my-2`} style={{ backgroundColor: isBus ? '#1a73e820' : `${theme?.color}20` }} />}
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span 
                          style={{ backgroundColor: isBus ? '#1a73e8' : theme?.color }}
                          className={`px-2 py-0.5 text-white text-[10px] font-black rounded`}
                        >
                          {isBus ? leg.routeShortName : theme?.label}
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {leg.agencyName || (isBus ? 'Bus Service' : 'Rail Network')}
                        </span>
                    </div>
                    <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                       <p className="text-[11px] font-bold text-white leading-snug">Board: <span className="text-slate-400 font-bold ml-1">{get(leg, 'from.name')}</span></p>
                       <p className="text-[11px] font-bold text-white leading-snug">Alight: <span className="text-slate-400 font-bold ml-1">{get(leg, 'to.name')}</span></p>
                       <div className="pt-2 flex items-center gap-1.5 border-t border-white/5 mt-1">
                          <span 
                            style={{ color: isBus ? '#60a5fa' : theme?.color }}
                            className={`text-[8px] font-black uppercase tracking-[0.2em]`}
                          >
                            {stops} {isBus ? 'Stops' : 'Stations'} Enroute
                          </span>
                       </div>
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
