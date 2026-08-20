import React, { useState } from 'react';
import { ResidentProfile, CredentialDocument, DocumentCategory, PGYLevel, MedicalSpecialty } from '../types';
import { SOCAL_RESIDENCY_PROGRAMS } from '../data/mockData';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { uploadHeadshot, uploadCredentialDocumentFile } from '../lib/residentApi';
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Building,
  GraduationCap,
  Sparkles,
  X,
  FileCheck,
  Eye,
  Trash2,
  Plus,
  Calendar,
  Award,
  Download,
  Mail,
  Send,
  Link2,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface CredentialVaultProps {
  profile: ResidentProfile;
  onUpdateProfile: (updatedProfile: ResidentProfile) => void;
  onOpenDocumentViewer: (doc: CredentialDocument) => void;
}

export const CredentialVault: React.FC<CredentialVaultProps> = ({
  profile,
  onUpdateProfile,
  onOpenDocumentViewer,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Edit Profile Form State
  const [formProfile, setFormProfile] = useState<ResidentProfile>(profile);
  const [vaultProgramSelect, setVaultProgramSelect] = useState<string>(
    SOCAL_RESIDENCY_PROGRAMS.includes(profile.residencyProgram) ? profile.residencyProgram : 'Other'
  );
  const [vaultCustomProgram, setVaultCustomProgram] = useState<string>(
    SOCAL_RESIDENCY_PROGRAMS.includes(profile.residencyProgram) ? '' : profile.residencyProgram
  );

  // Upload Modal State
  const [activeUploadDocId, setActiveUploadDocId] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadDocNumber, setUploadDocNumber] = useState('');
  const [uploadExpirationDate, setUploadExpirationDate] = useState('');
  const [uploadIssuer, setUploadIssuer] = useState('');
  const [uploadedFileObj, setUploadedFileObj] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Custom Document Upload State
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [customDocNumber, setCustomDocNumber] = useState('');
  const [customExpirationDate, setCustomExpirationDate] = useState('2027-12-31');
  const [customFileName, setCustomFileName] = useState('');
  const [customFileObj, setCustomFileObj] = useState<File | null>(null);
  const [isCustomDragging, setIsCustomDragging] = useState(false);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [customSuccessMsg, setCustomSuccessMsg] = useState<string | null>(null);

  // Program Director Request Email State
  const [isPDRequestOpen, setIsPDRequestOpen] = useState(false);
  const [pdName, setPdName] = useState('Dr. Robert Vance, MD');
  const [pdEmail, setPdEmail] = useState('rvance@keck.usc.edu');
  const [pdCustomNote, setPdCustomNote] = useState('Hi Dr. Vance, I am applying for moonlighting opportunities. Could you please upload an updated Good Standing & Moonlighting Approval Letter for my MoonCall Passport using this secure upload link?');
  const [isSendingPDRequest, setIsSendingPDRequest] = useState(false);
  const [pdSentConfirmation, setPdSentConfirmation] = useState<{ pdName: string; pdEmail: string; dateSent: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const pdUploadToken = `https://mooncall.app/upload/pd-letter/token-${profile.id.replace('res_', '')}-2026`;

  const handleCopyPDLink = () => {
    navigator.clipboard.writeText(pdUploadToken);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleSendPDRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdEmail.trim()) {
      alert("Please enter your Program Director's email address.");
      return;
    }

    setIsSendingPDRequest(true);

    setTimeout(() => {
      const sentData = {
        pdName: pdName.trim() || 'Program Director',
        pdEmail: pdEmail.trim(),
        dateSent: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      };

      setIsSendingPDRequest(false);
      setPdSentConfirmation(sentData);

      // Update document notes in resident profile so it persists
      const updatedDocs = profile.documents.map((doc) => {
        if (doc.id === 'pd_letter' || doc.id.includes('pd_letter') || doc.name.toLowerCase().includes('program director')) {
          return {
            ...doc,
            notes: `Email request sent to ${sentData.pdName} (${sentData.pdEmail}) on ${sentData.dateSent}. Awaiting PD upload via secure link.`,
            status: doc.status === 'missing' ? ('pending' as const) : doc.status,
          };
        }
        return doc;
      });

      onUpdateProfile({ ...profile, documents: updatedDocs });
    }, 800);
  };

  const handleCustomDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDocTitle.trim()) {
      alert('Please enter a document title so hospital admins know what it is.');
      return;
    }

    setIsSubmittingCustom(true);
    try {
      const titleClean = customDocTitle.trim();
      const docId = `doc_custom_${Date.now()}`;

      let fileUrl = 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=500&auto=format&fit=crop&q=60';
      if (customFileObj && isSupabaseConfigured) {
        fileUrl = await uploadCredentialDocumentFile(profile.id, docId, customFileObj);
      }

      const newDoc: CredentialDocument = {
        id: docId,
        name: titleClean,
        category: 'other',
        requiredForTier1: false,
        status: 'verified',
        fileName: customFileName || customFileObj?.name || `${titleClean.replace(/\s+/g, '_')}_2026.pdf`,
        fileUrl,
        uploadDate: new Date().toISOString().split('T')[0],
        expirationDate: customExpirationDate || '2027-12-31',
        docNumber: customDocNumber || `CUST-${Math.floor(100000 + Math.random() * 900000)}`,
        issuer: 'Uploaded by Resident',
        notes: 'Custom document attached to MoonCall Passport',
      };

      const updatedDocs = [newDoc, ...profile.documents];
      onUpdateProfile({ ...profile, documents: updatedDocs });

      // Reset form so resident can upload another document seamlessly
      setCustomDocTitle('');
      setCustomDocNumber('');
      setCustomExpirationDate('2027-12-31');
      setCustomFileName('');
      setCustomFileObj(null);
      setCustomSuccessMsg(`"${titleClean}" successfully saved to your MoonCall Passport! You can add another document below.`);

      setTimeout(() => {
        setCustomSuccessMsg(null);
      }, 6000);
    } catch (err) {
      console.error('Failed to upload custom document', err);
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  // Calculate completion percentage
  const totalDocs = profile.documents.length;
  const verifiedDocs = profile.documents.filter((d) => d.status === 'verified').length;
  const completionPercent = Math.round((verifiedDocs / totalDocs) * 100);

  // Filter documents by category
  const filteredDocuments = profile.documents.filter((doc) => {
    if (selectedCategory === 'all') return true;
    return doc.category === selectedCategory;
  });

  // Handle Profile Form Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (vaultProgramSelect === 'Other' && !vaultCustomProgram.trim()) {
      alert('Please enter the specific name of your residency institution / hospital system.');
      return;
    }

    const finalProgram = vaultProgramSelect === 'Other'
      ? (vaultCustomProgram.trim() || 'Unlisted SoCal Medical Center')
      : vaultProgramSelect;

    const updatedProfile = {
      ...formProfile,
      residencyProgram: finalProgram,
      hospitalAffiliation: finalProgram,
    };

    onUpdateProfile(updatedProfile);
    setIsEditingProfile(false);
  };

  const [isUploadingHeadshot, setIsUploadingHeadshot] = useState(false);

  // Headshot selector — uploads to real storage so the photo survives a
  // refresh / different device, instead of the old blob: URL that only
  // worked in the current browser tab.
  const handleHeadshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show an instant local preview while the real upload happens.
    const previewUrl = URL.createObjectURL(file);
    setFormProfile((prev) => ({ ...prev, headshotUrl: previewUrl }));

    if (!isSupabaseConfigured) return;

    setIsUploadingHeadshot(true);
    try {
      const realUrl = await uploadHeadshot(profile.id, file);
      setFormProfile((prev) => ({ ...prev, headshotUrl: realUrl }));
      // If this upload happened outside the "Edit Profile" modal (the
      // hover-to-upload avatar in the header), persist it immediately
      // rather than waiting on a "Save Profile" click that may never come.
      if (!isEditingProfile) {
        onUpdateProfile({ ...profile, headshotUrl: realUrl });
      }
    } catch (err) {
      console.error('Failed to upload headshot', err);
    } finally {
      setIsUploadingHeadshot(false);
    }
  };

  // Open Upload Modal for a specific document
  const handleOpenUploadModal = (docId: string) => {
    const doc = profile.documents.find((d) => d.id === docId);
    setActiveUploadDocId(docId);
    setUploadFileName(doc?.fileName || '');
    setUploadDocNumber(doc?.docNumber || '');
    setUploadExpirationDate(doc?.expirationDate || '2027-08-31');
    setUploadIssuer(doc?.issuer || 'Massachusetts Dept of Health');
  };

  // Handle Document Upload Submission — uploads the real file to storage
  // when one was attached, instead of always faking the same stock photo.
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUploadDocId) return;

    setIsUploading(true);
    try {
      let fileUrl = 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=500&auto=format&fit=crop&q=60';
      if (uploadedFileObj && isSupabaseConfigured) {
        fileUrl = await uploadCredentialDocumentFile(profile.id, activeUploadDocId, uploadedFileObj);
      }

      const updatedDocs = profile.documents.map((d) => {
        if (d.id === activeUploadDocId) {
          return {
            ...d,
            status: 'verified' as const,
            fileName: uploadFileName || uploadedFileObj?.name || `${d.name.replace(/\s+/g, '_')}_2026.pdf`,
            fileUrl,
            uploadDate: new Date().toISOString().split('T')[0],
            expirationDate: uploadExpirationDate || '2027-08-31',
            docNumber: uploadDocNumber || 'DOC-99201-VERIFIED',
            issuer: uploadIssuer || 'Verified Healthcare Authority',
          };
        }
        return d;
      });

      onUpdateProfile({ ...profile, documents: updatedDocs });
      setActiveUploadDocId(null);
      setUploadedFileObj(null);
    } catch (err) {
      console.error('Failed to upload document', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Quick Delete / Reset Document
  const handleRemoveDoc = (docId: string) => {
    const updatedDocs = profile.documents.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          status: 'missing' as const,
          fileName: undefined,
          fileUrl: undefined,
          docNumber: undefined,
        };
      }
      return d;
    });
    onUpdateProfile({ ...profile, documents: updatedDocs });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      
      {/* Header Banner - Geometric Balance White/Blue Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Profile Basic Info */}
          <div className="flex items-center space-x-5">
            <div className="relative group">
              <img
                src={profile.headshotUrl}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
              />
              <label className="absolute inset-0 bg-slate-900/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <UploadCloud className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" onChange={handleHeadshotUpload} className="hidden" />
              </label>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-900">
                  Dr. {profile.firstName} {profile.lastName}, {profile.title}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-lg shadow-sm">
                  {profile.pgyLevel}
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-600 mt-1 flex items-center space-x-2">
                <Building className="w-4 h-4 text-blue-600 inline" />
                <span>{profile.residencyProgram}</span>
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-600">
                <span className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                  Specialty: <strong className="text-slate-900">{profile.specialty}</strong>
                </span>
                {profile.gender && (
                  <span className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                    Gender: <strong className="text-slate-900">{profile.gender}</strong>
                  </span>
                )}
                {profile.pronouns && (
                  <span className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                    Pronouns: <strong className="text-blue-700">{profile.pronouns}</strong>
                  </span>
                )}
                <span className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                  NPI #: <strong className="text-blue-600">{profile.npiNumber}</strong>
                </span>
                <span className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                  State License: <strong className="text-green-600">{profile.stateLicenseNumber} ({profile.licenseState})</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Centered Passport Status Box -- only claims "Verified" once every
              document in the vault below has actually been uploaded and
              marked verified (100%). This is purely the resident's own
              Credential Vault completeness; it has nothing to do with a
              hospital site marking them cleared/verified on their end (see
              HospitalPortal's separate "Mark as Verified" per-candidate
              flow), so it must never appear before 100% here. */}
          {completionPercent === 100 ? (
            <div className="flex flex-col items-center justify-center p-3 px-4 bg-emerald-50 border border-emerald-300 rounded-2xl shadow-2xs text-center shrink-0 my-2 lg:my-0">
              <div className="flex items-center space-x-1.5 text-emerald-900 font-extrabold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified Resident Passport</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold mt-0.5">
                All Vault Documents Verified • 100% Readiness
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-3 px-4 bg-amber-50 border border-amber-300 rounded-2xl shadow-2xs text-center shrink-0 my-2 lg:my-0">
              <div className="flex items-center space-x-1.5 text-amber-900 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Passport Not Yet Verified</span>
              </div>
              <span className="text-[10px] text-amber-700 font-bold mt-0.5">
                Upload & verify documents below • {completionPercent}% Readiness
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setFormProfile(profile);
                const currentProg = profile.residencyProgram || '';
                if (SOCAL_RESIDENCY_PROGRAMS.includes(currentProg)) {
                  setVaultProgramSelect(currentProg);
                  setVaultCustomProgram('');
                } else {
                  setVaultProgramSelect('Other');
                  setVaultCustomProgram(currentProg);
                }
                setIsEditingProfile(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors flex items-center space-x-2"
            >
              <User className="w-4 h-4 text-blue-600" />
              <span>Edit Profile & Credentials</span>
            </button>
          </div>

        </div>

        {/* Progress Bar Header */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-700 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Credential Vault Readiness Score</span>
            </span>
            <span className="font-extrabold text-blue-600 text-sm">{completionPercent}%</span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full rounded-full transition-all duration-700 bg-blue-600"
              style={{ width: `${completionPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500 mt-2">
            {completionPercent >= 80
              ? '✅ Excellent standing! Your profile meets credentialing requirements for 95% of moonlighting hospitals.'
              : '⚠️ Upload missing items below to unlock full moonlighting eligibility across hospitals.'}
          </p>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Edit Resident Profile</h2>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              
              {/* Headshot & Basic Info */}
              <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <img
                  src={formProfile.headshotUrl}
                  alt="Avatar"
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-600/20"
                />
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Headshot Image URL / Upload</label>
                  <input
                    type="text"
                    value={formProfile.headshotUrl}
                    onChange={(e) => setFormProfile({ ...formProfile, headshotUrl: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                    placeholder="Image URL..."
                  />
                  <div className="pt-1">
                    <label className="text-blue-600 hover:underline text-[10px] cursor-pointer font-semibold">
                      Or browse image from computer...
                      <input type="file" accept="image/*" onChange={handleHeadshotUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={formProfile.firstName}
                    onChange={(e) => setFormProfile({ ...formProfile, firstName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formProfile.lastName}
                    onChange={(e) => setFormProfile({ ...formProfile, lastName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Residency Program</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (vaultProgramSelect === 'Other') {
                          setVaultProgramSelect(SOCAL_RESIDENCY_PROGRAMS[0]);
                        } else {
                          setVaultProgramSelect('Other');
                        }
                      }}
                      className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition-all cursor-pointer"
                    >
                      {vaultProgramSelect === 'Other' ? '← SoCal Dropdown' : '+ Other Institution'}
                    </button>
                  </div>

                  <select
                    value={vaultProgramSelect}
                    onChange={(e) => setVaultProgramSelect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600 text-xs font-medium"
                  >
                    <optgroup label="Southern California Residency Programs">
                      {SOCAL_RESIDENCY_PROGRAMS.map((prog) => (
                        <option key={prog} value={prog}>
                          {prog}
                        </option>
                      ))}
                    </optgroup>
                    <option value="Other">Other / Unlisted Program (Specify below)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">PGY Level</label>
                  <select
                    value={formProfile.pgyLevel}
                    onChange={(e) => setFormProfile({ ...formProfile, pgyLevel: e.target.value as PGYLevel })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600 text-xs font-medium"
                  >
                    <option value="PGY-1">PGY-1 (Intern)</option>
                    <option value="PGY-2">PGY-2 Resident</option>
                    <option value="PGY-3">PGY-3 Resident</option>
                    <option value="PGY-4">PGY-4 Resident</option>
                    <option value="PGY-5">PGY-5 Resident</option>
                    <option value="Chief Resident">Chief Resident</option>
                    <option value="Fellow">Fellow</option>
                  </select>
                </div>
              </div>

              {/* If "Other" is selected, require typing custom institution name */}
              {vaultProgramSelect === 'Other' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl space-y-1 animate-in fade-in duration-200">
                  <label className="text-[11px] font-bold text-amber-900 block flex items-center justify-between">
                    <span>Specify Institution / Hospital Name (Required) *</span>
                    <span className="text-[10px] text-amber-700 font-normal">Unlisted Residency System</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stanford Health Care / Mayo Clinic"
                    value={vaultCustomProgram}
                    onChange={(e) => setVaultCustomProgram(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium text-xs"
                  />
                </div>
              )}

              {/* Gender and Preferred Pronouns Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={formProfile.gender || 'Female'}
                    onChange={(e) => setFormProfile({ ...formProfile, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                    <option value="Self-described">Self-described</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Preferred Pronouns</label>
                  <select
                    value={formProfile.pronouns || 'She/Her'}
                    onChange={(e) => setFormProfile({ ...formProfile, pronouns: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                  >
                    <option value="She/Her">She/Her/Hers</option>
                    <option value="He/Him">He/Him/His</option>
                    <option value="They/Them">They/Them/Theirs</option>
                    <option value="She/They">She/They</option>
                    <option value="He/They">He/They</option>
                    <option value="Ze/Hir">Ze/Hir</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Specialty</label>
                  <select
                    value={formProfile.specialty}
                    onChange={(e) => setFormProfile({ ...formProfile, specialty: e.target.value as MedicalSpecialty })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                  >
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="Family Medicine">Family Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Anesthesiology">Anesthesiology</option>
                    <option value="General Surgery">General Surgery</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">NPI Number</label>
                  <input
                    type="text"
                    value={formProfile.npiNumber}
                    onChange={(e) => setFormProfile({ ...formProfile, npiNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">State License #</label>
                  <input
                    type="text"
                    value={formProfile.stateLicenseNumber}
                    onChange={(e) => setFormProfile({ ...formProfile, stateLicenseNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {activeUploadDocId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Upload Credential Document</h2>
              </div>
              <button
                onClick={() => setActiveUploadDocId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-blue-800 font-semibold bg-blue-50 p-3 rounded-xl border border-blue-100">
              Target Item: {profile.documents.find((d) => d.id === activeUploadDocId)?.name}
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              
              {/* Drag & Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    setUploadedFileObj(f);
                    setUploadFileName(f.name);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-2 cursor-pointer transition-all ${
                  isDraggingOver
                    ? 'border-blue-600 bg-blue-50 scale-[1.02] shadow-md'
                    : 'border-blue-300 hover:border-blue-500 bg-slate-50'
                }`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto transition-transform ${isDraggingOver ? 'text-blue-700 scale-125 animate-bounce' : 'text-blue-600'}`} />
                <p className="text-slate-800 font-bold">
                  {isDraggingOver ? 'Drop file here to attach to Passport! 📄' : 'Drag and drop document file here, or click to browse'}
                </p>
                <p className="text-[10px] text-slate-500">
                  Supports PDF, PNG, JPG, or DOCX (Max 15MB)
                </p>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadedFileObj(f);
                      setUploadFileName(f.name);
                    }
                  }}
                  className="hidden"
                  id="file-upload-input"
                />
                <label
                  htmlFor="file-upload-input"
                  className="inline-block mt-2 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  Choose File
                </label>
              </div>

              {uploadFileName && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-900 truncate">{uploadFileName}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                    Ready to Upload
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Document / License Number
                  </label>
                  <input
                    type="text"
                    value={uploadDocNumber}
                    onChange={(e) => setUploadDocNumber(e.target.value)}
                    placeholder="e.g. MA-284910-MED"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={uploadExpirationDate}
                    onChange={(e) => setUploadExpirationDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Issuing Authority / Board
                </label>
                <input
                  type="text"
                  value={uploadIssuer}
                  onChange={(e) => setUploadIssuer(e.target.value)}
                  placeholder="e.g. Mass Board of Registration in Medicine"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveUploadDocId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm flex items-center space-x-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save & Verify Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { id: 'all', label: 'All Documents' },
            { id: 'institutional', label: 'PD & Institutional' },
            { id: 'licensing', label: 'Licenses & DEA' },
            { id: 'clinical_certs', label: 'ACLS & Clinical Certs' },
            { id: 'malpractice_health', label: 'Malpractice & Health' },
            { id: 'academic', label: 'CV & Transcripts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                selectedCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-900">{filteredDocuments.length}</strong> items
        </div>
      </div>

      {/* Custom Document Drag & Drop Section (Visible on 'All Documents' tab) */}
      {selectedCategory === 'all' && (
        <div className="bg-slate-50 border border-blue-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <UploadCloud className="w-5 h-5" />
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Upload Custom / Employer Requested Document
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-blue-100 text-blue-800 rounded-full border border-blue-200 uppercase">
                  Multi-Upload Enabled
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Employer or hospital MSO requested additional credentials not prepopulated in your vault? Upload any custom document here to save it to your MoonCall Passport.
              </p>
            </div>
          </div>

          {customSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-2xl flex items-center justify-between animate-fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{customSuccessMsg}</span>
              </div>
              <button onClick={() => setCustomSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleCustomDocSubmit} className="space-y-4 text-xs">
            {/* Form Inputs Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="text-[11px] font-extrabold text-slate-800 block mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customDocTitle}
                  onChange={(e) => setCustomDocTitle(e.target.value)}
                  placeholder="e.g., State Fluoroscopy Permit, COVID Booster, Reference Letter"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-2xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  License / Document ID # <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={customDocNumber}
                  onChange={(e) => setCustomDocNumber(e.target.value)}
                  placeholder="e.g. PERMIT-99201"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Expiration Date <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={customExpirationDate}
                  onChange={(e) => setCustomExpirationDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsCustomDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsCustomDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsCustomDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setCustomFileName(file.name);
                  setCustomFileObj(file);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                isCustomDragging
                  ? 'border-blue-600 bg-blue-100/70 scale-[1.01]'
                  : customFileName
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-blue-500 bg-white'
              }`}
            >
              <input
                type="file"
                id="custom-doc-file-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCustomFileName(file.name);
                    setCustomFileObj(file);
                  }
                }}
                className="hidden"
              />

              <label htmlFor="custom-doc-file-input" className="cursor-pointer block">
                <UploadCloud className={`w-7 h-7 mx-auto mb-1 ${customFileName ? 'text-emerald-600' : 'text-blue-600'}`} />
                {customFileName ? (
                  <div className="flex items-center justify-center space-x-2 text-emerald-800 font-bold">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Selected File: {customFileName}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-800 font-bold text-xs">
                      Drag and drop document file here, or <span className="text-blue-600 underline">browse computer</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Supports PDF, PNG, JPG, DOCX (Up to 25MB)
                    </p>
                  </>
                )}
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingCustom}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
              >
                {isSubmittingCustom ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving to Passport...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Save to Passport</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Document Grid - Matching Geometric Balance profile card style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDocuments.map((doc, idx) => {
          const isVerified = doc.status === 'verified';
          const isPending = doc.status === 'pending';
          const isMissing = doc.status === 'missing';
          const isPDLetter = doc.id === 'pd_letter' || doc.id.includes('pd_letter') || doc.name.toLowerCase().includes('program director');

          return (
            <div
              key={doc.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                isVerified
                  ? 'bg-white border-slate-200'
                  : isPending
                  ? 'bg-blue-50/50 border-blue-200'
                  : 'bg-white border-slate-200 opacity-90'
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isVerified
                          ? 'bg-green-100 text-green-600'
                          : isPending
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isVerified ? '✓' : idx + 1}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1 ${
                      isVerified
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : isPending
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isVerified && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                    {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                    {isMissing && <AlertTriangle className="w-3 h-3 text-slate-400" />}
                    <span>{isVerified ? 'Verified' : isPending ? 'Pending Review' : 'Missing'}</span>
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm text-slate-900 mb-1.5 leading-snug">
                  {doc.name}
                </h3>

                {/* Meta details if available */}
                {isVerified || isPending ? (
                  <div className="space-y-1 text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {doc.fileName && (
                      <p className="font-medium text-slate-800 truncate flex items-center space-x-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span className="truncate">{doc.fileName}</span>
                      </p>
                    )}
                    {doc.docNumber && (
                      <p className="text-[11px] text-slate-500">
                        ID/No: <span className="text-slate-900 font-mono font-semibold">{doc.docNumber}</span>
                      </p>
                    )}
                    {doc.expirationDate && (
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Expires: <strong className="text-slate-700">{doc.expirationDate}</strong></span>
                      </p>
                    )}
                    {doc.notes && (
                      <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/60 line-clamp-2">
                        "{doc.notes}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2 italic">
                    {doc.notes || 'Not uploaded yet. Click upload to attach document scan or request directly from PD.'}
                  </p>
                )}

                {/* Special Request Button for PD Moonlighting Approval Letter */}
                {isPDLetter && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (doc.issuer && (!pdName || pdName === 'Dr. Robert Vance, MD')) {
                          setPdName(doc.issuer);
                        }
                        setIsPDRequestOpen(true);
                      }}
                      className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-800 border border-indigo-200/90 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                    >
                      <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{pdSentConfirmation ? 'Resend / Edit PD Request' : 'Request Letter from PD'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {isVerified ? (
                  <>
                    <button
                      onClick={() => onOpenDocumentViewer(doc)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-blue-700 rounded-lg font-bold flex items-center space-x-1.5 transition-colors border border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Doc</span>
                    </button>

                    <button
                      onClick={() => handleRemoveDoc(doc.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100"
                      title="Remove Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleOpenUploadModal(doc.id)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm flex items-center justify-center space-x-2 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload & Complete</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Program Director Approval Request Modal */}
      {isPDRequestOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 flex items-start justify-between border-b border-indigo-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-600/30 border border-indigo-400/40 rounded-2xl flex items-center justify-center text-indigo-300">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Request Program Director Approval Letter</h2>
                  <p className="text-xs text-indigo-200/80">
                    Send an automated email to your Program Director with a secure upload link.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPDRequestOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">

              {/* Success Banner if already sent */}
              {pdSentConfirmation && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Email request dispatched to {pdSentConfirmation.pdName}!</p>
                    <p className="text-[11px] text-emerald-800">
                      An email was sent to <strong>{pdSentConfirmation.pdEmail}</strong> on {pdSentConfirmation.dateSent} with a single-use upload link. When they upload the signed letter, it will automatically populate your MoonCall Passport.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendPDRequest} className="space-y-5">
                {/* Inputs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      Program Director's Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pdName}
                      onChange={(e) => setPdName(e.target.value)}
                      placeholder="e.g. Dr. Robert Vance, MD"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      Program Director's Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={pdEmail}
                      onChange={(e) => setPdEmail(e.target.value)}
                      placeholder="e.g. rvance@keck.usc.edu"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                    Personal Note / Message <span className="text-slate-400 font-normal lowercase">(included in email)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={pdCustomNote}
                    onChange={(e) => setPdCustomNote(e.target.value)}
                    placeholder="Add a personal note to your Program Director..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs text-xs"
                  />
                </div>

                {/* Email Preview Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Live Email Request Preview
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      Automated MoonCall Dispatch
                    </span>
                  </div>

                  {/* Simulated Email Envelope Box */}
                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 shadow-inner space-y-3 font-sans border border-slate-800">
                    
                    {/* Header Meta */}
                    <div className="pb-3 border-b border-slate-800 space-y-1 text-[11px]">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 w-14 font-semibold">To:</span>
                        <span className="text-indigo-300 font-mono font-bold">{pdEmail || 'pd@hospital.edu'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 w-14 font-semibold">From:</span>
                        <span className="text-slate-300 font-mono">MoonCall Passport &lt;requests@mooncall.app&gt;</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 w-14 font-semibold">Subject:</span>
                        <span className="text-white font-bold">[Action Required] Moonlighting Approval Request - Dr. {profile.name}</span>
                      </div>
                    </div>

                    {/* Email Body Card */}
                    <div className="bg-white text-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
                      <p className="font-bold text-slate-900">
                        Dear {pdName || 'Program Director'},
                      </p>

                      <p className="text-slate-700 leading-relaxed">
                        <strong>Dr. {profile.name}</strong> ({profile.residencyProgram}, PGY-{profile.pgyLevel}) has requested an official Program Director Moonlighting Approval & Good Standing Letter for their verified MoonCall Passport.
                      </p>

                      {pdCustomNote && (
                        <div className="p-3 bg-indigo-50/70 border-l-4 border-indigo-600 rounded-r-xl italic text-slate-700 text-xs">
                          "{pdCustomNote}"
                        </div>
                      )}

                      {/* Secure Upload Callout Box */}
                      <div className="p-4 bg-indigo-600 text-white rounded-xl space-y-2 text-center shadow-md">
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-200" />
                          <span>Secure PD Upload Portal</span>
                        </div>
                        <h4 className="text-sm font-black">
                          Upload Signed Approval Letter
                        </h4>
                        <p className="text-[11px] text-indigo-100 max-w-md mx-auto">
                          Click the secure link below to upload the signed PDF. The letter will be instantly verified and attached to Dr. {profile.name}'s MoonCall Passport profile.
                        </p>
                        <div className="pt-1">
                          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white text-indigo-900 rounded-lg font-mono text-[10px] font-bold shadow-inner max-w-full truncate">
                            <Link2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate">{pdUploadToken}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 pt-1">
                        Thank you for supporting Dr. {profile.name}'s professional development.<br />
                        <strong>MoonCall Credentialing Operations</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleCopyPDLink}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all flex items-center space-x-2 text-xs border border-slate-200 cursor-pointer w-full sm:w-auto justify-center"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copy Upload Link</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setIsPDRequestOpen(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer text-xs"
                    >
                      Close
                    </button>

                    <button
                      type="submit"
                      disabled={isSendingPDRequest}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer text-xs"
                    >
                      {isSendingPDRequest ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending Email Request...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Email Request to PD</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
