// netlify/functions/verify-npi.js
//
// Server-side NPI verification. Called by the resident-facing app right
// after sign-up and whenever a resident clicks "Re-check NPI" in their
// Credential Vault. Runs on Netlify's servers (not the browser) for two
// reasons:
//
//   1. The CMS NPPES NPI Registry API (npiregistry.cms.hhs.gov) does not
//      send CORS headers, so a browser can't call it directly from
//      mooncall.org -- it has to be proxied through a server.
//   2. Whether an NPI counts as "verified" needs to be decided somewhere the
//      resident can't tamper with, then written to the database with the
//      Supabase *service role* key, which bypasses Row Level Security. A
//      matching DB trigger (see supabase/npi_verification.sql) rejects any
//      attempt to set these columns from a normal, non-service-role request,
//      so this function is the only path that can ever mark a profile
//      "verified".
//
// Required Netlify environment variables (Site settings -> Environment
// variables in the Netlify dashboard):
//   VITE_SUPABASE_URL           - already set for the frontend build
//   SUPABASE_SERVICE_ROLE_KEY   - NEW. From Supabase Dashboard -> Project
//                                  Settings -> API -> "service_role" secret
//                                  key. Never expose this to the browser --
//                                  it must only ever live here.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Validates the check-digit built into every real NPI (ISO/IEC 7812 Luhn
// algorithm with the fixed "80840" health-industry prefix). This is just a
// fast, offline sanity check to catch typos before spending a network call
// on the real registry -- the registry lookup below is what actually
// matters.
function hasValidNpiChecksum(npi) {
  if (!/^\d{10}$/.test(npi)) return false;
  const full = `80840${npi}`; // 5-digit prefix + 9-digit body + 1 check digit = 15 digits
  const digits = full.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const posFromRight = digits.length - 1 - i;
    let d = digits[i];
    if (posFromRight % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function normalizeName(name) {
  return (name || '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .trim();
}

function namesLikelyMatch(claimedFirst, claimedLast, registryFirst, registryLast) {
  const cf = normalizeName(claimedFirst);
  const cl = normalizeName(claimedLast);
  const rf = normalizeName(registryFirst);
  const rl = normalizeName(registryLast);
  if (!cl || !rl || cl !== rl) return false;
  if (!cf || !rf) return false;
  if (cf === rf) return true;
  // Tolerate nicknames / middle-name-as-first-name typos (e.g. "Rob" vs
  // "Robert") by allowing a shared 3+ character prefix rather than demanding
  // an exact match.
  const shortest = Math.min(cf.length, rf.length);
  if (shortest >= 3 && (cf.startsWith(rf.slice(0, shortest)) || rf.startsWith(cf.slice(0, shortest)))) {
    return true;
  }
  return false;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { status: 'error', message: 'Method not allowed.' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      status: 'error',
      message:
        'NPI verification is not configured on the server yet (missing Supabase env vars). ' +
        'Add SUPABASE_SERVICE_ROLE_KEY in Netlify site settings.',
    });
  }

  // Identify the caller from their Supabase session token. We never trust a
  // resident ID passed in the request body -- only the token proves who is
  // actually asking.
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return jsonResponse(401, { status: 'error', message: 'You must be signed in to verify an NPI.' });
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return jsonResponse(401, { status: 'error', message: 'Your session has expired. Please sign in again.' });
  }
  const userId = userData.user.id;

  // Service-role client: bypasses RLS so it can read the resident's own
  // claimed name/NPI and, later, write the verification result.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, first_name, last_name, npi_number')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return jsonResponse(404, { status: 'error', message: 'No profile found for your account yet.' });
  }

  const npi = (profile.npi_number || '').trim();
  if (!npi) {
    return jsonResponse(400, { status: 'error', message: 'Add your NPI number to your profile first.' });
  }

  if (!hasValidNpiChecksum(npi)) {
    return jsonResponse(200, {
      status: 'error',
      message: 'That doesn’t look like a valid 10-digit NPI (it failed the standard NPI checksum). Please double-check it.',
    });
  }

  let registryData;
  try {
    const res = await fetch(`https://npiregistry.cms.hhs.gov/api/?number=${npi}&version=2.1`);
    if (!res.ok) {
      throw new Error(`NPPES API responded with HTTP ${res.status}`);
    }
    registryData = await res.json();
  } catch (err) {
    // Transient network/API failure -- don't touch the DB, just report the
    // error so the client can offer to retry.
    return jsonResponse(200, {
      status: 'error',
      message: 'Could not reach the NPI registry right now. Please try again in a moment.',
    });
  }

  const result = Array.isArray(registryData?.results) ? registryData.results[0] : null;

  let outcome;
  if (Number(registryData?.result_count || 0) <= 0 || !result) {
    outcome = {
      status: 'not_found',
      message: `NPI ${npi} was not found in the CMS NPI Registry. Double-check the number.`,
    };
  } else {
    const basic = result.basic || {};
    const deactivated = Boolean(basic.deactivation_date) && !basic.reactivation_date;
    const isActive = basic.status === 'A' && !deactivated;
    const primaryTaxonomy = Array.isArray(result.taxonomies)
      ? result.taxonomies.find((t) => t.primary) || result.taxonomies[0]
      : null;
    const registryFullName = [basic.name_prefix, basic.first_name, basic.middle_name, basic.last_name]
      .filter(Boolean)
      .join(' ');

    if (!isActive) {
      outcome = {
        status: 'inactive',
        message: `NPI ${npi} is registered to ${registryFullName || 'a provider'}, but the registry shows it as deactivated/inactive.`,
        verifiedName: registryFullName || undefined,
      };
    } else if (!namesLikelyMatch(profile.first_name, profile.last_name, basic.first_name, basic.last_name)) {
      outcome = {
        status: 'name_mismatch',
        message: `NPI ${npi} is active, but it's registered to ${registryFullName || 'a different name'} — not ${profile.first_name} ${profile.last_name}. Please double-check the number.`,
        verifiedName: registryFullName || undefined,
      };
    } else {
      outcome = {
        status: 'verified',
        message: `Verified against the CMS NPI Registry as ${registryFullName}${basic.credential ? `, ${basic.credential}` : ''}.`,
        verifiedName: registryFullName || undefined,
        verifiedCredential: basic.credential || undefined,
        verifiedTaxonomy: primaryTaxonomy?.desc || undefined,
      };
    }
  }

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({
      npi_verification_status: outcome.status,
      npi_verified_name: outcome.verifiedName || null,
      npi_verified_credential: outcome.verifiedCredential || null,
      npi_verified_taxonomy: outcome.verifiedTaxonomy || null,
      npi_verified_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    return jsonResponse(500, { status: 'error', message: 'Verified, but failed to save the result. Please try again.' });
  }

  return jsonResponse(200, outcome);
};
