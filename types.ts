export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  frequency: string;
  user_id?: string;
}

export interface VitalSign {
  id: string;
  type: 'Blood Pressure' | 'Heart Rate' | 'Blood Sugar' | 'Weight' | 'Steps' | 'Location';
  value: string;
  timestamp: string;
  unit: string;
  user_id?: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  notes?: string;
  reminded?: boolean;
}

export interface Task {
  id: string;
  title: string;
  time: string;
  completed: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical';
  read: boolean;
  category: 'medication' | 'health' | 'sos' | 'appointment';
}

export enum UserRole {
  ELDER = 'ELDER',
  CAREGIVER = 'CAREGIVER'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  unique_no?: string;
  monitored_user_id?: string;
  pending_caregiver_id?: string;
  pending_caregiver_name?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodType?: string;
  allergies?: string;
  conditions?: string;
  relationship?: string;
}
