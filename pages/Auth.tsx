import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';
import { HeartIcon, UserCircleIcon, UserGroupIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>(UserRole.ELDER);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
      } else {
        if (!name.trim()) {
          setError("Please enter your name.");
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { 
              role: role,
              name: name.trim()
            }
          }
        });
        if (signUpError) throw signUpError;
        alert("Success! Check your email to confirm registration.");
        setIsLogin(true);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || "Authentication error. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-indigo-950 z-[200] flex flex-col p-6 overflow-y-auto">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center gap-8 py-10">
        <div className="text-center text-white space-y-4">
          <div className="bg-white/10 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto shadow-xl backdrop-blur-md animate-float">
            <HeartIcon className="w-12 h-12 text-rose-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">ElderCare</h1>
          <p className="text-indigo-300 text-xs font-black uppercase tracking-[0.3em] opacity-80">Cloud Health Network</p>
        </div>

        <div className="bg-white rounded-[40px] p-8 shadow-2xl space-y-8 animate-in slide-in-from-bottom-8 duration-500">
          {error && (
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-rose-600 text-[10px] font-black text-center uppercase">
              {error}
            </div>
          )}
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${isLogin ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            >
              LOGIN
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${!isLogin ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-lg font-bold text-black focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">My Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setRole(UserRole.ELDER)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === UserRole.ELDER ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                    >
                      <UserCircleIcon className="w-8 h-8" />
                      <span className="font-black text-[10px] uppercase">Senior</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRole(UserRole.CAREGIVER)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === UserRole.CAREGIVER ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                    >
                      <UserGroupIcon className="w-8 h-8" />
                      <span className="font-black text-[10px] uppercase">Caregiver</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-lg font-bold text-black focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-lg font-bold text-black focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-6 rounded-[24px] font-black text-xl shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'LOG IN' : 'CREATE ACCOUNT'}
                  <ArrowRightIcon className="w-6 h-6" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;