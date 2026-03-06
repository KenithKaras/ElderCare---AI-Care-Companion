import React, { useState, useEffect, useMemo } from 'react';
import { VitalSign, UserRole, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  PlusIcon, 
  HeartIcon, 
  XMarkIcon, 
  ArrowPathIcon, 
  MapPinIcon, 
  TrashIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShieldExclamationIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/solid';

const HealthTracking: React.FC = () => {
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [linkedMember, setLinkedMember] = useState<UserProfile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newVital, setNewVital] = useState<Partial<VitalSign>>({ type: 'Blood Pressure', value: '' });
  const [activeChart, setActiveChart] = useState<VitalSign['type']>('Heart Rate');
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const SQL_FIX = `CREATE POLICY "Caregivers can insert elder vitals" ON vitals FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.monitored_user_id = user_id));`;

  const loadVitals = async () => {
    try {
      setLoading(true);
      const user = await supabaseService.getCurrentUser();
      if (!user) return;

      const profile = await supabaseService.getProfile(user.id);
      setUserProfile(profile);
      
      let targetId = user.id;
      if (profile?.role === UserRole.CAREGIVER && profile?.monitored_user_id) {
        const senior = await supabaseService.getProfile(profile.monitored_user_id);
        setLinkedMember(senior);
        targetId = senior?.id || user.id;
      }

      const data = await supabaseService.getVitals(targetId);
      setVitals(data);

      if (data.length > 0) {
        const firstChartable = data.find(v => ['Heart Rate', 'Blood Pressure', 'Blood Sugar', 'Weight', 'Steps'].includes(v.type));
        if (firstChartable) setActiveChart(firstChartable.type);
      }
    } catch (err) {
      console.error("Load Vitals Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVitals();
    const handleLiveUpdate = (e: any) => {
      const updatedVital = e.detail;
      setVitals(prev => {
        const exists = prev.find(v => v.id === updatedVital.id);
        if (exists) return prev;
        return [updatedVital, ...prev].slice(0, 100);
      });
    };
    window.addEventListener('eca_vital_update', handleLiveUpdate);
    return () => window.removeEventListener('eca_vital_update', handleLiveUpdate);
  }, []);

  const handleAdd = async () => {
    if (!newVital.value || isSaving) return;
    
    setIsSaving(true);
    setPermissionError(null);
    try {
      const targetUserId = (userProfile?.role === UserRole.CAREGIVER && linkedMember) 
        ? linkedMember.id 
        : userProfile?.id;

      if (!targetUserId) throw new Error("Target user ID not found. Is an elder linked?");

      const units: Record<string, string> = {
        'Blood Pressure': 'mmHg',
        'Heart Rate': 'bpm',
        'Location': 'coords',
        'Blood Sugar': 'mg/dL',
        'Weight': 'kg',
        'Steps': 'steps'
      };

      const vital: Omit<VitalSign, 'id'> = {
        type: (newVital.type || 'Blood Pressure') as any,
        value: newVital.value as string,
        timestamp: new Date().toISOString(),
        unit: units[newVital.type || 'Blood Pressure'] || 'unit'
      };
      
      const { data, error } = await supabaseService.addVital(vital, targetUserId);
      
      if (error) {
        if ((error as any).code === '42501') {
          setPermissionError("PERMISSION_DENIED");
          return;
        }
        throw error;
      }

      if (data && data[0]) {
        setVitals(prev => [data[0], ...prev]);
        if (['Heart Rate', 'Blood Pressure', 'Blood Sugar', 'Weight', 'Steps'].includes(vital.type)) {
          setActiveChart(vital.type as any); 
        }
        setShowModal(false);
        setNewVital({ type: 'Blood Pressure', value: '' });
      }
    } catch (err: any) {
      console.error("Add Vital Error:", err);
      setPermissionError(err.message || "Failed to save log.");
    } finally {
      setIsSaving(false);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SQL_FIX);
    alert("SQL copied to clipboard! Run it in your Supabase SQL Editor.");
  };

  const formatValue = (v: VitalSign) => {
    if (v.type === 'Location') {
      const coords = v.value.split(',');
      if (coords.length === 2) {
        return `${parseFloat(coords[0]).toFixed(4)}, ${parseFloat(coords[1]).toFixed(4)}`;
      }
    }
    return v.value;
  };

  const displayedVitals = showAllLogs ? vitals : vitals.slice(0, 4);
  const isCaregiver = userProfile?.role === UserRole.CAREGIVER;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3 text-slate-800">
            <HeartIcon className="w-8 h-8 text-rose-500" />
            Health Tracker
          </h2>
          {isCaregiver && linkedMember && (
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1 italic">Linked to {linkedMember.name}</p>
          )}
        </div>
        <button 
          onClick={() => { setPermissionError(null); setShowModal(true); }}
          className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <PlusIcon className="w-5 h-5" /> Add
        </button>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-col gap-6 mb-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Trend Analysis</h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-black uppercase tracking-tighter flex items-center gap-1">
              <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
              Live Sync
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latest {activeChart}</p>
               {vitals.filter(v => v.type === activeChart)[0] ? (
                 <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{vitals.filter(v => v.type === activeChart)[0].value}</span>
                    <span className="text-xs font-black text-slate-400 uppercase mb-1">{vitals.filter(v => v.type === activeChart)[0].unit}</span>
                 </div>
               ) : (
                 <span className="text-2xl font-black text-slate-200 uppercase tracking-tighter italic">No Data</span>
               )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['Heart Rate', 'Blood Pressure', 'Blood Sugar', 'Weight', 'Steps'].map(t => (
              <button 
                key={t}
                onClick={() => setActiveChart(t as any)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all border ${
                  activeChart === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="h-52 w-full -ml-4 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vitals.filter(v => v.type === activeChart).slice(0, 15).reverse().map(v => ({ time: new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), val: activeChart === 'Blood Pressure' ? (parseInt(v.value.split('/')[0]) || 0) : (parseInt(v.value) || 0) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} labelStyle={{ display: 'none' }} />
                <Line type="monotone" dataKey="val" stroke={activeChart === 'Heart Rate' ? '#f43f5e' : '#4f46e5'} strokeWidth={5} dot={{ r: 6, fill: 'white', strokeWidth: 3, stroke: activeChart === 'Heart Rate' ? '#f43f5e' : '#4f46e5' }} />
              </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-3 px-1">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-2">History Log</h3>
        {vitals.length > 0 ? displayedVitals.map(v => (
          <div key={v.id} className="bg-white p-5 rounded-[28px] border border-slate-100 flex items-center justify-between shadow-sm min-h-[90px]">
            <div className="flex items-center gap-4 min-w-0">
              <div className={`p-4 rounded-2xl shrink-0 ${v.type === 'Heart Rate' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                {v.type === 'Location' ? <MapPinIcon className="w-6 h-6" /> : <HeartIcon className="w-6 h-6" />}
              </div>
              <div className="truncate">
                <p className="font-black text-slate-800 text-base leading-none mb-1.5">{v.type}</p>
                <p className="text-[9px] text-slate-400 font-black uppercase whitespace-nowrap">
                  {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(v.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className={`font-black text-slate-900 tracking-tighter leading-tight ${v.type === 'Location' ? 'text-[11px]' : 'text-xl'}`}>
                {formatValue(v)}
              </p>
              <p className="text-[8px] text-slate-400 font-black uppercase mt-0.5">
                {v.type === 'Location' ? 'Coords' : v.unit}
              </p>
            </div>
          </div>
        )) : (
          <div className="py-24 text-center space-y-4 opacity-20"><ChartBarIcon className="w-16 h-16 mx-auto" /><p className="font-black text-[10px] uppercase tracking-[3px]">Waiting for health data</p></div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-6 z-[200] backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">New Health Log</h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><XMarkIcon className="w-6 h-6"/></button>
            </div>
            
            {permissionError === 'PERMISSION_DENIED' ? (
              <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[32px] space-y-4 animate-in slide-in-from-top-2">
                 <div className="flex items-center gap-3">
                    <ShieldExclamationIcon className="w-6 h-6 text-rose-600 shrink-0" />
                    <p className="text-xs font-black text-rose-800 uppercase">Supabase Setup Required</p>
                 </div>
                 <p className="text-[11px] font-bold text-rose-700 leading-relaxed">
                   Your Supabase database is blocking Caregivers from saving logs. 
                   Copy the SQL below and run it in your <strong>Supabase SQL Editor</strong> to fix this:
                 </p>
                 <div className="bg-white/60 p-3 rounded-xl border border-rose-200 font-mono text-[9px] break-all text-rose-900 select-all">
                    {SQL_FIX}
                 </div>
                 <button onClick={copySql} className="w-full bg-rose-600 text-white py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                    <ClipboardDocumentIcon className="w-4 h-4" /> Copy SQL Fix
                 </button>
              </div>
            ) : permissionError && (
              <div className="bg-rose-50 p-4 rounded-xl text-rose-600 text-[10px] font-black uppercase text-center border border-rose-100">{permissionError}</div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vital Category</label>
                <div className="grid grid-cols-2 gap-2">
                   {['Heart Rate', 'Blood Pressure', 'Blood Sugar', 'Weight', 'Steps'].map(t => (
                     <button key={t} onClick={() => setNewVital({...newVital, type: t as any})} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${newVital.type === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{t}</button>
                   ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reading Value</label>
                <input type="text" placeholder={newVital.type === 'Blood Pressure' ? '120/80' : '72'} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-2xl font-black text-black outline-none focus:border-indigo-500 transition-all" value={newVital.value} onChange={e => setNewVital({...newVital, value: e.target.value})} />
              </div>
            </div>
            
            <button onClick={handleAdd} disabled={isSaving || !newVital.value} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
              {isSaving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'SAVE LOG'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthTracking;