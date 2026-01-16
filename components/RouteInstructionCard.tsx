
import React from 'react';
import { Clock, DollarSign, Repeat, Footprints, Bus, Train, MoveRight } from 'lucide-react';

interface RouteInstructionCardProps {
  itinerary: any;
}

const RouteInstructionCard: React.FC<RouteInstructionCardProps> = ({ itinerary }) => {
  if (!itinerary?.legs?.length) {
    return null;
  }

  // Summary stats
  const duration = Math.round(itinerary.duration / 60);
  const numericFare = parseFloat(itinerary.fare);
  const fare = !isNaN(numericFare) && numericFare > 0 ? numericFare.toFixed(2) : null;
  
  const vehicleLegs = itinerary.legs.filter((leg: any) => leg.mode !== 'WALK').length;
  const transfers = Math.max(0, vehicleLegs - 1);
  const walkDistance = Math.round(itinerary.walkDistance);

  const stats = [
    { icon: <Clock className="w-4 h-4" />, value: `${duration}`, unit: 'm', label: 'Time' },
    ...(fare ? [{ icon: <DollarSign className="w-4 h-4" />, value: fare, unit: '$', label: 'Fare' }] : []),
    { icon: <Repeat className="w-4 h-4" />, value: `${transfers}`, unit: 'x', label: 'Xfer' },
    { icon: <Footprints className="w-4 h-4" />, value: `${walkDistance}`, unit: 'm', label: 'Walk' },
  ];

  const get = (obj: any, path: string, defaultValue: any = null) =>
    path.split('.').reduce((a, c) => (a && a[c] ? a[c] : defaultValue), obj);

  // Filter legs to remove redundant small walks (e.g. < 5m at start/end)
  const relevantLegs = itinerary.legs.filter((leg: any, idx: number) => {
    if (leg.mode === 'WALK' && (idx === 0 || idx === itinerary.legs.length - 1)) {
        return leg.distance > 10; // Only show significant start/end walks
    }
    return true;
  });

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 mx-1">
      {/* Summary Header Dashboard */}
      <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
        <div className="flex justify-between items-center">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                {stat.icon}
                <span className="text-base font-black text-slate-800">
                  {stat.unit === '$' && <span className="text-[10px] mr-0.5">$</span>}
                  {stat.value}
                  {stat.unit !== '$' && <span className="text-[10px] ml-0.5">{stat.unit}</span>}
                </span>
              </div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vertical Journey Flow */}
      <div className="p-8 space-y-8">
        {relevantLegs.map((leg: any, index: number) => {
          const isLastLeg = index === relevantLegs.length - 1;

          // WALK Rendering - Lighter style
          if (leg.mode === 'WALK') {
            return (
              <div key={index} className="flex gap-4">
                <div className="w-8 flex flex-col items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Footprints className="w-4 h-4" />
                  </div>
                  {!isLastLeg && <div className="w-0.5 flex-1 bg-slate-100 my-2" />}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-bold text-slate-500">Walk {Math.round(leg.distance)}m</p>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    → To {isLastLeg ? 'Destination' : get(leg, 'to.name', 'Next Point')}
                  </p>
                </div>
              </div>
            );
          }

          // BUS Rendering - Emphasized Style
          if (leg.mode === 'BUS') {
            const stops = get(leg, 'intermediateStops.length', 0);
            return (
              <div key={index} className="flex gap-4">
                <div className="w-8 flex flex-col items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                    <Bus className="w-4 h-4" />
                  </div>
                  {!isLastLeg && <div className="w-0.5 flex-1 bg-indigo-100 my-2" />}
                </div>
                <div className="flex-1 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-indigo-600 text-white text-sm font-black rounded-lg">
                      {leg.routeShortName}
                    </span>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                      {leg.agencyName}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                       <MoveRight className="w-3 h-3 text-indigo-400 mt-1 shrink-0" />
                       <p className="text-xs font-bold text-slate-700">Board at <span className="font-black text-slate-900">{get(leg, 'from.name')}</span></p>
                    </div>
                    <div className="flex items-start gap-2">
                       <MoveRight className="w-3 h-3 text-indigo-400 mt-1 shrink-0" />
                       <p className="text-xs font-bold text-slate-700">Alight at <span className="font-black text-slate-900">{get(leg, 'to.name')}</span></p>
                    </div>
                    <div className="pt-2 flex items-center gap-1.5 border-t border-indigo-100">
                       <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{stops} STOPS</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // MRT/RAIL Rendering - Emphasized Style
          if (leg.mode === 'SUBWAY' || leg.mode === 'RAIL' || leg.mode === 'TRAM') {
            const stops = get(leg, 'intermediateStops.length', 0);
            return (
              <div key={index} className="flex gap-4">
                <div className="w-8 flex flex-col items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                    <Train className="w-4 h-4" />
                  </div>
                  {!isLastLeg && <div className="w-0.5 flex-1 bg-emerald-100 my-2" />}
                </div>
                <div className="flex-1 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-emerald-600 text-white text-sm font-black rounded-lg">
                      {leg.route || 'MRT'}
                    </span>
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Rapid Transit</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                       <MoveRight className="w-3 h-3 text-emerald-400 mt-1 shrink-0" />
                       <p className="text-xs font-bold text-slate-700">Board at <span className="font-black text-slate-900">{get(leg, 'from.name')}</span></p>
                    </div>
                    <div className="flex items-start gap-2">
                       <MoveRight className="w-3 h-3 text-emerald-400 mt-1 shrink-0" />
                       <p className="text-xs font-bold text-slate-700">Alight at <span className="font-black text-slate-900">{get(leg, 'to.name')}</span></p>
                    </div>
                    <div className="pt-2 flex items-center gap-1.5 border-t border-emerald-100">
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{stops} STATIONS</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default RouteInstructionCard;
