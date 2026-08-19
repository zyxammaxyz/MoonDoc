import React, { useState } from 'react';
import { ResidentProfile, CredentialDocument, Application } from '../types';
import { ApplicationChatModal } from './ApplicationChatModal';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Download,
  Share2,
  FileText,
  UserCheck,
  X,
  ExternalLink,
  Award,
  Calendar,
  Check,
  Copy,
  Printer,
  MessageSquare
} from 'lucide-react';

interface HospitalSharePreviewProps {
  profile: ResidentProfile;
  onClose: () => void;
  isModal?: boolean;
  applications?: Application[];
  onSendMessage?: (
    appId: string,
    text: string,
    senderRole: 'resident' | 'hospital',
    senderName: string
  ) => void;
}

export const HospitalSharePreview: React.FC<HospitalSharePreviewProps> = ({
  profile,
  onClose,
  isModal = true,
  applications = [],
  onSendMessage
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isApprovedByHospital, setIsApprovedByHospital] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const passportUrl = `https://mooncall.app/passport/${profile.npiNumber}`;

  const verifiedDocs = profile.documents.filter((d) => d.status === 'verified');
  const pendingDocs = profile.documents.filter((d) => d.status === 'pending');

  const defaultApp = applications[0];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(passportUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Listen for Escape key when in modal mode
  React.useEffect(() => {
    if (!isModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, onClose]);

  const innerContent = (
    <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full p-6 sm:p-8 space-y-6 shadow-xl relative text-slate-900 mx-auto">
      
      {/* Main Resident Verified Passport Document Card */}
      <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <img
              src={profile.headshotUrl}
              alt={profile.firstName}
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-green-500/30 border border-slate-200 shadow-sm"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-blue-900">
                  Dr. {profile.firstName} {profile.lastName}, {profile.title}
                </h1>
                <span className="px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700 border border-green-200 rounded-full flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span>NPI Verified</span>
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-600 mt-1">
                {profile.residencyProgram} • <span className="text-slate-900 font-bold">{profile.pgyLevel}</span>
                {profile.pronouns && <span className="ml-2 text-blue-700 font-bold">({profile.pronouns})</span>}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Specialty: <strong className="text-slate-800">{profile.specialty}</strong>
                {profile.gender && <> | Gender: <strong className="text-slate-800">{profile.gender}</strong></>}
                {" "}| NPI: <strong className="text-blue-600">{profile.npiNumber}</strong> | License: <strong className="text-green-600">{profile.stateLicenseNumber} ({profile.licenseState})</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-3 px-4 bg-emerald-50 border border-emerald-300 rounded-2xl shadow-2xs text-center shrink-0 self-center sm:self-auto">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Resident Passport</span>
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Last System Audit: {new Date().toISOString().split('T')[0]}
            </p>
          </div>
        </div>

        {/* Verification Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400">PD Letter</span>
            <p className="font-bold text-green-600 mt-0.5 flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>Good Standing</span>
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400">State License</span>
            <p className="font-bold text-green-600 mt-0.5 flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>Active Full MA</span>
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400">DEA Registration</span>
            <p className="font-bold text-green-600 mt-0.5 flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>Sched II-V Active</span>
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400">ACLS / BLS</span>
            <p className="font-bold text-green-600 mt-0.5 flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>AHA Certified</span>
            </p>
          </div>
        </div>

        {/* Verified Document Records */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Attached Credential Scans ({verifiedDocs.length} Verified Files)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {verifiedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm"
              >
                <div className="truncate pr-2">
                  <p className="font-bold text-slate-900 truncate">{doc.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {doc.fileName || 'Verified_Scan.pdf'} • Expires {doc.expirationDate || '2027'}
                  </p>
                </div>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold flex-shrink-0">
                  PDF Attached
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hospital Action Row */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => {
              alert('Downloading Complete MoonCall Verified Credential Packet (PDF Bundle)...');
            }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-2 border border-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Download Full Packet (PDF Bundle)</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-blue-200 transition-all cursor-pointer shadow-2xs"
            >
              <Copy className="w-4 h-4 text-blue-600" />
              <span>{copiedLink ? 'Copied Passport URL!' : 'Copy Shareable Passport Link'}</span>
            </button>

            {isModal && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {showChatModal && defaultApp && onSendMessage && (
        <ApplicationChatModal
          application={defaultApp}
          onSendMessage={onSendMessage}
          onClose={() => setShowChatModal(false)}
          initialRole="hospital"
        />
      )}

    </div>
  );

  if (!isModal) {
    return innerContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {innerContent}
    </div>
  );
};
