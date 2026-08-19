import { supabase } from './supabaseClient';
import { ChatMessage, HospitalFacility } from '../types';

// ============================================================================
// Real interest + chat pipeline between a resident and a REAL hospital
// account (hospitals.owner_id set). This is entirely separate from the mock
// "MSO Admin Portal" demo, which keeps using its own local/fake data.
// ============================================================================

export interface SiteInterestThread {
  id: string;
  hospitalId: string;
  hospitalOwnerId: string;
  hospitalName: string;
  residentId: string;
  residentName: string;
  residentProgram?: string;
  status: 'new' | 'seen';
  createdAt: string;
}

function threadRowToType(row: any): SiteInterestThread {
  return {
    id: row.id,
    hospitalId: row.hospital_id,
    hospitalOwnerId: row.hospital_owner_id,
    hospitalName: row.hospital_name,
    residentId: row.resident_id,
    residentName: row.resident_name,
    residentProgram: row.resident_program || undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

function messageRowToType(row: any): ChatMessage {
  return {
    id: row.id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    text: row.text,
    timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Called when a resident expresses interest in a real hospital site. Creates
 * the notification-carrying thread (or returns the existing one if they've
 * already expressed interest here before) and posts their opening message.
 */
export async function createInterestThread(
  hospital: HospitalFacility,
  residentId: string,
  residentName: string,
  residentProgram: string | undefined,
  openingMessage: string
): Promise<{ thread: SiteInterestThread; message: ChatMessage }> {
  if (!hospital.ownerId) {
    throw new Error('This hospital site is not a real account yet.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('site_interests')
    .select('*')
    .eq('hospital_id', hospital.id)
    .eq('resident_id', residentId)
    .maybeSingle();
  if (existingError) throw existingError;

  let thread: SiteInterestThread;
  if (existing) {
    thread = threadRowToType(existing);
  } else {
    const { data: created, error: createError } = await supabase
      .from('site_interests')
      .insert({
        hospital_id: hospital.id,
        hospital_owner_id: hospital.ownerId,
        hospital_name: hospital.name,
        resident_id: residentId,
        resident_name: residentName,
        resident_program: residentProgram || null,
      })
      .select('*')
      .single();
    if (createError) throw createError;
    thread = threadRowToType(created);
  }

  const message = await sendMessage(thread.id, 'resident', residentId, residentName, openingMessage);
  return { thread, message };
}

export async function fetchThreadsForResident(residentId: string): Promise<SiteInterestThread[]> {
  const { data, error } = await supabase
    .from('site_interests')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(threadRowToType);
}

export async function fetchThreadsForHospitalOwner(ownerId: string): Promise<SiteInterestThread[]> {
  const { data, error } = await supabase
    .from('site_interests')
    .select('*')
    .eq('hospital_owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(threadRowToType);
}

export async function fetchMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('site_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(messageRowToType);
}

export async function sendMessage(
  threadId: string,
  senderRole: 'resident' | 'hospital',
  senderId: string,
  senderName: string,
  text: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('site_messages')
    .insert({ thread_id: threadId, sender_role: senderRole, sender_id: senderId, sender_name: senderName, text })
    .select('*')
    .single();
  if (error) throw error;
  return messageRowToType(data);
}

/**
 * Hospital admin opening a thread clears its "new" notification state.
 */
export async function markThreadSeen(threadId: string): Promise<void> {
  const { error } = await supabase.from('site_interests').update({ status: 'seen' }).eq('id', threadId);
  if (error) throw error;
}
