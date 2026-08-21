// netlify/functions/send-pd-request.js
//
// Server-side "email my Program Director" sender. Called when a resident
// clicks "Send Email Request to PD" in their Credential Vault. This used to
// be a pure UI mock (a setTimeout that faked a "sent" state) -- this
// function is what actually delivers the email. Runs on Netlify's servers,
// not the browser, for two reasons:
//
//   1. Real SMTP credentials can never be shipped to the browser.
//   2. The resident's name, title, program, and PGY level are read from
//      their own verified profile row (via the Supabase service role key)
//      rather than trusted from whatever the client claims -- the same
//      defensive pattern used in verify-npi.js.
//
// Required Netlify environment variables (Site settings -> Environment
// variables in the Netlify dashboard):
//   VITE_SUPABASE_URL           - already set for the frontend build
//   VITE_SUPABASE_ANON_KEY      - already set for the frontend build
//   SUPABASE_SERVICE_ROLE_KEY   - already set for verify-npi.js
//   GMAIL_SENDER_EMAIL          - the mailbox the email is actually sent
//                                  FROM. Defaults to maxbruin17@g.ucla.edu
//                                  below if unset -- change the env var
//                                  (not this file) whenever the sending
//                                  mailbox changes.
//   GMAIL_APP_PASSWORD          - a Gmail "App Password" for that mailbox
//                                  (Google Account -> Security -> 2-Step
//                                  Verification -> App passwords). This is
//                                  NOT the regular account password --
//                                  Gmail requires 2-Step Verification to be
//                                  turned on before it will even offer App
//                                  Passwords, and a normal password will be
//                                  rejected by SMTP auth.

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GMAIL_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL || 'maxbruin17@g.ucla.edu';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const SENDER_DISPLAY_NAME = 'MoonCall';

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

// Minimal HTML-escaping for the handful of user-supplied strings (PD name,
// custom note) that get interpolated into the HTML email body -- so a
// resident typing markup into the note field can't inject anything into an
// email that gets sent to someone else's inbox.
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let cachedTransporter = null;
function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_SENDER_EMAIL,
        pass: GMAIL_APP_PASSWORD,
      },
    });
  }
  return cachedTransporter;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { status: 'error', message: 'Method not allowed.' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      status: 'error',
      message: 'This feature is not configured on the server yet (missing Supabase env vars).',
    });
  }
  if (!GMAIL_APP_PASSWORD) {
    return jsonResponse(500, {
      status: 'error',
      message: 'This feature is not configured on the server yet -- add GMAIL_APP_PASSWORD in Netlify site settings.',
    });
  }

  // Identify the caller from their Supabase session token -- never trust a
  // resident's name/program straight from the request body.
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return jsonResponse(401, { status: 'error', message: 'You must be signed in to send this request.' });
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return jsonResponse(401, { status: 'error', message: 'Your session has expired. Please sign in again.' });
  }
  const userId = userData.user.id;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { status: 'error', message: 'Malformed request.' });
  }

  const pdName = String(body.pdName || 'Program Director').trim().slice(0, 200);
  const pdEmail = String(body.pdEmail || '').trim().slice(0, 320);
  const pdCustomNote = String(body.pdCustomNote || '').trim().slice(0, 2000);
  const uploadUrl = String(body.uploadUrl || '').trim().slice(0, 500);

  if (!isLikelyEmail(pdEmail)) {
    return jsonResponse(400, { status: 'error', message: "That doesn't look like a valid Program Director email address." });
  }
  if (!uploadUrl) {
    return jsonResponse(400, { status: 'error', message: 'Missing secure upload link.' });
  }

  // Service-role client: reads the resident's own verified profile so the
  // email reflects real data instead of anything the browser sent.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('first_name, last_name, title, residency_program, hospital_affiliation, pgy_level')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return jsonResponse(404, { status: 'error', message: 'No profile found for your account yet.' });
  }

  const residentFullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'A MoonCall resident';
  const residentTitle = profile.title || 'MD';
  const affiliation = profile.hospital_affiliation || profile.residency_program || '';
  const pgy = profile.pgy_level || '';
  const affiliationSuffix = affiliation ? ` (${affiliation}${pgy ? `, ${pgy}` : ''})` : '';

  const subject = `[Action Required] Moonlighting Approval Request - ${residentFullName}`;

  const noteHtml = pdCustomNote
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #4f46e5;background:#f5f5ff;color:#333;font-style:italic;">${escapeHtml(pdCustomNote)}</blockquote>`
    : '';

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
      <p>Dear ${escapeHtml(pdName)},</p>
      <p>
        <strong>${escapeHtml(residentFullName)}, ${escapeHtml(residentTitle)}</strong>${escapeHtml(affiliationSuffix)}
        has requested an official Program Director Moonlighting Approval &amp; Good Standing Letter
        for their verified MoonCall Passport.
      </p>
      ${noteHtml}
      <div style="margin:24px 0;padding:24px;border-radius:16px;background:linear-gradient(135deg,#4f46e5,#4338ca);color:#fff;text-align:center;">
        <p style="text-transform:uppercase;font-size:11px;letter-spacing:0.05em;opacity:0.85;margin:0 0 8px;">Secure PD Upload Portal</p>
        <p style="font-size:18px;font-weight:700;margin:0 0 8px;">Upload Signed Approval Letter</p>
        <p style="font-size:13px;opacity:0.9;margin:0 0 16px;">
          Click the secure link below to upload the signed PDF so it can be attached to
          ${escapeHtml(residentFullName)}'s MoonCall Passport profile.
        </p>
        <a href="${escapeHtml(uploadUrl)}" style="display:inline-block;background:#fff;color:#4338ca;font-weight:700;padding:10px 16px;border-radius:10px;text-decoration:none;font-size:13px;word-break:break-all;">
          ${escapeHtml(uploadUrl)}
        </a>
      </div>
      <p style="font-size:12px;color:#64748b;">
        Thank you for supporting ${escapeHtml(residentFullName)}'s professional development.<br/>
        <strong>MoonCall Credentialing Operations</strong>
      </p>
    </div>
  `;

  const text = [
    `Dear ${pdName},`,
    '',
    `${residentFullName}, ${residentTitle}${affiliationSuffix} has requested an official Program Director Moonlighting Approval & Good Standing Letter for their verified MoonCall Passport.`,
    pdCustomNote ? `\n"${pdCustomNote}"\n` : '',
    `Upload the signed letter here: ${uploadUrl}`,
    '',
    `Thank you for supporting ${residentFullName}'s professional development.`,
    'MoonCall Credentialing Operations',
  ].filter(Boolean).join('\n');

  try {
    await getTransporter().sendMail({
      from: `"${SENDER_DISPLAY_NAME}" <${GMAIL_SENDER_EMAIL}>`,
      to: pdEmail,
      replyTo: GMAIL_SENDER_EMAIL,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error('Failed to send PD request email:', err);
    return jsonResponse(502, {
      status: 'error',
      message: 'Could not send the email right now. Please try again in a moment.',
    });
  }

  return jsonResponse(200, {
    status: 'sent',
    pdName,
    pdEmail,
    sentAt: new Date().toISOString(),
  });
};
