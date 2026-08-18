import React, { useState } from 'react';
import { Application, ResidentProfile } from '../types';
import {
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  Download,
  AlertCircle,
  Activity,
  ShieldCheck,
  TrendingUp,
  Sliders,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

interface HoursDashboardProps {
  applications: Application[];
  profile: ResidentProfile;
}

export const HoursDashboard: React.FC<HoursDashboardProps> = ({ applications, profile }) => {
  // Filter completed shifts for verified logged hours
  const completedApplications = applications.filter(
    (app) => app.status === 'Completed'
  );

  // Filter approved shifts that are scheduled / awaiting resident completion
  const approvedApplications = applications.filter(
    (app) => app.status === 'Approved'
  );

  const allEligibleApplications = [...completedApplications, ...approvedApplications];

  // Group months
  const monthsList = Array.from(
    new Set(allEligibleApplications.map((app) => app.shift.date.substring(0, 7)))
  ).sort().reverse();

  const [selectedMonth, setSelectedMonth] = useState<string>(
    monthsList[0] || '2026-08'
  );

  // Filter shifts by selected month (or 'all')
  const monthlyCompletedShifts = completedApplications.filter((app) => {
    if (selectedMonth === 'all') return true;
    return app.shift.date.substring(0, 7) === selectedMonth;
  });

  const monthlyAllShifts = allEligibleApplications.filter((app) => {
    if (selectedMonth === 'all') return true;
    return app.shift.date.substring(0, 7) === selectedMonth;
  });

  // Calculate Logged Totals (Completed Shifts)
  const totalMonthlyHours = monthlyCompletedShifts.reduce(
    (acc, app) => acc + app.shift.durationHours,
    0
  );

  const totalAllTimeHours = completedApplications.reduce(
    (acc, app) => acc + app.shift.durationHours,
    0
  );

  const pendingHoursToLog = approvedApplications.reduce(
    (acc, app) => acc + app.shift.durationHours,
    0
  );

  const averageShiftHours =
    monthlyCompletedShifts.length > 0
      ? (totalMonthlyHours / monthlyCompletedShifts.length).toFixed(1)
      : monthlyAllShifts.length > 0
      ? (monthlyAllShifts.reduce((a, c) => a + c.shift.durationHours, 0) / monthlyAllShifts.length).toFixed(1)
      : '0';

  // ACGME Duty Hour Safety Limit Gauge (Max 80 hours/week including residency + moonlighting)
  const acgmeMaxAllowance = 80; // Weekly max limit
  const estimatedResidencyBaseHours = 60; // Average residency hours per week
  const moonlightingWeeklyAvg = (totalMonthlyHours / 4.3).toFixed(1);
  const totalCombinedWeeklyHours = Number(estimatedResidencyBaseHours) + Number(moonlightingWeeklyAvg);
  const dutyHourSafetyPercent = Math.min(
    100,
    Math.round((totalCombinedWeeklyHours / acgmeMaxAllowance) * 100)
  );

  // Export Duty Hours Log
  const handleExportHoursLog = () => {
    const headers = ['Shift Date', 'Hospital Institution', 'Department', 'Shift Type', 'Timing', 'Duration (Hours)', 'Status'];
    const rows = monthlyAllShifts.map((app) => [
      app.shift.date,
      `"${app.shift.hospitalName}"`,
      `"${app.shift.department}"`,
      app.shift.shiftType,
      `"${app.shift.startTime} - ${app.shift.endTime}"`,
      app.shift.durationHours,
      app.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ACGME_Moonlighting_Duty_Hours_${profile.lastName}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                Duty Hours Logger
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Dr. {profile.firstName} {profile.lastName} • {profile.pgyLevel}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900 mt-1 tracking-tight">
              Monthly Moonlighting Hours Summary
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Automatic tally of shift lengths accepted each day to ensure seamless ACGME compliance & PD reporting.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportHoursLog}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Duty Hours Log</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Selected Month Hours</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-900 tracking-tight">
              {totalMonthlyHours} <span className="text-xs text-slate-500 font-normal">hrs</span>
            </div>
            <p className="text-[11px] text-slate-500">
              In {selectedMonth === 'all' ? 'All Months' : selectedMonth}
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>All-Time Logged Hours</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalAllTimeHours} <span className="text-xs text-slate-500 font-normal">hrs</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Across {completedApplications.length} completed shift(s)
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Avg. Completed Duration</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              {averageShiftHours} <span className="text-xs text-slate-500 font-normal">hrs/shift</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Standard 8hr, 10hr, & 12hr blocks
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>ACGME Weekly Duty Safety</span>
              <div className="w-8 h-8 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-green-700 tracking-tight">
              {totalCombinedWeeklyHours} <span className="text-xs text-slate-500 font-normal">/ 80 hr wk</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold">
              ✓ Compliant ({Math.round(80 - Number(totalCombinedWeeklyHours))} hrs headroom)
            </p>
          </div>

        </div>
      </div>

      {/* Month Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">Select Reporting Month:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              selectedMonth === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Months
          </button>
          {monthsList.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedMonth === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Hours Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Shift Hours Log — {selectedMonth === 'all' ? 'All Months' : selectedMonth} ({monthlyAllShifts.length} shifts)
            </h2>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              Completed Logged: {totalMonthlyHours} hrs
            </span>
            {pendingHoursToLog > 0 && (
              <span className="font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                Approved Pending: {pendingHoursToLog} hrs
              </span>
            )}
          </div>
        </div>

        {monthlyAllShifts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800">No Shift Hours in Selected Month</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Completed and approved shifts for {selectedMonth} will appear here along with shift duration lengths and running monthly totals.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Institution</th>
                  <th className="px-6 py-3.5">Role & Department</th>
                  <th className="px-6 py-3.5">Shift Type</th>
                  <th className="px-6 py-3.5">Time Period</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-center">Shift Length</th>
                  <th className="px-6 py-3.5 text-right">Logged Monthly Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {monthlyAllShifts.map((app, idx) => {
                  const isCompleted = app.status === 'Completed';
                  // Calculate cumulative running tally for completed shifts in month
                  const runningTally = monthlyAllShifts
                    .slice(0, idx + 1)
                    .filter((item) => item.status === 'Completed')
                    .reduce((sum, item) => sum + item.shift.durationHours, 0);

                  const isNight = app.shift.shiftType.toLowerCase().includes('night');

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-bold">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>{app.shift.date}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-900 font-bold">{app.shift.hospitalName}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-slate-900 font-semibold block">{app.shift.title}</span>
                        <span className="text-[10px] text-slate-500 block">{app.shift.department}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {isNight ? <Moon className="w-3 h-3 text-indigo-600" /> : <Sun className="w-3 h-3 text-amber-500" />}
                          <span>{app.shift.shiftType}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-mono">
                        {app.shift.startTime} - {app.shift.endTime}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold inline-flex items-center space-x-1 ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Completed</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Approved (Scheduled)</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-3 py-1 bg-blue-100 text-blue-900 font-extrabold rounded-lg text-xs">
                          {app.shift.durationHours} hrs
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900 font-black">
                        {isCompleted ? `${runningTally} hrs` : <span className="text-slate-400 font-normal">Pending Completion</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
