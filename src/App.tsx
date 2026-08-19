import React, { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LandingPage } from './components/LandingPage';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { MapView } from './components/MapView';
import { CredentialVault } from './components/CredentialVault';
import { ShiftDetailModal } from './components/ShiftDetailModal';
import { MyApplications } from './components/MyApplications';
import { HospitalSharePreview } from './components/HospitalSharePreview';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { FinancesDashboard } from './components/FinancesDashboard';
import { HoursDashboard } from './components/HoursDashboard';
import { HospitalAdminPortal } from './components/HospitalAdminPortal';
import { AffiliatedSites } from './components/AffiliatedSites';
import { ResidentCommunications } from './components/ResidentCommunications';
import { HospitalPortal } from './components/HospitalPortal';

import { ResidentProfile, MoonlightingShift, Application, CredentialDocument, HospitalFacility, AdminNotification, ResidentNotification } from './types';
import { INITIAL_RESIDENT, MOCK_SHIFTS, INITIAL_APPLICATIONS, MOCK_HOSPITALS } from './data/mockData';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import {
  getCurrentSession,
  fetchMyProfile,
  ensureProfileFromAuthUser,
  fetchMyApplications,
  fetchMyNotifications,
  fetchShifts,
  fetchHospitals,
  createApplication,
  updateApplication,
  saveProfile,
  insertNotification,
  markNotificationReadRemote,
  signOutResident,
} from './lib/residentApi';
import {
  createInterestThread,
  fetchMessages as fetchInterestMessages,
  sendMessage as sendInterestMessage,
} from './lib/interestApi';

// For any "expressed interest" entries backed by a real hospital account
// (realThreadId set), pull the latest messages -- including the hospital
// admin's replies -- from the real site_messages table. Entries tied to mock
// hospitals pass through untouched.
async function refreshMessagesForApps(apps: Application[]): Promise<Application[]> {
  const realApps = apps.filter((a) => a.realThreadId);
  if (realApps.length === 0) return apps;
  try {
    const results = await Promise.all(
      realApps.map((a) => fetchInterestMessages(a.realThreadId as string))
    );
    const messagesByAppId = new Map(realApps.map((a, i) => [a.id, results[i]]));
    return apps.map((app) => (messagesByAppId.has(app.id) ? { ...app, messages: messagesByAppId.get(app.id) } : app));
  } catch (err) {
    console.error('Failed to refresh hospital chat messages', err);
    return apps;
  }
}

