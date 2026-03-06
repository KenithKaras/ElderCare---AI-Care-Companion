import React, { useState, useEffect, useRef } from 'react';
import { ShieldExclamationIcon, XMarkIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { supabaseService } from '../services/supabaseService';
import { locationService } from '../services/locationService';
import { useNavigate } from 'react-router-dom';

const SOS: React.FC = () => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'counting' | 'alerted'>('idle');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [userName, setUserName] = useState<string>('Emergency User');
  const timerRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await supabaseService.getCurrentUser();
      if (user) {
        const profile = await supabaseService.getProfile(user.id);
        if (profile?.name) setUserName(profile.name);
      }
    };
    fetchUser();
  }, []);

  const triggerSOS = () => {
    setStatus('counting');
    setCountdown(3);
    
    // Start live tracking immediately to ensure best available location
    locationService.startLiveTracking((coords) => {
      setLocation(coords);
    });

    timerRef.current = window.setInterval(async () => {
      setCountdown(prev => {
        if (prev === 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          
          const currentLoc = locationService.getLastKnownLocation();
          const locStr = currentLoc 
            ? `GPS: ${currentLoc.lat.toFixed(4)}, ${currentLoc.lng.toFixed(4)} (acc: ${Math.round(currentLoc.accuracy)}m)` 
            : 'Location unknown';
          
          // Trigger SOS Alert
          supabaseService.triggerSOS(`${userName} needs help immediately! Current ${locStr}`);
          
          setStatus('alerted');
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    locationService.stopLiveTracking();
    setStatus('idle');
    setCountdown(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex justify-end">
        {status !== 'counting' && (
          <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-full shadow-md text-slate-400">
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10">
        {status === 'idle' && (
          <>
            <div className="bg-rose-100 p-8 rounded-full animate-pulse shadow-2xl shadow-rose-200">
              <ShieldExclamationIcon className="w-24 h-24 text-rose-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Emergency</h2>
              <p className="text-lg text-slate-500 font-bold max-w-[280px]">Press and hold to notify your family immediately.</p>
            </div>
            <button 
              onMouseDown={triggerSOS}
              onTouchStart={triggerSOS}
              className="w-56 h-56 bg-rose-600 rounded-full text-white text-5xl font-black shadow-[0_20px_50px_rgba(225,29,72,0.4)] hover:bg-rose-700 active:scale-90 transition-all border-[12px] border-rose-400/50"
            >
              SOS
            </button>
          </>
        )}

        {status === 'counting' && (
          <div className="space-y-8 animate-in zoom-in duration-300">
            <h2 className="text-4xl font-black text-rose-600 uppercase">Alerting Caregivers</h2>
            <div className="text-[14rem] font-black leading-none text-rose-600 tabular-nums">
              {countdown}
            </div>
            <button 
              onClick={cancelSOS}
              className="bg-slate-800 text-white w-full max-w-xs py-6 rounded-3xl text-2xl font-black shadow-xl"
            >
              STOP ALERT
            </button>
          </div>
        )}

        {status === 'alerted' && (
          <div className="bg-white p-8 rounded-[40px] shadow-2xl border-4 border-rose-500 w-full animate-in slide-in-from-bottom-20 duration-500">
            <div className="flex flex-col items-center gap-4 text-rose-600 mb-6">
              <ShieldExclamationIcon className="w-16 h-16" />
              <h2 className="text-3xl font-black uppercase tracking-tight">Help is notified</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                <p className="text-emerald-700 font-black text-xs uppercase">Message Sent via Cloud</p>
              </div>
              <button 
                onClick={() => {
                  locationService.stopLiveTracking();
                  setStatus('idle');
                }}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl text-xl font-black mt-4 shadow-lg"
              >
                I AM SAFE NOW
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOS;