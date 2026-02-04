
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Zap, Loader2, Home, Building2, Bell, BellOff, Footprints } from 'lucide-react';
import { FavoriteService, FavoriteBusStop, CommuteService } from '../types';
import { fetchBusArrival, registerAlert } from '../services/busApi';
import StationCard from '../components/StationCard';

interface CommuteModePageProps {
  commuteServices: CommuteService[];
  pinnedServices: FavoriteService[];
  telegramId: string;
  unifiedAlerts: Record<string, { id: string, type: 'LIVE' | 'SCHEDULED' }>;
  onAlertChange: (stopCode: string, serviceNo: string, alertId: string | null) => void;
  onSyncAlerts: () => void;
  onError: (err: any) => void;
  autoHomeAlert: boolean;
  autoBackAlert: boolean;
}

const CommuteModePage: React.FC<CommuteModePageProps> = ({ 
  commuteServices, pinnedServices, telegramId, unifiedAlerts, onAlertChange, onSyncAlerts, onError,
  autoHomeAlert, autoBackAlert
}) => {
  const { mode } = useParams<{ mode: 'home' | 'back' }>();
  const navigate = useNavigate();
  const [initializing, setInitializing] = useState(true);
  const [alertStatus, setAlertStatus] = useState<Record<string, string>>({});

  const activeModeServices = useMemo(() => 
    commuteServices.filter(p => p.mode === mode), 
  [commuteServices, mode]);

  const stops = useMemo(() => {
    const map = new Map<string, FavoriteBusStop>();
    activeModeServices.forEach(s => {
      if (!map.has(s.busStopCode)) {
        map.set(s.busStopCode, { code: s.busStopCode, name: s.busStopName });
      }
    });
    return Array.from(map.values());
  }, [activeModeServices]);

  const isHome = mode === 'home';
  const isAutoEnabled = isHome ? autoHomeAlert : autoBackAlert;

  useEffect(() => {
    if (!telegramId || activeModeServices.length === 0) {
      setInitializing(false);
      return;
    }

    const triggerSmartAlerts = async () => {
      setInitializing(true);
      const results: Record<string, string> = {};

      if (!isAutoEnabled) {
        activeModeServices.forEach(svc => {
          results[`${svc.busStopCode}-${svc.serviceNos}`] = 'SKIPPED_TOGGLE';
        });
        setAlertStatus(results);
        setInitializing(false);
        return;
      }

      for (const svc of activeModeServices) {
        const alertKey = `${svc.busStopCode}-${svc.serviceNos}`;
        if (unifiedAlerts[alertKey]) {
          results[alertKey] = 'ALREADY_ACTIVE';
          continue;
        }

        try {
          const arrivalData = await fetchBusArrival(svc.busStopCode);
          const bus = arrivalData.services.find(s => s.ServiceNo === svc.serviceNos);
          
          if (!bus || bus.eta === 'NA') {
             results[alertKey] = 'ERROR';
             continue;
          }

          const eta = bus.eta === 'Arr' ? 0 : Number(bus.eta);
          const walkTime = svc.walkingTime || 5;
          const threshold = walkTime + 2;
          
          if (eta > threshold) {
            const res = await registerAlert({
              chatId: telegramId,
              busStopCode: svc.busStopCode,
              serviceNo: svc.serviceNos,
              threshold: threshold
            });
            onAlertChange(svc.busStopCode, svc.serviceNos, res.alertId);
            results[alertKey] = 'TRIGGERED';
          } else {
            results[alertKey] = 'SKIPPED_CLOSE';
          }
        } catch (err) {
          console.error(`Auto-alert failed for ${svc.serviceNos}`, err);
          results[alertKey] = 'ERROR';
        }
      }

      setAlertStatus(results);
      onSyncAlerts();
      setInitializing(false);
    };

    triggerSmartAlerts();
  }, [mode, telegramId, isAutoEnabled, activeModeServices, onAlertChange, onSyncAlerts, unifiedAlerts]);

  return (
    <div className="pb-32 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Commute Mode</h2>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-1">Telemetry Mission Active</p>
        </div>
      </div>

      <div className={`relative overflow-hidden mb-10 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl ${isHome ? 'bg-indigo-600/10' : 'bg-emerald-600/10'}`}>
         <div className="absolute top-0 right-0 p-8 opacity-5">
            {isHome ? <Home className="w-32 h-32" /> : <Building2 className="w-32 h-32" />}
         </div>
         <div className="relative z-10 flex flex-col items-start">
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isHome ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
               <Zap className="w-3.5 h-3.5" />
               Smart Protocol: {isHome ? 'LEAVE HOME' : 'BACK HOME'}
            </div>
            
            <h3 className="text-white text-base font-black uppercase tracking-tight mb-4">
              {initializing ? 'Analyzing Route Conditions...' : 'Route Scanning Complete'}
            </h3>

            {initializing ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Processing Node Sensors</span>
              </div>
            ) : (
              <div className="space-y-3 w-full">
                <div className={`flex items-start gap-3 p-4 bg-white/5 rounded-2xl border ${isAutoEnabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                  {isAutoEnabled ? <Bell className="w-5 h-5 text-emerald-400 shrink-0" /> : <BellOff className="w-5 h-5 text-rose-400 shrink-0" />}
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1">
                      Auto-Alert System: {isAutoEnabled ? 'ENGAGED' : 'PAUSED'}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                      {isAutoEnabled 
                        ? `Deployment synced to node telemetry.`
                        : "Tracking live ETAs only. Automatic alerts are currently disabled."}
                    </p>
                  </div>
                </div>
              </div>
            )}
         </div>
      </div>

      {stops.length > 0 ? (
        <div className="bg-[#121215] border border-white/5 rounded-[2rem] p-2.5 shadow-xl">
          {stops.map(stop => (
            <StationCard 
              key={stop.code}
              stop={stop}
              pinnedServices={pinnedServices}
              commuteServices={activeModeServices}
              onPinToggle={() => {}} 
              telegramId={telegramId}
              unifiedAlerts={unifiedAlerts}
              onAlertChange={onAlertChange}
              onSyncAlerts={onSyncAlerts}
              onError={onError}
              onlyShowPinned={true}
            />
          ))}
        </div>
      ) : !initializing && (
        <div className="py-24 text-center bg-white/[0.01] border border-white/5 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center">
          <Bell className="w-8 h-8 text-slate-800 mb-5" />
          <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] leading-loose">
            No Commute Assignments Found.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommuteModePage;
