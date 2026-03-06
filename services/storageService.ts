import { Medication, VitalSign, Appointment, Task, AppNotification, UserProfile, UserRole } from '../types';

const KEYS = {
  MEDICATIONS: 'eca_medications',
  VITALS: 'eca_vitals',
  APPOINTMENTS: 'eca_appointments',
  TASKS: 'eca_tasks',
  NOTIFICATIONS: 'eca_notifications',
  USER_PROFILE: 'eca_user_profile',
  DEVICES: 'eca_devices',
  SETTINGS: 'eca_settings',
  FIT_TOKEN: 'eca_fit_token',
  FIT_EXPIRY: 'eca_fit_expiry'
};

export interface ConnectedDevice {
  id: string;
  name: string;
  type: string;
  status: 'Connected' | 'Syncing' | 'Low Battery' | 'Disconnected' | 'Live' | 'Reconnecting';
  lastSync: string;
  icon: string;
  isHardware?: boolean;
}

export interface AppSettings {
  bluetoothRetryInterval: number; // in seconds
  autoReconnectEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  bluetoothRetryInterval: 30,
  autoReconnectEnabled: true
};

export const storageService = {
  getUserProfile: (): UserProfile | null => {
    const data = localStorage.getItem(KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
  },
  saveUserProfile: (profile: UserProfile) => localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile)),
  
  wipeSensitiveData: () => {
    localStorage.removeItem(KEYS.USER_PROFILE);
    localStorage.removeItem(KEYS.FIT_TOKEN);
    localStorage.removeItem(KEYS.FIT_EXPIRY);
    localStorage.removeItem('eca_last_steps');
  },

  getSettings: (): AppSettings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },
  saveSettings: (settings: AppSettings) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings)),

  getMedications: (): Medication[] => {
    const data = localStorage.getItem(KEYS.MEDICATIONS);
    return data ? JSON.parse(data) : [];
  },
  saveMedications: (meds: Medication[]) => localStorage.setItem(KEYS.MEDICATIONS, JSON.stringify(meds)),

  getVitals: (): VitalSign[] => {
    const data = localStorage.getItem(KEYS.VITALS);
    return data ? JSON.parse(data) : [];
  },
  saveVitals: (vitals: VitalSign[]) => {
    localStorage.setItem(KEYS.VITALS, JSON.stringify(vitals));
    window.dispatchEvent(new CustomEvent('eca_vitals_changed'));
  },

  syncRealTimeVital: (type: VitalSign['type'], value: string, unit: string) => {
    const vitals = storageService.getVitals();
    const entry: VitalSign = {
      id: Date.now().toString(),
      type,
      value,
      unit,
      timestamp: new Date().toISOString()
    };
    const updated = [entry, ...vitals].slice(0, 20);
    storageService.saveVitals(updated);
    
    window.dispatchEvent(new CustomEvent('eca_vital_update', { detail: entry }));
  },

  getConnectedDevices: (): ConnectedDevice[] => {
    const data = localStorage.getItem(KEYS.DEVICES);
    return data ? JSON.parse(data) : [];
  },
  saveConnectedDevices: (devices: ConnectedDevice[]) => {
    localStorage.setItem(KEYS.DEVICES, JSON.stringify(devices));
    window.dispatchEvent(new CustomEvent('eca_device_status_changed'));
  },
  
  getAppointments: (): Appointment[] => {
    const data = localStorage.getItem(KEYS.APPOINTMENTS);
    return data ? JSON.parse(data) : [];
  },
  saveAppointments: (apps: Appointment[]) => localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(apps)),

  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const current = storageService.getNotifications();
    const newNotif: AppNotification = {
      ...notif,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false
    };
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([newNotif, ...current]));
    window.dispatchEvent(new CustomEvent('eca_new_notification', { detail: newNotif }));
  },
  getNotifications: (): AppNotification[] => {
    const data = localStorage.getItem(KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  },
  markNotificationRead: (id: string) => {
    const current = storageService.getNotifications();
    const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }
};