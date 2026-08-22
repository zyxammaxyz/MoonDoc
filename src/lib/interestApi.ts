import { supabase } from './supabaseClient';
import { ChatMessage, HospitalFacility, MoonlightingShift } from '../types';

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
  // Set when this thread was opened by expressing interest in one specific
  // posted job (the normal path once a hospital has jobs live) -- absent
  // for the older/fallback "general interest in this site" path used when a
  // hospital hasn't posted any jobs yet.
  shiftId?: string;
  shiftTitle?: string;
  // Hospital admin's manual sign-off that this candidate has satisfied every
  // requirement for the job -- never set automatically by document uploads.
  verified: boolean;
  // Hospital admin's manual confirmation that this resident actually worked
  // the shift -- separate from `verified` above (which is a pre-shift
  // credentialing sign-off). Also never set automatically. This is what
  // powers each site's "Past Jobs" track record of who worked it and when.
  completed: boolean;
  completedAt?: string;
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
    shiftId: row.shift_id || undefined,
    shiftTitle: row.shift_title || undefined,
    verified: !!row.verified,
    completed: !!row.completed,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
  };
}

// ============================================================================
// Per-job document requirements (custom, hospital-defined asks on top of the
// standard passport catalog -- the standard toggles live directly on
// shifts.data.requiredDocIds and don't need a table of their own).
// ============================================================================

export interface CustomDocRequest {
  id: string;
  shiftId: string;
  ownerId: string;
  label: string;
  createdAt: string;
}

export interface CustomDocSubmission {
  id: string;
  requestId: string;
  residentId: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
}

function customDocRequestRowToType(row: any): CustomDocRequest {
  return {
    id: row.id,
    shiftId: row.shift_id,
    ownerId: row.owner_id,
    label: row.label,
    createdAt: row.created_at,
  };
}

function customDocSubmissionRowToType(row: any): CustomDocSubmission {
  return {
    id: row.id,
    requestId: row.request_id,
    residentId: row.resident_id,
    fileUrl: row.file_url || undefined,
    fileName: row.file_name || undefined,
    uploadedAt: row.uploaded_at || undefined,
  };
}

/**
 * Hospital side: fetch the custom document requests configured for one of
 * their own posted jobs.
 */
export async function fetchCustomDocRequests(shiftId: string): Promise<CustomDocRequest[]> {
  const { data, error } = await supabase
    .from('custom_document_requests')
    .select('*')
    .eq('shift_id', shiftId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(customDocRequestRowToType);
}

/**
 * Hospital side: add a brand-new custom document ask to a job. Because
 * visibility to residents is driven by their existing site_interests row
 * for this shift_id, this applies immediately to every candidate already
 * connected to the job, not just future ones.
 */
export async function addCustomDocRequest(shiftId: string, ownerId: string, label: string): Promise<CustomDocRequest> {
  const { data, error } = await supabase
    .from('custom_document_requests')
    .insert({ shift_id: shiftId, owner_id: ownerId, label })
    .select('*')
    .single();
  if (error) throw error;
  return customDocRequestRowToType(data);
}

export async function deleteCustomDocRequest(requestId: string, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('custom_document_requests')
    .delete()
    .eq('id', requestId)
    .eq('owner_id', ownerId);
  if (error) throw error;
}

/**
 * Fetch whichever of the given requests a specific resident has already
 * submitted a file for. Works for both sides -- RLS scopes a resident to
 * their own rows, and a hospital owner to submissions against their own
 * requests.
 */
export async function fetchCustomDocSubmissions(
  requestIds: string[],
  residentId: string
): Promise<CustomDocSubmission[]> {
  if (requestIds.length === 0) return [];
  const { data, error } = await supabase
    .from('custom_document_submissions')
    .select('*')
    .in('request_id', requestIds)
    .eq('resident_id', residentId);
  if (error) throw error;
  return (data || []).map(customDocSubmissionRowToType);
}

/**
 * Resident side: record that they've uploaded a file for one of a
 * hospital's custom document requests (the file itself is uploaded to
 * Storage separately -- see uploadCredentialDocumentFile -- this just
 * upserts the pointer row).
 */
export async function submitCustomDocSubmission(
  requestId: string,
  residentId: string,
  fileUrl: string,
  fileName: string
): Promise<CustomDocSubmission> {
  const { data, error } = await supabase
    .from('custom_document_submissions')
    .upsert(
      {
        request_id: requestId,
        resident_id: residentId,
        file_url: fileUrl,
        file_name: fileName,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: 'request_id,resident_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return customDocSubmissionRowToType(data);
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
 *
 * When `shift` is given, the thread is tied to that specific job posting --
 * this is the normal path once a hospital has jobs live, and is what lets
 * document requirements be job-specific. Omitting it falls back to a
 * general, site-level thread (used only when a hospital hasn't posted any
 * jobs yet).
 */
export async function createInterestThread(
  hospital: HospitalFacility,
  residentId: string,
  residentName: string,
  residentProgram: string | undefined,
  openingMessage: string,
  shift?: MoonlightingShift
): Promise<{ thread: SiteInterestThread; message: ChatMessage }> {
  if (!hospital.ownerId) {
    throw new Error('This hospital site is not a real account yet.');
  }

  let existingQuery = supabase
    .from('site_interests')
    .select('*')
    .eq('hospital_id', hospital.id)
    .eq('resident_id', residentId);
  existingQuery = shift ? existingQuery.eq('shift_id', shift.id) : existingQuery.is('shift_id', null);
  const { data: existing, error: existingError } = await existingQuery.maybeSingle();
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
        shift_id: shift?.id || null,
        shift_title: shift?.title || null,
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

/**
 * Hospital admin's manual sign-off (or reversal) that a candidate has
 * satisfied everything required for the job. Deliberately never flipped
 * automatically by document uploads -- a human always makes this call.
 */
export async function markThreadVerified(threadId: string, verified: boolean): Promise<void> {
  const { error } = await supabase.from('site_interests').update({ verified }).eq('id', threadId);
  if (error) throw error;
}

/**
 * Hospital admin's manual confirmation (or reversal) that a resident
 * actually worked this shift -- what builds each site's real "Past Jobs"
 * track record. Deliberately separate from `verified` above and, like it,
 * never flipped automatically.
 */
export async function markThreadCompleted(threadId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('site_interests')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', threadId);
  if (error) throw error;
}
