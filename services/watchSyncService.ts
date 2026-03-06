import { googleFitService } from './googleFitService';
import { bluetoothService } from './bluetoothService';
import { supabaseService } from './supabaseService';
import { storageService } from './storageService';
import { UserRole } from '../types';

let syncInterval: number | null = null;
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // Updated to 5 minutes for background sync

export const watchSyncService = {
  /**
   * Starts the 5-minute background sync process.
   */
  async start() {
    if (syncInterval) return;

    console.log("[SyncService] Initializing 5-minute background sync...");
    this.performSync();

    syncInterval = window.setInterval(() => {
      this.performSync();
    }, SYNC_INTERVAL_MS);
  },

  /**
   * Sync logic that fetches data and broadcasts full DB objects with IDs.
   */
  async performSync() {
    try {
      const user = await supabaseService.getCurrentUser();
      if (!user) return;

      const profile = await supabaseService.getProfile(user.id);
      if (profile?.role !== UserRole.ELDER) return;

      console.log("[SyncService] Starting 5-minute health data fetch...");

      // 1. Google Fit Sync
      if (googleFitService.getAccessToken()) {
        try {
          const fitResult = await googleFitService.syncData();
          if (fitResult.stepsRecord) {
             window.dispatchEvent(new CustomEvent('eca_vital_update', { detail: fitResult.stepsRecord }));
          }
          if (fitResult.hrRecord) {
             window.dispatchEvent(new CustomEvent('eca_vital_update', { detail: fitResult.hrRecord }));
          }
        } catch (e) {
          console.warn("[SyncService] Google Fit sync failed:", e);
        }
      }

      // 2. Bluetooth Health & Mock expanded metrics
      const devices = storageService.getConnectedDevices();
      const hardwareDevice = devices.find(d => d.isHardware && d.status === 'Live');
      
      if (hardwareDevice) {
        const mockBP = `${115 + Math.floor(Math.random() * 15)}/${75 + Math.floor(Math.random() * 10)}`;
        const mockSugar = (90 + Math.floor(Math.random() * 20)).toString();

        const results = await Promise.all([
          supabaseService.addVital({
            type: 'Blood Pressure',
            value: mockBP,
            unit: 'mmHg',
            timestamp: new Date().toISOString()
          }),
          supabaseService.addVital({
            type: 'Blood Sugar',
            value: mockSugar,
            unit: 'mg/dL',
            timestamp: new Date().toISOString()
          })
        ]);

        results.forEach(res => {
          if (res && res[0]) {
            window.dispatchEvent(new CustomEvent('eca_vital_update', { detail: res[0] }));
          }
        });

        const updated = devices.map(d => 
          d.id === hardwareDevice.id 
            ? { ...d, lastSync: new Date().toISOString() } 
            : d
        );
        storageService.saveConnectedDevices(updated);
      }

      localStorage.setItem('eca_last_background_sync', new Date().toISOString());
      window.dispatchEvent(new CustomEvent('eca_background_sync_complete'));

    } catch (err) {
      console.error("[SyncService] Background sync error:", err);
    }
  },

  stop() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  }
};