import React, { useState } from 'react';
import { Application } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  Download,
  Filter,
  Sparkles,
  MapPin,
  ShieldCheck,
  CalendarCheck
} from 'lucide-react';

interface ShiftCalendarViewProps {
  applications: Application[];
  onOpenChat: (app: Application) => void;
  onMarkCompleted?: (appId: string) => void;
}

// Helper: Format 24h time '19:00' to 12h time '7:00 PM'
function format12HourTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr || '00'} ${ampm}`;
}

// Helper: Get days in month
function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Helper: Get starting day of week for month (0 = Sun, 1 = Mon, ..., 6 = Sat)
function getFirstDayOfWeek(year: number, monthIndex: number): number {
  return new Date(year, monthIndex, 1).getDay();
}

export const ShiftCalendarView: React.FC<ShiftCalendarViewProps> = ({
  applications,
  onOpenChat,
  onMarkCompleted,
}) => {
  // Current view month (default to August 2026 since mock data shifts are Aug 2026)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 1)); // Aug 2026
  const [selectedAppModal, setSelectedAppModal] = useState<Application | null>(null);

  // Filters for shift statuses
  const [showApproved, setShowApproved] = useState(true);
  const [showReviewing, setShowReviewing] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = getDaysInMonth(year, monthIndex);
  const startDay = getFirstDayOfWeek(year, monthIndex);

  // Filter applications for current status filters
  const filteredApps = applications.filter((app) => {
    if (app.status === 'Approved' && !showApproved) return false;
    if (app.status === 'Credentialing Review' && !showReviewing) return false;
    if (app.status === 'Completed' && !showCompleted) return false;
    return true;
  });

  // Map applications by date string 'YYYY-MM-DD'
  const appsByDate: Record<string, Application[]> = {};
  filteredApps.forEach((app) => {
    const d = app.shift.date; // e.g. '2026-08-15'
    if (d) {
      if (!appsByDate[d]) appsByDate[d] = [];
      appsByDate[d].push(app);
    }
  });

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, monthIndex - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, monthIndex + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 7, 1));
  };

  // Export .ics calendar file
  const handleExportICS = () => {
    if (applications.length === 0) {
      alert('No shifts available to export.');
      return;
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MoonCall//Resident Moonlighting Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    applications.forEach((app) => {
      const shift = app.shift;
      const dateStr = shift.date.replace(/-/g, ''); // YYYYMMDD
      const startTimeStr = (shift.startTime || '07:00').replace(':', '') + '00';
      const endTimeStr = (shift.endTime || '19:00').replace(':', '') + '00';

      const dtStart = `${dateStr}T${startTimeStr}`;
      const dtEnd = `${dateStr}T${endTimeStr}`;

      icsContent = icsContent.concat([
        'BEGIN:VEVENT',
        `UID:mooncall_shift_${app.id}@mooncall.app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:Moonlighting: ${shift.title} (${shift.specialty})`,
        `LOCATION:${shift.hospitalName}, ${shift.facilityLocation}`,
        `DESCRIPTION:Status: ${app.status}\\nHourly Rate: $${shift.hourlyRate}/hr\\nTotal Pay: $${shift.totalPay}\\nPassport Share Token: ${app.passportShareToken}`,
        'END:VEVENT',
      ]);
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MoonCall_Moonlighting_Schedule_${year}_${monthNames[monthIndex]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build calendar matrix
  const calendarCells = [];
  // Empty cells before start of month
  for (let i = 0; i < startDay; i++) {
    calendarCells.push(null);
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  return (
    <div className="space-y-6">
      
      {/* Calendar Control Header Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          {/* Month Selector Controls */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>{monthNames[monthIndex]} {year}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Compare your residency duty hours & moonlighting commitments
              </p>
            </div>
          </div>

          {/* Action & Export Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                Current Month
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleExportICS}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Export all moonlighting shifts to Apple Calendar or Google Calendar (.ics)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export .ics Calendar</span>
            </button>
          </div>

        </div>

        {/* Legend & Filter Toggles */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Status Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showApproved}
                onChange={(e) => setShowApproved(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[11px]">
                Approved ({applications.filter(a => a.status === 'Approved').length})
              </span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showReviewing}
                onChange={(e) => setShowReviewing(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
              />
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px]">
                Pending Review ({applications.filter(a => a.status === 'Credentialing Review').length})
              </span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
              />
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300 font-extrabold text-[11px]">
                Completed ({applications.filter(a => a.status === 'Completed').length})
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Monthly Calendar Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Day Header Row */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center font-extrabold text-xs text-slate-600 py-3">
          {daysOfWeek.map((day) => (
            <div key={day} className="tracking-wider uppercase text-[11px]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Matrix */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/50">
          {calendarCells.map((dayNum, idx) => {
            if (dayNum === null) {
              return (
                <div key={`empty-${idx}`} className="bg-slate-50/60 min-h-[120px] sm:min-h-[140px] p-2" />
              );
            }

            // Construct date string 'YYYY-MM-DD'
            const mStr = String(monthIndex + 1).padStart(2, '0');
            const dStr = String(dayNum).padStart(2, '0');
            const fullDateStr = `${year}-${mStr}-${dStr}`;

            const dayApps = appsByDate[fullDateStr] || [];
            const isToday =
              dayNum === 12 && monthIndex === 7 && year === 2026; // Highlight Aug 12, 2026

            return (
              <div
                key={fullDateStr}
                className={`bg-white min-h-[120px] sm:min-h-[140px] p-2 flex flex-col justify-between transition-colors hover:bg-slate-50/80 ${
                  isToday ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20' : ''
                }`}
              >
                {/* Date Header Number */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-blue-600 text-white font-black shadow-xs'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {dayApps.length > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {dayApps.length} {dayApps.length === 1 ? 'shift' : 'shifts'}
                    </span>
                  )}
                </div>

                {/* Day Shifts Blocks Container */}
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[160px] custom-scrollbar">
                  {dayApps.map((app) => {
                    const shift = app.shift;
                    const isApproved = app.status === 'Approved';
                    const isReviewing = app.status === 'Credentialing Review';
                    const isCompleted = app.status === 'Completed';

                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelectedAppModal(app)}
                        className={`p-2 rounded-xl border text-[11px] cursor-pointer transition-all hover:scale-[1.02] shadow-2xs ${
                          isApproved
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100'
                            : isReviewing
                            ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
                            : isCompleted
                            ? 'bg-blue-50 border-blue-300 text-blue-950 hover:bg-blue-100'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-extrabold text-[10px] leading-tight mb-0.5">
                          <span className="truncate max-w-[110px]" title={shift.hospitalName}>
                            {shift.hospitalName.replace(' Medical Center', '').replace(' Urgent Care', '')}
                          </span>
                          <span className="font-black text-slate-900">${shift.totalPay}</span>
                        </div>

                        <div className="font-bold text-[11px] truncate leading-tight text-slate-900 mb-1" title={shift.title}>
                          {shift.title}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-medium pt-0.5 border-t border-slate-200/60">
                          <span className="flex items-center space-x-0.5">
                            <Clock className="w-3 h-3 text-slate-500 inline shrink-0" />
                            <span>{format12HourTime(shift.startTime)}</span>
                          </span>

                          <span className={`px-1.5 py-0.2 rounded font-extrabold text-[9px] ${
                            isApproved
                              ? 'bg-emerald-200 text-emerald-900'
                              : isReviewing
                              ? 'bg-amber-200 text-amber-900'
                              : isCompleted
                              ? 'bg-blue-200 text-blue-900'
                              : 'bg-slate-200 text-slate-800'
                          }`}>
                            {isApproved ? 'Approved' : isReviewing ? 'Pending' : isCompleted ? 'Completed' : app.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* SHIFT DETAILS CLICK POPUP MODAL */}
      {selectedAppModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                    {selectedAppModal.shift.specialty}
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md border ${
                    selectedAppModal.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : selectedAppModal.status === 'Credentialing Review'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : selectedAppModal.status === 'Completed'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {selectedAppModal.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  {selectedAppModal.shift.title}
                </h3>

                <p className="text-xs text-slate-600 font-semibold flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{selectedAppModal.shift.hospitalName}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedAppModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time & Payout Details Grid */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Scheduled Time
                </span>
                <p className="font-extrabold text-slate-900 text-sm flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{format12HourTime(selectedAppModal.shift.startTime)} – {format12HourTime(selectedAppModal.shift.endTime)}</span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {selectedAppModal.shift.date} ({selectedAppModal.shift.durationHours} Hours)
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Total Compensation
                </span>
                <p className="font-black text-emerald-600 text-lg">
                  ${selectedAppModal.shift.totalPay}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  ${selectedAppModal.shift.hourlyRate}/hour rate
                </p>
              </div>
            </div>

            {/* Address / Location */}
            <div className="flex items-start space-x-2 text-xs text-slate-600 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Hospital Facility Location</span>
                <span>{selectedAppModal.shift.facilityLocation}</span>
              </div>
            </div>

            {/* Passport Share Token */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>Passport Share Token:</span>
              <code className="text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold">
                {selectedAppModal.passportShareToken}
              </code>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 gap-3">
              <button
                onClick={() => {
                  onOpenChat(selectedAppModal);
                  setSelectedAppModal(null);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat with Hospital MSO</span>
              </button>

              {selectedAppModal.status === 'Approved' && onMarkCompleted && (
                <button
                  onClick={() => {
                    onMarkCompleted(selectedAppModal.id);
                    setSelectedAppModal(null);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Completed</span>
                </button>
              )}

              <button
                onClick={() => setSelectedAppModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
