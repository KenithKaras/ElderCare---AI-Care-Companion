
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Medication, UserRole, UserProfile, VitalSign } from '../types';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ArrowRightIcon,
  HeartIcon,
  PhoneIcon,
  VideoCameraIcon,
  FaceSmileIcon,
  ClipboardDocumentIcon,
  FireIcon,
  ArrowPathIcon,
  MapPinIcon,
  SignalIcon,
  MapIcon,
  PlusCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';
import { Link, useNavigate } from 'react-router-dom';
import { googleFitService } from '../services/googleFitService';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [linkedMember, setLinkedMember] = useState<UserProfile | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [steps, setSteps] = useState<number>(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const loadDashboardData = async () => {
    try {
      const authUser = await supabaseService.getCurrentUser();
      if (!authUser) return;

      const profile = await supabaseService.getProfile(authUser.id);
      setUser(profile);

      const isCaregiver = profile?.role === UserRole.CAREGIVER;
      const targetId = (isCaregiver && profile?.monitored_user_id) 
        ? profile.monitored_user_id 
        : authUser.id;

      const promises: any[] = [
        supabaseService.getMedications(targetId),
        supabaseService.getVitals(targetId)
      ];

      if (isCaregiver && profile?.monitored_user_id) {
        const senior = await supabaseService.getProfile(profile.monitored_user_id);
        // Only consider linked if mutual
        if (senior && senior.monitored_user_id?.split(',').includes(profile.id)) {
          setLinkedMember(senior);
        } else {
          setLinkedMember(null);
        }
      }

      const results = await Promise.all(promises);
      const fetchedMeds = (results[0] || []).filter((m: Medication) => !m.taken).slice(0, 3);
      const fetchedVitals = (results[1] || []) as VitalSign[];
      
      setMeds(fetchedMeds);
      setVitals(fetchedVitals);


      const latestStepVital = fetchedVitals.find(v => v.type === 'Steps');
      if (latestStepVital) {
        const stepVal = parseInt(latestStepVital.value) || 0;
        setSteps(stepVal);
        setLastSync(latestStepVital.timestamp);
        localStorage.setItem('eca_last_steps', stepVal.toString());
      } else {
        const cachedSteps = parseInt(localStorage.getItem('eca_last_steps') || '0');
        setSteps(cachedSteps);
        setLastSync(localStorage.getItem('eca_last_background_sync'));
      }
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadDashboardData();
      setLoading(false);
    };
    init();

    const handleSyncComplete = () => loadDashboardData();
    const handleVitalUpdate = (e: any) => {
      const vital = e.detail as VitalSign;
      if (vital.type === 'Steps') {
        setSteps(parseInt(vital.value) || 0);
        setLastSync(vital.timestamp);
      }
      setVitals(prev => [vital, ...prev.filter(v => v.id !== vital.id)].slice(0, 50));
    };

    window.addEventListener('eca_background_sync_complete', handleSyncComplete);
    window.addEventListener('eca_vital_update', handleVitalUpdate);
    const refreshInterval = setInterval(loadDashboardData, 30000);

    return () => {
      window.removeEventListener('eca_background_sync_complete', handleSyncComplete);
      window.removeEventListener('eca_vital_update', handleVitalUpdate);
      clearInterval(refreshInterval);
    };
  }, []);

  const formatCoords = (val: string) => {
    if (!val || !val.includes(',')) return val;
    const parts = val.split(',');
    return `${parseFloat(parts[0]).toFixed(4)}, ${parseFloat(parts[1]).toFixed(4)}`;
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await googleFitService.syncData();
      await loadDashboardData();
    } catch (e) {
      console.warn("Fit sync failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyId = () => {
    if (user?.unique_no) {
      navigator.clipboard.writeText(user.unique_no.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="p-8 animate-pulse space-y-4"><div className="h-32 bg-slate-100 rounded-[32px]"></div><div className="h-64 bg-slate-100 rounded-[32px]"></div></div>;

  const isCaregiver = user?.role === UserRole.CAREGIVER;
  const progress = Math.min((steps / 5000) * 100, 100);
  const locationVital = vitals.find(v => v.type === 'Location');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {isCaregiver ? (
        <header className="flex justify-between items-start pt-2 px-1">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 relative">
              <SignalIcon className="w-8 h-8 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Monitoring</h2>
              <p className="text-slate-500 font-bold text-xs">Watching {linkedMember?.name || '---'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600 border border-slate-100"><PhoneIcon className="w-5 h-5"/></button>
            <button className="p-3 bg-indigo-600 rounded-2xl shadow-lg text-white"><VideoCameraIcon className="w-5 h-5"/></button>
          </div>
        </header>
      ) : (
        <section className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">My Care ID</p>
              <h2 className="text-4xl font-black tracking-tighter">#{user?.unique_no || '-----'}</h2>
            </div>
            <button 
              onClick={handleCopyId}
              className={`p-4 rounded-2xl transition-all flex flex-col items-center gap-1 ${copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <ClipboardDocumentIcon className="w-6 h-6" />
              <span className="text-[8px] font-black uppercase">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
        </section>
      )}

      {/* AI COMPANION CALL CARD */}
      {!isCaregiver && (
        <button 
          onClick={() => navigate('/ai-call')}
          className="w-full bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[32px] text-white flex items-center justify-between shadow-xl shadow-indigo-200 active:scale-95 transition-all group"
        >
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                <SparklesIcon className="w-8 h-8 text-white" />
             </div>
             <div className="text-left">
                <p className="text-xl font-black leading-none">AI Companion</p>
                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">Talk to Puck Now</p>
             </div>
          </div>
          <div className="bg-white/10 p-3 rounded-full">
            <PhoneIcon className="w-5 h-5 text-white" />
          </div>
        </button>
      )}

      {/* Medication Reminder Block */}
      {!isCaregiver && meds.length > 0 && (
        <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <PlusCircleIcon className="w-5 h-5 text-indigo-600" />
              Upcoming Meds
            </h3>
            <Link to="/meds" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">View All</Link>
          </div>
          <div className="space-y-3">
            {meds.map(med => (
              <div key={med.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💊</span>
                  <div>
                    <p className="font-black text-slate-800 text-sm leading-none mb-1">{med.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{med.dosage}</p>
                  </div>
                </div>
                <p className="text-indigo-600 font-black text-sm">{med.time}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
              <FireIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Steps Activity</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-800 tracking-tight">{steps.toLocaleString()}</p>
                <p className="text-sm font-bold text-slate-300">/ 5,000</p>
              </div>
            </div>
          </div>
          <div className="text-right">
             {!isCaregiver && (
                <button onClick={handleSync} className="p-3 bg-orange-50 text-orange-600 rounded-xl mb-2">
                  <ArrowPathIcon className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
             )}
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                {lastSync ? `Updated ${new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not Synced'}
             </p>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
           <div className="h-full bg-orange-500 transition-all duration-1000 shadow-inner" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <section className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-2 gap-8">
           <div className="space-y-1"><p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Heart Rate</p><p className="text-4xl font-black tracking-tighter">{vitals.find(v => v.type === 'Heart Rate')?.value || '--'}</p><p className="text-[10px] text-slate-500 font-bold uppercase">BPM</p></div>
           <div className="space-y-1 text-right"><p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Blood Pressure</p><p className="text-4xl font-black tracking-tighter">{vitals.find(v => v.type === 'Blood Pressure')?.value || '--'}</p><p className="text-[10px] text-slate-500 font-bold uppercase">mmHg</p></div>
           <div className="space-y-1"><p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Blood Sugar</p><p className="text-4xl font-black tracking-tighter">{vitals.find(v => v.type === 'Blood Sugar')?.value || '--'}</p><p className="text-[10px] text-slate-500 font-bold uppercase">mg/dL</p></div>
           <div className="space-y-1 text-right"><p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Updated</p><p className="text-sm font-black uppercase text-slate-300 mt-2">{vitals[0] ? new Date(vitals[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</p></div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-3"><MapPinIcon className="w-6 h-6 text-emerald-500" /> Live Location</h3>
        </div>
        {locationVital ? (
          <div className="space-y-4">
            <div className="h-64 bg-slate-50 rounded-3xl relative overflow-hidden border border-slate-100 shadow-inner flex flex-col items-center justify-center">
              <MapIcon className="w-20 h-20 text-slate-200" />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-[2px]">
                 <div className="w-12 h-12 bg-indigo-600 rounded-full border-4 border-white shadow-2xl animate-bounce flex items-center justify-center"><div className="w-3 h-3 bg-white rounded-full"></div></div>
                 <div className="mt-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/50 text-center">
                    <p className="text-[10px] font-black text-slate-800 uppercase">Marker Active</p>
                    <p className="text-[9px] font-bold text-slate-500">{formatCoords(locationVital.value)}</p>
                 </div>
              </div>
            </div>
            <a href={`https://www.google.com/maps?q=${locationVital.value}`} target="_blank" rel="noopener noreferrer" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">Open Map Navigation</a>
          </div>
        ) : (
          <div className="h-32 bg-slate-50 rounded-3xl flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 opacity-60">
             <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-relaxed">No location data shared.</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 pb-4">
         <Link to="/health" className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500"><HeartIcon className="w-6 h-6" /></div>
            <p className="font-black text-slate-800 text-lg tracking-tight">Vitals Logs</p>
         </Link>
         <Link to="/wellness" className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500"><FaceSmileIcon className="w-6 h-6" /></div>
            <p className="font-black text-slate-800 text-lg tracking-tight">Wellness Mind</p>
         </Link>
      </div>
    </div>
  );
};

export default Dashboard;
