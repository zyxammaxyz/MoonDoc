import React, { useEffect, useRef, useState } from 'react';
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
  Users,
  MessageSquare,
  Send,
  Sparkles,
  Briefcase,
  FileText,
  ExternalLink,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Settings2,
  CheckCheck,
  Undo2,
  Search,
  History,
  ClipboardCheck,
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
  createShift,
  fetchMyShifts,
  deleteShift,
  updateShiftRequiredDocs,
  fetchCandidateProfile,
  NewSiteDetails,
  NewShiftDetails,
} from '../lib/hospitalApi';
import {
  fetchThreadsForHospitalOwner,
  fetchMessages,
  sendMessage,
  markThreadSeen,
  markThreadVerified,
  fetchCustomDocRequests,
  addCustomDocRequest,
  deleteCustomDocRequest,
  fetchCustomDocSubmissions,
  markThreadCompleted,
  SiteInterestThread,
  CustomDocRequest,
  CustomDocSubmission,
} from '../lib/interestApi';
import { HospitalAccountProfile, HospitalFacility, ChatMessage, MoonlightingShift, ResidentProfile, PGYLevel, DocumentCategory } from '../types';
import { INITIAL_DOCUMENTS } from '../data/mockData';

// The standard passport document catalog every resident already uploads to
// -- reused here so a hospital can toggle which of these apply to a given
// job, without duplicating or changing that baseline list in any way.
const STANDARD_DOC_CATALOG = INITIAL_DOCUMENTS.map((d) => ({ id: d.id, name: d.name, category: d.category }));

