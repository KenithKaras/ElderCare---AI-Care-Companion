import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  HeartIcon, 
  PlusCircleIcon, 
  CalendarIcon, 
  FaceSmileIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  PhoneIcon,
  CpuChipIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ShieldExclamationIcon as ShieldSolid } from '@heroicons/react/24/solid';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { supabaseService } from '../services/supabaseService';
import { UserRole, UserProfile, AppNotification } from '../types';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sosAlert, setSosAlert] = useState<AppNotification | null>(null);
  const authInitialized = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLandingPage = location.pathname === '/' && !user;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const initializeAuth = async () => {
      if (authInitialized.current) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          const profile = await supabaseService.getProfile(session.user.id);
          if (mounted) setUser(profile);
          authInitialized.current = true;
        } else if (location.pathname !== '/auth' && location.pathname !== '/' && mounted) {
          navigate('/auth');
        }
      } catch (err) {
        if (mounted && location.pathname !== '/' && location.pathname !== '/auth') navigate('/auth');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        authInitialized.current = false;
        if (location.pathname !== '/auth' && location.pathname !== '/') navigate('/');
      } else if (session && !user) {
        const profile = await supabaseService.getProfile(session.user.id);
        if (mounted) {
          setUser(profile);
          authInitialized.current = true;
        }
        if (location.pathname === '/auth') navigate('/');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, user]);

  useEffect(() => {
    let sosSub: any = null;
    if (isSupabaseConfigured && user?.role === UserRole.CAREGIVER && user.monitored_user_id) {
      sosSub = supabaseService.subscribeToSOS(user.monitored_user_id, (payload) => {
        const newNotif = payload.new as AppNotification;
        setSosAlert(newNotif);
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play();
        } catch (e) {}
      });
    }
    return () => {
      if (sosSub) supabase.removeChannel(sosSub);
    };
  }, [user]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-amber-100 p-6 rounded-full mb-6">
          <ExclamationTriangleIcon className="w-12 h-12 text-amber-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Configuration Required</h1>
        <p className="text-slate-500 max-w-xs mb-8 font-medium">Please set your Supabase environment variables.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAuthPage = location.pathname === '/auth';
  if (isAuthPage || isLandingPage) return <>{children}</>;

  const navItems = user?.role === UserRole.CAREGIVER ? [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Chat', path: '/messages', icon: ChatBubbleOvalLeftEllipsisIcon },
    { name: 'Vitals', path: '/health', icon: HeartIcon },
    { name: 'Meds', path: '/meds', icon: PlusCircleIcon },
    { name: 'Visits', path: '/appointments', icon: CalendarIcon },
    { name: 'Devices', path: '/devices', icon: CpuChipIcon },
  ] : [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Chat', path: '/messages', icon: ChatBubbleOvalLeftEllipsisIcon },
    { name: 'Health', path: '/health', icon: HeartIcon },
    { name: 'Mind', path: '/wellness', icon: FaceSmileIcon },
    { name: 'Meds', path: '/meds', icon: PlusCircleIcon },
    { name: 'Visits', path: '/appointments', icon: CalendarIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl border-x border-slate-100 bg-white/40 backdrop-blur-sm font-sans">
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl px-5 py-4 border-b border-slate-100 flex justify-between items-center">
        <Link to="/" className="text-xl font-extrabold text-indigo-950 flex items-center gap-2">
          <HeartIcon className="w-6 h-6 text-rose-500 stroke-[3]" />
          ElderCare
        </Link>
        <Link to="/profile" className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${location.pathname === '/profile' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-indigo-700 shadow-sm'}`}>
          <span className="text-[10px] font-black uppercase">{user?.name?.split(' ').map(n => n[0]).join('') || '??'}</span>
        </Link>
      </header>

      <main className="flex-1 p-5 pb-32">
        {children}
      </main>

      {sosAlert && (
        <div className="fixed inset-0 z-[1000] bg-rose-600 flex flex-col items-center justify-center p-8 text-white animate-in fade-in zoom-in duration-300">
           <div className="bg-white/20 p-8 rounded-full animate-pulse mb-8">
              <ShieldSolid className="w-24 h-24 text-white" />
           </div>
           <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Emergency SOS</h2>
           <p className="text-xl font-bold opacity-90 mb-10 text-center">A linked member has triggered an alert!</p>
           <button onClick={() => setSosAlert(null)} className="bg-white text-rose-600 py-4 px-10 rounded-[28px] font-black text-xs uppercase tracking-widest">Dismiss</button>
        </div>
      )}

      {user?.role === UserRole.ELDER && location.pathname !== '/sos' && (
        <button onClick={() => navigate('/sos')} className="fixed bottom-24 right-5 z-[60] bg-rose-600 text-white w-20 h-20 rounded-full shadow-xl border-4 border-white flex flex-col items-center justify-center active:scale-90 transition-transform animate-pulse-soft">
          <ShieldSolid className="w-8 h-8" />
          <span className="text-[10px] font-black uppercase mt-0.5 tracking-widest">SOS</span>
        </button>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t border-slate-100 grid grid-cols-6 items-center px-1 pb-safe z-50 h-20 bg-white/80 backdrop-blur-xl">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center py-2 transition-all ${location.pathname === item.path ? 'text-indigo-600' : 'text-slate-400'}`}>
            <item.icon className={`w-6 h-6 transition-transform ${location.pathname === item.path ? 'scale-110 stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className={`text-[8px] mt-1 font-black uppercase tracking-tighter ${location.pathname === item.path ? 'opacity-100' : 'opacity-70'}`}>{item.name}</span>
          </Link>
        ))}
      </nav>

      <style>{`
        @keyframes pulse-soft {
          0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.6); }
          70% { box-shadow: 0 0 0 20px rgba(225, 29, 72, 0); }
          100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
        }
        .animate-pulse-soft { animation: pulse-soft 2s infinite; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
};

export default Layout;