import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { VitalSign, Medication, AppNotification, UserProfile } from '../types';
import { 
  UserCircleIcon, 
  MapIcon, 
  ExclamationTriangleIcon,
  PhoneArrowUpRightIcon,
  ClockIcon,
  BellIcon,
  VideoCameraIcon,
  MapPinIcon,
  FireIcon,
  ArrowTopRightOnSquareIcon,
  SignalIcon,
  CheckBadgeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/solid';

const CaregiverDashboard: React.FC = () => {
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [linkedMember, setLinkedMember] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const formatCoords = (val: string) => {
    if (!val || !val.includes(',')) return val;
    const parts = val.split(',');
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return val;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const loadCloudData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const user = await supabaseService.getCurrentUser();
      if (!user) return;

      const profile = await supabaseService.getProfile(user.id);
      if (profile?.monitored_user_id) {
        const senior = await supabaseService.getProfile(profile.monitored_user_id);
        
        // Only show data if the link is mutual (Elder has also linked back)
        if (senior && senior.monitored_user_id?.split(',').includes(profile.id)) {
          setLinkedMember(senior);

          const [vitalData, medData] = await Promise.all([
            supabaseService.getVitals(senior.id),
            supabaseService.getMedications(senior.id)
          ]);
          setVitals(vitalData);
          setMeds(medData);
        } else {
          setLinkedMember(null);
        }
      }
    } catch (error) {
      console.error("Caregiver Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let sosSubscription: any = null;
    let vitalSubscription: any = null;
    let medSubscription: any = null;

    const setupSync = async () => {
      await loadCloudData(true);
      const user = await supabaseService.getCurrentUser();
      const profile = await supabaseService.getProfile(user?.id || '');
      
      if (profile?.monitored_user_id) {
        const elderId = profile.monitored_user_id;

        // Subscribe to SOS
        sosSubscription = supabaseService.subscribeToSOS(elderId, (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications(prev => [newNotif, ...prev]);
          loadCloudData();
        });

        // Real-time Vitals
        vitalSubscription = supabaseService.supabase
          .channel(`caregiver_vitals_${elderId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'vitals', filter: `user_id=eq.${elderId}` }, () => {
            loadCloudData();
          })
          .subscribe();

        // Real-time Meds
        medSubscription = supabaseService.supabase
          .channel(`caregiver_meds_${elderId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'medications', filter: `user_id=eq.${elderId}` }, () => {
            loadCloudData();
          })
          .subscribe();
      }
    };

    setupSync();

    return () => {
      if (sosSubscription) sosSubscription.unsubscribe();
      if (vitalSubscription) vitalSubscription.unsubscribe();
      if (medSubscription) medSubscription.unsubscribe();
    };
  }, []);

  if (loading) return <div className="flex flex-col items-center justify-center py-20 space-y-4"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Linking with Member...</p></div>;

  if (!linkedMember) return <div className="p-10 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 space-y-6"><UserCircleIcon className="w-20 h-20 text-slate-200 mx-auto" /><h3 className="text-xl font-black text-slate-800">No Member Linked</h3><p className="text-slate-400 text-sm font-bold">Ask the Elder for their Invite Code and enter it in your Profile.</p><button onClick={() => window.location.hash = '#/profile'} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-lg">Link Profile Now</button></div>;

  const stepsVital = vitals.find(v => v.type === 'Steps');
  const locationVital = vitals.find(v => v.type === 'Location');
  const currentSteps = stepsVital ? parseInt(stepsVital.value) : 0;
  const progress = Math.min((currentSteps / 5000) * 100, 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-[24px] flex items-center justify-center text-indigo-600 shadow-sm relative shrink-0">
            <UserCircleIcon className="w-12 h-12" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
          </div>
          <div className="min-w-0">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight truncate">{linkedMember.name}</h2>
            <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
              <SignalIcon className="w-3 h-3 animate-pulse" />
              Live Health Stream
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
           <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
           <p className="text-[10px] font-black text-indigo-700 uppercase tracking-tight">Active Connection Authorized</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
           <button className="bg-white border-2 border-indigo-600 text-indigo-600 p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 uppercase active:scale-95 transition-all"><PhoneArrowUpRightIcon className="w-5 h-5" /> Voice</button>
           <button className="bg-indigo-600 text-white p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg uppercase active:scale-95 transition-all"><VideoCameraIcon className="w-5 h-5" /> Video</button>
        </div>
      </header>

      <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500"><FireIcon className="w-6 h-6" /></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Activity Status</h3>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Goal: 5,000</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-end gap-1"><p className="text-4xl font-black text-slate-900 tracking-tighter">{currentSteps.toLocaleString()}</p><p className="text-sm font-bold text-slate-400 mb-1">Steps Today</p></div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div></div>
        </div>
      </section>

      <section className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-2 gap-8">
           <div className="space-y-1"><p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Heart Rate</p><p className="text-4xl font-black tracking-tighter">{vitals.find(v => v.type === 'Heart Rate')?.value || '--'}</p><p className="text-[10px] text-slate-500 font-bold uppercase">BPM</p></div>
           <div className="space-y-1 text-right"><p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Blood Pressure</p><p className="text-4xl font-black tracking-tighter">{vitals.find(v => v.type === 'Blood Pressure')?.value || '--'}</p><p className="text-[10px] text-slate-500 font-bold uppercase">mmHg</p></div>
           <div className="space-y-1"><p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Blood Sugar</p><p className="text-4xl font-black tracking-tighter">{vitals.find(v => v.type === 'Blood Sugar')?.value || '--'}</p><p className="text-[10px] text-slate-500 font-bold uppercase">mg/dL</p></div>
           <div className="space-y-1 text-right"><p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Last Update</p><p className="text-xs font-black uppercase text-slate-300 mt-2">{vitals[0] ? new Date(vitals[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</p></div>
        </div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </section>

      <section className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-3"><MapPinIcon className="w-6 h-6 text-emerald-500" /> Live Tracker</h3>
          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Real-time GPS</span>
        </div>
        {locationVital ? (
          <div className="space-y-4">
            <div className="h-64 bg-slate-50 rounded-3xl relative overflow-hidden border border-slate-100 shadow-inner flex flex-col items-center justify-center">
              <MapIcon className="w-16 h-16 text-slate-200 mb-4" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <div className="w-12 h-12 bg-indigo-600 rounded-full border-4 border-white shadow-2xl animate-bounce flex items-center justify-center"><div className="w-3 h-3 bg-white rounded-full"></div></div>
                 <div className="mt-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/50 text-center">
                    <p className="text-[10px] font-black text-slate-800 uppercase">Marker Active</p>
                    <p className="text-[9px] font-bold text-slate-500">{formatCoords(locationVital.value)}</p>
                 </div>
              </div>
            </div>
            <a href={`https://www.google.com/maps?q=${locationVital.value}`} target="_blank" rel="noopener noreferrer" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"><ArrowTopRightOnSquareIcon className="w-5 h-5" /> Open Maps Navigation</a>
          </div>
        ) : (
          <div className="h-64 bg-slate-50 rounded-3xl flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 opacity-60"><MapIcon className="w-16 h-16 text-slate-200 mb-4" /><p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">No location data found.</p></div>
        )}
      </section>
    </div>
  );
};

export default CaregiverDashboard;