const DOC_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  institutional: 'PD & Institutional',
  licensing: 'Licenses & DEA',
  clinical_certs: 'ACLS & Clinical Certs',
  malpractice_health: 'Malpractice & Health',
  academic: 'CV & Transcripts',
  other: 'Other',
};

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

  // Dashboard sub-view: your sites vs. posted jobs vs. residents who've
  // expressed interest
  const [dashboardView, setDashboardView] = useState<'sites' | 'jobs' | 'candidates'>('sites');
  const [interests, setInterests] = useState<SiteInterestThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<SiteInterestThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<ResidentProfile | null>(null);
  const [isLoadingCandidateProfile, setIsLoadingCandidateProfile] = useState(false);
  // Interested (not yet signed off) vs. Verified (hospital manually
  // confirmed every requirement is met) -- this is a human call, never
  // flipped automatically just because documents were uploaded.
  const [candidateSubTab, setCandidateSubTab] = useState<'interested' | 'verified'>('interested');
  // Filters the always-visible candidate list by name/program/job so an MSO
  // tracking a lot of residents at once can jump straight to one.
  const [candidateSearch, setCandidateSearch] = useState('');
  const [isTogglingVerified, setIsTogglingVerified] = useState(false);
  // Which interest-thread's completion status is currently being saved --
  // keyed by thread id so multiple "Past Jobs" rows across different sites
  // don't fight over one shared loading flag.
  const [togglingCompletedId, setTogglingCompletedId] = useState<string | null>(null);
  // The opened candidate's job-specific requirements checklist (only
  // populated when their thread is tied to a specific posted job).
  const [threadCustomDocRequests, setThreadCustomDocRequests] = useState<CustomDocRequest[]>([]);
  const [threadCustomDocSubmissions, setThreadCustomDocSubmissions] = useState<CustomDocSubmission[]>([]);
  const [isLoadingThreadRequirements, setIsLoadingThreadRequirements] = useState(false);

  // Per-job document requirements management (Jobs tab)
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  const [customDocsByShift, setCustomDocsByShift] = useState<Record<string, CustomDocRequest[]>>({});
  const [newCustomDocLabelByShift, setNewCustomDocLabelByShift] = useState<Record<string, string>>({});
  const [isSavingRequirements, setIsSavingRequirements] = useState<string | null>(null);

  // Job postings
  const [shifts, setShifts] = useState<MoonlightingShift[]>([]);
  const [showPostJob, setShowPostJob] = useState(false);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const ALL_PGY: PGYLevel[] = ['PGY-1', 'PGY-2', 'PGY-3', 'PGY-4', 'PGY-5', 'Fellow'];
  const [jobForm, setJobForm] = useState<NewShiftDetails & { siteId: string }>({
    siteId: '',
    title: '',
    department: '',
    specialty: 'Emergency Medicine',
    date: '',
    startTime: '',
    endTime: '',
    durationHours: 12,
    hourlyRate: 175,
    spotsAvailable: 1,
    pgyRequirement: [],
    description: '',
  });

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
            const [mySites, myInterests, myShifts] = await Promise.all([
              fetchMyHospitalSites(session.user.id),
              fetchThreadsForHospitalOwner(session.user.id),
              fetchMyShifts(session.user.id),
            ]);
            setSites(mySites);
            setInterests(myInterests);
            setShifts(myShifts);
            if (mySites.length) setJobForm((prev) => ({ ...prev, siteId: prev.siteId || mySites[0].id }));
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

  // Poll for newly-expressed resident interest while the dashboard is open,
  // so a new "Candidates" notification shows up without a manual refresh.
  useEffect(() => {
    if (stage !== 'dashboard' || !userId) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await fetchThreadsForHospitalOwner(userId);
        setInterests(fresh);
      } catch (err) {
        console.error('Failed to refresh candidates', err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [stage, userId]);

  const loadDashboard = async (uid: string) => {
    const hospitalProfile = await ensureHospitalProfileFromAuthUser(uid);
    setProfile(hospitalProfile);
    const [mySites, myInterests, myShifts] = await Promise.all([
      fetchMyHospitalSites(uid),
      fetchThreadsForHospitalOwner(uid),
      fetchMyShifts(uid),
    ]);
    setSites(mySites);
    setInterests(myInterests);
    setShifts(myShifts);
    if (mySites.length) setJobForm((prev) => ({ ...prev, siteId: prev.siteId || mySites[0].id }));
    setUserId(uid);
    setStage('dashboard');
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setJobError(null);

    const site = sites.find((s) => s.id === jobForm.siteId);
    if (!site) {
      setJobError('Select which site this job is for.');
      return;
    }
    if (!jobForm.title || !jobForm.department || !jobForm.date || !jobForm.startTime || !jobForm.endTime) {
      setJobError('Please fill in the job title, department, date, and shift times.');
      return;
    }

    setIsSavingJob(true);
    try {
      const { siteId, ...details } = jobForm;
      const created = await createShift(details, site, userId);
      setShifts((prev) => [created, ...prev]);
      setShowPostJob(false);
      setJobForm((prev) => ({
        ...prev,
        title: '',
        department: '',
        date: '',
        startTime: '',
        endTime: '',
        description: '',
      }));
    } catch (err: any) {
      setJobError(err?.message || 'Could not post this job. Please try again.');
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleDeleteJob = async (shiftId: string) => {
    if (!userId) return;
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    try {
      await deleteShift(shiftId, userId);
    } catch (err) {
      console.error('Failed to delete job', err);
    }
  };

  // Guards against a slow response for a previously-opened thread landing
  // after the admin has already switched to a different candidate.
  const openThreadRequestRef = useRef<string | null>(null);

  const handleOpenThread = async (thread: SiteInterestThread) => {
    openThreadRequestRef.current = thread.id;
    setSelectedThread(thread);
    setIsLoadingThread(true);
    setThreadMessages([]);
    setCandidateProfile(null);
    setIsLoadingCandidateProfile(true);
    setThreadCustomDocRequests([]);
    setThreadCustomDocSubmissions([]);
    fetchCandidateProfile(thread.residentId)
      .then((prof) => {
        if (openThreadRequestRef.current === thread.id) setCandidateProfile(prof);
      })
      .catch((err) => console.error('Failed to load candidate passport', err))
      .finally(() => {
        if (openThreadRequestRef.current === thread.id) setIsLoadingCandidateProfile(false);
      });

    if (thread.shiftId) {
      setIsLoadingThreadRequirements(true);
      fetchCustomDocRequests(thread.shiftId)
        .then(async (requests) => {
          if (openThreadRequestRef.current !== thread.id) return;
          setThreadCustomDocRequests(requests);
          if (requests.length === 0) return;
          const submissions = await fetchCustomDocSubmissions(requests.map((r) => r.id), thread.residentId);
          if (openThreadRequestRef.current === thread.id) setThreadCustomDocSubmissions(submissions);
        })
        .catch((err) => console.error('Failed to load job document requirements', err))
        .finally(() => {
          if (openThreadRequestRef.current === thread.id) setIsLoadingThreadRequirements(false);
        });
    }

    try {
      const msgs = await fetchMessages(thread.id);
      setThreadMessages(msgs);
      if (thread.status === 'new') {
        await markThreadSeen(thread.id);
        setInterests((prev) => prev.map((t) => (t.id === thread.id ? { ...t, status: 'seen' } : t)));
      }
    } catch (err) {
      console.error('Failed to load candidate thread', err);
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleToggleVerified = async (thread: SiteInterestThread) => {
    setIsTogglingVerified(true);
    const nextVerified = !thread.verified;
    try {
      await markThreadVerified(thread.id, nextVerified);
      setInterests((prev) => prev.map((t) => (t.id === thread.id ? { ...t, verified: nextVerified } : t)));
      setSelectedThread((prev) => (prev && prev.id === thread.id ? { ...prev, verified: nextVerified } : prev));
    } catch (err) {
      console.error('Failed to update verification status', err);
    } finally {
      setIsTogglingVerified(false);
    }
  };

  // Manual, hospital-side confirmation that a resident actually worked a
  // shift -- separate from credentialing `verified` above. This is what
  // populates each site's "Past Jobs" track record.
  const handleToggleCompleted = async (thread: SiteInterestThread) => {
    const nextCompleted = !thread.completed;
    setTogglingCompletedId(thread.id);
    try {
      await markThreadCompleted(thread.id, nextCompleted);
      setInterests((prev) =>
        prev.map((t) =>
          t.id === thread.id
            ? { ...t, completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : undefined }
            : t
        )
      );
    } catch (err) {
      console.error('Failed to update job completion status', err);
    } finally {
      setTogglingCompletedId(null);
    }
  };

  // Toggle a standard passport document on/off for a job's requirements.
  const handleToggleStandardDoc = async (shift: MoonlightingShift, docId: string) => {
    if (!userId) return;
    const nextRequired = shift.requiredDocIds.includes(docId)
      ? shift.requiredDocIds.filter((id) => id !== docId)
      : [...shift.requiredDocIds, docId];

    setIsSavingRequirements(shift.id);
    try {
      const updated = await updateShiftRequiredDocs(shift, userId, nextRequired);
      setShifts((prev) => prev.map((s) => (s.id === shift.id ? updated : s)));
    } catch (err) {
      console.error('Failed to update document requirements', err);
    } finally {
      setIsSavingRequirements(null);
    }
  };

  const handleExpandShift = (shift: MoonlightingShift) => {
    const isExpanding = expandedShiftId !== shift.id;
    setExpandedShiftId(isExpanding ? shift.id : null);
    if (isExpanding && !customDocsByShift[shift.id]) {
      fetchCustomDocRequests(shift.id)
        .then((requests) => setCustomDocsByShift((prev) => ({ ...prev, [shift.id]: requests })))
        .catch((err) => console.error('Failed to load custom document requests', err));
    }
  };

  const handleAddCustomDoc = async (shift: MoonlightingShift) => {
    if (!userId) return;
    const label = (newCustomDocLabelByShift[shift.id] || '').trim();
    if (!label) return;

    setIsSavingRequirements(shift.id);
    try {
      const created = await addCustomDocRequest(shift.id, userId, label);
      setCustomDocsByShift((prev) => ({ ...prev, [shift.id]: [...(prev[shift.id] || []), created] }));
      setNewCustomDocLabelByShift((prev) => ({ ...prev, [shift.id]: '' }));
    } catch (err) {
      console.error('Failed to add custom document request', err);
    } finally {
      setIsSavingRequirements(null);
    }
  };

  const handleDeleteCustomDoc = async (shift: MoonlightingShift, requestId: string) => {
    if (!userId) return;
    setCustomDocsByShift((prev) => ({
      ...prev,
      [shift.id]: (prev[shift.id] || []).filter((r) => r.id !== requestId),
    }));
    try {
      await deleteCustomDocRequest(requestId, userId);
    } catch (err) {
      console.error('Failed to remove custom document request', err);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !userId || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    setIsSendingChat(true);
    try {
      const message = await sendMessage(selectedThread.id, 'hospital', userId, profile?.organizationName || 'MSO Team', text);
      setThreadMessages((prev) => [...prev, message]);
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsSendingChat(false);
    }
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
            <span>Back to MoonCall</span>
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
            Back to MoonCall
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

      <main className={`mx-auto px-6 py-8 ${dashboardView === 'candidates' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        <div className="flex mb-6 bg-slate-100 rounded-xl p-1 max-w-sm">
          <button
            onClick={() => { setDashboardView('sites'); setSelectedThread(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
              dashboardView === 'sites' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Your Sites</span>
          </button>
          <button
            onClick={() => { setDashboardView('jobs'); setSelectedThread(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
              dashboardView === 'jobs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs</span>
          </button>
          <button
            onClick={() => setDashboardView('candidates')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 relative ${
              dashboardView === 'candidates' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Candidates</span>
            {interests.some((t) => t.status === 'new') && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                {interests.filter((t) => t.status === 'new').length}
              </span>
            )}
          </button>
        </div>

        {dashboardView === 'jobs' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Posted Jobs</h2>
                <p className="text-sm text-slate-500">
                  Jobs you post here show up immediately on every resident's Opportunity Map.
                </p>
              </div>
              <button
                onClick={() => setShowPostJob(!showPostJob)}
                disabled={sites.length === 0}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                title={sites.length === 0 ? 'Add a site first' : ''}
              >
                <Plus className="w-4 h-4" />
                <span>Post New Job</span>
              </button>
            </div>

            {sites.length === 0 && (
              <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
                Add a site under "Your Sites" first -- jobs are posted for a specific facility.
              </p>
            )}

            {showPostJob && (
              <form onSubmit={handleSubmitJob} className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Site *</label>
                  <select
                    value={jobForm.siteId}
                    onChange={(e) => setJobForm({ ...jobForm, siteId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={jobForm.title}
                      onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      placeholder="e.g. Weekend ED Swing Coverage"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Department *</label>
                    <input
                      type="text"
                      value={jobForm.department}
                      onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                      placeholder="e.g. Emergency Department"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Specialty</label>
                  <select
                    value={jobForm.specialty}
                    onChange={(e) => setJobForm({ ...jobForm, specialty: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                  >
                    {['Emergency Medicine', 'Internal Medicine', 'Family Medicine', 'Pediatrics', 'Anesthesiology', 'General Surgery', 'Neurology', 'Psychiatry', 'Radiology', 'Obstetrics & Gynecology', 'Urgent Care'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Date *</label>
                    <input
                      type="date"
                      value={jobForm.date}
                      onChange={(e) => setJobForm({ ...jobForm, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Start Time *</label>
                    <input
                      type="time"
                      value={jobForm.startTime}
                      onChange={(e) => setJobForm({ ...jobForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">End Time *</label>
                    <input
                      type="time"
                      value={jobForm.endTime}
                      onChange={(e) => setJobForm({ ...jobForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Shift Length (hrs)</label>
                    <input
                      type="number"
                      min={1}
                      value={jobForm.durationHours}
                      onChange={(e) => setJobForm({ ...jobForm, durationHours: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Pay Rate ($/hr) *</label>
                    <input
                      type="number"
                      min={1}
                      value={jobForm.hourlyRate}
                      onChange={(e) => setJobForm({ ...jobForm, hourlyRate: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Spots Available</label>
                    <input
                      type="number"
                      min={1}
                      value={jobForm.spotsAvailable}
                      onChange={(e) => setJobForm({ ...jobForm, spotsAvailable: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Eligible PGY Levels (leave blank for all)</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_PGY.map((pgy) => {
                      const selected = jobForm.pgyRequirement.includes(pgy);
                      return (
                        <button
                          type="button"
                          key={pgy}
                          onClick={() =>
                            setJobForm((prev) => ({
                              ...prev,
                              pgyRequirement: selected
                                ? prev.pgyRequirement.filter((p) => p !== pgy)
                                : [...prev.pgyRequirement, pgy],
                            }))
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                            selected ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {pgy}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Description *</label>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Describe the shift, patient population, and expectations..."
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                {jobError && (
                  <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {jobError}
                  </p>
                )}

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingJob}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {isSavingJob && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isSavingJob ? 'Posting…' : 'Post Job'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPostJob(false)}
                    className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {shifts.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-700 font-bold text-sm">No jobs posted yet</p>
                <p className="text-xs text-slate-500 mt-1">Post your first job to have it appear on the resident map.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shifts.map((shift) => {
                  const isExpanded = expandedShiftId === shift.id;
                  const customDocs = customDocsByShift[shift.id] || [];
                  const isSaving = isSavingRequirements === shift.id;
                  return (
                    <div key={shift.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="p-4 flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-sm text-slate-900">{shift.title}</h3>
                            <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Live on map</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{shift.department} · {shift.hospitalName}</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {shift.date} · {shift.startTime}–{shift.endTime} · ${shift.hourlyRate}/hr · {shift.spotsAvailable} spot{shift.spotsAvailable !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => handleExpandShift(shift)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer text-[11px] font-bold"
                            title="Manage required documents"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Requirements</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteJob(shift.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Remove job"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/70 p-4 space-y-4">
                          <div>
                            <p className="text-xs font-bold text-slate-700 mb-2 flex items-center space-x-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Required from the standard MoonCall Passport</span>
                            </p>
                            <p className="text-[11px] text-slate-500 mb-2.5">
                              Toggle which of the documents residents already upload to their Passport are required for this specific job.
                            </p>
                            <div className="space-y-3">
                              {(Object.keys(DOC_CATEGORY_LABELS) as DocumentCategory[]).map((cat) => {
                                const docsInCat = STANDARD_DOC_CATALOG.filter((d) => d.category === cat);
                                if (docsInCat.length === 0) return null;
                                return (
                                  <div key={cat}>
                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                      {DOC_CATEGORY_LABELS[cat]}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {docsInCat.map((doc) => {
                                        const isOn = shift.requiredDocIds.includes(doc.id);
                                        return (
                                          <button
                                            key={doc.id}
                                            type="button"
                                            disabled={isSaving}
                                            onClick={() => handleToggleStandardDoc(shift, doc.id)}
                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold text-left transition-colors cursor-pointer disabled:opacity-60 ${
                                              isOn
                                                ? 'bg-blue-50 border-blue-200 text-blue-900'
                                                : 'bg-white border-slate-200 text-slate-500'
                                            }`}
                                          >
                                            <span className="truncate mr-2">{doc.name}</span>
                                            <span
                                              className={`w-8 h-[18px] rounded-full relative shrink-0 transition-colors ${
                                                isOn ? 'bg-blue-600' : 'bg-slate-300'
                                              }`}
                                            >
                                              <span
                                                className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${
                                                  isOn ? 'right-0.5' : 'left-0.5'
                                                }`}
                                              />
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-200">
                            <p className="text-xs font-bold text-slate-700 mb-2 flex items-center space-x-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>Additional documents specific to this job</span>
                            </p>

                            {customDocs.length > 0 && (
                              <div className="space-y-1.5 mb-2.5">
                                {customDocs.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800"
                                  >
                                    <span className="truncate">{doc.label}</span>
                                    <button
                                      onClick={() => handleDeleteCustomDoc(shift, doc.id)}
                                      className="text-slate-400 hover:text-red-600 cursor-pointer shrink-0 ml-2"
                                      title="Remove this requirement"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleAddCustomDoc(shift);
                              }}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="text"
                                value={newCustomDocLabelByShift[shift.id] || ''}
                                onChange={(e) =>
                                  setNewCustomDocLabelByShift((prev) => ({ ...prev, [shift.id]: e.target.value }))
                                }
                                placeholder="e.g. Site-specific EMR training certificate"
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                              />
                              <button
                                type="submit"
                                disabled={isSaving || !(newCustomDocLabelByShift[shift.id] || '').trim()}
                                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            </form>
                            <p className="text-[10px] text-slate-400 mt-1.5">
                              Adding a document requests it immediately from every resident already connected to this job, not just future candidates.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : dashboardView === 'candidates' ? (
          <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[560px]">
            {/* Resident list -- always visible on the left so the MSO can
                jump between candidates without losing their place, even
                when tracking a lot of residents at once. */}
            <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-200 space-y-2.5 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    placeholder="Search residents..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setCandidateSubTab('interested')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      candidateSubTab === 'interested' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Interested ({interests.filter((t) => !t.verified).length})
                  </button>
                  <button
                    onClick={() => setCandidateSubTab('verified')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      candidateSubTab === 'verified' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Verified ({interests.filter((t) => t.verified).length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {(() => {
                  const q = candidateSearch.trim().toLowerCase();
                  const list = interests
                    .filter((t) => (candidateSubTab === 'verified' ? t.verified : !t.verified))
                    .filter(
                      (t) =>
                        !q ||
                        t.residentName.toLowerCase().includes(q) ||
                        (t.residentProgram || '').toLowerCase().includes(q) ||
                        (t.shiftTitle || '').toLowerCase().includes(q)
                    );

                  if (list.length === 0) {
                    return (
                      <div className="text-center py-12 px-4">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-700 font-bold text-xs">
                          {q
                            ? 'No residents match that search'
                            : candidateSubTab === 'verified'
                            ? 'No verified candidates yet'
                            : 'No interested residents yet'}
                        </p>
                        {!q && (
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {candidateSubTab === 'verified'
                              ? "Mark a candidate as Verified once they've met every requirement."
                              : "When a resident expresses interest in one of your sites, they'll show up here."}
                          </p>
                        )}
                      </div>
                    );
                  }

                  return list.map((thread) => {
                    const isActive = selectedThread?.id === thread.id;
                    return (
                      <button
                        key={thread.id}
                        onClick={() => handleOpenThread(thread)}
                        className={`w-full text-left p-3 transition-colors cursor-pointer ${
                          isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`font-bold text-xs truncate ${isActive ? 'text-blue-800' : 'text-slate-900'}`}>
                            {thread.residentName}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            {thread.status === 'new' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="New" />
                            )}
                            {thread.verified && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{thread.residentProgram || 'Resident'}</p>
                        <p className="text-[10px] text-blue-700 font-semibold truncate mt-0.5">
                          {thread.shiftTitle ? `Applied: ${thread.shiftTitle}` : `Interested in ${thread.hospitalName}`}
                        </p>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Detail: MoonCall Passport on the left, chat on the right --
                per the request to split these side by side instead of
                stacking them, once a resident is picked from the list. */}
            {selectedThread ? (
              <div className="flex-1 flex gap-4 min-w-0">
                {/* Passport panel */}
                <div className="w-[340px] shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
                    <h3 className="text-sm font-bold">{selectedThread.residentName}</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {selectedThread.residentProgram || 'Resident'} ·{' '}
                      {selectedThread.shiftTitle
                        ? `Applied for "${selectedThread.shiftTitle}"`
                        : `Interested in ${selectedThread.hospitalName}`}
                    </p>
                    <button
                      onClick={() => handleToggleVerified(selectedThread)}
                      disabled={isTogglingVerified}
                      className={`mt-3 w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 ${
                        selectedThread.verified
                          ? 'bg-slate-700 hover:bg-slate-600 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isTogglingVerified ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : selectedThread.verified ? (
                        <Undo2 className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5" />
                      )}
                      <span>{selectedThread.verified ? 'Verified — Move Back' : 'Mark as Verified'}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {selectedThread.shiftId && (
                      <div className="p-3.5 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center space-x-1.5 mb-2">
                          <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-bold text-slate-800">Requirements for this job</span>
                        </div>
                        {isLoadingThreadRequirements ? (
                          <div className="flex items-center space-x-2 text-xs text-slate-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking documents…</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(() => {
                              const jobShift = shifts.find((s) => s.id === selectedThread.shiftId);
                              const standardChecklist = (jobShift?.requiredDocIds || []).map((docId) => {
                                const doc = candidateProfile?.documents.find((d) => d.id === docId);
                                return { docId, name: doc?.name || docId, met: doc?.status === 'verified' };
                              });
                              return (
                                <>
                                  {standardChecklist.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {standardChecklist.map((item) => (
                                        <span
                                          key={item.docId}
                                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${
                                            item.met
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                              : 'bg-amber-50 border-amber-200 text-amber-800'
                                          }`}
                                        >
                                          {item.met ? '✓' : '✗'} {item.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {threadCustomDocRequests.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {threadCustomDocRequests.map((req) => {
                                        const submitted = threadCustomDocSubmissions.find(
                                          (s) => s.requestId === req.id && s.fileUrl
                                        );
                                        return submitted ? (
                                          <a
                                            key={req.id}
                                            href={submitted.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-2 py-1 rounded-lg border text-[10px] font-bold bg-emerald-50 border-emerald-200 text-emerald-800 underline hover:no-underline"
                                          >
                                            ✓ {req.label}
                                          </a>
                                        ) : (
                                          <span
                                            key={req.id}
                                            className="px-2 py-1 rounded-lg border text-[10px] font-bold bg-amber-50 border-amber-200 text-amber-800"
                                          >
                                            ✗ {req.label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {standardChecklist.length === 0 && threadCustomDocRequests.length === 0 && (
                                    <p className="text-[11px] text-slate-400">No specific document requirements set for this job yet.</p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-3.5">
                      <div className="flex items-center space-x-1.5 mb-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800">MoonCall Passport</span>
                      </div>
                      {isLoadingCandidateProfile ? (
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading credential documents…</span>
                        </div>
                      ) : !candidateProfile ? (
                        <p className="text-xs text-slate-400">Could not load this candidate's passport.</p>
                      ) : candidateProfile.documents.length === 0 ? (
                        <p className="text-xs text-slate-400">No documents uploaded yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {candidateProfile.documents.map((doc) => (
                            <a
                              key={doc.id}
                              href={doc.fileUrl || undefined}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => { if (!doc.fileUrl) e.preventDefault(); }}
                              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                                doc.fileUrl
                                  ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 cursor-pointer'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 cursor-default'
                              }`}
                              title={doc.fileUrl ? 'Open document' : 'Not uploaded yet'}
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[150px]">{doc.name}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                  doc.status === 'verified'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : doc.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {doc.status}
                              </span>
                              {doc.fileUrl && <ExternalLink className="w-3 h-3 shrink-0" />}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chat panel */}
                <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-800">Conversation</span>
                    <span className="text-[10px] text-slate-400">{threadMessages.length} message{threadMessages.length === 1 ? '' : 's'}</span>
                  </div>

                  <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50/60">
                    {isLoadingThread ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    ) : threadMessages.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">No messages yet.</div>
                    ) : (
                      threadMessages.map((msg) => {
                        const isHospital = msg.senderRole === 'hospital';
                        return (
                          <div key={msg.id} className={`flex flex-col ${isHospital ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                                isHospital
                                  ? 'bg-blue-600 text-white rounded-tr-none'
                                  : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                              }`}
                            >
                              <div className={`flex items-center justify-between gap-4 mb-1 pb-1 border-b ${isHospital ? 'border-blue-500 text-blue-100' : 'border-slate-100 text-slate-400'}`}>
                                <span className="font-bold text-[10px]">{msg.senderName}</span>
                                <span className="text-[9px]">{msg.timestamp}</span>
                              </div>
                              <div className="whitespace-pre-line font-medium">{msg.text}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Message ${selectedThread.residentName}...`}
                      className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={isSendingChat || !chatInput.trim()}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                    >
                      {isSendingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-center p-10">
                <div>
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-bold text-sm">Select a resident to view their passport &amp; chat</p>
                  <p className="text-xs text-slate-500 mt-1">Pick anyone from the list on the left to see their MoonCall Passport and message them directly.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
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
            {sites.map((site) => {
              // Today's date as an ISO 'YYYY-MM-DD' string -- shift.date is
              // stored in the same format, so plain string comparison works
              // for "has this shift already happened" without needing a
              // date-parsing library.
              const todayIso = new Date().toISOString().slice(0, 10);
              const pastJobs = interests
                .filter((t) => t.hospitalId === site.id && t.shiftId)
                .map((t) => ({ thread: t, shift: shifts.find((s) => s.id === t.shiftId) }))
                .filter((pj): pj is { thread: SiteInterestThread; shift: MoonlightingShift } =>
                  !!pj.shift && (pj.shift.date <= todayIso || pj.thread.completed)
                )
                .sort((a, b) => b.shift.date.localeCompare(a.shift.date));

              return (
                <div key={site.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-slate-900">{site.name}</h3>
                        <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Live on map</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{site.address}, {site.city}, {site.state}</p>
                    </div>
                  </div>

                  {/* Past Jobs -- a real track record of who worked this
                      site and when, built entirely from manual "Verify
                      Completion" sign-offs below (never inferred just
                      because a shift date passed). */}
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 mb-2">
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>Past Jobs</span>
                    </p>

                    {pastJobs.length === 0 ? (
                      <p className="text-[11px] text-slate-400">No completed shifts at this site yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {pastJobs.map(({ thread, shift }) => (
                          <div
                            key={thread.id}
                            className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {thread.residentName}
                                {thread.residentProgram && (
                                  <span className="text-slate-400 font-medium"> · {thread.residentProgram}</span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {shift.title} · {shift.date}
                              </p>
                            </div>

                            {thread.completed ? (
                              <span className="shrink-0 flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleCompleted(thread)}
                                disabled={togglingCompletedId === thread.id}
                                className="shrink-0 flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                {togglingCompletedId === thread.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <ClipboardCheck className="w-3 h-3" />
                                )}
                                <span>Verify Completion</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
};
