import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { Medication, VitalSign, UserProfile, UserRole } from '../types';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  read: boolean;
}

const generateInviteCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

export const supabaseService = {
  supabase,

  async getCurrentUser() {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch {
      return null;
    }
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    return await supabase.auth.signOut();
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (!data && !error) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          const newProfile = {
            id: user.id,
            name: user.user_metadata.name || 'User',
            email: user.email,
            role: user.user_metadata.role || 'ELDER',
            unique_no: generateInviteCode()
          };
          const { data: inserted } = await supabase.from('profiles').insert([newProfile]).select().maybeSingle();
          return inserted as UserProfile;
        }
      }
      return data as UserProfile;
    } catch (err) {
      console.error("Profile error:", err);
      return null;
    }
  },

  async getLinkedUser(): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) return null;
    const user = await this.getCurrentUser();
    if (!user) return null;
    const profile = await this.getProfile(user.id);
    if (profile?.monitored_user_id) {
      return await this.getProfile(profile.monitored_user_id);
    }
    return null;
  },

  async updateProfile(profile: UserProfile) {
    if (!isSupabaseConfigured) return;
    return await supabase.from('profiles').update(profile).eq('id', profile.id);
  },

  async regenerateInviteCode(): Promise<string | null> {
    if (!isSupabaseConfigured) return null;
    const user = await this.getCurrentUser();
    if (!user) return null;
    
    const newCode = generateInviteCode();
    const { error } = await supabase
      .from('profiles')
      .update({ unique_no: newCode })
      .eq('id', user.id);
    
    if (error) return null;
    return newCode;
  },

  async getMessages(otherUserId: string): Promise<ChatMessage[]> {
    if (!isSupabaseConfigured) return [];
    const user = await this.getCurrentUser();
    if (!user) return [];
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    return (data as ChatMessage[]) || [];
  },

  async markMessagesAsRead(otherUserId: string) {
    if (!isSupabaseConfigured) return;
    const user = await this.getCurrentUser();
    if (!user) return;
    return await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', otherUserId)
      .eq('read', false);
  },

  async sendMessage(receiverId: string, text: string) {
    if (!isSupabaseConfigured) return { error: 'Not configured' };
    const user = await this.getCurrentUser();
    if (!user) return { error: 'No user session' };
    return await supabase.from('messages').insert([{ sender_id: user.id, receiver_id: receiverId, text }]);
  },

  subscribeToMessages(myId: string, otherId: string, callback: (payload: any) => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    const channelId = [myId, otherId].sort().join(':').replace(/[^a-zA-Z0-9]/g, '_');
    return supabase
      .channel(`chat_${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, callback)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, callback)
      .subscribe();
  },

  broadcastTyping(myId: string, otherId: string, isTyping: boolean) {
    if (!isSupabaseConfigured) return;
    const channelId = [myId, otherId].sort().join(':').replace(/[^a-zA-Z0-9]/g, '_');
    const channel = supabase.channel(`typing_${channelId}`);
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: myId, isTyping }
        });
      }
    });
  },

  async getVitals(userId?: string): Promise<VitalSign[]> {
    if (!isSupabaseConfigured) return [];
    let targetId = userId;
    if (!targetId) {
      const user = await this.getCurrentUser();
      if (!user) return [];
      targetId = user.id;
    }
    const { data } = await supabase
      .from('vitals')
      .select('*')
      .eq('user_id', targetId)
      .order('timestamp', { ascending: false });
    return (data as any[]) || [];
  },

  async addVital(vital: Omit<VitalSign, 'id'>, targetUserId?: string) {
    if (!isSupabaseConfigured) return { data: null, error: { message: 'Cloud Not Configured' } };
    let userId = targetUserId;
    if (!userId) {
      const user = await this.getCurrentUser();
      if (!user) return { data: null, error: { message: 'No Session' } };
      userId = user.id;
    }
    const { data, error } = await supabase
      .from('vitals')
      .insert([{ ...vital, user_id: userId }])
      .select();
    
    if (error) console.error("Supabase Vital Error:", error);
    return { data, error };
  },

  async deleteVital(id: string) {
    if (!isSupabaseConfigured) return { error: new Error('Cloud not configured') };
    return await supabase.from('vitals').delete().eq('id', id);
  },

  async getMedications(userId?: string): Promise<Medication[]> {
    if (!isSupabaseConfigured) return [];
    let targetId = userId;
    if (!targetId) {
      const user = await this.getCurrentUser();
      if (!user) return [];
      targetId = user.id;
    }
    const { data } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', targetId)
      .order('time', { ascending: true });
    return (data as any[]) || [];
  },

  async toggleMedication(id: string, taken: boolean) {
    if (!isSupabaseConfigured) return;
    return await supabase.from('medications').update({ taken }).eq('id', id);
  },

  async deleteMedication(id: string) {
    if (!isSupabaseConfigured) return;
    return await supabase.from('medications').delete().eq('id', id);
  },

  async triggerSOS(message: string) {
    if (!isSupabaseConfigured) return;
    const user = await this.getCurrentUser();
    if (!user) return;

    await supabase.from('notifications').insert([{
      user_id: user.id,
      title: 'EMERGENCY SOS',
      message,
      type: 'critical',
      category: 'sos'
    }]);

    const { data: caregivers } = await supabase.from('profiles').select('id').eq('monitored_user_id', user.id);
    if (caregivers) {
      for (const cg of caregivers) {
        await this.sendMessage(cg.id, `🚨 EMERGENCY SOS TRIGGERED: ${message}`);
      }
    }
  },

  subscribeToSOS(seniorId: string, callback: (payload: any) => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    const safeId = seniorId.replace(/[^a-zA-Z0-9]/g, '_');
    return supabase
      .channel(`sos_${safeId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `category=eq.sos` 
      }, (payload) => {
        if (payload.new && (payload.new as any).user_id === seniorId) {
          callback(payload);
        }
      })
      .subscribe();
  },

  async respondToLinkRequest(caregiverId: string, approve: boolean): Promise<void> {
    if (!isSupabaseConfigured) return;
    const user = await this.getCurrentUser();
    if (!user) return;
    const profile = await this.getProfile(user.id);
    if (!profile) return;

    if (approve) {
      // Elder links back to the caregiver by adding to a comma-separated list
      const currentLinks = profile.monitored_user_id ? profile.monitored_user_id.split(',') : [];
      if (!currentLinks.includes(caregiverId)) {
        currentLinks.push(caregiverId);
        await supabase
          .from('profiles')
          .update({ monitored_user_id: currentLinks.join(',') })
          .eq('id', user.id);
      }
    } else {
      // If denied, we could remove the caregiver's link to us if we had permission,
      // but for now we just don't add them to our approved list.
    }
  },

  async removeCaregiver(caregiverId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const user = await this.getCurrentUser();
    if (!user) return;
    const profile = await this.getProfile(user.id);
    if (!profile || !profile.monitored_user_id) return;

    const currentLinks = profile.monitored_user_id.split(',');
    const newLinks = currentLinks.filter(id => id !== caregiverId);
    
    await supabase
      .from('profiles')
      .update({ monitored_user_id: newLinks.join(',') })
      .eq('id', user.id);
  },

  async getPendingLinkRequests(elderId: string): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) return [];
    // Find caregivers who have set their monitored_user_id to this elder
    // but the elder hasn't linked back yet.
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('monitored_user_id', elderId)
      .eq('role', UserRole.CAREGIVER);
    
    return (data || []) as UserProfile[];
  },

  async requestLinkToElder(inviteCode: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Cloud service disabled.' };
    const user = await this.getCurrentUser();
    if (!user) return { success: false, message: 'Auth required' };

    const { data: elderProfile } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('unique_no', inviteCode)
      .maybeSingle();

    if (!elderProfile) return { success: false, message: 'Invalid Invite Code.' };
    
    // Update OWN profile to indicate we want to monitor this elder
    // This is RLS-compliant as users can always update their own profile
    const { error } = await supabase
      .from('profiles')
      .update({ 
        monitored_user_id: elderProfile.id
      })
      .eq('id', user.id);

    return error ? { success: false, message: 'Request failed.' } : { success: true, message: `Request sent to ${elderProfile.name}.` };
  },

  async addMedication(med: { name: string; dosage: string; time: string; frequency: string }, targetUserId?: string) {
    if (!isSupabaseConfigured) return { data: null, error: { message: 'Not Configured' } };
    let userId = targetUserId;
    if (!userId) {
      const user = await this.getCurrentUser();
      if (!user) return { data: null, error: { message: 'No Session' } };
      userId = user.id;
    }
    const { data, error } = await supabase
      .from('medications')
      .insert([{ ...med, user_id: userId, taken: false }])
      .select();

    if (error) console.error("Supabase Med Error:", error);
    return { data, error };
  }
};