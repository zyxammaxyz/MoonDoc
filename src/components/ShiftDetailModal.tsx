import React, { useState, useEffect } from 'react';
import { MoonlightingShift, CredentialDocument, ResidentProfile } from '../types';
import {
  X,
  Hospital,
  MapPin,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Building2,
  Calendar,
  Check,
  Award,
  Sparkles,
  FileCheck,
  FilePlus,
  ArrowRight,
  FileText,
  MessageSquare
} from 'lucide-react';
import { fetchCustomDocRequests, CustomDocRequest } from '../lib/interestApi';

interface ShiftDetailModalProps {
  shift: MoonlightingShift | null;
  onClose: () => void;
  userProfile: ResidentProfile;
  onApply: (shift: MoonlightingShift) => void;
  isAlreadyApplied: boolean;
  onOpenVault: () => void;
}

export const ShiftDetailModal: React.FC<ShiftDetailModalProps> = ({
  shift,
  onClose,
  userProfile,
  onApply,
  isAlreadyApplied,
  onOpenVault,
}) => {
  if (!shift) return null;

  const [isApplying, setIsApplying] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Any additional, hospital-specific documents this job asks for on top of
  // the standard passport checklist below. These are informational here --
  // actually uploading a file for one only happens once connected, from
  // this application's real chat (see ApplicationChatModal).
  const [customDocRequests, setCustomDocRequests] = useState<CustomDocRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCustomDocRequests(shift.id)
      .then((requests) => {
        if (!cancelled) setCustomDocRequests(requests);
      })
      .catch(() => {
        // Harmless for mock shifts / no backend configured -- just means
        // no custom requests to show.
      });
    return () => {
      cancelled = true;
    };
  }, [shift.id]);

  // Check requirement match against resident's documents
  const documentChecklist = shift.requiredDocIds.map((docId) => {
    const userDoc = userProfile.documents.find((d) => d.id === docId);
    return {
      docId,
      docName: userDoc ? userDoc.name : docId,
      isVerified: userDoc?.status === 'verified',
      isPending: userDoc?.status === 'pending',
      fileName: userDoc?.fileName,
    };
  });

  const allVerified = documentChecklist.every((item) => item.isVerified);
  const missingCount = documentChecklist.filter((item) => !item.isVerified).length;

  const handleConfirmApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      onApply(shift);
      setIsApplying(false);
      setShowSuccessMessage(true);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-8 text-slate-900">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {showSuccessMessage ? (
          /* Application Success View */
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 border border-green-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Application Submitted!
            </h2>

            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your verified <strong className="text-blue-600">MoonCall Passport</strong> package has been sent directly to the Medical Staff Office at <strong className="text-slate-900">{shift.hospitalName}</strong>.
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Shift Title:</span>
                <span className="font-bold text-slate-900">{shift.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shift Date:</span>
                <span className="font-bold text-blue-600">{shift.date} ({shift.startTime} - {shift.endTime})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Payout:</span>
                <span className="font-extrabold text-green-600">${shift.totalPay}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-center space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Normal Shift Detail View */
          <>
            {/* Header Badge & Title */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                  {shift.specialty}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                  {shift.shiftType}
                </span>
                {shift.urgency === 'High Demand' && (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                    🔥 High Demand
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-blue-900">
                {shift.title}
              </h2>

              <p className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                <Hospital className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-800">{shift.hospitalName}</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{shift.facilityLocation} ({shift.distanceMiles} miles away)</span>
              </p>
            </div>

            {/* Compensation & Shift Logistics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Hourly Rate</p>
                <p className="text-lg font-extrabold text-blue-600 mt-0.5">
                  ${shift.hourlyRate}
                  <span className="text-[10px] text-slate-400 font-normal">/hr</span>
                </p>
              </div>

              <div>
                <p className="text-slate-500 font-medium">Total Shift Pay</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                  ${shift.totalPay}
                </p>
              </div>

              <div>
                <p className="text-slate-500 font-medium">Date & Time</p>
                <p className="font-bold text-blue-600 mt-0.5">
                  {shift.date}
                </p>
                <p className="text-[10px] text-slate-500">{shift.startTime} - {shift.endTime} ({shift.durationHours}h)</p>
              </div>

              <div>
                <p className="text-slate-500 font-medium">PGY Level Match</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {shift.pgyRequirement.join(', ')}
                </p>
              </div>
            </div>

            {/* Shift Description */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold text-slate-800">Clinical Scope & Duties</h3>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                {shift.description}
              </p>
            </div>

            {/* Hospital Amenities */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-lg border font-semibold ${shift.malpracticeIncluded ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                🛡️ Malpractice Coverage Provided
              </span>
              <span className={`px-2.5 py-1 rounded-lg border font-semibold ${shift.restCallRoomAvailable ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                🛌 Sleep Call Room Available
              </span>
              <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold">
                💻 EMR: {shift.hospitalId === 'hosp_bmc' ? 'Epic Systems' : 'Epic / EHR'}
              </span>
            </div>

            {/* Credentialing Compliance Checklist Matrix */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Hospital Credentialing Requirements Match</span>
                </h3>
                {allVerified ? (
                  <span className="text-[11px] font-bold text-green-600 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span>100% Documentation Matched</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-600 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{missingCount} Document Needs Attention</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {documentChecklist.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      item.isVerified
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {item.isVerified ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      )}
                      <span className="font-semibold truncate">{item.docName}</span>
                    </div>

                    <span className="text-[10px] font-bold opacity-80 flex-shrink-0 ml-2">
                      {item.isVerified ? 'Verified' : 'Missing'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional, hospital-specific document requests (beyond the
                standard passport checklist above) */}
            {customDocRequests.length > 0 && (
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Additional Documents Requested by {shift.hospitalName}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {customDocRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-800 flex items-center space-x-2"
                    >
                      <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="font-semibold truncate">{req.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>
                    {isAlreadyApplied
                      ? "Upload these from this application's chat (open it from My Applications or Affiliated Sites)."
                      : 'Uploaded from the real chat once you apply and connect with this site.'}
                  </span>
                </p>
              </div>
            )}

            {/* Footer Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              {!allVerified && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenVault();
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-blue-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center space-x-1.5"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Upload Missing Items</span>
                </button>
              )}

              <div className="flex items-center space-x-3 ml-auto">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>

                {isAlreadyApplied ? (
                  <button
                    disabled
                    className="px-6 py-2.5 bg-green-100 border border-green-200 text-green-700 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Already Applied</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmApply}
                    disabled={isApplying}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-2 transition-all"
                  >
                    {isApplying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Passport...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Express Apply with MoonCall Passport</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
