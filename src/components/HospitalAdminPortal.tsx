import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Search, 
  FileText, 
  MessageSquare, 
  X, 
  Check, 
  User, 
  GraduationCap, 
  Calendar, 
  Sparkles,
  ChevronRight,
  LogOut,
  Hospital,
  PlusCircle,
  Briefcase,
  MapPin,
  Send,
  Award,
  Copy,
  RotateCcw,
  AlertTriangle,
  Layers,
  CheckCircle,
  FileSpreadsheet,
  Bell,
  UserPlus
} from 'lucide-react';
import { Application, CredentialDocument, MoonlightingShift, MedicalSpecialty, PGYLevel, AdminNotification, ChatMessage } from '../types';
import { JobTextBroadcastModal } from './JobTextBroadcastModal';

interface HospitalAdminPortalProps {
  applications: Application[];
  shifts?: MoonlightingShift[];
  notifications?: AdminNotification[];
  onAddShift?: (newShift: MoonlightingShift) => void;
  onUpdateApplicationStatus: (appId: string, newStatus: Application['status'], notes?: string) => void;
  onUpdatePayoutStatus?: (appId: string, payoutStatus: 'Pending' | 'Paid', payoutDate?: string) => void;
  onUpdateResidentDocument: (residentId: string, docId: string, newStatus: 'verified' | 'pending') => void;
  onSendMessage: (appId: string, text: string, senderRole: 'resident' | 'hospital', senderName: string) => void;
  onLogout: () => void;
  onSwitchToResident?: () => void;
  onOpenDocumentViewer: (doc: CredentialDocument) => void;
}

const INITIAL_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif_1',
    type: 'new_interest',
    title: 'New Resident Added to Under Review',
    message: 'Dr. Kevin Park expressed interest in St. Francis Medical Center ED and was added to the Under Review candidates list.',
    timestamp: '15 mins ago',
    read: false,
    residentName: 'Dr. Kevin Park',
    residentAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
    hospitalName: 'St. Francis Medical Center ED'
  },
  {
    id: 'notif_2',
    type: 'candidate_accepted',
    title: 'Candidate Moved to Accepted List',
    message: 'Dr. Jessie Smith credentials 100% verified. Moved from Under Review to Accepted Candidates roster.',
    timestamp: '1 hour ago',
    read: false,
    residentName: 'Dr. Jessie Smith',
    residentAvatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80',
    shiftTitle: 'High-Volume Community ER Nocturnist'
  },
  {
    id: 'notif_3',
    type: 'job_transferred',
    title: 'Job Transferred: Published → Accepted',
    message: 'High-Volume Community ER Nocturnist shift at St. Francis Medical Center filled by Dr. Jessie Smith and transferred from Published to Accepted Jobs.',
    timestamp: '1 hour ago',
    read: true,
    residentName: 'Dr. Jessie Smith',
    hospitalName: 'St. Francis Medical Center ED',
    shiftTitle: 'High-Volume Community ER Nocturnist'
  },
  {
    id: 'notif_4',
    type: 'new_interest',
    title: 'New Resident Added to Under Review',
    message: 'Dr. Maya Lin expressed interest in Valley Presbyterian Community ED and joined the Under Review list.',
    timestamp: '3 hours ago',
    read: true,
    residentName: 'Dr. Maya Lin',
    residentAvatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&auto=format&fit=crop&q=80',
    hospitalName: 'Valley Presbyterian Community ED'
  },
  {
    id: 'notif_5',
    type: 'candidate_accepted',
    title: 'Candidate Moved to Accepted List',
    message: 'Dr. Ananya Sharma cleared for After-Hours Urgent Care Fast Track at Kaiser Sunset Urgent Care Center.',
    timestamp: 'Yesterday',
    read: true,
    residentName: 'Dr. Ananya Sharma',
    residentAvatar: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=500&auto=format&fit=crop&q=80',
    shiftTitle: 'After-Hours Urgent Care Fast Track'
  }
];

