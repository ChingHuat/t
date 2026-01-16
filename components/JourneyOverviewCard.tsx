
import React from 'react';
import { Clock, DollarSign, Repeat, Footprints } from 'lucide-react';

interface JourneyOverviewCardProps {
  itinerary: any;
}

const JourneyOverviewCard: React.FC<JourneyOverviewCardProps> = ({ itinerary }) => {
  const duration = Math.round(itinerary.duration / 60);
  
  const numericFare = parseFloat(itinerary.fare);
  const fare = !isNaN(numericFare) ? numericFare.toFixed(2) : null;

  // Manually calculate transfers: (Number of vehicle legs) - 1
  const vehicleLegs = (itinerary.legs || []).filter((leg: any) => leg.mode !== 'WALK').length;
  const transfers = Math.max(0, vehicleLegs - 1);
  
  const walkDistance = Math.round(itinerary.walkDistance);

  const stats = [
    { icon: <Clock className="w-5 h-5" />, value: `${duration}`, unit: 'min', label: 'Duration' },
    ...(fare && parseFloat(fare) > 0 ? [{ icon: <DollarSign className="w-5 h-5" />, value: fare, unit: '$', label: 'Est. Fare' }] : []),
    { icon: <Repeat className="w-5 h-5" />, value: `${transfers}`, unit: 'xfr', label: 'Transfers' },
    { icon: <Footprints className="w-5 h-5" />, value: `${walkDistance}`, unit: 'm', label: 'Walking' },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0">
              {stat.icon}
            </div>
            <div>
              <p className="text-xl font-black text-slate-800 leading-none">
                {stat.unit === '$' && <span className="text-sm align-super mr-0.5">{stat.unit}</span>}
                {stat.value}
                {stat.unit !== '$' && <span className="text-sm ml-0.5">{stat.unit}</span>}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JourneyOverviewCard;
