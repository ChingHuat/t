
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

  const homeServicesCount = useMemo(() => commuteServices.filter(p => p.mode === 'home').length, [commuteServices]);
  const backServicesCount = useMemo(() => commuteServices.filter(p => p.mode === 'back').length, [commuteServices]);

  const handleToggleAutoAlert = (e: React.MouseEvent, type: 'home' | 'back') => {
    e.stopPropagation();
    if (type === 'home') setAutoHomeAlert(!autoHomeAlert);
    else setAutoBackAlert(!autoBackAlert);
  };

  return (
    <div className="pb-12">
      {/* Commute Mode Smart Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-10 animate-in slide-in-from-top-4 duration-500">
        <button 
          onClick={() => navigate('/commute/home')}
          className="relative group overflow-hidden bg-gradient-to-br from-indigo-600/90 to-indigo-800/90 p-5 rounded-[2rem] border border-white/10 shadow-xl shadow-indigo-900/20 active:scale-95 transition-all"
        >
          <div 
            onClick={(e) => handleToggleAutoAlert(e, 'home')}
            className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${autoHomeAlert ? 'bg-white text-indigo-600 shadow-lg' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
            title={autoHomeAlert ? "Auto-Alerts Enabled" : "Auto-Alerts Disabled"}
          >
            {autoHomeAlert ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </div>
          <div className="absolute bottom-0 right-0 p-3 opacity-10 group-hover:scale-125 transition-transform pointer-events-none">
            <Home className="w-16 h-16" />
          </div>
          <div className="relative z-10 flex flex-col items-start text-left pointer-events-none">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Leave Home</h3>
            <div className="flex items-center gap-1">
              <span className="text-white text-base font-black uppercase tracking-tight">Active Mode</span>
              <ChevronRight className="w-4 h-4 text-white/50" />
            </div>
            <p className="text-[8px] font-bold text-indigo-300 uppercase tracking-widest mt-2">{homeServicesCount} Nodes Linked</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/commute/back')}
          className="relative group overflow-hidden bg-gradient-to-br from-emerald-600/90 to-emerald-800/90 p-5 rounded-[2rem] border border-white/10 shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
        >
          <div 
            onClick={(e) => handleToggleAutoAlert(e, 'back')}
            className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${autoBackAlert ? 'bg-white text-emerald-600 shadow-lg' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
            title={autoBackAlert ? "Auto-Alerts Enabled" : "Auto-Alerts Disabled"}
          >
            {autoBackAlert ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </div>
          <div className="absolute bottom-0 right-0 p-3 opacity-10 group-hover:scale-125 transition-transform pointer-events-none">
            <Building2 className="w-16 h-16" />
          </div>
          <div className="relative z-10 flex flex-col items-start text-left pointer-events-none">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">Back Home</h3>
            <div className="flex items-center gap-1">
              <span className="text-white text-base font-black uppercase tracking-tight">Active Mode</span>
              <ChevronRight className="w-4 h-4 text-white/50" />
            </div>
            <p className="text-[8px] font-bold text-emerald-300 uppercase tracking-widest mt-2">{backServicesCount} Nodes Linked</p>
          </div>
        </button>
      </div>

      {/* Priority Section: Grouped Pinned Services */}
      {pinnedServices.length > 0 && (
        <section className="mb-14 animate-in slide-in-from-top-4 duration-500 delay-100">
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
