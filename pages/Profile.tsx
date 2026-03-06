import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabaseService } from '../services/supabaseService';
import { UserProfile, UserRole } from '../types';
import { 
  UserCircleIcon, 
  PhoneIcon, 
  HeartIcon, 
  PencilSquareIcon,
  CheckCircleIcon,
  FingerPrintIcon,
  LinkIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ArrowLeftStartOnRectangleIcon,
  KeyIcon,
  CpuChipIcon,
  ChevronRightIcon,
  UserPlusIcon,
  NoSymbolIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<UserProfile>>({});
  const navigate = useNavigate();
  
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkID, setLinkID] = useState('');
  const [linkStatus, setLinkStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });
  const [isLinking, setIsLinking] = useState(false);

  const [caregivers, setCaregivers] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<UserProfile[]>([]);
  const [monitoredMember, setMonitoredMember] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const authUser = await supabaseService.getCurrentUser();
    if (authUser) {
      const profile = await supabaseService.getProfile(authUser.id);
      setUser(profile);
      setEditedUser(profile || {});

      if (profile?.role === UserRole.ELDER) {
        // Load approved caregivers
        if (profile.monitored_user_id) {
          const ids = profile.monitored_user_id.split(',');
          const profiles = await Promise.all(ids.map(id => supabaseService.getProfile(id)));
          setCaregivers(profiles.filter((p): p is UserProfile => p !== null));
        } else {
          setCaregivers([]);
        }

        // Load pending requests
        const requests = await supabaseService.getPendingLinkRequests(profile.id);
        const approvedIds = profile.monitored_user_id ? profile.monitored_user_id.split(',') : [];
        setPendingRequests(requests.filter(r => !approvedIds.includes(r.id)));
      } else if (profile?.monitored_user_id) {
        // Caregiver monitoring an elder
        const linked = await supabaseService.getProfile(profile.monitored_user_id);
        setMonitoredMember(linked);
      }
    }
  };

  const handleSave = async () => {
    if (editedUser) {
      await supabaseService.updateProfile(editedUser as UserProfile);
      await loadProfile();
      setIsEditing(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabaseService.signOut();
    navigate('/auth');
  };

  const handleLinkRequest = async () => {
    if (linkID.length < 5) {
      setLinkStatus({ type: 'error', msg: 'Enter a 5-digit code.' });
      return;
    }

    setIsLinking(true);
    const result = await supabaseService.requestLinkToElder(linkID);
    setIsLinking(false);

    if (result.success) {
      setLinkStatus({ type: 'success', msg: result.message });
      setTimeout(() => setShowLinkModal(false), 3000);
    } else {
      setLinkStatus({ type: 'error', msg: result.message });
    }
  }

  const handleRegenerateCode = async () => {
    const newCode = await supabaseService.regenerateInviteCode();
    if (newCode) {
      setUser(prev => prev ? { ...prev, unique_no: newCode } : null);
    }
  };

  const handleRemoveCaregiver = async (id: string) => {
    await supabaseService.removeCaregiver(id);
    loadProfile();
  };

  const handleRespondToRequest = async (caregiverId: string, approve: boolean) => {
    await supabaseService.respondToLinkRequest(caregiverId, approve);
    loadProfile();
  };

  if (!user) return null;

  const isElder = user.role === UserRole.ELDER;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">My Profile</h2>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all ${
            isEditing ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white border border-slate-200 text-slate-600 shadow-sm'
          }`}
        >
          {isEditing ? <CheckCircleIcon className="w-5 h-5" /> : <PencilSquareIcon className="w-5 h-5" />}
          {isEditing ? 'Save' : 'Edit'}
        </button>
      </header>

      {/* Primary Identity Card */}
      <section className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl flex items-center justify-between overflow-hidden relative">
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
            <FingerPrintIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Invite Code</p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-black tracking-[0.2em] font-mono">{user.unique_no || '-----'}</p>
              <button 
                onClick={handleRegenerateCode}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                title="Regenerate code"
              >
                <ArrowPathIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
        {!isElder && (
          <button 
            onClick={() => setShowLinkModal(true)}
            className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex flex-col items-center relative z-10"
          >
            <LinkIcon className="w-6 h-6" />
            <span className="text-[8px] font-black uppercase mt-1">Link Elder</span>
          </button>
        )}
      </section>

      {/* Pending Request Notification */}
      {isElder && pendingRequests.map(request => (
        <div key={request.id} className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[32px] space-y-4 animate-bounce-subtle">
           <div className="flex items-center gap-3">
              <UserPlusIcon className="w-6 h-6 text-amber-600" />
              <p className="text-sm font-black text-slate-800">Connection Request</p>
           </div>
           <p className="text-xs font-bold text-slate-500 leading-relaxed">
             <strong>{request.name}</strong> wants to link with your account to monitor your safety. Do you allow this?
           </p>
           <div className="flex gap-2">
              <button onClick={() => handleRespondToRequest(request.id, true)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">Approve</button>
              <button onClick={() => handleRespondToRequest(request.id, false)} className="flex-1 bg-white border border-slate-200 text-slate-400 py-3 rounded-xl font-black text-[10px] uppercase">Deny</button>
           </div>
        </div>
      ))}

      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 bg-indigo-100 rounded-[32px] flex items-center justify-center text-indigo-600 border-4 border-white shadow-xl">
          <UserCircleIcon className="w-16 h-16" />
        </div>
        <div className="w-full">
          {isEditing ? (
            <input 
              className="text-2xl font-black text-center bg-slate-50 border-b-2 border-indigo-500 outline-none w-full max-w-[200px]"
              value={editedUser.name || ''}
              onChange={e => setEditedUser({...editedUser, name: e.target.value})}
            />
          ) : (
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{user.name}</h3>
          )}
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
            {isElder ? 'Senior Citizen' : `Caregiver Account`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Link to="/devices" className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-95 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <CpuChipIcon className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-black text-slate-800 leading-none">Devices & Health Sync</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Manage Watch & Google Fit</p>
            </div>
          </div>
          <ChevronRightIcon className="w-6 h-6 text-slate-300" />
        </Link>
      </div>

      {/* Active Connections for Elder */}
      {isElder && caregivers.length > 0 && (
        <section className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Approved Caregivers</h4>
          <div className="grid grid-cols-1 gap-3">
            {caregivers.map(cg => (
              <div key={cg.id} className="bg-emerald-50 p-4 rounded-[32px] border-2 border-emerald-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600">
                    <UserCircleIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{cg.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Authorized Caregiver</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveCaregiver(cg.id)}
                  className="bg-white text-rose-500 p-2 rounded-xl shadow-sm border border-rose-100 active:scale-95 transition-all"
                  title="Remove Caregiver"
                >
                  <NoSymbolIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Caregiver's Monitored Member */}
      {!isElder && monitoredMember && (
        <section className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Monitoring Member</h4>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                <UserCircleIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="font-black text-slate-800 text-base">{monitoredMember.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Senior Citizen</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowLinkModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="text-center space-y-4 mb-8">
              <h3 className="text-2xl font-black text-slate-800">Secure Link</h3>
              <p className="text-slate-500 text-sm font-medium">Enter the 5-digit Invite Code found on the Elder's profile.</p>
            </div>
            <div className="space-y-6">
              <input 
                type="text" placeholder="1 2 3 4 5" value={linkID}
                onChange={(e) => setLinkID(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={5}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-3xl font-black text-center tracking-widest outline-none focus:border-indigo-500 font-mono"
              />
              {linkStatus.type && (
                <div className={`p-4 rounded-xl text-center text-xs font-black uppercase ${
                  linkStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {linkStatus.msg}
                </div>
              )}
              <button onClick={handleLinkRequest} disabled={isLinking || linkID.length < 5}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl disabled:opacity-50"
              >
                {isLinking ? 'SENDING REQUEST...' : 'REQUEST ACCESS'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={handleSignOut} disabled={isSigningOut}
        className="w-full bg-slate-50 text-slate-400 py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
      >
        <ArrowLeftStartOnRectangleIcon className="w-6 h-6" />
        Sign Out
      </button>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default Profile;