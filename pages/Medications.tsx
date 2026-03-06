import React, { useState, useEffect, useRef } from 'react';
import { Medication, UserRole, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';
import { 
  PlusIcon, 
  CheckCircleIcon, 
  TrashIcon, 
  ArrowUturnLeftIcon, 
  PlusCircleIcon, 
  XMarkIcon, 
  UserCircleIcon, 
  ArrowPathIcon,
  ShieldExclamationIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/solid';

const Medications: React.FC = () => {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [linkedMember, setLinkedMember] = useState<UserProfile | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const SQL_FIX_MEDS = `CREATE POLICY "Caregivers can insert elder meds" ON medications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.monitored_user_id = user_id));`;

  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    time: '08:00',
    frequency: 'Once Daily'
  });

  const undoTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    loadData();
    return () => { if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const user = await supabaseService.getCurrentUser();
    if (user) {
      const profile = await supabaseService.getProfile(user.id);
      setUserProfile(profile);
      
      let targetId = user.id;
      if (profile?.role === UserRole.CAREGIVER && profile?.monitored_user_id) {
        const senior = await supabaseService.getProfile(profile.monitored_user_id);
        setLinkedMember(senior);
        targetId = senior?.id || user.id;
      }

      const medData = await supabaseService.getMedications(targetId);
      setMeds(medData);
    }
    setLoading(false);
  };

  const toggleTaken = async (id: string) => {
    const targetMed = meds.find(m => m.id === id);
    if (!targetMed) return;

    const isMarkingAsTaken = !targetMed.taken;
    setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: isMarkingAsTaken } : m));
    await supabaseService.toggleMedication(id, isMarkingAsTaken);

    if (isMarkingAsTaken) {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      setUndoId(id);
      undoTimeoutRef.current = window.setTimeout(() => setUndoId(null), 5000);
    }
  };

  const handleDeleteMed = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this medication from the plan?")) return;
    setMeds(prev => prev.filter(m => m.id !== id));
    await supabaseService.deleteMedication(id);
  };

  const handleUndo = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: false } : m));
    await supabaseService.toggleMedication(id, false);
    setUndoId(null);
  };

  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name || !newMed.dosage || isSaving) return;

    setPermissionError(null);
    setIsSaving(true);

    const targetUserId = (userProfile?.role === UserRole.CAREGIVER && linkedMember) 
      ? linkedMember.id 
      : userProfile?.id;

    if (!targetUserId) {
       setPermissionError("Internal Error: Target User ID not found.");
       setIsSaving(false);
       return;
    }

    try {
      const { error } = await supabaseService.addMedication(newMed, targetUserId);
      
      if (error) {
        if ((error as any).code === '42501') {
          setPermissionError("PERMISSION_DENIED");
          return;
        }
        throw error;
      }
      
      setShowAddModal(false);
      setNewMed({ name: '', dosage: '', time: '08:00', frequency: 'Once Daily' });
      await loadData();
    } catch (err: any) {
      console.error("Save Med Error:", err);
      setPermissionError(err.message || "Failed to save medication.");
    } finally {
      setIsSaving(false);
    }
  };

  const copySqlMeds = () => {
    navigator.clipboard.writeText(SQL_FIX_MEDS);
    alert("SQL copied! Run it in Supabase SQL Editor.");
  };

  const isCaregiver = userProfile?.role === UserRole.CAREGIVER;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pharmacy</h2>
          {isCaregiver && linkedMember && (
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Managing {linkedMember.name}'s Meds</p>
          )}
        </div>
        <button 
          onClick={() => { setPermissionError(null); setShowAddModal(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <PlusIcon className="w-6 h-6" /> Add
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center opacity-20"><ArrowPathIcon className="w-10 h-10 animate-spin" /></div>
        ) : meds.length > 0 ? meds.map(m => {
          const isUndoable = undoId === m.id;
          return (
            <div key={m.id} className={`p-6 rounded-[32px] border-2 transition-all duration-500 relative overflow-hidden ${m.taken ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${m.taken ? 'bg-white text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {m.taken ? '✅' : '💊'}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 leading-none">{m.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{m.dosage} • {m.frequency}</p>
                    <p className="text-lg font-black text-indigo-600 mt-1">{m.time}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {m.taken ? <CheckCircleIcon className="w-8 h-8 text-emerald-500" /> : <button onClick={() => handleDeleteMed(m.id)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>}
                </div>
              </div>
              {isUndoable ? (
                <button onClick={(e) => handleUndo(e, m.id)} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-3"><ArrowUturnLeftIcon className="w-5 h-5" /> UNDO ACTION</button>
              ) : (
                <button onClick={() => toggleTaken(m.id)} className={`w-full py-4 rounded-2xl font-black text-base transition-all ${m.taken ? 'bg-white text-emerald-600 border-2 border-emerald-100' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}>{m.taken ? 'COMPLETED' : 'MARK AS TAKEN'}</button>
              )}
            </div>
          );
        }) : (
          <div className="py-20 text-center opacity-30 border-2 border-dashed border-slate-200 rounded-[40px]"><PlusCircleIcon className="w-12 h-12 mx-auto mb-4" /><p className="font-black text-xs uppercase tracking-widest">No medications listed</p></div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">New Medication</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><XMarkIcon className="w-6 h-6"/></button>
            </div>
            
            {permissionError === 'PERMISSION_DENIED' ? (
              <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[32px] space-y-4 animate-in slide-in-from-top-2">
                 <div className="flex items-center gap-3">
                    <ShieldExclamationIcon className="w-6 h-6 text-rose-600 shrink-0" />
                    <p className="text-xs font-black text-rose-800 uppercase">Database Permission Error</p>
                 </div>
                 <p className="text-[11px] font-bold text-rose-700 leading-relaxed">
                   Caregivers are currently blocked from saving plans for Elders. 
                   Copy the SQL below and run it in your <strong>Supabase SQL Editor</strong> to fix this:
                 </p>
                 <div className="bg-white/60 p-3 rounded-xl border border-rose-200 font-mono text-[9px] break-all text-rose-900 select-all">
                    {SQL_FIX_MEDS}
                 </div>
                 <button onClick={copySqlMeds} className="w-full bg-rose-600 text-white py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                    <ClipboardDocumentIcon className="w-4 h-4" /> Copy SQL Fix
                 </button>
              </div>
            ) : permissionError && (
              <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl flex items-start gap-3">
                 <ShieldExclamationIcon className="w-6 h-6 text-rose-600 shrink-0" />
                 <p className="text-[11px] font-bold text-rose-700 leading-tight">{permissionError}</p>
              </div>
            )}

            <form onSubmit={handleAddMed} className="space-y-4">
              <input type="text" placeholder="Name (e.g. Aspirin)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-lg font-black outline-none focus:border-indigo-500" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} required />
              <input type="text" placeholder="Dosage (e.g. 50mg)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-lg font-black outline-none focus:border-indigo-500" value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <input type="time" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-lg font-black outline-none" value={newMed.time} onChange={e => setNewMed({...newMed, time: e.target.value})} />
                <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black uppercase outline-none" value={newMed.frequency} onChange={e => setNewMed({...newMed, frequency: e.target.value})}>
                  <option>Once Daily</option><option>Twice Daily</option><option>As Needed</option>
                </select>
              </div>
              <button type="submit" disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center gap-2">
                {isSaving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'SAVE PLAN'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medications;