import React, { useState } from 'react';
import { CredentialDocument, MoonlightingShift } from '../types';
import { ShieldAlert, CheckCircle2, AlertCircle, ChevronUp, ChevronDown, ArrowRight, FilePlus, Share2, Sparkles } from 'lucide-react';

interface ProgressBarProps {
  documents: CredentialDocument[];
  completionPercentage: number;
  onOpenVault: () => void;
  onOpenShareModal: () => void;
  availableShifts: MoonlightingShift[];
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  documents,
  completionPercentage,
  onOpenVault,
  onOpenShareModal,
  availableShifts,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalRequired = documents.length;
  const verifiedCount = documents.filter((d) => d.status === 'verified').length;
  const pendingCount = documents.filter((d) => d.status === 'pending').length;
  const missingCount = documents.filter((d) => d.status === 'missing').length;

  const missingDocs = documents.filter((d) => d.status === 'missing' || d.status === 'pending');

  // Count how many shifts resident is fully eligible for
  const eligibleShiftsCount = availableShifts.filter((shift) => {
    return shift.requiredDocIds.every((reqId) => {
      const doc = documents.find((d) => d.id === reqId);
      return doc && doc.status === 'verified';
    });
  }).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 transition-all duration-300">
      {/* Expanded Details Card */}
      {isExpanded && (
        <div className="max-w-4xl mx-auto px-4 mb-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Credential Readiness & Hospital Compliance Matrix
                </h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
              {/* Stat 1 */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">Verified Documents</p>
                <p className="text-xl font-extrabold text-green-600 mt-1">
                  {verifiedCount} <span className="text-xs text-slate-400 font-normal">/ {totalRequired}</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  PD Letter, License & DEA verified
                </p>
              </div>

              {/* Stat 2 */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">Eligible Opportunities</p>
                <p className="text-xl font-extrabold text-blue-600 mt-1">
                  {eligibleShiftsCount} <span className="text-xs text-slate-400 font-normal">/ {availableShifts.length} shifts</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Instant Express Apply ready
                </p>
              </div>

              {/* Stat 3 */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">Action Needed</p>
                <p className="text-xl font-extrabold text-amber-600 mt-1">
                  {missingCount + pendingCount} <span className="text-xs text-slate-400 font-normal">items</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {missingCount > 0 ? `${missingCount} missing document` : 'Pending review'}
                </p>
              </div>
            </div>

            {/* List of missing items */}
            {missingDocs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pending / Missing Items to reach 100%:</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingDocs.map((doc) => (
                    <span
                      key={doc.id}
                      onClick={onOpenVault}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] cursor-pointer hover:bg-amber-100 transition-colors"
                    >
                      <FilePlus className="w-3 h-3 text-amber-600" />
                      <span>{doc.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={onOpenShareModal}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-200"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Export MoonDoc Passport</span>
              </button>

              <button
                onClick={onOpenVault}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-colors"
              >
                <span>Upload Missing Items in Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Sticky Bottom Progress Bar Strip */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Expand toggle & contextual status */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center space-x-1.5 border border-slate-200 text-xs font-semibold cursor-pointer"
              title="Expand Details"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              <span className="hidden sm:inline">Details</span>
            </button>

            <div className="text-xs text-slate-600 font-medium hidden sm:block">
              {completionPercentage === 100 ? (
                <span className="text-green-600 font-bold flex items-center gap-1">
                  ✓ Full Passport verified ({availableShifts.length} shifts ready)
                </span>
              ) : (
                <span>
                  Ready for <strong className="text-blue-600 font-bold">{eligibleShiftsCount} of {availableShifts.length}</strong> shifts
                </span>
              )}
            </div>
          </div>

          {/* Center: Centered Progress Bar & Percent Complete Box */}
          <div className="w-full md:max-w-md mx-auto flex flex-col items-center">
            <div className="flex items-center justify-between w-full text-xs mb-1.5 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Credentialing Progress
              </span>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-extrabold rounded-md border border-blue-200 shadow-2xs">
                {completionPercentage}% COMPLETE
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {missingCount + pendingCount > 0 ? `${missingCount + pendingCount} remaining` : 'Verified'}
              </span>
            </div>

            {/* Progress Track */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              onClick={onOpenShareModal}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Share Passport</span>
            </button>

            <button
              onClick={onOpenVault}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <span>{completionPercentage === 100 ? 'Manage Vault' : 'Complete Vault'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </footer>
    </div>
  );
};
