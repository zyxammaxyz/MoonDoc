import { supabase } from './supabaseClient';
import {
  Application,
  ChatMessage,
  CredentialDocument,
  HospitalFacility,
  MoonlightingShift,
  NpiVerificationStatus,
  ResidentNotification,
  ResidentProfile,
} from '../types';

// ============================================================================
// Row <-> App-type mapping helpers
// ============================================================================

interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone: string | null;
  headshot_url: string | null;
  residency_program: string | null;
  hospital_affiliation: string | null;
  specialty: string | null;
  pgy_level: string | null;
  gender: string | null;
  pronouns: string | null;
  npi_number: string | null;
  npi_verification_status: NpiVerificationStatus | null;
  npi_verified_name: string | null;
  npi_verified_credential: string | null;
  npi_verified_taxonomy: string | null;
  npi_verified_at: string | null;
  state_license_number: string | null;
  license_state: string | null;
  dea_number: string | null;
  bio: string | null;
  documents: CredentialDocument[];
}

export function profileRowToResidentProfile(row: ProfileRow): ResidentProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    title: row.title,
    email: row.email,
    phone: row.phone || '',
    headshotUrl: row.headshot_url || '',
    residencyProgram: row.residency_program || '',
    hospitalAffiliation: row.hospital_affiliation || '',
    specialty: (row.specialty as ResidentProfile['specialty']) || 'Emergency Medicine',
    pgyLevel: (row.pgy_level as ResidentProfile['pgyLevel']) || 'PGY-1',
    gender: row.gender || undefined,
    pronouns: row.pronouns || undefined,
    npiNumber: row.npi_number || '',
    npiVerificationStatus: row.npi_verification_status || 'unverified',
    npiVerifiedName: row.npi_verified_name || undefined,
    npiVerifiedCredential: row.npi_verified_credential || undefined,
    npiVerifiedTaxonomy: row.npi_verified_taxonomy || undefined,
    npiVerifiedAt: row.npi_verified_at || undefined,
    stateLicenseNumber: row.state_license_number || '',
    licenseState: row.license_state || '',
    deaNumber: row.dea_number || '',
    bio: row.bio || undefined,
    documents: row.documents || [],
  };
}

function residentProfileToRow(profile: ResidentProfile, userId: string) {
  return {
    id: userId,
    first_name: profile.firstName,
    last_name: profile.lastName,
    title: profile.title,
    email: profile.email,
    phone: profile.phone,
    headshot_url: profile.headshotUrl,
    residency_program: profile.residencyProgram,
    hospital_affiliation: profile.hospitalAffiliation,
    specialty: profile.specialty,
    pgy_level: profile.pgyLevel,
    gender: profile.gender,
    pronouns: profile.pronouns,
    npi_number: profile.npiNumber,
    state_license_number: profile.stateLicenseNumber,
    license_state: profile.licenseState,
    dea_number: profile.deaNumber,
    bio: profile.bio,
    documents: profile.documents,
    updated_at: new Date().toISOString(),
  };
}

interface ApplicationRow {
  id: string;
  resident_id: string;
  shift_id: string;
  applied_date: string;
  status: Application['status'];
  hospital_notes: string | null;
  passport_share_token: string;
  payout_status: Application['payoutStatus'] | null;
  payout_date: string | null;
  messages: ChatMessage[];
  shift_snapshot: MoonlightingShift;
  real_thread_id: string | null;
}

function applicationRowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    shiftId: row.shift_id,
    shift: row.shift_snapshot,
    appliedDate: row.applied_date,
    status: row.status,
    hospitalNotes: row.hospital_notes || undefined,
    passportShareToken: row.passport_share_token,
    messages: row.messages || [],
    payoutStatus: row.payout_status || undefined,
    payoutDate: row.payout_date || undefined,
    realThreadId: row.real_thread_id || undefined,
  };
}

