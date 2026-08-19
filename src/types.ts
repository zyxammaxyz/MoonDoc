export type PGYLevel = 'PGY-1' | 'PGY-2' | 'PGY-3' | 'PGY-4' | 'PGY-5' | 'Chief Resident' | 'Fellow';

export type MedicalSpecialty =
  | 'Internal Medicine'
  | 'Emergency Medicine'
  | 'Family Medicine'
  | 'Pediatrics'
  | 'Anesthesiology'
  | 'General Surgery'
  | 'Neurology'
  | 'Psychiatry'
  | 'Radiology'
  | 'Obstetrics & Gynecology'
  | 'Urgent Care';

export type DocumentCategory =
  | 'institutional'
  | 'licensing'
  | 'clinical_certs'
  | 'malpractice_health'
  | 'academic'
  | 'other';

export type DocumentStatus = 'verified' | 'pending' | 'missing' | 'expiring_soon';

export interface CredentialDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  requiredForTier1: boolean;
  status: DocumentStatus;
  fileUrl?: string;
  fileName?: string;
  uploadDate?: string;
  expirationDate?: string;
  issuer?: string;
  docNumber?: string;
  notes?: string;
}

export interface ResidentProfile {
  id: string;
  firstName: string;
  lastName: string;
  title: string; // e.g. "MD" or "DO"
  email: string;
  phone: string;
  headshotUrl: string;
  residencyProgram: string;
  hospitalAffiliation: string;
  specialty: MedicalSpecialty;
  pgyLevel: PGYLevel;
  gender?: string;
  pronouns?: string;
  npiNumber: string;
  stateLicenseNumber: string;
  licenseState: string;
  deaNumber: string;
  bio?: string;
  documents: CredentialDocument[];
}

export interface HospitalFacility {
  id: string;
  name: string;
  systemName: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  emrSystem: string;
  hospitalRating: number;
  badge?: string;
  contactPerson: string;
  contactEmail: string;
  logoUrl?: string;
  ownerId?: string;
}

// A real hospital/MSO administrator account (Phase 2) — separate from the
// resident's ResidentProfile and from the mock/demo Hospital Admin login.
export interface HospitalAccountProfile {
  id: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface MoonlightingShift {
  id: string;
  hospitalId: string;
  hospitalName: string;
  facilityLocation: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  specialty: MedicalSpecialty;
  title: string;
  department: string;
  hourlyRate: number;
  totalPay: number;
  shiftType: 'Day Shift' | 'Night Shift' | 'Swing Shift' | '24-Hour Call' | 'Weekend Coverage' | 'Telehealth';
  startTime: string;
  endTime: string;
  date: string;
  durationHours: number;
  pgyRequirement: PGYLevel[];
  requiredDocIds: string[];
  description: string;
  malpracticeIncluded: boolean;
  restCallRoomAvailable: boolean;
  mealStipend: boolean;
  urgency: 'Standard' | 'Urgent' | 'High Demand';
  spotsAvailable: number;
}

export interface ChatMessage {
  id: string;
  senderRole: 'resident' | 'hospital';
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  isSystemNote?: boolean;
}

export interface Application {
  id: string;
  shiftId: string;
  shift: MoonlightingShift;
  appliedDate: string;
  status: 'Submitted' | 'Credentialing Review' | 'Approved' | 'Completed' | 'Declined';
  hospitalNotes?: string;
  passportShareToken: string;
  applicantProfile?: ResidentProfile;
  messages?: ChatMessage[];
  payoutStatus?: 'Pending' | 'Paid';
  payoutDate?: string;
}

export interface AdminNotification {
  id: string;
  type: 'new_interest' | 'candidate_accepted' | 'job_transferred';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  residentName?: string;
  residentAvatar?: string;
  hospitalName?: string;
  shiftTitle?: string;
}

export interface ResidentNotification {
  id: string;
  hospitalId: string;
  hospitalName: string;
  shiftId: string;
  shiftTitle: string;
  specialty: MedicalSpecialty;
  hourlyRate: number;
  totalPay: number;
  date: string;
  timestamp: string;
  read: boolean;
  message: string;
  connectionReason: 'worked_before' | 'expressed_interest';
}

export interface FilterState {
  specialty: string;
  maxDistance: number;
  minPayRate: number;
  shiftType: string;
  searchQuery: string;
  onlyEligible: boolean;
}

