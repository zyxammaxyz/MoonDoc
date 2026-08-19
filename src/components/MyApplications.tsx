import React, { useState } from 'react';
import { Application } from '../types';
import { ApplicationChatModal } from './ApplicationChatModal';
import { ShiftCalendarView } from './ShiftCalendarView';
import {
  FileCheck,
  Building2,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Send,
  X,
  ListFilter,
  CalendarDays
} from 'lucide-react';

interface MyApplicationsProps {
  applications: Application[];
  onOpenHospitalPreview?: () => void;
  onSendMessage: (
    appId: string,
    text: string,
    senderRole: 'resident' | 'hospital',
    senderName: string
  ) => void;
  onMarkShiftCompleted?: (appId: string) => void;
}

// Helper: Format date string '2026-08-10' to written out 'August 10, 2026'
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

export const MyApplications: React.FC<MyApplicationsProps> = ({
  applications,
  onOpenHospitalPreview,
  onSendMessage,
  onMarkShiftCompleted,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedChatApp, setSelectedChatApp] = useState<Application | null>(null);
  const [completingApp, setCompletingApp] = useState<Application | null>(null);

  const approvedCount = applications.filter((a) => a.status === 'Approved').length;
  const completedCount = applications.filter((a) => a.status === 'Completed').length;
  const reviewingCount = applications.filter((a) => a.status === 'Credentialing Review').length;

  const totalEarningsEstimated = applications.reduce((acc, app) => {
    return acc + app.shift.totalPay;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight text-blue-900">
              My Applications & Hospital Status
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track applications, hospital credentialing progress, and direct messaging with hospital coordinators.
          </p>
        </div>

        {/* View Switcher & Stats Row */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          
          {/* List vs Calendar View Toggle */}
          <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center space-x-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>List View</span>
            </button>

            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-amber-300" />
              <span>Calendar View</span>
            </button>
          </div>

          <div className="bg-slate-50 p-3 px-4 rounded-2xl border border-slate-200 hidden sm:block">
            <p className="text-slate-500 font-medium">Approved Shifts</p>
            <p className="text-xl font-extrabold text-blue-600 mt-0.5">
              {approvedCount} <span className="text-xs text-slate-400 font-normal">shifts</span>
            </p>
          </div>

          <div className="bg-slate-50 p-3 px-4 rounded-2xl border border-slate-200 hidden sm:block">
            <p className="text-slate-500 font-medium">Under Review</p>
            <p className="text-xl font-extrabold text-amber-600 mt-0.5">
              {reviewingCount} <span className="text-xs text-slate-400 font-normal">hospitals</span>
            </p>
          </div>
        </div>
      </div>

      {/* RENDER CALENDAR OR LIST VIEW BASED ON viewMode */}
      {viewMode === 'calendar' ? (
        <ShiftCalendarView
          applications={applications}
          onOpenChat={(app) => setSelectedChatApp(app)}
          onMarkCompleted={(appId) => {
            const found = applications.find((a) => a.id === appId);
            if (found) setCompletingApp(found);
          }}
        />
      ) : (
        /* Applications List View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>Active Applications & Hospital Status</span>
            </h2>

            <button
              onClick={() => setViewMode('calendar')}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Switch to Calendar Schedule →</span>
            </button>
          </div>

        {applications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No Shifts Applied Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Explore the interactive Opportunity Map to find available moonlighting shifts in your area and express apply with your MoonCall Passport.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {applications.map((app) => {
              const isApproved = app.status === 'Approved';
              const isReviewing = app.status === 'Credentialing Review';
              const msgCount = app.messages ? app.messages.length : 0;

              return (
                <div
                  key={app.id}
                  className={`p-6 rounded-3xl border transition-all ${
                    isApproved
                      ? 'bg-white border-blue-300 shadow-md ring-1 ring-blue-100'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    
                    {/* Shift Info */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 rounded">
                          {app.shift.specialty}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Applied: {formatWrittenDate(app.appliedDate)}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        {app.shift.title}
                      </h3>

                      <p className="text-xs text-slate-500 flex items-center space-x-2">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 inline" />
                        <span className="font-semibold text-slate-800">{app.shift.hospitalName}</span>
                        <span>•</span>
                        <span>{app.shift.facilityLocation}</span>
                      </p>
                    </div>

                    {/* Pay & Status Pill + Actions */}
                    <div className="flex flex-wrap items-center space-x-3">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 font-medium">Payout</p>
                        <p className="text-lg font-extrabold text-blue-600">
                          ${app.shift.totalPay}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 ${
                          app.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isApproved
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : isReviewing
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {(isApproved || app.status === 'Completed') && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {isReviewing && <Clock className="w-4 h-4 text-amber-600 animate-spin" />}
                        <span>{app.status === 'Completed' ? 'Completed & Logged' : app.status}</span>
                      </span>

                      {/* Action Button: Completed */}
                      {isApproved && (
                        <button
                          onClick={() => setCompletingApp(app)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center space-x-1.5 border border-emerald-500"
                          title="Mark this shift as completed to log hours & update finances"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Completed</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Tracker Stepper */}
                  <div className="py-4">
                    <p className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">
                      Hospital Credentialing Workflow Progress
                    </p>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      
                      {/* Step 1: Passport Sent */}
                      <div className="space-y-1">
                        <div className="w-7 h-7 bg-green-100 text-green-600 border border-green-200 rounded-full flex items-center justify-center mx-auto font-bold text-xs shadow-2xs">
                          <Check className="w-4 h-4" />
                        </div>
                        <p className="font-bold text-slate-800 text-[11px]">Passport Sent</p>
                        <p className="text-[9px] text-slate-400">Verified Packet</p>
                      </div>

                      {/* Step 2: MSO Review */}
                      <div className="space-y-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto font-bold text-xs border shadow-2xs ${
                            isApproved || isReviewing || app.status === 'Completed'
                              ? isApproved || app.status === 'Completed'
                                ? 'bg-green-100 text-green-600 border-green-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </div>
                        <p className={`font-bold text-[11px] ${isApproved || isReviewing || app.status === 'Completed' ? 'text-slate-800' : 'text-slate-400'}`}>MSO Review</p>
                        <p className="text-[9px] text-slate-400">Medical Staff Office</p>
                      </div>

                      {/* Step 3: Approved */}
                      <div className="space-y-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto font-bold text-xs border shadow-2xs ${
                            isApproved || app.status === 'Completed'
                              ? 'bg-green-100 text-green-600 border-green-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </div>
                        <p className={`font-bold text-[11px] ${isApproved || app.status === 'Completed' ? 'text-slate-800' : 'text-slate-400'}`}>Approved</p>
                        <p className="text-[9px] text-slate-400">Scheduled on Calendar</p>
                      </div>

                      {/* Step 4: Shift Payout */}
                      <div className="space-y-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto font-bold text-xs border shadow-2xs ${
                            app.status === 'Completed'
                              ? 'bg-green-100 text-green-600 border-green-200 ring-2 ring-emerald-500/20'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </div>
                        <p className={`font-bold text-[11px] ${app.status === 'Completed' ? 'text-emerald-700' : 'text-slate-400'}`}>Shift Payout</p>
                        <p className="text-[9px] text-slate-400">{app.status === 'Completed' ? 'Direct Deposit Issued' : 'Direct Deposit'}</p>
                      </div>

                    </div>
                  </div>

                  {/* Actions & Direct Communication Line Trigger */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">
                      Passport Share Token: <code className="text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{app.passportShareToken}</code>
                    </span>

                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => setSelectedChatApp(app)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat with Hospital MSO</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Render Chat Modal if selected */}
      {selectedChatApp && (
        <ApplicationChatModal
          application={
            applications.find((a) => a.id === selectedChatApp.id) || selectedChatApp
          }
          onSendMessage={onSendMessage}
          onClose={() => setSelectedChatApp(null)}
          initialRole="resident"
        />
      )}

      {/* SHIFT COMPLETION CONFIRMATION POPUP MODAL */}
      {completingApp && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Shift Completion Confirmation</h3>
                  <p className="text-xs text-slate-500">Record completed shift for duty hours & finances</p>
                </div>
              </div>
              <button
                onClick={() => setCompletingApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MANDATORY POPUP STATEMENT BOX */}
            <div className="bg-emerald-50 border-2 border-emerald-300/80 p-4 rounded-2xl text-center space-y-1 shadow-xs">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Resident Declaration</span>
              <p className="text-sm font-extrabold text-emerald-950 leading-snug">
                "I completed this shift and will update my hours and finances"
              </p>
            </div>

            {/* Shift Details Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Hospital Facility</span>
                <span className="font-bold text-slate-900">{completingApp.shift.hospitalName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Shift Title</span>
                <span className="font-bold text-slate-900">{completingApp.shift.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Date & Duration</span>
                <span className="font-bold text-blue-700">{completingApp.shift.date} ({completingApp.shift.durationHours || 12} hrs)</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Earned Shift Payout</span>
                <span className="font-black text-emerald-600 text-sm">${completingApp.shift.totalPay}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setCompletingApp(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onMarkShiftCompleted) {
                    onMarkShiftCompleted(completingApp.id);
                  }
                  setCompletingApp(null);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Completion</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
