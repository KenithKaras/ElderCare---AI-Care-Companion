import React, { useState, useEffect } from 'react';
import { 
  CpuChipIcon, 
  TrashIcon, 
  DevicePhoneMobileIcon,
  XMarkIcon,
  ArrowPathIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  ArrowRightCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  Battery50Icon,
  SignalIcon,
  Cog6ToothIcon,
  ArrowPathRoundedSquareIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/solid';
import { storageService, ConnectedDevice, AppSettings } from '../services/storageService';
import { bluetoothService } from '../services/bluetoothService';
import { googleFitService } from '../services/googleFitService';

let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

const StatusDot: React.FC<{ status: ConnectedDevice['status'] }> = ({ status }) => {
  const colors: Record<string, string> = {
    'Live': 'bg-emerald-500 animate-pulse',
    'Connected': 'bg-emerald-500',
    'Disconnected': 'bg-rose-500',
    'Syncing': 'bg-amber-500 animate-spin',
    'Reconnecting': 'bg-indigo-500 animate-bounce',
    'Low Battery': 'bg-rose-600'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || 'bg-slate-300'}`}></div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{status}</p>
    </div>
  );
};

const Devices: React.FC = () => {
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncingFit, setIsSyncingFit] = useState(false);
  const [error, setError] = useState<{title: string, msg: string} | null>(null);
  const [isBluetoothSupported, setIsBluetoothSupported] = useState(true);
  const [isSecure, setIsSecure] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(localStorage.getItem('eca_last_background_sync') || '');
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());

  useEffect(() => {
    refreshDevices();
    setIsBluetoothSupported(bluetoothService.isSupported());
    setIsSecure(window.isSecureContext);
    bluetoothService.initAutoReconnect();

    const handleSyncComplete = () => {
      setLastSyncTime(localStorage.getItem('eca_last_background_sync') || '');
      refreshDevices();
    };

    window.addEventListener('eca_device_status_changed', refreshDevices);
    window.addEventListener('eca_background_sync_complete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('eca_device_status_changed', refreshDevices);
      window.removeEventListener('eca_background_sync_complete', handleSyncComplete);
    };
  }, []);

  const refreshDevices = () => {
    setConnectedDevices(storageService.getConnectedDevices());
  };

  const handleBluetoothConnect = async (existingDevice?: any) => {
    setIsScanning(true);
    setError(null);
    try {
      const result = await bluetoothService.connectHeartRateDevice(existingDevice);
      if (result) {
        const name = result.name.toLowerCase();
        let icon = '⌚';
        if (name.includes('noise')) icon = '⚡';
        if (name.includes('fire') || name.includes('bolt')) icon = '🔥';
        if (name.includes('boat')) icon = '🚢';
        if (name.includes('amaz')) icon = '🏔️';

        const newDevice: ConnectedDevice = {
          id: result.device.id,
          name: result.name,
          type: 'Smart Watch',
          status: 'Live',
          lastSync: new Date().toISOString(),
          icon: icon,
          isHardware: true
        };
        
        setConnectedDevices(prev => {
          const filtered = prev.filter(d => d.id !== result.device.id);
          const updated = [...filtered, newDevice];
          storageService.saveConnectedDevices(updated);
          return updated;
        });
      }
    } catch (err: any) {
      setError({
        title: 'Bluetooth Error',
        msg: err.message || 'Make sure your watch has Bluetooth turned ON and is not paired with another phone.'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFitConnect = async () => {
    setIsSyncingFit(true);
    setError(null);
    try {
      await googleFitService.authorize();
      await googleFitService.syncData();
      
      const fitDevice: ConnectedDevice = {
        id: 'google_fit',
        name: 'Google Fit',
        type: 'Cloud Health',
        status: 'Live',
        lastSync: new Date().toISOString(),
        icon: '🏃',
        isHardware: false
      };
      
      setConnectedDevices(prev => {
        const filtered = prev.filter(d => d.id !== 'google_fit');
        const updated = [...filtered, fitDevice];
        storageService.saveConnectedDevices(updated);
        return updated;
      });
    } catch (err: any) {
      setError({
        title: 'Google Sync Error',
        msg: 'Connection was interrupted. Please try again.'
      });
    } finally {
      setIsSyncingFit(false);
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    storageService.saveSettings(updated);
    bluetoothService.stopAutoReconnect();
    bluetoothService.initAutoReconnect();
  };

  const removeDevice = (id: string) => {
    if (id === 'google_fit') googleFitService.disconnect();
    const updated = connectedDevices.filter(d => d.id !== id);
    setConnectedDevices(updated);
    storageService.saveConnectedDevices(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3 text-slate-800">
            <CpuChipIcon className="w-8 h-8 text-indigo-500" />
            Watch Center
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">Auto-sync Active (10m)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 border border-slate-100 active:scale-95">
             <Cog6ToothIcon className="w-6 h-6" />
          </button>
          <button onClick={() => setShowHelpModal(true)} className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600 border border-slate-100 active:scale-95">
             <QuestionMarkCircleIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      {lastSyncTime && (
        <div className="bg-indigo-50/50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100">
           <div className="flex items-center gap-3 text-indigo-600">
              <CheckBadgeIcon className="w-5 h-5" />
              <p className="text-[11px] font-black uppercase tracking-tight">Last Background Sync</p>
           </div>
           <p className="text-[11px] font-bold text-indigo-400">{new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-[28px] space-y-2 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 text-rose-600">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <p className="font-black text-sm uppercase">{error.title}</p>
          </div>
          <p className="text-xs font-bold text-rose-500 leading-relaxed">{error.msg}</p>
          <button onClick={() => setError(null)} className="text-[10px] font-black uppercase text-rose-400 mt-2 underline">Dismiss</button>
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Connect Your Watch</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl space-y-4 relative overflow-hidden">
            {isScanning && (
              <div className="absolute inset-0 bg-indigo-600/5 animate-pulse pointer-events-none"></div>
            )}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isScanning ? 'bg-indigo-600 text-white animate-bounce' : 'bg-indigo-50 text-indigo-600'}`}>
                   <CpuChipIcon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-800">Scan for Nearby Watches</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase">Noise • Firebolt • BoAt • Amazfit</p>
                </div>
              </div>
              {isScanning ? (
                <div className="flex items-center gap-2 text-indigo-600">
                  <ArrowPathIcon className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <button 
                  onClick={() => handleBluetoothConnect()}
                  disabled={!isBluetoothSupported}
                  className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-30"
                >
                  Find My Watch
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={handleFitConnect}
            disabled={isSyncingFit}
            className="w-full bg-white p-6 rounded-[32px] border border-slate-100 shadow-lg flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                {isSyncingFit ? <ArrowPathIcon className="w-8 h-8 animate-spin" /> : <ArrowRightCircleIcon className="w-8 h-8" />}
              </div>
              <div>
                <p className="text-lg font-black text-slate-800">Google Fit</p>
                <p className="text-[10px] text-slate-400 font-black uppercase">Sync Health Dashboard</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Paired Watches</h3>
        <div className="space-y-3">
          {connectedDevices.length > 0 ? connectedDevices.map(device => (
            <div key={device.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                    {device.icon}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-lg leading-none">{device.name}</p>
                    <div className="mt-2">
                       <StatusDot status={device.status} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {device.status === 'Disconnected' && device.isHardware && (
                    <button 
                      onClick={() => handleBluetoothConnect()}
                      className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                    >
                      <ArrowPathRoundedSquareIcon className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => removeDevice(device.id)}
                    className="p-3 bg-slate-50 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {device.isHardware && (
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Battery50Icon className="w-4 h-4" />
                        <span className="text-[10px] font-black">{device.status === 'Live' ? 'Linked' : '--'}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${device.status === 'Live' ? 'text-emerald-500' : 'text-slate-300'}`}>
                        <SignalIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase">{device.status === 'Live' ? 'Connected' : 'None'}</span>
                      </div>
                   </div>
                   <p className="text-[8px] font-black text-slate-300 uppercase">Last Data: {new Date(device.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}
            </div>
          )) : (
            <div className="p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 opacity-40">
              <CpuChipIcon className="w-12 h-12 mx-auto mb-2 text-slate-200" />
              <p className="font-black text-[10px] uppercase tracking-widest leading-relaxed">No watches connected.<br/>Tap 'Find My Watch' above.</p>
            </div>
          )}
        </div>
      </section>

      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-6 relative animate-in zoom-in-95">
            <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 p-2"><XMarkIcon className="w-6 h-6"/></button>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Watch Settings</h3>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-sm text-slate-800">Background Sync</p>
                  <p className="text-[10px] text-slate-400 font-bold">Try to reconnect automatically</p>
                </div>
                <button 
                  onClick={() => updateSettings({ autoReconnectEnabled: !settings.autoReconnectEnabled })}
                  className={`w-14 h-8 rounded-full transition-all flex items-center p-1 ${settings.autoReconnectEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}
                >
                   <div className="w-6 h-6 bg-white rounded-full shadow-md"></div>
                </button>
              </div>
            </div>

            <button onClick={() => setShowSettings(false)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black tracking-widest uppercase">Save & Exit</button>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-6 relative animate-in zoom-in-95">
            <button onClick={() => setShowHelpModal(false)} className="absolute top-6 right-6 p-2"><XMarkIcon className="w-6 h-6"/></button>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Watch Setup Help</h3>
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-2xl">
                <p className="text-xs font-black text-indigo-600 uppercase mb-2">Step 1: Prep Your Watch</p>
                <p className="text-[11px] font-bold text-slate-600 leading-relaxed">Go to your watch settings. Ensure Bluetooth is ON and it is NOT connected to any other phone.</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl">
                <p className="text-xs font-black text-emerald-600 uppercase mb-2">Step 2: Start Scan</p>
                <p className="text-[11px] font-bold text-slate-600 leading-relaxed">Tap 'Find My Watch'. Select your device from the system list (Noise, Firebolt, etc).</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl">
                <p className="text-xs font-black text-amber-600 uppercase mb-2">Notice</p>
                <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">Web Bluetooth works best on Chrome/Edge. iPhones (Safari) may have limited support.</p>
              </div>
            </div>
            <button onClick={() => setShowHelpModal(false)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black tracking-widest uppercase">Got It</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;