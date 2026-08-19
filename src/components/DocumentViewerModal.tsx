import React from 'react';
import { CredentialDocument } from '../types';
import { X, FileText, CheckCircle2, Download, Calendar, ShieldCheck, Printer } from 'lucide-react';

interface DocumentViewerModalProps {
  document: CredentialDocument | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document: doc, onClose }) => {
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-8 text-slate-900">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">{doc.name}</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>Verified</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              File: <strong className="text-slate-800">{doc.fileName || 'Document_Scan.pdf'}</strong> | Issuer: <strong className="text-blue-600">{doc.issuer || 'Official Issuing Board'}</strong>
            </p>
          </div>
        </div>

        {/* Simulated High-Fidelity PDF Viewer Box */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 font-mono relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-[11px] text-slate-500 font-sans">
            <span className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>MoonCall Tamper-Proof Cryptographic Verification Seal</span>
            </span>
            <span>Doc ID: {doc.docNumber || 'MD-88301'}</span>
          </div>

          <div className="bg-white text-slate-900 p-8 rounded-xl shadow-md space-y-4 font-serif border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{doc.issuer || 'MASSACHUSETTS GENERAL HOSPITAL'}</h3>
                <p className="text-xs text-slate-600 font-sans">DEPARTMENT OF MEDICAL AFFAIRS & CREDENTIALING</p>
              </div>
              <div className="text-right text-xs font-sans text-slate-500">
                <p>Date Verified: {doc.uploadDate || '2026-07-01'}</p>
                <p>Status: ACTIVE & VALID</p>
              </div>
            </div>

            <div className="py-4 space-y-3 font-sans text-sm text-slate-800 leading-relaxed">
              <p className="font-bold uppercase text-slate-900">OFFICIAL RECORD / VERIFICATION CERTIFICATE</p>
              <p>
                This certifies that the attached document (<strong className="text-blue-900">{doc.name}</strong>) has been officially verified by MoonCall automated NPI & Medical Staff Board cross-referencing.
              </p>
              <p className="text-xs text-slate-600">
                • Document Number: <strong>{doc.docNumber || 'MA-284910-MED'}</strong><br/>
                • Expiration Date: <strong>{doc.expirationDate || '2027-12-31'}</strong><br/>
                • Resident Standing: <strong>PGY-2 / Good Standing</strong>
              </p>
            </div>

            <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-xs font-sans text-slate-500">
              <span>Digital Signature Hash: 0x8f2a...991e</span>
              <span className="font-bold text-blue-900">MoonCall Verified</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Expires: <strong className="text-slate-800">{doc.expirationDate || '2027-12-31'}</strong>
          </p>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => alert(`Downloading ${doc.fileName || 'Document'}`)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download File</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              Close Preview
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