export function HospitalAdminPortal({
  applications,
  shifts = [],
  notifications = [],
  onAddShift,
  onUpdateApplicationStatus,
  onUpdatePayoutStatus,
  onUpdateResidentDocument,
  onSendMessage,
  onLogout,
  onSwitchToResident,
  onOpenDocumentViewer,
}: HospitalAdminPortalProps) {
  // Main Top-Level Navigation Tab:
  const [mainTab, setMainTab] = useState<'published_jobs' | 'accepted_jobs' | 'completed_jobs' | 'roster' | 'messages' | 'notifications' | 'create_job'>('published_jobs');

  // Notifications State
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>(
    notifications.length > 0 ? notifications : INITIAL_NOTIFICATIONS
  );
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<'all' | 'new_interest' | 'candidate_accepted' | 'job_transferred'>('all');

  const unreadCount = adminNotifications.filter((n) => !n.read).length;

  // Selected Chat Thread for Master Communications Tab
  const [selectedChatAppId, setSelectedChatAppId] = useState<string | null>(applications[0]?.id || null);

  // Manual Payout Confirmation Modal State
  const [payoutConfirmApp, setPayoutConfirmApp] = useState<Application | null>(null);

  // Active Hospital Filter Context
  const [selectedHospital, setSelectedHospital] = useState<string>('All Hospitals');
  
  // Tab Subdivision for Roster
  const [activeCategoryTab, setActiveCategoryTab] = useState<'review' | 'accepted' | 'completed'>('review');

  // Institution Filter for Candidates
  const [selectedInstitution, setSelectedInstitution] = useState<string>('All');

  // Search Queries
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers
  const [activePassportModalApp, setActivePassportModalApp] = useState<Application | null>(null);
  const [activeChatModalApp, setActiveChatModalApp] = useState<Application | null>(null);
  const [chatInputText, setChatInputText] = useState<string>('');
  
  // Text Breakdown Broadcast Modal State
  const [selectedBroadcastShift, setSelectedBroadcastShift] = useState<MoonlightingShift | null>(null);

  // Notification Toast Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // --------------------------------------------------------------------------
  // CREATE JOB FORM STATE
  // --------------------------------------------------------------------------
  const [jobTitle, setJobTitle] = useState('Community ER Nocturnist Shift');
  const [jobHospital, setJobHospital] = useState('St. Francis Medical Center ED');
  const [jobDepartment, setJobDepartment] = useState('Emergency Department (Level II Trauma)');
  const [jobAddress, setJobAddress] = useState('Lynwood, CA');
  const [jobSpecialty, setJobSpecialty] = useState<MedicalSpecialty>('Emergency Medicine');
  const [jobRate, setJobRate] = useState<number>(185);
  const [jobDuration, setJobDuration] = useState<number>(12);
  const [jobDate, setJobDate] = useState('2026-08-22');
  const [jobStartTime, setJobStartTime] = useState('19:00');
  const [jobEndTime, setJobEndTime] = useState('07:00');
  const [jobShiftType, setJobShiftType] = useState<'Day Shift' | 'Night Shift' | 'Swing Shift' | '24-Hour Call' | 'Weekend Coverage' | 'Telehealth'>('Night Shift');
  const [jobPgyReq, setJobPgyReq] = useState<PGYLevel[]>(['PGY-2', 'PGY-3', 'PGY-4', 'Chief Resident']);
  const [jobMalpractice, setJobMalpractice] = useState(true);
  const [jobRestRoom, setJobRestRoom] = useState(true);
  const [jobMealStipend, setJobMealStipend] = useState(true);
  const [jobPatientVolume, setJobPatientVolume] = useState('18 - 22 patients / 12hr shift');
  const [jobEmrSystem, setJobEmrSystem] = useState('Epic Hyperspace');
  const [jobMidlevelSupport, setJobMidlevelSupport] = useState('Dedicated PA/NP on shift until 02:00');
  const [jobUrgency, setJobUrgency] = useState<'Standard' | 'Urgent' | 'High Demand'>('High Demand');
  const [jobDescription, setJobDescription] = useState('High-volume community ER nocturnist shift. Single-physician coverage with dedicated PA support. Rapid credentialing via MoonCall Passport.');

  // Handle Form Submit to Publish Job Live
  const handlePublishJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !jobHospital || !jobRate) return;

    const totalPayCalculated = jobRate * jobDuration;

    const newShift: MoonlightingShift = {
      id: `shift_${Date.now()}`,
      hospitalId: `hosp_${Date.now()}`,
      hospitalName: jobHospital,
      facilityLocation: `${jobDepartment}, ${jobAddress}`,
      lat: 33.9242 + (Math.random() - 0.5) * 0.08,
      lng: -118.2120 + (Math.random() - 0.5) * 0.08,
      distanceMiles: 8.4,
      specialty: jobSpecialty,
      title: jobTitle,
      department: jobDepartment,
      hourlyRate: jobRate,
      totalPay: totalPayCalculated,
      shiftType: jobShiftType,
      startTime: jobStartTime,
      endTime: jobEndTime,
      date: jobDate,
      durationHours: jobDuration,
      pgyRequirement: jobPgyReq,
      requiredDocIds: ['pd_letter', 'state_license', 'npi_verification', 'dea_certificate', 'acls_card'],
      description: `${jobDescription} | Patient Volume: ${jobPatientVolume} | EMR: ${jobEmrSystem} | Midlevel Support: ${jobMidlevelSupport}`,
      malpracticeIncluded: jobMalpractice,
      restCallRoomAvailable: jobRestRoom,
      mealStipend: jobMealStipend,
      urgency: jobUrgency,
      spotsAvailable: 1,
    };

    if (onAddShift) {
      onAddShift(newShift);
    }

    showToast(`🎉 Shift Published Live! "${jobTitle}" is now active on the candidate board & Published Jobs list.`);
    setMainTab('published_jobs');
  };

  const togglePgyRequirement = (pgy: PGYLevel) => {
    setJobPgyReq((prev) =>
      prev.includes(pgy) ? prev.filter((p) => p !== pgy) : [...prev, pgy]
    );
  };

  // --------------------------------------------------------------------------
  // DERIVED DATA & COMPUTATION
  // --------------------------------------------------------------------------
  // 1. Accepted Applications (Pending Shift Coverage)
  const acceptedApplications = applications.filter((app) => app.status === 'Approved');

  // 2. Completed Applications (Shift Worked)
  const completedApplications = applications.filter((app) => app.status === 'Completed');

  // 3. IDs of shifts that are filled/accepted or completed
  const filledShiftIds = new Set([
    ...acceptedApplications.map((a) => a.shiftId),
    ...completedApplications.map((a) => a.shiftId)
  ]);

  // 4. Open / Published Jobs (Not yet filled)
  const openPublishedShifts = shifts.filter((s) => !filledShiftIds.has(s.id));

  // Filter open published shifts by hospital selector & search query
  const filteredPublishedShifts = openPublishedShifts.filter((shift) => {
    if (selectedHospital !== 'All Hospitals') {
      const matchHosp = shift.hospitalName.toLowerCase().includes(selectedHospital.toLowerCase()) ||
        selectedHospital.toLowerCase().includes(shift.hospitalName.toLowerCase());
      if (!matchHosp) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = shift.title.toLowerCase().includes(q);
      const matchSpec = shift.specialty.toLowerCase().includes(q);
      const matchLocation = shift.facilityLocation.toLowerCase().includes(q);
      if (!matchTitle && !matchSpec && !matchLocation) return false;
    }
    return true;
  });

  // Filter accepted jobs by hospital selector & search query
  const filteredAcceptedApplications = acceptedApplications.filter((app) => {
    if (selectedHospital !== 'All Hospitals') {
      const matchHosp = app.shift.hospitalName.toLowerCase().includes(selectedHospital.toLowerCase()) ||
        selectedHospital.toLowerCase().includes(app.shift.hospitalName.toLowerCase());
      if (!matchHosp) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const residentName = `${app.applicantProfile?.firstName} ${app.applicantProfile?.lastName}`.toLowerCase();
      const title = app.shift.title.toLowerCase();
      if (!residentName.includes(q) && !title.includes(q)) return false;
    }
    return true;
  });

  // Filter completed jobs by hospital selector & search query
  const filteredCompletedApplications = completedApplications.filter((app) => {
    if (selectedHospital !== 'All Hospitals') {
      const matchHosp = app.shift.hospitalName.toLowerCase().includes(selectedHospital.toLowerCase()) ||
        selectedHospital.toLowerCase().includes(app.shift.hospitalName.toLowerCase());
      if (!matchHosp) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const residentName = `${app.applicantProfile?.firstName} ${app.applicantProfile?.lastName}`.toLowerCase();
      const title = app.shift.title.toLowerCase();
      if (!residentName.includes(q) && !title.includes(q)) return false;
    }
    return true;
  });

  // All unique institutions
  const allInstitutions = Array.from(
    new Set(
      applications
        .map((a) => a.applicantProfile?.residencyProgram)
        .filter(Boolean) as string[]
    )
  );

  // Candidate Roster Filters
  const hospitalApps = applications.filter((app) => {
    if (selectedHospital === 'All Hospitals') return true;
    return app.shift.hospitalName.toLowerCase().includes(selectedHospital.toLowerCase()) ||
      selectedHospital.toLowerCase().includes(app.shift.hospitalName.toLowerCase());
  });

  const filteredRosterApps = hospitalApps.filter((app) => {
    if (activeCategoryTab === 'review') {
      return app.status === 'Credentialing Review' || app.status === 'Submitted';
    }
    if (activeCategoryTab === 'accepted') {
      return app.status === 'Approved';
    }
    if (activeCategoryTab === 'completed') {
      return app.status === 'Completed';
    }
    return true;
  }).filter((app) => {
    const profile = app.applicantProfile;
    if (!profile) return true;

    if (selectedInstitution !== 'All' && profile.residencyProgram !== selectedInstitution) {
      return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const fullName = `${profile.firstName} ${profile.lastName}`.toLowerCase();
      const program = profile.residencyProgram.toLowerCase();
      const shiftTitle = app.shift.title.toLowerCase();
      return fullName.includes(query) || program.includes(query) || shiftTitle.includes(query);
    }

    return true;
  });

  // Category counts for roster
  const countUnderReview = hospitalApps.filter((a) => a.status === 'Credentialing Review' || a.status === 'Submitted').length;
  const countAcceptedRoster = hospitalApps.filter((a) => a.status === 'Approved').length;
  const countCompletedRoster = hospitalApps.filter((a) => a.status === 'Completed').length;

  // Total completed stats
  const totalCompletedPay = completedApplications.reduce((sum, a) => sum + (a.shift.totalPay || 0), 0);
  const totalCompletedHours = completedApplications.reduce((sum, a) => sum + (a.shift.durationHours || 0), 0);

  // Handle Resident Dropped Last-Minute (Returns job back to Published Jobs!)
  const handleResidentDropped = (app: Application) => {
    onUpdateApplicationStatus(
      app.id,
      'Declined',
      'Resident dropped shift last-minute. Returned to Open Published Jobs board.'
    );
    showToast(`↩️ Resident dropped shift. "${app.shift.title}" has been returned to Open Published Jobs!`);
  };

  // Handle Mark Shift Completed
  const handleMarkShiftCompleted = (app: Application) => {
    onUpdateApplicationStatus(
      app.id,
      'Completed',
      'Shift completed successfully. Direct deposit and MSO sign-off dispatched.'
    );
    showToast(`✅ "${app.shift.title}" marked as Completed! Moved to Completed Jobs Log.`);
  };

  // Handle Document Verification Toggle
  const handleToggleDocVerification = (app: Application, doc: CredentialDocument) => {
    const profile = app.applicantProfile;
    if (!profile) return;

    const isCurrentlyVerified = doc.status === 'verified';
    const newStatus = isCurrentlyVerified ? 'pending' : 'verified';

    onUpdateResidentDocument(profile.id, doc.id, newStatus);

    onSendMessage(
      app.id,
      `[MSO System Note]: ${doc.name} was marked as ${newStatus === 'verified' ? 'VERIFIED ✅' : 'UNDER REVIEW ⏳'} by Hospital Medical Staff Office.`,
      'hospital',
      'Hospital MSO Verifier'
    );

    const requiredDocs = profile.documents.filter((d) => d.requiredForTier1);
    const allRequiredVerified = requiredDocs.every((req) => {
      if (req.id === doc.id) return newStatus === 'verified';
      return req.status === 'verified';
    });

    if (allRequiredVerified && app.status === 'Credentialing Review') {
      onUpdateApplicationStatus(
        app.id,
        'Approved',
        'Automatically Cleared: All required MoonCall Passport credentials verified by Medical Staff Office.'
      );

      onSendMessage(
        app.id,
        `🎉 Congratulations Dr. ${profile.lastName}! All required MoonCall Passport credentials have been verified by our MSO team. Your shift application is officially ACCEPTED and CLEARED!`,
        'hospital',
        'Hospital MSO Coordinator'
      );

      showToast(`🎉 Dr. ${profile.firstName} ${profile.lastName}'s credentials are 100% verified! Application moved to ACCEPTED.`);
    } else {
      showToast(`${doc.name} marked as ${newStatus.toUpperCase()}`);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatModalApp || !chatInputText.trim()) return;

    onSendMessage(activeChatModalApp.id, chatInputText.trim(), 'hospital', 'Medical Staff Office Coordinator');
    setChatInputText('');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24">
      {/* Top Banner & Navigation Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            {/* Left Brand Identity */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={onSwitchToResident || onLogout}>
              <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm shrink-0">
                <img src="/brand/logo.png" alt="MoonCall" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold tracking-tight text-white">
                    Moon<span className="text-blue-400">Call</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md">
                    MSO Admin Portal
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Physician Moonlighting and Document Vault
                </p>
              </div>
            </div>

            {/* Hospital System Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl">
                <Hospital className="w-4 h-4 text-blue-400" />
                <select
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="All Hospitals" className="bg-slate-900 text-white">
                    All Partner Hospitals (Master View)
                  </option>
                  <option value="St. Francis Medical Center ED" className="bg-slate-900 text-white">
                    St. Francis Medical Center (Lynwood)
                  </option>
                  <option value="Valley Presbyterian Community ED" className="bg-slate-900 text-white">
                    Valley Presbyterian Community ED
                  </option>
                  <option value="Exer Urgent Care - Santa Monica" className="bg-slate-900 text-white">
                    Exer Urgent Care Network
                  </option>
                  <option value="Kaiser Sunset Urgent Care Center" className="bg-slate-900 text-white">
                    Kaiser Sunset Medical Center
                  </option>
                  <option value="Glendale Adventist ER Division" className="bg-slate-900 text-white">
                    Glendale Adventist Health
                  </option>
                  <option value="LA General Medical Center (LAC+USC) ED" className="bg-slate-900 text-white">
                    LA General Medical Center
                  </option>
                </select>
              </div>

              <button
                onClick={() => setMainTab('notifications')}
                className="relative p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
                title="Admin Notifications Center"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={onLogout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Admin</span>
              </button>
            </div>

          </div>

          {/* MAIN TAB SWITCHER NAVIGATION BAR */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between overflow-x-auto custom-scrollbar gap-2">
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              
              {/* TAB 1: Published Jobs (Open) */}
              <button
                onClick={() => setMainTab('published_jobs')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  mainTab === 'published_jobs'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Briefcase className="w-4 h-4 text-blue-300" />
                <span>Published Jobs (Open)</span>
                <span className="px-1.5 py-0.2 bg-blue-500/30 text-blue-200 rounded-full text-[10px] font-extrabold">
                  {openPublishedShifts.length}
                </span>
              </button>

              {/* TAB 2: Accepted Jobs (Pending Coverage) */}
              <button
                onClick={() => setMainTab('accepted_jobs')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  mainTab === 'accepted_jobs'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Accepted Jobs (Filled)</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-200 rounded-full text-[10px] font-extrabold">
                  {acceptedApplications.length}
                </span>
              </button>

              {/* TAB 3: Completed Jobs Log */}
              <button
                onClick={() => setMainTab('completed_jobs')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  mainTab === 'completed_jobs'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-300" />
                <span>Completed Jobs</span>
                <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-200 rounded-full text-[10px] font-extrabold">
                  {completedApplications.length}
                </span>
              </button>

              {/* TAB 4: Resident Candidate Roster */}
              <button
                onClick={() => setMainTab('roster')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  mainTab === 'roster'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 text-amber-300" />
                <span>Candidate Roster</span>
              </button>

              {/* TAB 5: Master Communications & Chat */}
              <button
                onClick={() => setMainTab('messages')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  mainTab === 'messages'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-sky-300" />
                <span>Messages & Chat</span>
                <span className="px-1.5 py-0.2 bg-sky-500/30 text-sky-200 rounded-full text-[10px] font-extrabold">
                  {applications.filter((a) => a.messages && a.messages.length > 0).length}
                </span>
              </button>

              {/* TAB 6: Admin Notifications */}
              <button
                onClick={() => setMainTab('notifications')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  mainTab === 'notifications'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-200 rounded-full text-[10px] font-extrabold">
                    {unreadCount}
                  </span>
                )}
              </button>

            </div>

            {/* TAB 5: Create a Job Button */}
            <button
              onClick={() => setMainTab('create_job')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
                mainTab === 'create_job'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-100" />
              <span>Create a Job</span>
            </button>

          </div>

        </div>
      </header>

      {/* Main Content Viewport */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="mb-6 p-4 bg-emerald-900/90 border border-emerald-500 text-emerald-100 rounded-2xl shadow-xl flex items-center justify-between animate-fade-in">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
              <p className="text-sm font-semibold">{toastMessage}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 1: PUBLISHED JOBS (OPEN & UNFILLED SHIFTS)                     */}
        {/* =================================================================== */}
        {mainTab === 'published_jobs' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header & Search */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                    <Briefcase className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Published Jobs (Open & Unfilled) ({filteredPublishedShifts.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Active hospital opportunities available for resident application. Generate 1-click email/SMS text breakdowns to recruit candidates.
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search shift title, specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* List of Open Published Shifts */}
            {filteredPublishedShifts.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Open Published Jobs</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  All published shifts are currently filled by accepted residents, or no shifts match your search filter.
                </p>
                <button
                  onClick={() => setMainTab('create_job')}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create & Publish a New Job</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPublishedShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Specialty & Status */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase rounded-md">
                          {shift.specialty}
                        </span>

                        <span className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Active Live on Board</span>
                        </span>
                      </div>

                      {/* Title & Hospital */}
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {shift.title}
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center space-x-1">
                        <Hospital className="w-3.5 h-3.5 text-slate-400 inline shrink-0" />
                        <span>{shift.hospitalName} ({shift.facilityLocation})</span>
                      </p>

                      {/* Schedule & Pay Grid */}
                      <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase">Date & Timing</span>
                          <strong className="text-slate-900 font-bold">{shift.date}</strong>
                          <p className="text-slate-500 text-[11px]">{shift.startTime} - {shift.endTime} ({shift.durationHours}h)</p>
                        </div>

                        <div>
                          <span className="text-slate-400 font-semibold block text-[10px] uppercase">Compensation</span>
                          <strong className="text-blue-600 font-extrabold">${shift.hourlyRate}/hr</strong>
                          <p className="text-slate-500 text-[11px]">${shift.totalPay} Total Shift Pay</p>
                        </div>
                      </div>

                      {/* Descriptors & Requirements */}
                      <div className="mt-3 text-xs text-slate-600 space-y-1">
                        <p className="flex items-center space-x-1 text-[11px]">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Eligible PGY: <strong className="text-slate-800">{shift.pgyRequirement.join(', ')}</strong></span>
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {shift.description}
                        </p>
                      </div>
                    </div>

                    {/* Action Row: One Click Text Creation */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Shift ID: <code className="font-mono text-slate-600">{shift.id}</code>
                      </span>

                      <button
                        onClick={() => setSelectedBroadcastShift(shift)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center space-x-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>⚡ Copy Email/SMS Text Breakdown</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: ACCEPTED JOBS (PENDING COVERAGE)                             */}
        {/* =================================================================== */}
        {mainTab === 'accepted_jobs' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Accepted Jobs (Pending Coverage) ({filteredAcceptedApplications.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Shifts filled by cleared resident candidates. If a resident drops last-minute, easily return the job back to Open Published Jobs.
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search resident or shift..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {filteredAcceptedApplications.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Accepted Jobs Pending</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  No shifts are currently in accepted status awaiting coverage.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAcceptedApplications.map((app) => {
                  const resident = app.applicantProfile;
                  if (!resident) return null;

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:border-blue-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                    >
                      {/* Left: Shift & Resident Info */}
                      <div className="flex items-start space-x-4">
                        <img
                          src={resident.headshotUrl}
                          alt={resident.firstName}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80';
                          }}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0"
                        />

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md border border-emerald-200">
                              ACCEPTED & CLEARED
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {app.shift.hospitalName}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 mt-1">
                            {app.shift.title}
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-700">
                            <span className="font-bold text-blue-700">
                              Dr. {resident.firstName} {resident.lastName}, {resident.title} ({resident.pgyLevel})
                            </span>
                            <span>•</span>
                            <span>{resident.residencyProgram}</span>
                            <span>•</span>
                            <span className="text-slate-500 font-mono">NPI: {resident.npiNumber}</span>
                            {resident.npiVerificationStatus === 'verified' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                <ShieldCheck className="w-3 h-3" /> CMS Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3" /> NPI Not Verified
                              </span>
                            )}
                          </div>

                          <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 inline-flex flex-wrap items-center gap-4 text-xs">
                            <span>🗓 Date: <strong className="text-slate-900">{app.shift.date}</strong></span>
                            <span>⏰ Timing: <strong className="text-slate-900">{app.shift.startTime} - {app.shift.endTime}</strong></span>
                            <span>💰 Total Pay: <strong className="text-emerald-700">${app.shift.totalPay}</strong> (${app.shift.hourlyRate}/hr)</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        
                        {/* Drop Last Minute Action Button */}
                        <button
                          onClick={() => handleResidentDropped(app)}
                          className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                          title="Resident dropped last minute - return job back to published jobs list"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>Resident Dropped (Return to Published Jobs)</span>
                        </button>

                        {/* Mark Completed Action Button */}
                        <button
                          onClick={() => handleMarkShiftCompleted(app)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Mark Shift Completed</span>
                        </button>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: COMPLETED JOBS LOG                                           */}
        {/* =================================================================== */}
        {mainTab === 'completed_jobs' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header & Stats Banner */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Completed Jobs Log ({filteredCompletedApplications.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Historical log of all moonlighting shifts completed by resident physicians sorted by date.
                </p>
              </div>

              {/* Total Payroll Stats Bar */}
              <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Shifts Completed</span>
                  <strong className="text-sm font-black text-slate-900">{completedApplications.length} Shifts</strong>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Hours Worked</span>
                  <strong className="text-sm font-black text-slate-900">{totalCompletedHours} Hours</strong>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Disbursed Payroll</span>
                  <strong className="text-sm font-black text-emerald-600">${totalCompletedPay}</strong>
                </div>
              </div>
            </div>

            {/* List of Completed Shifts */}
            {filteredCompletedApplications.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Completed Shifts Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  No shifts have been marked as completed yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCompletedApplications.map((app) => {
                  const resident = app.applicantProfile;
                  if (!resident) return null;

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start space-x-4">
                        <img
                          src={resident.headshotUrl}
                          alt={resident.firstName}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80';
                          }}
                          className="w-12 h-12 rounded-2xl object-cover border border-indigo-200 shrink-0"
                        />

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded-md border border-indigo-200 flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3 text-indigo-600" />
                              <span>COMPLETED & SIGNED OFF</span>
                            </span>
                            <span className="text-xs font-bold text-slate-500">{app.shift.date}</span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 mt-1">
                            {app.shift.title} — {app.shift.hospitalName}
                          </h3>

                          <p className="text-xs text-slate-600 mt-0.5">
                            Physician: <strong className="text-slate-800">Dr. {resident.firstName} {resident.lastName}, {resident.title}</strong> ({resident.residencyProgram})
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 space-y-2">
                        <div className="text-right">
                          <span className="text-base font-extrabold text-emerald-600">${app.shift.totalPay}</span>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {app.shift.durationHours} hrs @ ${app.shift.hourlyRate}/hr
                          </p>
                        </div>

                        {/* Manual Payout Status Tracker Button */}
                        {app.payoutStatus === 'Paid' ? (
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Payout Disbursed ✅</span>
                            </span>
                            <button
                              onClick={() => setPayoutConfirmApp(app)}
                              className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 underline cursor-pointer"
                            >
                              Edit Status
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Payout Pending</span>
                            </span>
                            <button
                              onClick={() => setPayoutConfirmApp(app)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Payout Complete 💰</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: CANDIDATE ROSTER (PASSPORT REVIEW & VERIFICATION)           */}
        {/* =================================================================== */}
        {mainTab === 'roster' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Category Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                onClick={() => setActiveCategoryTab('review')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  activeCategoryTab === 'review'
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-black text-amber-600">{countUnderReview}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-3">1. Under Review</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submitted passports pending MSO credential document sign-off
                </p>
              </div>

              <div 
                onClick={() => setActiveCategoryTab('accepted')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  activeCategoryTab === 'accepted'
                    ? 'bg-blue-500/10 border-blue-500/50 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-black text-blue-600">{countAcceptedRoster}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-3">2. Accepted Candidates</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  100% credentialed residents cleared for upcoming coverage
                </p>
              </div>

              <div 
                onClick={() => setActiveCategoryTab('completed')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  activeCategoryTab === 'completed'
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-black text-emerald-600">{countCompletedRoster}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-3">3. Worked & Completed</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Residents who completed shifts and received payroll sign-off
                </p>
              </div>
            </div>

            {/* List of Resident Candidates */}
            <div className="space-y-4">
              {filteredRosterApps.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                  <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Resident Candidates Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    No candidates match the selected category tab or search query.
                  </p>
                </div>
              ) : (
                filteredRosterApps.map((app) => {
                  const resident = app.applicantProfile;
                  if (!resident) return null;

                  const totalDocs = resident.documents.length;
                  const verifiedDocs = resident.documents.filter((d) => d.status === 'verified').length;
                  const percentVerified = Math.round((verifiedDocs / totalDocs) * 100);
                  const isFullyVerified = verifiedDocs === totalDocs || app.status === 'Approved' || app.status === 'Completed';

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                    >
                      <div className="flex items-start space-x-4">
                        <img
                          src={resident.headshotUrl}
                          alt={resident.firstName}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80';
                          }}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h2 className="text-base font-bold text-slate-900">
                              Dr. {resident.firstName} {resident.lastName}, {resident.title}
                            </h2>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">
                              {resident.pgyLevel}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 text-xs text-slate-600 mt-1">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-semibold text-slate-800">{resident.residencyProgram}</span>
                          </div>

                          <p className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                            <span>NPI: <strong className="text-slate-700 font-mono">{resident.npiNumber}</strong></span>
                            {resident.npiVerificationStatus === 'verified' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                <ShieldCheck className="w-3 h-3" /> CMS Verified
                              </span>
                            )}
                            <span>•</span>
                            <span>CA License: <strong className="text-slate-700 font-mono">{resident.stateLicenseNumber}</strong></span>
                          </p>

                          <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 inline-flex items-center space-x-3 text-xs">
                            <span className="font-bold text-slate-900">{app.shift.title}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-600">{app.shift.date} ({app.shift.startTime} - {app.shift.endTime})</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between w-full lg:w-auto gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="w-full sm:w-48">
                          <div className="flex items-center justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-600 flex items-center space-x-1">
                              <ShieldCheck className={`w-3.5 h-3.5 ${isFullyVerified ? 'text-emerald-500' : 'text-amber-500'}`} />
                              <span>Passport Progress</span>
                            </span>
                            <span className={isFullyVerified ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                              {verifiedDocs}/{totalDocs} Verified
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isFullyVerified ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${percentVerified}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 w-full sm:w-auto">
                          <button
                            onClick={() => {
                              setSelectedChatAppId(app.id);
                              setMainTab('messages');
                            }}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>Chat</span>
                          </button>

                          <button
                            onClick={() => setActivePassportModalApp(app)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 ${
                              isFullyVerified
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isFullyVerified ? 'View Passport' : 'Verify Passport'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: MESSAGES & COMMUNICATIONS HUB                                */}
        {/* =================================================================== */}
        {mainTab === 'messages' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Banner */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-sky-100 text-sky-800 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Resident Communications Hub ({applications.length} Active Threads)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Central inbox to message resident physicians directly regarding credential status, shift scheduling, and onboarding without navigating roster tabs.
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter threads by resident or shift..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Master Dual-Pane Chat Layout */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
              
              {/* Left Column: Consolidated Resident Conversation Thread List (4 cols) */}
              <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50/50 flex flex-col">
                {(() => {
                  // Group applications by resident ID to consolidate communications per physician
                  const residentThreadMap = new Map<
                    string,
                    {
                      residentId: string;
                      resident: NonNullable<Application['applicantProfile']>;
                      primaryApp: Application;
                      allApps: Application[];
                      allMessages: ChatMessage[];
                      latestMessage: ChatMessage | null;
                      statusSummary: string;
                    }
                  >();

                  applications.forEach((app) => {
                    const resident = app.applicantProfile;
                    if (!resident) return;
                    const resId = resident.id;

                    if (!residentThreadMap.has(resId)) {
                      residentThreadMap.set(resId, {
                        residentId: resId,
                        resident,
                        primaryApp: app,
                        allApps: [app],
                        allMessages: [...(app.messages || [])],
                        latestMessage: null,
                        statusSummary: app.status
                      });
                    } else {
                      const existing = residentThreadMap.get(resId)!;
                      existing.allApps.push(app);
                      if (app.messages && app.messages.length > 0) {
                        app.messages.forEach((m) => {
                          if (!existing.allMessages.some((msg) => msg.id === m.id)) {
                            existing.allMessages.push(m);
                          }
                        });
                      }
                    }
                  });

                  const consolidatedThreads = Array.from(residentThreadMap.values()).map((thread) => {
                    const msgs = thread.allMessages;
                    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                    return {
                      ...thread,
                      latestMessage: lastMsg
                    };
                  });

                  const filteredConsolidated = consolidatedThreads.filter((th) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    const resident = th.resident;
                    const matchName =
                      resident.firstName.toLowerCase().includes(q) ||
                      resident.lastName.toLowerCase().includes(q) ||
                      resident.residencyProgram.toLowerCase().includes(q);
                    const matchShift = th.allApps.some((a) =>
                      a.shift.title.toLowerCase().includes(q) || a.shift.hospitalName.toLowerCase().includes(q)
                    );
                    const matchMsg = th.allMessages.some((m) => m.text.toLowerCase().includes(q));
                    return matchName || matchShift || matchMsg;
                  });

                  return (
                    <>
                      <div className="p-3.5 border-b border-slate-200 bg-slate-100/70 text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Resident Communications</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                          {consolidatedThreads.length} Residents
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 overflow-y-auto flex-1 max-h-[560px]">
                        {filteredConsolidated.map((th) => {
                          const resident = th.resident;
                          const selectedApp = applications.find(
                            (a) => a.id === (selectedChatAppId || applications[0]?.id)
                          );
                          const isSelected = selectedApp?.applicantProfile?.id === resident.id;
                          const lastMsg = th.latestMessage;

                          return (
                            <div
                              key={th.residentId}
                              onClick={() => setSelectedChatAppId(th.primaryApp.id)}
                              className={`p-4 transition-all cursor-pointer flex items-start space-x-3 ${
                                isSelected
                                  ? 'bg-blue-50/90 border-l-4 border-blue-600'
                                  : 'hover:bg-slate-100/80 bg-white'
                              }`}
                            >
                              <img
                                src={resident.headshotUrl}
                                alt={resident.firstName}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80';
                                }}
                                className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0"
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">
                                    Dr. {resident.firstName} {resident.lastName}
                                  </h4>
                                  <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                                    {lastMsg?.timestamp || 'Active'}
                                  </span>
                                </div>

                                <p className="text-[11px] font-semibold text-blue-700 truncate">
                                  {th.allApps.length > 1
                                    ? `${th.allApps.length} Shifts / Connections`
                                    : th.primaryApp.shift.title}
                                </p>

                                <p className="text-[11px] text-slate-500 truncate mt-1">
                                  {lastMsg
                                    ? `${lastMsg.senderRole === 'hospital' ? 'You: ' : 'Dr: '}${lastMsg.text}`
                                    : 'No messages yet.'}
                                </p>

                                <div className="mt-2 flex items-center space-x-1.5">
                                  <span
                                    className={`px-2 py-0.2 text-[9px] font-extrabold rounded-md uppercase ${
                                      th.allApps.some((a) => a.status === 'Approved')
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : th.allApps.some((a) => a.status === 'Completed')
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {th.allApps.some((a) => a.status === 'Approved')
                                      ? 'Approved'
                                      : th.primaryApp.status}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {resident.pgyLevel}
                                  </span>
                                  {th.allApps.length > 1 && (
                                    <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 text-slate-700 font-bold rounded-md">
                                      Unified Thread
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Right Column: Active Conversation Pane (8 cols) */}
              <div className="lg:col-span-8 flex flex-col bg-white">
                {(() => {
                  const activeApp =
                    applications.find((a) => a.id === (selectedChatAppId || applications[0]?.id)) ||
                    applications[0];
                  if (!activeApp || !activeApp.applicantProfile) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                        <h3 className="text-base font-bold text-slate-800">No Resident Selected</h3>
                        <p className="text-xs text-slate-500 mt-1">Select a candidate on the left to view messages.</p>
                      </div>
                    );
                  }

                  const resident = activeApp.applicantProfile;
                  // Gather all messages across all applications for this resident to ensure 1 consolidated thread view
                  const residentApps = applications.filter((a) => a.applicantProfile?.id === resident.id);
                  const consolidatedMessages: ChatMessage[] = [];
                  residentApps.forEach((a) => {
                    if (a.messages) {
                      a.messages.forEach((m) => {
                        if (!consolidatedMessages.some((msg) => msg.id === m.id)) {
                          consolidatedMessages.push(m);
                        }
                      });
                    }
                  });

                  return (
                    <div className="flex flex-col h-full">
                      
                      {/* Active Thread Header */}
                      <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={resident.headshotUrl}
                            alt={resident.firstName}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80';
                            }}
                            className="w-11 h-11 rounded-2xl object-cover border-2 border-blue-400 shrink-0"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-bold">
                                Dr. {resident.firstName} {resident.lastName}, {resident.title}
                              </h3>
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-extrabold rounded-md border border-blue-400/30">
                                {resident.pgyLevel}
                              </span>
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold rounded-md border border-emerald-400/30">
                                Consolidated Thread
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-0.5">
                              {resident.residencyProgram} • {residentApps.map((a) => a.shift.title).join(' | ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setActivePassportModalApp(activeApp)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1 transition-colors border border-slate-700 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                            <span>View Passport</span>
                          </button>
                        </div>
                      </div>

                      {/* Chat Messages Stream */}
                      <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50/70 min-h-[350px]">
                        {consolidatedMessages.length > 0 ? (
                          consolidatedMessages.map((msg) => {
                            const isHospital = msg.senderRole === 'hospital';

                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isHospital ? 'items-end' : 'items-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                    isHospital
                                      ? 'bg-slate-900 text-white rounded-tr-none shadow-sm'
                                      : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-xs'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-4 mb-1 border-b border-slate-700/40 pb-1">
                                    <span
                                      className={`font-bold text-[10px] ${
                                        isHospital ? 'text-blue-300' : 'text-blue-700'
                                      }`}
                                    >
                                      {msg.senderName}
                                    </span>
                                    <span
                                      className={`text-[9px] ${
                                        isHospital ? 'text-slate-400' : 'text-slate-400'
                                      }`}
                                    >
                                      {msg.timestamp}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-line">{msg.text}</p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-12 text-slate-400 text-xs">
                            No message history yet. Send a message below to start communicating with Dr.{' '}
                            {resident.lastName}.
                          </div>
                        )}
                      </div>

                      {/* Quick Reply Presets Bar */}
                      <div className="p-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center space-x-2 overflow-x-auto text-[11px]">
                        <span className="text-slate-400 font-bold shrink-0 text-[10px] uppercase">
                          Quick Replies:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onSendMessage(
                              activeApp.id,
                              'Your MoonCall Passport credentials have been verified and approved by the MSO! ✅',
                              'hospital',
                              'Hospital MSO Coordinator'
                            );
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg shrink-0 font-medium transition-colors cursor-pointer"
                        >
                          ✅ Passport Verified
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSendMessage(
                              activeApp.id,
                              `Shift schedule confirmed for ${activeApp.shift.date} (${activeApp.shift.startTime}). Please arrive 15m early for badge issuance. 🗓`,
                              'hospital',
                              'Hospital MSO Coordinator'
                            );
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg shrink-0 font-medium transition-colors cursor-pointer"
                        >
                          🗓 Shift Confirmed
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSendMessage(
                              activeApp.id,
                              'Please upload your updated CA State Medical License to your MoonCall Passport vault. 📄',
                              'hospital',
                              'Hospital MSO Coordinator'
                            );
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg shrink-0 font-medium transition-colors cursor-pointer"
                        >
                          📄 Request License
                        </button>
                      </div>

                      {/* Message Input Box */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!chatInputText.trim()) return;
                          onSendMessage(
                            activeApp.id,
                            chatInputText.trim(),
                            'hospital',
                            'Hospital MSO Coordinator'
                          );
                          setChatInputText('');
                        }}
                        className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
                      >
                        <input
                          type="text"
                          placeholder={`Message Dr. ${resident.firstName} ${resident.lastName}...`}
                          value={chatInputText}
                          onChange={(e) => setChatInputText(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </form>

                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: CREATE A JOB FORM                                            */}
        {/* =================================================================== */}
        {mainTab === 'create_job' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 max-w-4xl mx-auto animate-fade-in">
            
            <div className="border-b border-slate-200 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <PlusCircle className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">Post a Moonlighting Shift</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Document shift details and publish live to Published Jobs & the candidate search map.
                </p>
              </div>

              <button
                onClick={() => setMainTab('published_jobs')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
              >
                <span>Back to Published Jobs</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishJob} className="space-y-6">
              
              {/* Section 1: Role Title & Specialty */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 text-blue-600">
                  <Briefcase className="w-4 h-4" />
                  <span>1. Role Title & Medical Specialty</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Role Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Community ER Nocturnist Shift"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Medical Specialty <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={jobSpecialty}
                      onChange={(e) => setJobSpecialty(e.target.value as MedicalSpecialty)}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Emergency Medicine">Emergency Medicine</option>
                      <option value="Urgent Care">Urgent Care</option>
                      <option value="Internal Medicine">Internal Medicine</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Family Medicine">Family Medicine</option>
                      <option value="Anesthesiology">Anesthesiology</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Eligible Resident PGY Levels
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['PGY-1', 'PGY-2', 'PGY-3', 'PGY-4', 'Chief Resident', 'Fellow'] as PGYLevel[]).map((pgy) => {
                      const isSelected = jobPgyReq.includes(pgy);
                      return (
                        <button
                          key={pgy}
                          type="button"
                          onClick={() => togglePgyRequirement(pgy)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {pgy}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 2: Facility Location */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 text-blue-600">
                  <Building2 className="w-4 h-4" />
                  <span>2. Hospital Facility & Location</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hospital Facility Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={jobHospital}
                      onChange={(e) => setJobHospital(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department / Unit
                    </label>
                    <input
                      type="text"
                      value={jobDepartment}
                      onChange={(e) => setJobDepartment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City / Location
                    </label>
                    <input
                      type="text"
                      value={jobAddress}
                      onChange={(e) => setJobAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Shift Timing & Pay */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 text-blue-600">
                  <Award className="w-4 h-4" />
                  <span>3. Schedule & Compensation</span>
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shift Date
                    </label>
                    <input
                      type="date"
                      value={jobDate}
                      onChange={(e) => setJobDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shift Type
                    </label>
                    <select
                      value={jobShiftType}
                      onChange={(e) => setJobShiftType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      <option value="Night Shift">Night Shift</option>
                      <option value="Day Shift">Day Shift</option>
                      <option value="Swing Shift">Swing Shift</option>
                      <option value="24-Hour Call">24-Hour Call</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hourly Rate ($/hr) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={50}
                      max={500}
                      value={jobRate}
                      onChange={(e) => setJobRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Duration (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={jobDuration}
                      onChange={(e) => setJobDuration(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Summary Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Publish Action Button */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setMainTab('published_jobs')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Publish Shift Live to Open Board</span>
                </button>
              </div>

            </form>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: ADMIN NOTIFICATIONS CENTER                                   */}
        {/* =================================================================== */}
        {mainTab === 'notifications' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Filter Bar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                    <Bell className="w-5 h-5 text-amber-600" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Hospital MSO Notifications & Activity Log ({adminNotifications.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time alerts for new resident interest, candidate approvals, and job shift transfers.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      setAdminNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                      showToast('All notifications marked as read ✓');
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
            </div>

            {/* Notification Filter Category Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All Alerts', count: adminNotifications.length },
                {
                  id: 'new_interest',
                  label: 'New Resident Interest (Under Review)',
                  count: adminNotifications.filter((n) => n.type === 'new_interest').length
                },
                {
                  id: 'candidate_accepted',
                  label: 'Accepted Candidates',
                  count: adminNotifications.filter((n) => n.type === 'candidate_accepted').length
                },
                {
                  id: 'job_transferred',
                  label: 'Shift Transfers (Published → Accepted)',
                  count: adminNotifications.filter((n) => n.type === 'job_transferred').length
                }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setNotifCategoryFilter(cat.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    notifCategoryFilter === cat.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                      notifCategoryFilter === cat.id
                        ? 'bg-blue-500/30 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {adminNotifications.filter((n) => notifCategoryFilter === 'all' || n.type === notifCategoryFilter).length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Notifications Found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    No activity alerts match the selected category filter.
                  </p>
                </div>
              ) : (
                adminNotifications
                  .filter((n) => notifCategoryFilter === 'all' || n.type === notifCategoryFilter)
                  .map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        !notif.read
                          ? 'bg-blue-50/60 border-blue-200 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                            notif.type === 'new_interest'
                              ? 'bg-indigo-100 text-indigo-700'
                              : notif.type === 'candidate_accepted'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {notif.type === 'new_interest' && <UserPlus className="w-5 h-5" />}
                          {notif.type === 'candidate_accepted' && <CheckCircle2 className="w-5 h-5" />}
                          {notif.type === 'job_transferred' && <RotateCcw className="w-5 h-5" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-extrabold text-slate-900">{notif.title}</h4>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{notif.message}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{notif.timestamp}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                        {notif.type === 'new_interest' && (
                          <button
                            onClick={() => {
                              setMainTab('roster');
                              setActiveCategoryTab('review');
                            }}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <span>View Under Review</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {notif.type === 'candidate_accepted' && (
                          <button
                            onClick={() => {
                              setMainTab('roster');
                              setActiveCategoryTab('accepted');
                            }}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <span>View Accepted Roster</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {notif.type === 'job_transferred' && (
                          <button
                            onClick={() => setMainTab('accepted_jobs')}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                          >
                            <span>View Accepted Jobs</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: TEXT BREAKDOWN BROADCAST MODAL */}
      {selectedBroadcastShift && (
        <JobTextBroadcastModal
          shift={selectedBroadcastShift}
          onClose={() => setSelectedBroadcastShift(null)}
          onCopySuccess={(msg) => showToast(msg)}
        />
      )}

      {/* MODAL 2: FULL PASSPORT VERIFIER & DOCUMENT SIGN-OFF */}
      {activePassportModalApp && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <img
                  src={activePassportModalApp.applicantProfile?.headshotUrl}
                  alt={activePassportModalApp.applicantProfile?.firstName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80';
                  }}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-400 shrink-0"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold">
                      Dr. {activePassportModalApp.applicantProfile?.firstName} {activePassportModalApp.applicantProfile?.lastName}'s Passport
                    </h2>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-md">
                      {activePassportModalApp.applicantProfile?.pgyLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center space-x-2">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                    <span>{activePassportModalApp.applicantProfile?.residencyProgram}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePassportModalApp(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Status Banner */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Hospital MSO Verification Status
                  </h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Click "Verify & Sign Off" next to each document after checking compliance. Once all required documents are verified, candidate will automatically transition to ACCEPTED.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-600">Verification Progress:</span>
                  <p className="text-lg font-black text-blue-700">
                    {activePassportModalApp.applicantProfile?.documents.filter((d) => d.status === 'verified').length} / {activePassportModalApp.applicantProfile?.documents.length} Docs
                  </p>
                </div>
              </div>

              {/* Document CheckList with Toggles */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  MoonCall Passport Documents ({activePassportModalApp.applicantProfile?.documents.length})
                </h3>

                <div className="space-y-3">
                  {activePassportModalApp.applicantProfile?.documents.map((doc) => {
                    const isVerified = doc.status === 'verified';

                    return (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          isVerified
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isVerified ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xs font-bold text-slate-900">{doc.name}</h4>
                              {doc.requiredForTier1 && (
                                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md">
                                  REQUIRED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Issuer: {doc.issuer || 'ACGME Program'} {doc.docNumber && `• ID: ${doc.docNumber}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => onOpenDocumentViewer(doc)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Inspect File</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDocVerification(activePassportModalApp, doc)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                              isVerified
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isVerified ? 'Verified' : 'Verify & Sign Off'}</span>
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Hospital MSO Audit ID: <code className="font-mono text-slate-700">{activePassportModalApp.passportShareToken}</code>
              </span>
              <button
                onClick={() => setActivePassportModalApp(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Done Reviewing
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: DIRECT APPLICANT CHAT DRAWER */}
      {activeChatModalApp && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full h-[600px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <img
                  src={activeChatModalApp.applicantProfile?.headshotUrl}
                  alt={activeChatModalApp.applicantProfile?.firstName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80';
                  }}
                  className="w-10 h-10 rounded-xl object-cover border border-blue-400"
                />
                <div>
                  <h3 className="text-sm font-bold">
                    Dr. {activeChatModalApp.applicantProfile?.firstName} {activeChatModalApp.applicantProfile?.lastName}
                  </h3>
                  <p className="text-[11px] text-slate-400">{activeChatModalApp.shift.title}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveChatModalApp(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Scroll View */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-slate-50">
              {activeChatModalApp.messages?.map((msg) => {
                const isHospital = msg.senderRole === 'hospital';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isHospital ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                        isHospital
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-xs'
                      }`}
                    >
                      <p className="font-bold text-[10px] mb-0.5 opacity-80">{msg.senderName}</p>
                      <p>{msg.text}</p>
                      <p className="text-[9px] opacity-60 text-right mt-1">{msg.timestamp}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
              <input
                type="text"
                placeholder="Type message to resident candidate..."
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                className="flex-1 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Send
              </button>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: MANUAL PAYOUT CONFIRMATION MODAL */}
      {payoutConfirmApp && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Manual Payout Status Tracking
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Has the payout of <strong className="text-emerald-700 font-extrabold">${payoutConfirmApp.shift.totalPay}</strong> for <strong className="text-slate-900 font-bold">Dr. {payoutConfirmApp.applicantProfile?.firstName} {payoutConfirmApp.applicantProfile?.lastName}</strong> ({payoutConfirmApp.shift.title}) been issued via hospital payroll, check, or direct transfer?
            </p>
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500">
              ℹ️ <strong>No bank linking required.</strong> This updates internal payout records so the MSO admin team can track completed disbursements manually.
            </div>
            <div className="mt-6 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPayoutConfirmApp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetStatus = payoutConfirmApp.payoutStatus === 'Paid' ? 'Pending' : 'Paid';
                  if (onUpdatePayoutStatus) {
                    onUpdatePayoutStatus(payoutConfirmApp.id, targetStatus);
                  }
                  const label = targetStatus === 'Paid' ? 'Disbursed' : 'Pending';
                  showToast(`💰 Payout status updated to ${label} ($${payoutConfirmApp.shift.totalPay}) for Dr. ${payoutConfirmApp.applicantProfile?.lastName}!`);
                  setPayoutConfirmApp(null);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{payoutConfirmApp.payoutStatus === 'Paid' ? 'Mark as Pending' : 'Confirm Payout Disbursed'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
