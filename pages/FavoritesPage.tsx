
import React, { useMemo } from 'react';
import { MapPin, Star, LayoutPanelTop } from 'lucide-react';
import { FavoriteBusStop, FavoriteService, BusService } from '../types';
import StationCard from '../components/StationCard';
import ActiveAlertsBanner from '../components/ActiveAlertsBanner';

interface FavoritesPageProps {
  favorites: FavoriteBusStop[];
  pinnedServices: FavoriteService[];
  toggleFavorite: (stop: FavoriteBusStop) => void;
  togglePinnedService: (pinned: FavoriteService) => void;
  telegramId: string;
  activeAlerts: Record<string, string>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ 
  favorites, pinnedServices, toggleFavorite, togglePinnedService, 
  telegramId, activeAlerts, onAlertChange 
}) => {
  const pinnedStopCodes = useMemo(() => Array.from(new Set(pinnedServices.map(p => p.busStopCode))), [pinnedServices]);
  
  const pinnedStops = useMemo(() => {
    return pinnedStopCodes.map(code => {
      const fav = favorites.find(f => f.code === code);
      if (fav) return fav;
      const pin = pinnedServices.find(p => p.busStopCode === code);
      return { code, name: pin?.busStopName || 'Bus Stop', road: '' };
    });
  }, [pinnedStopCodes, favorites, pinnedServices]);

  return (
    <div className="pb-12">
      {/* Priority Section: Grouped Pinned Services */}
      {pinnedServices.length > 0 && (
        <section className="mb-14 animate-in slide-in-from-top-4 duration-500">
           <div className="flex items-center gap-2.5 mb-6 px-1">
             <LayoutPanelTop className="w-5 h-5 text-indigo-500" />
             <h2 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Priority Commute</h2>
           </div>
           
           <div className="bg-[#121215] border border-white/5 rounded-[2rem] p-2.5 shadow-xl">
             {pinnedStops.map(stop => (
               <StationCard 
                 key={`priority-${stop.code}`}
                 stop={stop}
                 pinnedServices={pinnedServices}
                 onPinToggle={togglePinnedService}
                 telegramId={telegramId}
                 activeAlerts={activeAlerts}
                 onAlertChange={onAlertChange}
                 onlyShowPinned={true}
               />
             ))}
           </div>
        </section>
      )}

      {/* System Notifications */}
      <ActiveAlertsBanner activeAlerts={activeAlerts} telegramId={telegramId} onCancelAlert={onAlertChange} />

      {/* Saved Hubs Section */}
      <section>
        <div className="mb-8 px-1 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-rose-500/70" />
            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Saved Stations</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{favorites.length} Hubs Linked</span>
        </div>

        {favorites.length === 0 ? (
          <div className="py-24 text-center bg-white/[0.01] border border-white/5 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center mx-1">
            <MapPin className="w-8 h-8 text-slate-800 mb-5" />
            <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] leading-loose">
              No active stations found.<br/>Acquire nodes via Search.
            </p>
          </div>
        ) : (
          <div className="bg-[#121215] border border-white/5 rounded-[2rem] p-2.5 shadow-xl">
            {favorites.map(stop => (
              <StationCard 
                key={stop.code}
                stop={stop}
                pinnedServices={pinnedServices}
                toggleFavorite={() => toggleFavorite(stop)}
                isFavorite={true}
                onPinToggle={togglePinnedService}
                telegramId={telegramId}
                activeAlerts={activeAlerts}
                onAlertChange={onAlertChange}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FavoritesPage;
