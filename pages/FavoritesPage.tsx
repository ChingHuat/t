
import React, { useMemo } from 'react';
import { MapPin, Star, LayoutPanelTop, Home, Building2, ChevronRight, Zap, Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FavoriteBusStop, FavoriteService, CommuteService } from '../types';
import StationCard from '../components/StationCard';

interface FavoritesPageProps {
  favorites: FavoriteBusStop[];
  pinnedServices: FavoriteService[];
  commuteServices: CommuteService[];
  toggleFavorite: (stop: FavoriteBusStop) => void;
  togglePinnedService: (pinned: FavoriteService) => void;
  telegramId: string;
  unifiedAlerts: Record<string, { id: string, type: 'LIVE' | 'SCHEDULED' }>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
  onSyncAlerts: () => void;
  onError: (err: any) => void;
  onUpdateCommute: (stopCode: string, svcNo: string, mode: 'home' | 'back' | undefined, name?: string) => void;
  autoHomeAlert: boolean;
  setAutoHomeAlert: (val: boolean) => void;
  autoBackAlert: boolean;
  setAutoBackAlert: (val: boolean) => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ 
  favorites, pinnedServices, commuteServices, toggleFavorite, togglePinnedService, 
  telegramId, unifiedAlerts, onAlertChange, onSyncAlerts, onError,
  onUpdateCommute, autoHomeAlert, setAutoHomeAlert, autoBackAlert, setAutoBackAlert
}) => {
  const navigate = useNavigate();
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
                 commuteServices={commuteServices}
                 onPinToggle={togglePinnedService}
                 telegramId={telegramId}
                 unifiedAlerts={unifiedAlerts}
                 onAlertChange={onAlertChange}
                 onSyncAlerts={onSyncAlerts}
                 onError={onError}
                 onlyShowPinned={true}
                 onUpdateCommute={onUpdateCommute}
               />
             ))}
           </div>
        </section>
      )}

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
                commuteServices={commuteServices}
                toggleFavorite={() => toggleFavorite(stop)}
                isFavorite={true}
                onPinToggle={togglePinnedService}
                telegramId={telegramId}
                unifiedAlerts={unifiedAlerts}
                onAlertChange={onAlertChange}
                onSyncAlerts={onSyncAlerts}
                onError={onError}
                onUpdateCommute={onUpdateCommute}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FavoritesPage;
