import { supabase } from './supabaseClient';
import { HospitalAccountProfile, HospitalFacility, MedicalSpecialty } from '../types';

// ============================================================================
// Row <-> type mapping
// ============================================================================

function hospitalProfileRowToType(row: any): HospitalAccountProfile {
  return {
    id: row.id,
    organizationName: row.organization_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone || '',
  };
}

function hospitalProfileToRow(profile: HospitalAccountProfile) {
  return {
    id: profile.id,
    organization_name: profile.organizationName,
    contact_name: profile.contactName,
    contact_email: profile.contactEmail,
    contact_phone: profile.contactPhone || null,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================================
// Auth
// ============================================================================

export interface HospitalSignUpDetails {
  email: string;
  password: string;
  organizationName: string;
  contactName: string;
  contactPhone: string;
}

export async function beginHospitalSignUp(details: HospitalSignUpDetails) {
  const { data, error } = await supabase.auth.signUp({
    email: details.email,
    password: details.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        account_type: 'hospital_admin',
        organization_name: details.organizationName,
        contact_name: details.contactName,
        contact_phone: details.contactPhone,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInHospitalAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Called after a hospital admin clicks the confirmation link in their email
 * (or on session restore) — builds their hospital_profiles row from the
 * signup metadata if it doesn't exist yet.
 */
export async function ensureHospitalProfileFromAuthUser(userId: string): Promise<HospitalAccountProfile> {
  const existing = await fetchMyHospitalProfile(userId);
  if (existing) return existing;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error('No authenticated user found while creating hospital profile.');

  const meta = user.user_metadata || {};
  const newProfile: HospitalAccountProfile = {
    id: user.id,
    organizationName: meta.organization_name || 'Unnamed Organization',
    contactName: meta.contact_name || '',
    contactEmail: user.email || '',
    contactPhone: meta.contact_phone || '',
  };

  const { error: upsertError } = await supabase.from('hospital_profiles').upsert(hospitalProfileToRow(newProfile));
  if (upsertError) throw upsertError;
  return newProfile;
}

export async function fetchMyHospitalProfile(userId: string): Promise<HospitalAccountProfile | null> {
  const { data, error } = await supabase.from('hospital_profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return hospitalProfileRowToType(data);
}

// ============================================================================
// Geocoding (OpenStreetMap Nominatim — free, no API key)
// ============================================================================

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(fullAddress: string): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fullAddress)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Address lookup failed. Please check the address and try again.');
  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Could not find that address on the map. Try a more specific address (street, city, state).');
  }
  const best = results[0];
  return {
    lat: parseFloat(best.lat),
    lng: parseFloat(best.lon),
    displayName: best.display_name,
  };
}

// ============================================================================
// Hospital sites (facilities) — stored in the shared `hospitals` table
// ============================================================================

export interface NewSiteDetails {
  name: string;
  systemName: string;
  address: string;
  city: string;
  state: string;
  emrSystem: string;
  contactPerson: string;
  contactEmail: string;
  specialtyFocus?: MedicalSpecialty;
}

/**
 * Geocodes the given address and creates a new hospital "site" row, owned by
 * this hospital admin. It immediately becomes visible on every resident's
 * Opportunity Map (the `hospitals` table has always been publicly readable).
 */
export async function createHospitalSite(details: NewSiteDetails, ownerId: string): Promise<HospitalFacility> {
  const fullAddress = `${details.address}, ${details.city}, ${details.state}`;
  const geo = await geocodeAddress(fullAddress);

  const id = `hosp_owned_${ownerId.slice(0, 8)}_${Date.now()}`;
  const facility: HospitalFacility = {
    id,
    name: details.name,
    systemName: details.systemName || details.name,
    address: details.address,
    city: details.city,
    state: details.state,
    lat: geo.lat,
    lng: geo.lng,
    emrSystem: details.emrSystem || 'Not specified',
    hospitalRating: 5,
    contactPerson: details.contactPerson,
    contactEmail: details.contactEmail,
    // Critical: this is what lets the resident side recognize this as a
    // REAL hospital account (vs. a mock one) and route "expressed interest"
    // into the real notification + chat pipeline instead of the fabricated
    // demo conversation.
    ownerId,
  };

  const { error } = await supabase.from('hospitals').insert({
    id,
    data: facility,
    owner_id: ownerId,
  });
  if (error) throw error;

  return facility;
}

export async function fetchMyHospitalSites(ownerId: string): Promise<HospitalFacility[]> {
  const { data, error } = await supabase
    .from('hospitals')
    .select('data')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.data as HospitalFacility);
}
