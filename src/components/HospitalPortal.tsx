import React, { useEffect, useState } from 'react';
import {
  Building2,
  ArrowLeft,
  Mail,
  Loader2,
  CheckCircle2,
  MapPin,
  Plus,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { resendSignUpCode, signOutResident, getCurrentSession } from '../lib/residentApi';
import {
  beginHospitalSignUp,
  signInHospitalAdmin,
  ensureHospitalProfileFromAuthUser,
  fetchMyHospitalProfile,
  fetchMyHospitalSites,
  createHospitalSite,
  NewSiteDetails,
} from '../lib/hospitalApi';
import { HospitalAccountProfile, HospitalFacility } from '../types';

interface HospitalPortalProps {
  onBack: () => void;
}

type Stage = 'auth' | 'check_email' | 'dashboard' | 'loading';

export const HospitalPortal: React.FC<HospitalPortalProps> = ({ onBack }) => {
  const [stage, setStage] = useState<Stage>('loading');
  const [isSignUp, setIsSignUp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Session / profile
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<HospitalAccountProfile | null>(null);
  const [sites, setSites] = useState<HospitalFacility[]>([]);

  // Add-site form
  const [showAddSite, setShowAddSite] = useState(false);
  const [siteForm, setSiteForm] = useState<NewSiteDetails>({
    name: '',
    systemName: '',
    address: '',
    city: '',
    state: '',
    emrSystem: '',
    contactPerson: '',
    contactEmail: '',
  });
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  // On mount: if there's already a session for a hospital admin (e.g. they
  // clicked the confirmation link), load their dashboard directly.
  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured) {
        setStage('auth');
        return;
      }
      try {
        const session = await getCurrentSession();
        if (session?.user) {
          const existingProfile = await fetchMyHospitalProfile(session.user.id);
          if (existingProfile) {
            setUserId(session.user.id);
            setProfile(existingProfile);
            const mySites = await fetchMyHospitalSites(session.user.id);
            setSites(mySites);
            setStage('dashboard');
            return;
          }
        }
      } catch (err) {
        console.error('Hospital portal bootstrap failed', err);
      }
      setStage('auth');
    })();
  }, []);

  const loadDashboard = async (uid: string) => {
    const hospitalProfile = await ensureHospitalProfileFromAuthUser(uid);
    setProfile(hospitalProfile);
    const mySites = await fetchMyHospitalSites(uid);
    setSites(mySites);
    setUserId(uid);
    setStage('dashboard');
  };

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        if (!organizationName || !contactName || !email || !password) {
          throw new Error('Please fill in all required fields.');
        }
        await beginHospitalSignUp({ email, password, organizationName, contactName, contactPhone });
        setStage('check_email');
      } else {
        const result = await signInHospitalAdmin(email, password);
        if (result.user) {
          await loadDashboard(result.user.id);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendSuccess(false);
    try {
      await resendSignUpCode(email);
      setResendSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Could not resend the email. Please wait a bit and try again.');
    }
  };

  const handleLogout = async () => {
    await signOutResident(); // generic Supabase sign-out — works for any account type
    setUserId(null);
    setProfile(null);
    setSites([]);
    setEmail('');
    setPassword('');
    setStage('auth');
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSiteError(null);

    if (!siteForm.name || !siteForm.address || !siteForm.city || !siteForm.state) {
      setSiteError('Please fill in the facility name and full address.');
      return;
    }

    setIsSavingSite(true);
    try {
      const created = await createHospitalSite(siteForm, userId);
      setSites((prev) => [created, ...prev]);
      setShowAddSite(false);
      setSiteForm({
        name: '',
        systemName: '',
        address: '',
        city: '',
        state: '',
        emrSystem: '',
        contactPerson: '',
        contactEmail: '',
      });
    } catch (err: any) {
      setSiteError(err?.message || 'Could not save this site. Please check the address and try again.');
    } finally {
      setIsSavingSite(false);
    }
  };

  // ==========================================================================
  // Render: loading
  // ==========================================================================
  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ==========================================================================
  // Render: check your email
  // ==========================================================================
  if (stage === 'check_email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Check your email</h2>
          <p className="text-sm text-slate-600 mt-2">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your MSO account, then come back here and sign in.
          </p>

          {resendSuccess && (
            <p className="mt-4 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              Email resent — check your inbox (and spam folder).
            </p>
          )}
          {error && (
            <p className="mt-4 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={handleResend}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              Resend Email
            </button>
            <button
              onClick={() => setStage('auth')}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-500 text-sm font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Render: sign up / sign in
  // ==========================================================================
  if (stage === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
        <div className="max-w-md w-full">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to MoonDoc</span>
          </button>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-8">
            <div className="flex items-center space-x-2.5 mb-1">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Hospital / MSO Account</h1>
                <p className="text-xs text-slate-500">Real account — separate from the resident portal</p>
              </div>
            </div>

            {!isSupabaseConfigured && (
              <p className="mt-4 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Backend isn't configured in this environment yet, so accounts can't be created here.
              </p>
            )}

            <div className="flex mt-6 mb-5 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => { setIsSignUp(true); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  isSignUp ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => { setIsSignUp(false); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  !isSignUp ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleSubmitAuth} className="space-y-3.5">
              {isSignUp && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Organization / Hospital System Name *</label>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="e.g. Sunrise Regional Health System"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Your Name (MSO Contact) *</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Jordan Reyes"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. (555) 123-4567"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Work Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourhospital.org"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isSupabaseConfigured}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSignUp ? 'Create MSO Account' : 'Sign In'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Render: dashboard
  // ==========================================================================
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">{profile?.organizationName}</h1>
            <p className="text-xs text-slate-500">{profile?.contactName} · MSO Dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Back to MoonDoc
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Sites</h2>
            <p className="text-sm text-slate-500">
              Facilities you add here show up automatically on every resident's Opportunity Map.
            </p>
          </div>
          <button
            onClick={() => setShowAddSite(!showAddSite)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Site</span>
          </button>
        </div>

        {showAddSite && (
          <form onSubmit={handleAddSite} className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Facility Name *</label>
                <input
                  type="text"
                  value={siteForm.name}
                  onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                  placeholder="e.g. Sunrise Regional ED"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Health System Name</label>
                <input
                  type="text"
                  value={siteForm.systemName}
                  onChange={(e) => setSiteForm({ ...siteForm, systemName: e.target.value })}
                  placeholder="Defaults to facility name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Street Address *</label>
              <input
                type="text"
                value={siteForm.address}
                onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                placeholder="e.g. 100 Main St"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">City *</label>
                <input
                  type="text"
                  value={siteForm.city}
                  onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })}
                  placeholder="e.g. Los Angeles"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">State *</label>
                <input
                  type="text"
                  value={siteForm.state}
                  onChange={(e) => setSiteForm({ ...siteForm, state: e.target.value })}
                  placeholder="e.g. CA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">EMR System</label>
                <input
                  type="text"
                  value={siteForm.emrSystem}
                  onChange={(e) => setSiteForm({ ...siteForm, emrSystem: e.target.value })}
                  placeholder="e.g. Epic Systems"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Recruiting Contact Person</label>
                <input
                  type="text"
                  value={siteForm.contactPerson}
                  onChange={(e) => setSiteForm({ ...siteForm, contactPerson: e.target.value })}
                  placeholder="e.g. Dr. Sarah Jenkins"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Recruiting Contact Email</label>
              <input
                type="email"
                value={siteForm.contactEmail}
                onChange={(e) => setSiteForm({ ...siteForm, contactEmail: e.target.value })}
                placeholder="e.g. moonlighting@yourhospital.org"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
              />
            </div>

            {siteError && (
              <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{siteError}</span>
              </p>
            )}

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="submit"
                disabled={isSavingSite}
                className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                {isSavingSite && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSavingSite ? 'Looking up address & saving…' : 'Save Site'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddSite(false)}
                className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {sites.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 font-bold text-sm">No sites yet</p>
            <p className="text-xs text-slate-500 mt-1">Add your first facility to have it appear on the resident map.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <div key={site.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-slate-900">{site.name}</h3>
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Live on map</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{site.address}, {site.city}, {site.state}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