function applicationToRow(app: Application, residentId: string, applicantProfile?: ResidentProfile) {
  return {
    id: app.id,
    resident_id: residentId,
    shift_id: app.shiftId,
    applied_date: app.appliedDate,
    status: app.status,
    hospital_notes: app.hospitalNotes || null,
    passport_share_token: app.passportShareToken,
    payout_status: app.payoutStatus || null,
    payout_date: app.payoutDate || null,
    messages: app.messages || [],
    shift_snapshot: app.shift,
    real_thread_id: app.realThreadId || null,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================================
// Auth
// ============================================================================

export interface SignUpDetails {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  title: 'MD' | 'DO';
  npiNumber: string;
  residencyProgram: string;
  specialty: ResidentProfile['specialty'];
  pgyLevel: ResidentProfile['pgyLevel'];
  headshotUrl?: string;
}

/**
 * Real sign-up: creates the auth user and triggers Supabase's built-in
 * "Confirm signup" email, which contains a clickable confirmation link
 * (no email-template customization required). The profile's other details
 * are stashed as auth user metadata so we can build the profile row once
 * the resident clicks the link and comes back with a real session — see
 * ensureProfileFromAuthUser below.
 */
export async function beginSignUp(details: SignUpDetails) {
  const { data, error } = await supabase.auth.signUp({
    email: details.email,
    password: details.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        first_name: details.firstName,
        last_name: details.lastName,
        title: details.title,
        npi_number: details.npiNumber,
        residency_program: details.residencyProgram,
        specialty: details.specialty,
        pgy_level: details.pgyLevel,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function resendSignUpCode(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

/**
 * Called after a resident clicks the confirmation link in their email and
 * lands back on the app with a real session. If their profile row doesn't
 * exist yet, build it from the metadata stashed during sign-up.
 */
export async function ensureProfileFromAuthUser(userId: string): Promise<ResidentProfile> {
  const existing = await fetchMyProfile(userId);
  if (existing) return existing;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error('No authenticated user found while creating profile.');

  const meta = user.user_metadata || {};
  const newProfile: ResidentProfile = {
    id: user.id,
    firstName: meta.first_name || '',
    lastName: meta.last_name || '',
    title: (meta.title as 'MD' | 'DO') || 'MD',
    email: user.email || '',
    phone: '',
    headshotUrl: '',
    residencyProgram: meta.residency_program || '',
    hospitalAffiliation: meta.residency_program || '',
    specialty: (meta.specialty as ResidentProfile['specialty']) || 'Emergency Medicine',
    pgyLevel: (meta.pgy_level as ResidentProfile['pgyLevel']) || 'PGY-1',
    npiNumber: meta.npi_number || '',
    stateLicenseNumber: '',
    licenseState: '',
    deaNumber: '',
    documents: DEFAULT_NEW_RESIDENT_DOCUMENTS(),
  };

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(residentProfileToRow(newProfile, user.id));
  if (upsertError) throw upsertError;

  // Best-effort automatic NPI check right after account creation, so by the
  // time the resident lands on their dashboard the badge already reflects a
  // real answer instead of sitting at "unverified" until they notice a
  // button. Deliberately not awaited/blocking and errors are swallowed --
  // sign-up must never fail or stall because the NPI registry is slow or
  // briefly unreachable. The resident (or the app) can always retry via
  // verifyNpi() below.
  verifyNpi().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[MoonCall] Automatic NPI verification failed (non-fatal):', err);
  });

  return newProfile;
}

export async function signInResident(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutResident() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

function DEFAULT_NEW_RESIDENT_DOCUMENTS(): CredentialDocument[] {
  // Real new accounts start with nothing verified — no pretending.
  const base: Array<Pick<CredentialDocument, 'id' | 'name' | 'category' | 'requiredForTier1'>> = [
    { id: 'pd_letter', name: 'Program Director (PD) Moonlighting Approval Letter', category: 'institutional', requiredForTier1: true },
    { id: 'state_license', name: 'Full / Limited State Medical License', category: 'licensing', requiredForTier1: true },
    { id: 'npi_verification', name: 'NPI (National Provider Identifier) Registration', category: 'licensing', requiredForTier1: true },
    { id: 'dea_certificate', name: 'Federal DEA Registration Certificate', category: 'licensing', requiredForTier1: true },
    { id: 'acls_card', name: 'Advanced Cardiovascular Life Support (ACLS)', category: 'clinical_certs', requiredForTier1: true },
    { id: 'bls_card', name: 'Basic Life Support (BLS) Certificate', category: 'clinical_certs', requiredForTier1: true },
    { id: 'malpractice_cert', name: 'Certificate of Malpractice Insurance Coverage', category: 'malpractice_health', requiredForTier1: true },
    { id: 'tb_immunization', name: 'Immunization & Health Clearance (QuantiFERON TB & Flu)', category: 'malpractice_health', requiredForTier1: true },
    { id: 'cv_document', name: 'Curriculum Vitae (CV) & ACGME Case Logs', category: 'academic', requiredForTier1: true },
  ];
  return base.map((d) => ({ ...d, status: 'missing' as const }));
}

// ============================================================================
// Profile
// ============================================================================

export async function fetchMyProfile(userId: string): Promise<ResidentProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return profileRowToResidentProfile(data as ProfileRow);
}

export async function saveProfile(profile: ResidentProfile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(residentProfileToRow(profile, profile.id))
    .eq('id', profile.id);
  if (error) throw error;
}

export interface NpiVerificationResult {
  status: NpiVerificationStatus;
  message: string;
  verifiedName?: string;
  verifiedCredential?: string;
  verifiedTaxonomy?: string;
}

/**
 * Asks the server-side verify-npi function (netlify/functions/verify-npi.js)
 * to look the resident's NPI up against the real CMS NPI Registry and record
 * the result. This has to go through a server: the registry's API doesn't
 * support CORS, and only a trusted server (using the Supabase service role
 * key) is allowed to write the verification columns at all -- a database
 * trigger rejects that write from anyone else, including the resident's own
 * authenticated session.
 */
export async function verifyNpi(): Promise<NpiVerificationResult> {
  const session = await getCurrentSession();
  if (!session) throw new Error('You must be signed in to verify your NPI.');

  const response = await fetch('/api/verify-npi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  let data: NpiVerificationResult;
  try {
    data = await response.json();
  } catch {
    throw new Error('NPI verification returned an unexpected response. Please try again.');
  }

  if (!response.ok) {
    throw new Error(data?.message || 'NPI verification failed. Please try again.');
  }

  return data;
}

export interface PdApprovalRequestInput {
  pdName: string;
  pdEmail: string;
  pdCustomNote: string;
  uploadUrl: string;
}

export interface PdApprovalRequestResult {
  status: 'sent';
  pdName: string;
  pdEmail: string;
  sentAt: string;
}

/**
 * Asks the server-side send-pd-request function
 * (netlify/functions/send-pd-request.js) to actually email the resident's
 * Program Director with a secure upload link for their moonlighting
 * approval letter. This has to go through a server: real SMTP credentials
 * can never be shipped to the browser, and the resident's name/program/PGY
 * level are pulled from their own verified profile server-side rather than
 * trusted from whatever this call sends.
 */
export async function sendPdApprovalRequest(input: PdApprovalRequestInput): Promise<PdApprovalRequestResult> {
  const session = await getCurrentSession();
  if (!session) throw new Error('You must be signed in to send this request.');

  const response = await fetch('/api/send-pd-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });

  let data: PdApprovalRequestResult & { message?: string };
  try {
    data = await response.json();
  } catch {
    throw new Error('That returned an unexpected response. Please try again.');
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Could not send the email. Please try again.');
  }

  return data;
}

// Client-side gate before anything reaches storage. This is a data-hygiene
// check, not a security boundary on its own (nothing stops someone from
// renaming a file's extension) -- the real protection is that the
// credential-documents bucket is private and only readable by the owning
// resident and a connected hospital (see supabase/schema.sql). This just
// keeps obviously-wrong files (a .exe, a 200MB video) out of the
// credentialing pipeline before they're stored at all.
function assertFileAllowed(file: File, allowedExtensions: string[], maxBytes: number, kindLabel: string) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error(
      `"${file.name}" isn't a supported file type for ${kindLabel}. Allowed: ${allowedExtensions.join(', ').toUpperCase()}.`
    );
  }
  if (file.size > maxBytes) {
    throw new Error(
      `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB, which is over the ${(maxBytes / (1024 * 1024)).toFixed(0)}MB limit for ${kindLabel}.`
    );
  }
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024; // 15MB -- matches the limit already advertised in the Credential Vault upload UI

export async function uploadHeadshot(userId: string, file: File): Promise<string> {
  assertFileAllowed(file, ['jpg', 'jpeg', 'png', 'webp', 'gif'], MAX_PHOTO_BYTES, 'a profile photo');
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/headshot_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCredentialDocumentFile(userId: string, docId: string, file: File): Promise<string> {
  assertFileAllowed(file, ['pdf', 'png', 'jpg', 'jpeg', 'docx'], MAX_DOCUMENT_BYTES, 'a credential document');
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `${userId}/${docId}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('credential-documents').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = await supabase.storage.from('credential-documents').createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl || path;
}

// ============================================================================
// Shared reference data (hospitals & shifts)
// ============================================================================

export async function fetchHospitals(): Promise<HospitalFacility[]> {
  const { data, error } = await supabase.from('hospitals').select('data, owner_id');
  if (error) throw error;
  // Prefer the real owner_id column over whatever's embedded in the JSON
  // blob -- this makes real hospital sites created before ownerId was added
  // to that JSON payload work correctly too, with no data migration needed.
  return (data || []).map((row) => ({
    ...(row.data as HospitalFacility),
    ownerId: row.owner_id || (row.data as HospitalFacility)?.ownerId,
  }));
}

export async function fetchShifts(): Promise<MoonlightingShift[]> {
  const { data, error } = await supabase.from('shifts').select('data').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.data as MoonlightingShift);
}

// ============================================================================
// Applications
// ============================================================================

export async function fetchMyApplications(userId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('resident_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => applicationRowToApplication(row as ApplicationRow));
}

export async function createApplication(app: Application, residentId: string): Promise<void> {
  const { error } = await supabase.from('applications').insert(applicationToRow(app, residentId));
  if (error) throw error;
}

export async function updateApplication(app: Application, residentId: string): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update(applicationToRow(app, residentId))
    .eq('id', app.id)
    .eq('resident_id', residentId);
  if (error) throw error;
}

// ============================================================================
// Resident notifications
// ============================================================================

export async function fetchMyNotifications(userId: string): Promise<ResidentNotification[]> {
  const { data, error } = await supabase
    .from('resident_notifications')
    .select('id, data, read')
    .eq('resident_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({ ...(row.data as ResidentNotification), read: row.read }));
}

export async function insertNotification(notif: ResidentNotification, residentId: string): Promise<void> {
  const { error } = await supabase.from('resident_notifications').insert({
    id: notif.id,
    resident_id: residentId,
    data: notif,
    read: notif.read,
  });
  if (error) throw error;
}

export async function markNotificationReadRemote(id: string, residentId: string): Promise<void> {
  const { error } = await supabase
    .from('resident_notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('resident_id', residentId);
  if (error) throw error;
}
