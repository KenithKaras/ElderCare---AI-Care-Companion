import React, { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { watchSyncService } from './services/watchSyncService';
import { supabaseService } from './services/supabaseService';

// Lazy load pages for performance
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Medications = lazy(() => import('./pages/Medications'));
const HealthTracking = lazy(() => import('./pages/HealthTracking'));
const SOS = lazy(() => import('./pages/SOS'));
const Wellness = lazy(() => import('./pages/Wellness'));
const CaregiverDashboard = lazy(() => import('./pages/CaregiverDashboard'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Devices = lazy(() => import('./pages/Devices'));
const Profile = lazy(() => import('./pages/Profile'));
const Messages = lazy(() => import('./pages/Messages'));
const AICall = lazy(() => import('./pages/AICall'));

const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white animate-in fade-in duration-500">
    <div className="relative mb-8">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
         <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
      </div>
    </div>
    <div className="text-center space-y-1">
      <p className="text-slate-900 font-black text-lg tracking-tight uppercase">ElderCare</p>
      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Optimizing Experience...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const user = await supabaseService.getCurrentUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    // Start background services
    watchSyncService.start();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabaseService.supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      watchSyncService.stop();
      subscription.unsubscribe();
    };
  }, []);

  if (isAuthenticated === null) return <LoadingFallback />;

  return (
    <Router>
      <Layout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <Landing />} />
            <Route path="/auth" element={isAuthenticated ? <Navigate to="/" replace /> : <Auth />} />
            <Route path="/meds" element={<Medications />} />
            <Route path="/health" element={<HealthTracking />} />
            <Route path="/sos" element={<SOS />} />
            <Route path="/wellness" element={<Wellness />} />
            <Route path="/caregiver" element={<CaregiverDashboard />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/ai-call" element={<AICall />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
};

export default App;