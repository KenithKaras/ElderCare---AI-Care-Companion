import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartIcon, 
  ShieldCheckIcon, 
  UserGroupIcon, 
  BoltIcon, 
  SparklesIcon,
  MapPinIcon,
  BellAlertIcon,
  ArrowRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: "Compassionate AI",
      desc: "Gemini-powered wellness chat that listens and cares like family.",
      icon: <SparklesIcon className="w-8 h-8 text-amber-500" />,
      color: "bg-amber-50"
    },
    {
      title: "Real-time Peace",
      desc: "Live vitals and location tracking for instant caregiver awareness.",
      icon: <BoltIcon className="w-8 h-8 text-indigo-500" />,
      color: "bg-indigo-50"
    },
    {
      title: "SOS Network",
      desc: "One tap to alert your entire family and emergency services.",
      icon: <BellAlertIcon className="w-8 h-8 text-rose-500" />,
      color: "bg-rose-50"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Dynamic Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 py-4 flex justify-between items-center ${
        scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'
      }`}>
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <HeartIcon className="w-6 h-6 text-white" />
          </div>
          <span className="font-black text-xl tracking-tighter text-slate-900">ElderCare</span>
        </div>
        <button 
          onClick={() => navigate('/auth')}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 text-center">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-200/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-rose-200/20 rounded-full blur-[100px] -z-10 animate-float"></div>

        <div className="max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Now with Gemini AI Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.05] tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Living Independently, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-rose-500 to-indigo-600 bg-[length:200%_auto] animate-shimmer">Never Alone.</span>
          </h1>

          <p className="text-lg text-slate-500 font-bold max-w-xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            The world's most compassionate platform connecting seniors with their loved ones through AI-driven care and real-time monitoring.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
            <button 
              onClick={() => navigate('/auth')}
              className="group w-full sm:w-auto bg-indigo-600 text-white px-10 py-6 rounded-[28px] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Get Started
              <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="#features" className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors py-4">
              Learn More
            </a>
          </div>
        </div>

        {/* Floating Mockup UI Elements */}
        <div className="mt-20 relative max-w-lg mx-auto h-[400px]">
           {/* Center Card */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-80 bg-white rounded-[40px] shadow-2xl border border-slate-50 z-20 animate-float p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                 <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500"><HeartIcon className="w-6 h-6" /></div>
                 <div className="text-right">
                    <p className="text-[8px] font-black text-slate-300 uppercase">Live Pulse</p>
                    <p className="text-2xl font-black text-slate-900">72</p>
                 </div>
              </div>
              <div className="h-16 w-full bg-slate-50 rounded-2xl flex items-end justify-between p-2 gap-1">
                 {[40, 70, 50, 90, 60, 85].map((h, i) => (
                   <div key={i} className="w-full bg-indigo-600 rounded-full" style={{ height: `${h}%` }}></div>
                 ))}
              </div>
              <button className="bg-slate-900 text-white w-full py-3 rounded-xl font-black text-[10px] uppercase">Healthy Range</button>
           </div>
           
           {/* Side Card 1 */}
           <div className="absolute top-20 -left-10 w-56 h-48 bg-white/40 backdrop-blur-xl rounded-[32px] shadow-xl border border-white/60 z-10 animate-float-delayed p-5 text-left">
              <MapPinIcon className="w-8 h-8 text-emerald-500 mb-4" />
              <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Safe Zone</p>
              <p className="text-sm font-black text-slate-800">Father is at Central Park</p>
              <div className="mt-4 flex items-center gap-2">
                 <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs">👨‍🦳</div>
                 <p className="text-[8px] font-bold text-slate-400">2 mins ago</p>
              </div>
           </div>

           {/* Side Card 2 */}
           <div className="absolute top-10 -right-10 w-56 h-48 bg-white/40 backdrop-blur-xl rounded-[32px] shadow-xl border border-white/60 z-10 animate-float-alt p-5 text-right">
              <BellAlertIcon className="w-8 h-8 text-amber-500 ml-auto mb-4" />
              <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Reminder</p>
              <p className="text-sm font-black text-slate-800">Daily Vitamin D3</p>
              <div className="mt-4 flex justify-end gap-1">
                 <div className="px-3 py-1 bg-amber-500 text-white rounded-full text-[8px] font-black uppercase">Urgent</div>
              </div>
           </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Everything you need.</h2>
            <p className="text-slate-500 font-bold max-w-sm mx-auto">Modern technology, designed for the wisdom of age.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 space-y-6 hover:shadow-xl transition-all group">
                <div className={`w-16 h-16 ${f.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900">{f.title}</h3>
                  <p className="text-sm font-bold text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Roles */}
      <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px]"></div>
        
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
          <div className="space-y-8 p-10 bg-white/5 backdrop-blur-md rounded-[48px] border border-white/10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-900">
               <ShieldCheckIcon className="w-10 h-10" />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black tracking-tight">For Seniors</h3>
              <p className="font-bold text-slate-400 leading-relaxed">Stay safe and connected with an app that talks back. No complex menus, just care.</p>
              <ul className="space-y-3">
                 {["SOS Panic Button", "Medication Audio Prompts", "AI Memory Games"].map(l => (
                   <li key={l} className="flex items-center gap-3 text-sm font-bold">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> {l}
                   </li>
                 ))}
              </ul>
            </div>
          </div>

          <div className="space-y-8 p-10 bg-indigo-600 rounded-[48px] shadow-2xl">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white">
               <UserGroupIcon className="w-10 h-10" />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black tracking-tight">For Caregivers</h3>
              <p className="font-bold text-indigo-100 leading-relaxed">The ultimate peace of mind. Know they are safe without making that 5th daily phone call.</p>
              <ul className="space-y-3">
                 {["Remote Health Vitals", "GPS Location History", "Secure Messaging"].map(l => (
                   <li key={l} className="flex items-center gap-3 text-sm font-bold">
                      <div className="w-2 h-2 bg-white rounded-full"></div> {l}
                   </li>
                 ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 text-center space-y-8">
         <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <HeartIcon className="w-8 h-8 text-rose-500" />
              <span className="text-2xl font-black tracking-tighter">ElderCare</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bridging the generation gap through AI</p>
         </div>
         <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-center items-center gap-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Care</a>
            <a href="#">Help Center</a>
         </div>
         <p className="text-[10px] font-bold text-slate-300">© 2024 Elder Care Assistant. Built with Gemini AI.</p>
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .animate-shimmer { animation: shimmer 8s linear infinite; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-20px) translateX(-50%); }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }

        @keyframes float-side {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float-delayed { animation: float-side 6s ease-in-out infinite 1s; }
        .animate-float-alt { animation: float-side 7s ease-in-out infinite 0.5s; }
      `}</style>
    </div>
  );
};

export default Landing;