import React, { useState, useEffect } from 'react';
import { Appointment } from '../types';
import { storageService } from '../services/storageService';
import { CalendarDaysIcon, PlusIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/solid';

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newApp, setNewApp] = useState<Partial<Appointment>>({ 
    doctorName: '', specialty: '', date: '', time: '', notes: '' 
  });

  useEffect(() => {
    setAppointments(storageService.getAppointments());
  }, []);

  const handleAdd = () => {
    if (!newApp.doctorName || !newApp.date) return;
    const app: Appointment = {
      id: Date.now().toString(),
      doctorName: newApp.doctorName!,
      specialty: newApp.specialty || 'General',
      date: newApp.date!,
      time: newApp.time || '10:00 AM',
      notes: newApp.notes,
      reminded: false
    };
    const updated = [...appointments, app];
    setAppointments(updated);
    storageService.saveAppointments(updated);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Remove this appointment?")) return;
    const updated = appointments.filter(a => a.id !== id);
    setAppointments(updated);
    storageService.saveAppointments(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <CalendarDaysIcon className="w-8 h-8 text-indigo-500" />
          Visits
        </h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"
        >
          <PlusIcon className="w-5 h-5" /> Schedule
        </button>
      </div>

      <div className="space-y-4">
        {appointments.length > 0 ? appointments.map(app => (
          <div key={app.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4 relative group">
            <div className="flex items-center gap-5">
              <div className="bg-indigo-50 p-3 rounded-2xl text-center min-w-[70px]">
                <p className="text-indigo-600 font-black uppercase text-[10px]">Date</p>
                <p className="text-xl font-black">{app.date.split('-')[2]}</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase">{new Date(app.date).toLocaleString('default', { month: 'short' })}</p>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-black text-slate-800">{app.doctorName}</h3>
                  <button 
                    onClick={() => handleDelete(app.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-indigo-600 font-bold text-xs">{app.specialty}</p>
                <div className="flex items-center gap-3 mt-1.5 text-slate-400 text-xs">
                  <div className="flex items-center gap-1 font-bold">
                    <ClockIcon className="w-4 h-4" />
                    <span>{app.time}</span>
                  </div>
                </div>
              </div>
            </div>
            {app.notes && (
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-xs text-slate-500 italic font-medium leading-relaxed">"{app.notes}"</p>
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-lg font-bold text-slate-300">No visits planned.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 space-y-6 shadow-2xl animate-in slide-in-from-bottom-20">
            <h3 className="text-xl font-black text-slate-800">Schedule Visit</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Doctor Name</label>
                <input 
                  type="text" placeholder="Dr. Sarah Johnson" 
                  className="w-full rounded-xl border border-slate-200 p-4 text-base font-bold text-black bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={e => setNewApp({...newApp, doctorName: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialty</label>
                <input 
                  type="text" placeholder="e.g. Cardiology" 
                  className="w-full rounded-xl border border-slate-200 p-4 text-base font-bold text-black bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={e => setNewApp({...newApp, specialty: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input 
                    type="date" className="w-full rounded-xl border border-slate-200 p-4 text-base font-bold text-black bg-slate-50 focus:bg-white outline-none"
                    onChange={e => setNewApp({...newApp, date: e.target.value})}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</label>
                  <input 
                    type="time" className="w-full rounded-xl border border-slate-200 p-4 text-base font-bold text-black bg-slate-50 focus:bg-white outline-none"
                    onChange={e => setNewApp({...newApp, time: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                <textarea 
                  placeholder="Additional details..."
                  className="w-full rounded-xl border border-slate-200 p-4 text-base font-bold text-black bg-slate-50 focus:bg-white outline-none h-24 resize-none"
                  onChange={e => setNewApp({...newApp, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 border-2 border-slate-100 rounded-xl font-black text-slate-400">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;