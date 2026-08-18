import React, { useState, useEffect, useRef } from 'react';
import { Application, ChatMessage } from '../types';
import {
  MessageSquare,
  Send,
  X,
  Building2,
  User,
  ShieldCheck,
  Paperclip,
  CheckCheck,
  Bot,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ApplicationChatModalProps {
  application: Application;
  onSendMessage: (
    appId: string,
    text: string,
    senderRole: 'resident' | 'hospital',
    senderName: string
  ) => void;
  onClose: () => void;
  initialRole?: 'resident' | 'hospital';
}

function formatWrittenDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
  return dateStr;
}

export const ApplicationChatModal: React.FC<ApplicationChatModalProps> = ({
  application,
  onSendMessage,
  onClose,
  initialRole = 'resident'
}) => {
  const [activeRole, setActiveRole] = useState<'resident' | 'hospital'>(initialRole);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = application.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const senderName =
      activeRole === 'resident'
        ? 'Dr. Maria Toledo'
        : `${application.shift.hospitalName} MSO Coordinator`;

    onSendMessage(application.id, inputText.trim(), activeRole, senderName);
    setInputText('');
  };

  const handleQuickPrompt = (promptText: string) => {
    const senderName =
      activeRole === 'resident'
        ? 'Dr. Maria Toledo'
        : `${application.shift.hospitalName} MSO Coordinator`;

    onSendMessage(application.id, promptText, activeRole, senderName);
  };

  const residentQuickPrompts = [
    'Where should I report for orientation on arrival?',
    'Is physician parking validated in the main garage?',
    'Can you confirm my EMR / EPIC credentials step?',
    'What is the dress code for this shift?'
  ];

  const hospitalQuickPrompts = [
    'Your MoonDoc Passport has been approved by MSO.',
    'Please report to Room 3B in the main ED at 06:45 AM.',
    'EPIC logins dispatched to your registered email address.',
    'Parking pass code is #4920 at the South Garage entrance.'
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full flex flex-col h-[680px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {application.shift.hospitalName}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-500/30 text-blue-200 rounded-md border border-blue-400/30">
                  {application.status}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {application.shift.title} • {application.shift.date}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sender Persona Switcher Banner */}
        <div className="bg-slate-100 p-2.5 px-5 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium hidden sm:inline">
            Direct Messaging Line:
          </span>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <span className="text-[11px] text-slate-500 font-semibold">Replying as:</span>
            <div className="bg-white p-0.5 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <button
                onClick={() => setActiveRole('resident')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                  activeRole === 'resident'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Dr. Toledo (Resident)</span>
              </button>

              <button
                onClick={() => setActiveRole('hospital')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                  activeRole === 'hospital'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>MSO (Hospital)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
          
          {/* Initial intro banner */}
          <div className="text-center my-2 space-y-1">
            <span className="px-3 py-1 bg-slate-200/80 text-slate-600 text-[10px] font-bold rounded-full inline-block">
              Encrypted Hospital-Resident Direct Channel
            </span>
            <p className="text-[11px] text-slate-400">
              Application submitted on {formatWrittenDate(application.appliedDate)}. Shared Passport Token: <strong className="text-slate-600 font-mono">{application.passportShareToken}</strong>
            </p>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                No messages exchanged yet. Send a note to coordinate shift arrival, EPIC credentials, or room locations.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isResident = msg.senderRole === 'resident';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isResident ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1 px-1">
                    <span className="font-bold text-slate-700">{msg.senderName}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[82%] rounded-2xl p-3.5 text-xs font-medium shadow-xs leading-relaxed ${
                      isResident
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-100/90 border-t border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center space-x-2 text-[11px]">
          <span className="text-slate-500 font-bold flex items-center space-x-1 flex-shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Quick Prompts:</span>
          </span>
          {(activeRole === 'resident' ? residentQuickPrompts : hospitalQuickPrompts).map(
            (prompt, i) => (
              <button
                key={i}
                onClick={() => handleQuickPrompt(prompt)}
                className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-200 flex-shrink-0 transition-colors flex items-center space-x-1"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
              </button>
            )
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          className="p-4 bg-white border-t border-slate-200 flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              activeRole === 'resident'
                ? 'Type message to hospital coordinator...'
                : 'Type response to Dr. Toledo...'
            }
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center space-x-1.5 shadow-sm ${
              inputText.trim()
                ? activeRole === 'resident'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
};