const INITIAL_RESIDENT_NOTIFICATIONS: ResidentNotification[] = [
  {
    id: 'res_notif_1',
    hospitalId: 'hosp_st_francis',
    hospitalName: 'St. Francis Medical Center ED',
    shiftId: 'shift_101',
    shiftTitle: 'High-Volume Community ER Nocturnist',
    specialty: 'Emergency Medicine',
    hourlyRate: 185,
    totalPay: 2220,
    date: '2026-08-15',
    timestamp: '15 mins ago',
    read: false,
    message: '🎉 St. Francis Medical Center ED posted a new shift: "High-Volume Community ER Nocturnist" ($185/hr). Because you have worked here before, you receive instant priority alert!',
    connectionReason: 'worked_before'
  }
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'resident' | 'admin'>('resident');
  const [activeTab, setActiveTab] = useState<'map' | 'vault' | 'applications' | 'communications' | 'finances' | 'hours' | 'affiliated_sites' | 'hospital_preview'>('map');
  const [profile, setProfile] = useState<ResidentProfile>(INITIAL_RESIDENT);
  const [shifts, setShifts] = useState<MoonlightingShift[]>(MOCK_SHIFTS);
  const [hospitals, setHospitals] = useState<HospitalFacility[]>(MOCK_HOSPITALS);
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [residentNotifications, setResidentNotifications] = useState<ResidentNotification[]>(INITIAL_RESIDENT_NOTIFICATIONS);

  // Real Supabase auth session for the resident side. Hospital Admin stays
  // a local demo login for this phase, so it never touches this state.
  const [session, setSession] = useState<Session | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);

  // Real Hospital/MSO account portal (Phase 2) — entirely separate from the
  // resident session above and from the mock Hospital Admin demo login.
  const [showHospitalPortal, setShowHospitalPortal] = useState<boolean>(false);

  // True only when the logged-in resident is a real Supabase-backed account
  // (as opposed to the still-mock Hospital Admin side). All the
  // write-through-to-database calls below are gated on this.
  const isRealResident =
    isSupabaseConfigured && userRole === 'resident' && !!session?.user && session.user.id === profile.id;

  // Kept in a ref (in addition to state) so the auth-change listener below —
  // which is set up once on mount — can check the latest logged-in status
  // without recreating the subscription on every render.
  const isLoggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  // Same pattern, for the real-hospital-chat poller below so it always sees
  // the latest applications list without needing to recreate its interval.
  const applicationsRef = useRef(applications);
  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  // A single Supabase Auth pool is shared by residents and hospital admins.
  // We tag hospital sign-ups with account_type metadata at sign-up time (see
  // beginHospitalSignUp) so that when a brand new session shows up — whether
  // from a page load or from clicking an email confirmation link — we route
  // it to the right experience instead of always assuming "resident."
  const isHospitalAdminSession = (s: Session | null): boolean => {
    return s?.user?.user_metadata?.account_type === 'hospital_admin';
  };

  const loadResidentSession = async (userId: string) => {
    // fetchMyProfile returns null the very first time a resident lands back
    // after clicking their email confirmation link — ensureProfileFromAuthUser
    // creates the row from the details stashed at sign-up time in that case.
    const existingProfile = await fetchMyProfile(userId);
    const prof = existingProfile || (await ensureProfileFromAuthUser(userId));
    const [apps, notifs, sharedShifts, sharedHospitals] = await Promise.all([
      fetchMyApplications(userId),
      fetchMyNotifications(userId),
      fetchShifts(),
      fetchHospitals(),
    ]);
    setProfile(prof);
    setApplications(await refreshMessagesForApps(apps));
    setResidentNotifications(notifs);
    if (sharedShifts.length) setShifts(sharedShifts);
    if (sharedHospitals.length) setHospitals(sharedHospitals);
    setIsLoggedIn(true);
    setUserRole('resident');
    setActiveTab('map');
  };

  const resetToLoggedOutState = () => {
    setIsLoggedIn(false);
    setSession(null);
    setProfile(INITIAL_RESIDENT);
    setApplications(INITIAL_APPLICATIONS);
    setResidentNotifications(INITIAL_RESIDENT_NOTIFICATIONS);
    setShifts(MOCK_SHIFTS);
    setHospitals(MOCK_HOSPITALS);
  };

  // On first load: restore a persisted resident session (page refresh /
  // returning visit) so residents don't have to log in every time. Also
  // keep listening for auth changes — this is what picks up a brand new
  // session the moment a resident clicks the confirmation link in their
  // email and lands back on this page.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsBootstrapping(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const existingSession = await getCurrentSession();
        if (mounted) setSession(existingSession);
        if (mounted && existingSession?.user) {
          if (isHospitalAdminSession(existingSession)) {
            setShowHospitalPortal(true);
          } else {
            await loadResidentSession(existingSession.user.id);
          }
        }
      } catch (err) {
        console.error('Failed to restore session', err);
      } finally {
        if (mounted) setIsBootstrapping(false);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      if (event === 'SIGNED_OUT') {
        if (isLoggedInRef.current) resetToLoggedOutState();
        return;
      }

      if (newSession?.user && isHospitalAdminSession(newSession)) {
        setShowHospitalPortal(true);
        return;
      }

      if (newSession?.user && !isLoggedInRef.current) {
        loadResidentSession(newSession.user.id).catch((err) =>
          console.error('Failed to load resident session', err)
        );
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modal states
  const [selectedShiftModal, setSelectedShiftModal] = useState<MoonlightingShift | null>(null);
  const [selectedDocViewer, setSelectedDocViewer] = useState<CredentialDocument | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Calculate percentage
  const totalDocs = profile.documents.length;
  const verifiedCount = profile.documents.filter((d) => d.status === 'verified').length;
  const completionPercentage = Math.round((verifiedCount / totalDocs) * 100);

  // Calculate approved shifts count
  const approvedCount = applications.filter((a) => a.status === 'Approved' || a.status === 'Completed').length;

  // Handle Hospital Admin publishing a new job -> Notifies connected residents
  const handleAddShift = (newShift: MoonlightingShift) => {
    setShifts((prev) => [newShift, ...prev]);

    // Check if logged in resident (or applications roster) has a connection with this hospital
    const matchingApp = applications.find((app) => {
      const sameId = app.shift?.hospitalId && newShift.hospitalId && app.shift.hospitalId === newShift.hospitalId;
      const sameName = app.shift?.hospitalName && newShift.hospitalName && (
        app.shift.hospitalName.toLowerCase().includes(newShift.hospitalName.toLowerCase()) ||
        newShift.hospitalName.toLowerCase().includes(app.shift.hospitalName.toLowerCase())
      );
      return sameId || sameName;
    });

    if (matchingApp) {
      const workedBefore = matchingApp.status === 'Completed' || matchingApp.status === 'Approved';
      const connectionReason = workedBefore ? 'worked_before' : 'expressed_interest';

      const notifMessage = workedBefore
        ? `🎉 ${newShift.hospitalName} posted a new shift: "${newShift.title}" ($${newShift.hourlyRate}/hr). Because you have worked here before, you have priority access!`
        : `🔔 New job posted at ${newShift.hospitalName}: "${newShift.title}" ($${newShift.hourlyRate}/hr) matching your saved Affiliated Sites connection!`;

      const newNotif: ResidentNotification = {
        id: `res_notif_${Date.now()}`,
        hospitalId: newShift.hospitalId,
        hospitalName: newShift.hospitalName,
        shiftId: newShift.id,
        shiftTitle: newShift.title,
        specialty: newShift.specialty,
        hourlyRate: newShift.hourlyRate,
        totalPay: newShift.totalPay,
        date: newShift.date,
        timestamp: 'Just now',
        read: false,
        message: notifMessage,
        connectionReason
      };

      setResidentNotifications((prev) => [newNotif, ...prev]);
      if (isRealResident && session?.user) {
        insertNotification(newNotif, session.user.id).catch((err) =>
          console.error('Failed to save notification', err)
        );
      }
    }
  };

  const handleMarkNotificationRead = (id: string) => {
    setResidentNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (isRealResident && session?.user) {
      markNotificationReadRemote(id, session.user.id).catch((err) =>
        console.error('Failed to mark notification read', err)
      );
    }
  };

  const handleSelectNotificationShift = (shiftId: string) => {
    setActiveTab('map');
    const target = shifts.find((s) => s.id === shiftId);
    if (target) {
      setSelectedShiftModal(target);
    }
  };


  // Real hospital account version of "expressing interest": creates a real,
  // persisted site_interests + first site_messages row (visible to the
  // hospital admin as a notification and a real chat thread), then mirrors
  // it into the local `applications` list so it shows up in the existing
  // Communications / My Shifts / Affiliated Sites UI exactly like a mock one.
  const handleConnectRealSite = async (hospital: HospitalFacility) => {
    if (!session?.user) return;
    const residentName = `Dr. ${profile.firstName} ${profile.lastName}`;
    const openingMessage = `Hello! I'm ${residentName} (${profile.residencyProgram}) and I'm interested in future moonlighting opportunities at ${hospital.name}. My verified MoonDoc Passport credentials are available on request.`;

    try {
      const { thread, message } = await createInterestThread(
        hospital,
        session.user.id,
        residentName,
        profile.residencyProgram,
        openingMessage
      );

      const poolShift: MoonlightingShift = {
        id: `shift_pool_${hospital.id}_${Date.now()}`,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        facilityLocation: `${hospital.address}, ${hospital.city}, ${hospital.state}`,
        lat: hospital.lat,
        lng: hospital.lng,
        distanceMiles: 6.2,
        specialty: profile.specialty,
        title: `General Moonlighting Candidate Roster (${hospital.name})`,
        department: 'Medical Staff Office / General Moonlighting Pool',
        hourlyRate: 175,
        totalPay: 2100,
        shiftType: 'Day Shift',
        startTime: '07:00',
        endTime: '19:00',
        date: '2026-08-25',
        durationHours: 12,
        pgyRequirement: [profile.pgyLevel],
        requiredDocIds: ['pd_letter', 'state_license', 'npi_verification', 'dea_certificate'],
        description: `Resident ${residentName} expressed interest in moonlighting opportunities at ${hospital.name}. MoonDoc Passport attached.`,
        malpracticeIncluded: true,
        restCallRoomAvailable: true,
        mealStipend: true,
        urgency: 'Standard',
        spotsAvailable: 5
      };

      const newApp: Application = {
        id: `app_conn_${Date.now()}`,
        shiftId: poolShift.id,
        shift: poolShift,
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'Credentialing Review',
        hospitalNotes: `Resident ${residentName} connected with ${hospital.name} MSO. Passport credentials attached for review.`,
        passportShareToken: `MOONDOC-${profile.licenseState}-${Math.floor(10000 + Math.random() * 90000)}`,
        applicantProfile: profile,
        messages: [message],
        realThreadId: thread.id,
      };

      setApplications((prev) => [newApp, ...prev]);
      if (isRealResident) {
        createApplication(newApp, session.user.id).catch((err) =>
          console.error('Failed to save real-site connection', err)
        );
      }
    } catch (err) {
      console.error('Failed to connect with real hospital site', err);
    }
  };

  // Handle Resident Connecting / Expressing Interest in an Affiliated Site
  const handleConnectSite = (hospital: HospitalFacility) => {
    // Check if already connected
    const existing = applications.find(
      (app) =>
        app.shift?.hospitalId === hospital.id ||
        app.shift?.hospitalName === hospital.name
    );
    if (existing) return;

    // Real hospital account (has an owner) -> real notification + real chat
    // thread, instead of the fabricated MSO reply used for mock hospitals.
    if (hospital.ownerId) {
      handleConnectRealSite(hospital);
      return;
    }

    // Create a pool shift object for this hospital
    const poolShift: MoonlightingShift = {
      id: `shift_pool_${hospital.id}_${Date.now()}`,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      facilityLocation: `${hospital.address}, ${hospital.city}, ${hospital.state}`,
      lat: hospital.lat,
      lng: hospital.lng,
      distanceMiles: 6.2,
      specialty: profile.specialty,
      title: `General Moonlighting Candidate Roster (${hospital.name})`,
      department: 'Medical Staff Office / General Moonlighting Pool',
      hourlyRate: 175,
      totalPay: 2100,
      shiftType: 'Day Shift',
      startTime: '07:00',
      endTime: '19:00',
      date: '2026-08-25',
      durationHours: 12,
      pgyRequirement: [profile.pgyLevel],
      requiredDocIds: ['pd_letter', 'state_license', 'npi_verification', 'dea_certificate'],
      description: `Resident Dr. ${profile.firstName} ${profile.lastName} expressed interest in moonlighting opportunities at ${hospital.name}. MoonDoc Passport attached.`,
      malpracticeIncluded: true,
      restCallRoomAvailable: true,
      mealStipend: true,
      urgency: 'Standard',
      spotsAvailable: 5
    };

    const newApp: Application = {
      id: `app_conn_${Date.now()}`,
      shiftId: poolShift.id,
      shift: poolShift,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'Credentialing Review', // Added to Under Review candidate list!
      hospitalNotes: `Resident Dr. ${profile.firstName} ${profile.lastName} connected with ${hospital.name} MSO. Passport credentials attached for review.`,
      passportShareToken: `MOONDOC-${profile.licenseState}-${Math.floor(10000 + Math.random() * 90000)}`,
      applicantProfile: profile,
      messages: [
        {
          id: `msg_c1_${Date.now()}`,
          senderRole: 'resident',
          senderName: `Dr. ${profile.firstName} ${profile.lastName}`,
          text: `Hello ${hospital.contactPerson}! I am interested in future moonlighting opportunities at ${hospital.name}. My verified MoonDoc Passport credentials are attached.`,
          timestamp: 'Just now'
        },
        {
          id: `msg_c2_${Date.now() + 1}`,
          senderRole: 'hospital',
          senderName: `${hospital.name} MSO Coordinator`,
          text: `Welcome Dr. ${profile.lastName}! Thank you for expressing interest in ${hospital.name}. We have added you to our Under Review candidate roster and opened a direct chat thread with our Medical Staff Office.`,
          timestamp: 'Just now'
        }
      ]
    };

    // Add to applications
    setApplications((prev) => [newApp, ...prev]);
    if (isRealResident && session?.user) {
      createApplication(newApp, session.user.id).catch((err) =>
        console.error('Failed to save connection', err)
      );
    }

    // Dispatch Admin Notification!
    const newNotif: AdminNotification = {
      id: `notif_${Date.now()}`,
      type: 'new_interest',
      title: 'New Resident Added to Under Review',
      message: `Dr. ${profile.firstName} ${profile.lastName} expressed interest in ${hospital.name} and was added to the Under Review candidates list.`,
      timestamp: 'Just now',
      read: false,
      residentName: `Dr. ${profile.firstName} ${profile.lastName}`,
      residentAvatar: profile.headshotUrl,
      hospitalName: hospital.name
    };

    setAdminNotifications((prev) => [newNotif, ...prev]);
  };

  // Handle shift application
  const handleApplyShift = (shift: MoonlightingShift) => {
    const newApp: Application = {
      id: `app_${Date.now()}`,
      shiftId: shift.id,
      shift: shift,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'Credentialing Review',
      hospitalNotes: 'MoonDoc Passport received by Medical Staff Office. Reviewing PD approval letter and state license.',
      passportShareToken: `MOONDOC-${profile.licenseState}-${Math.floor(10000 + Math.random() * 90000)}`,
      applicantProfile: profile,
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderRole: 'resident',
          senderName: `Dr. ${profile.firstName} ${profile.lastName}`,
          text: `Application submitted for ${shift.title}. Verified Passport credentials attached.`,
          timestamp: 'Just now'
        }
      ]
    };

    setApplications([newApp, ...applications]);
    if (isRealResident && session?.user) {
      createApplication(newApp, session.user.id).catch((err) =>
        console.error('Failed to save application', err)
      );
    }

    // Dispatch Admin Notification for new interest/application!
    const newNotif: AdminNotification = {
      id: `notif_app_${Date.now()}`,
      type: 'new_interest',
      title: 'New Resident Added to Under Review',
      message: `Dr. ${profile.firstName} ${profile.lastName} applied for "${shift.title}" at ${shift.hospitalName} and joined the Under Review roster.`,
      timestamp: 'Just now',
      read: false,
      residentName: `Dr. ${profile.firstName} ${profile.lastName}`,
      residentAvatar: profile.headshotUrl,
      hospitalName: shift.hospitalName,
      shiftTitle: shift.title
    };

    setAdminNotifications((prev) => [newNotif, ...prev]);
  };

  // Handle direct messages between resident & hospital MSO
  const handleSendMessage = (
    appId: string,
    text: string,
    senderRole: 'resident' | 'hospital',
    senderName: string
  ) => {
    const newMessage = {
      id: `msg_${Date.now()}`,
      senderRole,
      senderName,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let persistApp: Application | null = null;
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === appId) {
          const updated = {
            ...app,
            messages: [...(app.messages || []), newMessage],
          };
          persistApp = updated;
          return updated;
        }
        return app;
      })
    );
    if (!persistApp) return;

    // Real hospital thread: the real site_messages table is the source of
    // truth (that's what the hospital admin's dashboard reads from), so send
    // there instead of writing this fabricated message into `applications`.
    if (persistApp.realThreadId && session?.user) {
      sendInterestMessage(persistApp.realThreadId, senderRole, session.user.id, senderName, text).catch((err) =>
        console.error('Failed to send message to hospital', err)
      );
      return;
    }

    if (isRealResident && session?.user) {
      updateApplication(persistApp, session.user.id).catch((err) =>
        console.error('Failed to save message', err)
      );
    }
  };

  // Poll for hospital replies while the resident has the Chat tab open.
  useEffect(() => {
    if (activeTab !== 'communications') return;
    let cancelled = false;
    const tick = async () => {
      const refreshed = await refreshMessagesForApps(applicationsRef.current);
      if (!cancelled) setApplications(refreshed);
    };
    tick();
    const interval = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Handle resident marking an approved shift as completed
  const handleMarkShiftCompleted = (appId: string) => {
    let persistApp: Application | null = null;
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === appId) {
          const updated: Application = {
            ...app,
            status: 'Completed',
            payoutStatus: 'Paid',
            hospitalNotes: app.hospitalNotes ? `${app.hospitalNotes} | Shift completed by resident.` : 'Shift marked completed by resident.',
          };
          persistApp = updated;
          return updated;
        }
        return app;
      })
    );
    if (isRealResident && session?.user && persistApp) {
      updateApplication(persistApp, session.user.id).catch((err) =>
        console.error('Failed to save shift completion', err)
      );
    }
  };

  // Handle Admin Document Verification Toggle (Communicates with resident profile)
  const handleUpdateResidentDocument = (residentId: string, docId: string, newStatus: 'verified' | 'pending') => {
    // 1. Update active resident profile if it matches logged in resident
    if (profile.id === residentId) {
      setProfile((prev) => ({
        ...prev,
        documents: prev.documents.map((d) => (d.id === docId ? { ...d, status: newStatus } : d)),
      }));
    }

    // 2. Update embedded applicantProfile across all applications
    setApplications((prev) =>
      prev.map((app) => {
        if (app.applicantProfile?.id === residentId) {
          const updatedDocs = app.applicantProfile.documents.map((d) =>
            d.id === docId ? { ...d, status: newStatus } : d
          );
          return {
            ...app,
            applicantProfile: {
              ...app.applicantProfile,
              documents: updatedDocs,
            },
          };
        }
        return app;
      })
    );
  };

  // Handle Admin Application Status Update (e.g. Under Review -> Approved / Accepted)
  const handleUpdateApplicationStatus = (appId: string, newStatus: Application['status'], notes?: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === appId) {
          const updatedApp = {
            ...app,
            status: newStatus,
            hospitalNotes: notes || app.hospitalNotes,
          };

          if (newStatus === 'Approved') {
            // Dispatch notifications for candidate accepted and job transferred!
            const notifAccepted: AdminNotification = {
              id: `notif_acc_${Date.now()}`,
              type: 'candidate_accepted',
              title: 'Candidate Moved to Accepted List',
              message: `Dr. ${app.applicantProfile?.firstName} ${app.applicantProfile?.lastName} was cleared and moved from Under Review to Accepted Candidates roster for ${app.shift.title}.`,
              timestamp: 'Just now',
              read: false,
              residentName: `Dr. ${app.applicantProfile?.firstName} ${app.applicantProfile?.lastName}`,
              residentAvatar: app.applicantProfile?.headshotUrl,
              shiftTitle: app.shift.title
            };

            const notifTransferred: AdminNotification = {
              id: `notif_trans_${Date.now() + 1}`,
              type: 'job_transferred',
              title: 'Job Transferred: Published → Accepted',
              message: `The shift "${app.shift.title}" at ${app.shift.hospitalName} was filled by Dr. ${app.applicantProfile?.lastName} and transferred from Published to Accepted Jobs.`,
              timestamp: 'Just now',
              read: false,
              residentName: `Dr. ${app.applicantProfile?.lastName}`,
              hospitalName: app.shift.hospitalName,
              shiftTitle: app.shift.title
            };

            setAdminNotifications((prevNotifs) => [notifAccepted, notifTransferred, ...prevNotifs]);
          }

          return updatedApp;
        }
        return app;
      })
    );
  };

  // Handle Admin Payout Status Toggle (Manual Tracking)
  const handleUpdatePayoutStatus = (appId: string, payoutStatus: 'Pending' | 'Paid', payoutDate?: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === appId) {
          return {
            ...app,
            payoutStatus,
            payoutDate: payoutDate || new Date().toISOString().split('T')[0],
          };
        }
        return app;
      })
    );
  };

  // Handle Resident Profile Update (syncs documents to applications)
  const handleUpdateProfile = (updated: ResidentProfile) => {
    setProfile(updated);
    setApplications((prev) =>
      prev.map((app) => {
        if (app.applicantProfile?.id === updated.id) {
          return {
            ...app,
            applicantProfile: updated,
          };
        }
        return app;
      })
    );
    if (isRealResident) {
      saveProfile(updated).catch((err) => console.error('Failed to save profile', err));
    }
  };

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 text-sm">
        Loading MoonDoc...
      </div>
    );
  }

  if (showHospitalPortal) {
    return <HospitalPortal onBack={() => setShowHospitalPortal(false)} />;
  }

  if (!isLoggedIn) {
    return (
      <LandingPage
        onShowHospitalPortal={() => setShowHospitalPortal(true)}
        onLogin={async (role, customProfile) => {
          if (role === 'admin') {
            setIsLoggedIn(true);
            setUserRole('admin');
            setActiveTab('map');
            return;
          }

          // Resident login
          if (customProfile) {
            // Fresh sign-up: the profile row was just created in Supabase.
            // Start with an empty applications/notifications history.
            setProfile(customProfile);
            setApplications([]);
            setResidentNotifications([]);
            if (isSupabaseConfigured) {
              try {
                const [sharedShifts, sharedHospitals] = await Promise.all([fetchShifts(), fetchHospitals()]);
                if (sharedShifts.length) setShifts(sharedShifts);
                if (sharedHospitals.length) setHospitals(sharedHospitals);
              } catch (err) {
                console.error('Failed to load shared data', err);
              }
            }
            setIsLoggedIn(true);
            setUserRole('resident');
            setActiveTab('map');
            return;
          }

          // Existing account sign-in: pull everything from the database.
          try {
            const currentSession = await getCurrentSession();
            if (currentSession?.user) {
              // Defensive check: this same "resident" login form is shared by
              // anyone who types in valid credentials, so make sure we're not
              // about to build a resident dashboard for a Hospital/MSO admin
              // account that slipped through (e.g. a race with the auth
              // listener below). Route them to the real portal instead.
              if (isHospitalAdminSession(currentSession)) {
                setShowHospitalPortal(true);
                return;
              }
              await loadResidentSession(currentSession.user.id);
              return;
            }
          } catch (err) {
            console.error('Failed to load resident session after sign-in', err);
          }

          // Fallback (should not normally happen): still let them in so
          // they're not stuck on the landing page after a successful auth call.
          setIsLoggedIn(true);
          setUserRole('resident');
          setActiveTab('map');
        }}
      />
    );
  }

  // RENDER HOSPITAL ADMIN / MSO PORTAL
  if (userRole === 'admin') {
    return (
      <HospitalAdminPortal
        applications={applications}
        shifts={shifts}
        notifications={adminNotifications}
        onAddShift={handleAddShift}
        onUpdateApplicationStatus={handleUpdateApplicationStatus}
        onUpdatePayoutStatus={handleUpdatePayoutStatus}
        onUpdateResidentDocument={handleUpdateResidentDocument}
        onSendMessage={handleSendMessage}
        onLogout={() => setUserRole('resident')}
        onSwitchToResident={() => setUserRole('resident')}
        onOpenDocumentViewer={(doc) => setSelectedDocViewer(doc)}
      />
    );
  }

  // RENDER RESIDENT PORTAL
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        completionPercentage={completionPercentage}
        appliedCount={applications.length}
        approvedCount={approvedCount}
        notifications={residentNotifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onSelectNotificationShift={handleSelectNotificationShift}
        onLogout={() => {
          if (isRealResident) {
            signOutResident().catch((err) => console.error('Failed to sign out', err));
          }
          resetToLoggedOutState();
        }}
      />


      {/* Main View Content */}
      <main className="flex-1">
        {activeTab === 'map' && (
          <MapView
            shifts={shifts}
            onSelectShift={(shift) => setSelectedShiftModal(shift)}
            userDocuments={profile.documents}
          />
        )}

        {activeTab === 'vault' && (
          <CredentialVault
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onOpenDocumentViewer={(doc) => setSelectedDocViewer(doc)}
            onOpenShareModal={() => setShowShareModal(true)}
          />
        )}

        {activeTab === 'applications' && (
          <MyApplications
            applications={applications}
            onOpenHospitalPreview={() => setShowShareModal(true)}
            onSendMessage={handleSendMessage}
            onMarkShiftCompleted={handleMarkShiftCompleted}
          />
        )}

        {activeTab === 'communications' && (
          <ResidentCommunications
            applications={applications}
            hospitals={hospitals}
            profile={profile}
            onSendMessage={handleSendMessage}
            onConnectSite={handleConnectSite}
            onNavigateToSites={() => setActiveTab('affiliated_sites')}
          />
        )}

        {activeTab === 'finances' && (
          <FinancesDashboard
            applications={applications}
            profile={profile}
          />
        )}

        {activeTab === 'hours' && (
          <HoursDashboard
            applications={applications}
            profile={profile}
          />
        )}

        {activeTab === 'affiliated_sites' && (
          <AffiliatedSites
            hospitals={hospitals}
            applications={applications}
            shifts={shifts}
            profile={profile}
            onConnectSite={handleConnectSite}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeTab === 'hospital_preview' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
            <HospitalSharePreview
              profile={profile}
              onClose={() => setActiveTab('map')}
              isModal={false}
              applications={applications}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}
      </main>

      {/* Floating Bottom Credential Progress Bar */}
      <ProgressBar
        documents={profile.documents}
        completionPercentage={completionPercentage}
        onOpenVault={() => setActiveTab('vault')}
        onOpenShareModal={() => setShowShareModal(true)}
        availableShifts={shifts}
      />

      {/* Modals */}
      {selectedShiftModal && (
        <ShiftDetailModal
          shift={selectedShiftModal}
          onClose={() => setSelectedShiftModal(null)}
          userProfile={profile}
          onApply={handleApplyShift}
          isAlreadyApplied={applications.some((a) => a.shiftId === selectedShiftModal.id)}
          onOpenVault={() => setActiveTab('vault')}
        />
      )}

      {selectedDocViewer && (
        <DocumentViewerModal
          document={selectedDocViewer}
          onClose={() => setSelectedDocViewer(null)}
        />
      )}

      {showShareModal && (
        <HospitalSharePreview
          profile={profile}
          onClose={() => setShowShareModal(false)}
          applications={applications}
          onSendMessage={handleSendMessage}
        />
      )}

    </div>
  );
}

