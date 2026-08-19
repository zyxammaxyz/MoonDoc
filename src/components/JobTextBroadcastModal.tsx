import React, { useState } from 'react';
import { MoonlightingShift } from '../types';
import { Copy, Check, X, Sparkles, Send, Mail, MessageSquare } from 'lucide-react';

interface JobTextBroadcastModalProps {
  shift: MoonlightingShift;
  onClose: () => void;
  onCopySuccess: (msg: string) => void;
}

export const JobTextBroadcastModal: React.FC<JobTextBroadcastModalProps> = ({
  shift,
  onClose,
  onCopySuccess,
}) => {
  // Generate initial well-formatted text breakdown
  const defaultText = `🏥 MOONCALL SHIFT BROADCAST: ${shift.title}
==================================================
Facility: ${shift.hospitalName}
Location: ${shift.facilityLocation}
Department: ${shift.department}
Specialty: ${shift.specialty}

🗓 Date: ${shift.date}
⏰ Schedule: ${shift.startTime} - ${shift.endTime} (${shift.durationHours} Hours)
💰 Compensation: $${shift.hourlyRate}/hr ($${shift.totalPay} Total Pay)

📋 Requirements & Clinical Descriptors:
• Eligible PGY Levels: ${shift.pgyRequirement.join(', ')}
• EMR Software: ${shift.description.includes('EMR:') ? shift.description.split('EMR:')[1].split('|')[0].trim() : 'Epic Systems'}
• Perks Included: ${shift.malpracticeIncluded ? '✅ Malpractice Covered' : ''} ${shift.restCallRoomAvailable ? '| ✅ Call Room' : ''} ${shift.mealStipend ? '| ✅ Meal Allowance' : ''}

📝 Clinical Overview:
${shift.description}

⚡ Apply Instantly via MoonCall Passport:
https://mooncall.app/apply/${shift.id}

📞 Hospital MSO Contact:
moonlighting@${shift.hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.org | (310) 555-0199
==================================================`;

  const [formattedText, setFormattedText] = useState<string>(defaultText);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    onCopySuccess(`📋 Copied shift breakdown text to clipboard! Ready to paste into mass email or SMS broadcast.`);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                One-Click Email & SMS Text Generator
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Formatted breakdown ready for mass email broadcasts or resident text lists
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50">
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Mass Outreach Helper:</strong> Easily reach resident lists before all residents are on the platform.
              </span>
            </div>
            <span className="bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
              Auto-Formatted
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Text Breakdown Content (Editable):</span>
              <span className="text-[10px] text-slate-400 font-normal">Click text box to edit before copying</span>
            </label>
            <textarea
              rows={14}
              value={formattedText}
              onChange={(e) => setFormattedText(e.target.value)}
              className="w-full bg-white border border-slate-300 p-4 rounded-2xl text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-inner"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleCopy}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy 1-Click Text Breakdown</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
