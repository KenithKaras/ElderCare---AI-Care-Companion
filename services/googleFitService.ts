import { storageService } from './storageService';
import { supabaseService } from './supabaseService';

const GOOGLE_CLIENT_ID = '371530275598-knu37fufsrei9eo8esnh60ntpupmk1aa.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read'
].join(' ');

export const googleFitService = {
  async authorize(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!(window as any).google?.accounts?.oauth2) {
        setTimeout(() => {
          if (!(window as any).google?.accounts?.oauth2) {
            reject(new Error('Google Identity library failed to load. Please check your connection.'));
          } else {
            this.authorize().then(resolve).catch(reject);
          }
        }, 500);
        return;
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          localStorage.setItem('eca_fit_token', response.access_token);
          localStorage.setItem('eca_fit_expiry', (Date.now() + response.expires_in * 1000).toString());
          resolve(response.access_token);
        },
      });
      client.requestAccessToken();
    });
  },

  getAccessToken(): string | null {
    const token = localStorage.getItem('eca_fit_token');
    const expiry = localStorage.getItem('eca_fit_expiry');
    if (token && expiry && Date.now() < parseInt(expiry)) return token;
    return null;
  },

  disconnect() {
    localStorage.removeItem('eca_fit_token');
    localStorage.removeItem('eca_fit_expiry');
    const devices = storageService.getConnectedDevices().filter(d => d.id !== 'google_fit');
    storageService.saveConnectedDevices(devices);
  },

  async syncData(): Promise<{ stepsRecord: any, hrRecord: any, steps: number }> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Auth required');

    const endTime = Date.now();
    const startTime = new Date().setHours(0, 0, 0, 0);

    try {
      const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregateBy: [
            { dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps" },
            { dataTypeName: "com.google.heart_rate.bpm" },
            { dataTypeName: "com.google.sleep.segment" }
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime,
          endTimeMillis: endTime,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const bucket = data.bucket?.[0];
      
      const steps = bucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      const hr = bucket?.dataset?.[1]?.point?.[0]?.value?.[0]?.fpVal || 0;

      let stepsRecord = null;
      let hrRecord = null;

      if (steps > 0) {
        const res = await supabaseService.addVital({ type: 'Steps' as any, value: steps.toString(), unit: 'steps', timestamp: new Date().toISOString() });
        if (res && res[0]) stepsRecord = res[0];
      }
      
      if (hr > 0) {
        const res = await supabaseService.addVital({ type: 'Heart Rate', value: Math.round(hr).toString(), unit: 'bpm', timestamp: new Date().toISOString() });
        if (res && res[0]) hrRecord = res[0];
      }

      localStorage.setItem('eca_last_steps', steps.toString());
      return { stepsRecord, hrRecord, steps };
    } catch (e) {
      console.error("Fit sync failed", e);
      throw e;
    }
  }
};