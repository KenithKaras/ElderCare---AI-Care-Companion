
import { storageService } from './storageService';

export const notificationService = {
  // Simulates an FCM push notification
  sendPushNotification: async (title: string, body: string, priority: 'high' | 'normal' = 'normal') => {
    console.log(`[FCM PUSH] ${title}: ${body}`);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  },

  checkCriticalEvents: () => {
    const vitals = storageService.getVitals();
    const appointments = storageService.getAppointments();
    const now = new Date();

    const latestBP = vitals.find(v => v.type === 'Blood Pressure');
    const latestHR = vitals.find(v => v.type === 'Heart Rate');
    const latestBS = vitals.find(v => v.type === 'Blood Sugar');

    if (latestBP) {
      const parts = latestBP.value.split('/');
      const systolic = parseInt(parts[0]);
      const diastolic = parts[1] ? parseInt(parts[1]) : 80;

      if (systolic > 140 || systolic < 90 || diastolic > 95 || diastolic < 60) {
        notificationService.createHealthAlert('Blood Pressure', latestBP.value);
      }
    }

    if (latestHR) {
      const hr = parseInt(latestHR.value);
      if (hr > 110 || hr < 50) {
        notificationService.createHealthAlert('Heart Rate', `${hr} bpm`);
      }
    }

    if (latestBS) {
      const bs = parseInt(latestBS.value);
      if (bs > 200 || bs < 70) {
        notificationService.createHealthAlert('Blood Sugar', `${bs} mg/dL`);
      }
    }

    appointments.forEach(app => {
      const appDate = new Date(`${app.date} ${app.time}`);
      const diffHrs = (appDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (diffHrs > 0 && diffHrs < 24 && !app.reminded) {
        storageService.addNotification({
          title: 'Upcoming Appointment',
          message: `Reminder: Appointment with ${app.doctorName} tomorrow at ${app.time}.`,
          type: 'info',
          category: 'appointment'
        });
        notificationService.sendPushNotification('Appointment Reminder', `Visit with ${app.doctorName} in 24 hours.`);
        
        const updated = appointments.map(a => a.id === app.id ? { ...a, reminded: true } : a);
        storageService.saveAppointments(updated);
      }
    });
  },

  createHealthAlert: (type: string, value: string) => {
    const title = `Abnormal ${type} Detected`;
    const message = `Reading: ${value}. This is outside of normal range. Please check status immediately.`;
    
    const existing = storageService.getNotifications();
    const isDuplicate = existing.some(n => 
      n.title === title && 
      (Date.now() - new Date(n.timestamp).getTime()) < 300000
    );

    if (!isDuplicate) {
      storageService.addNotification({
        title,
        message,
        type: 'critical',
        category: 'health'
      });
      notificationService.sendPushNotification('Critical Health Alert', message, 'high');
    }
  },

  triggerSOS: (location: string) => {
    storageService.addNotification({
      title: 'SOS ALERT TRIGGERED',
      message: `SOS alert triggered! Current location: ${location}`,
      type: 'critical',
      category: 'sos'
    });
    notificationService.sendPushNotification('EMERGENCY SOS', `SOS Triggered at ${location}`, 'high');
  },

  triggerMissedMed: (medName: string) => {
    storageService.addNotification({
      title: 'Medication Missed',
      message: `Missed dose of ${medName}.`,
      type: 'warning',
      category: 'medication'
    });
    notificationService.sendPushNotification('Caregiver Alert', `Missed dose: ${medName}`);
  }
};

// Break circular dependency by listening to event instead of being called directly from storage
window.addEventListener('eca_vitals_changed', () => {
  notificationService.checkCriticalEvents();
});
