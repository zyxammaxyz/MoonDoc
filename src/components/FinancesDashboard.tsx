import React, { useState } from 'react';
import { Application, ResidentProfile } from '../types';
import {
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Download,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Receipt,
  Search
} from 'lucide-react';

interface FinancesDashboardProps {
  applications: Application[];
  profile: ResidentProfile;
}

export const FinancesDashboard: React.FC<FinancesDashboardProps> = ({ applications, profile }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterHospital, setFilterHospital] = useState<string>('all');

  // Filter approved or completed shifts
  const approvedApplications = applications.filter(
    (app) => app.status === 'Approved' || app.status === 'Completed'
  );

  // Filter by query and selection
  const filteredShifts = approvedApplications.filter((app) => {
    const matchesSearch =
      app.shift.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.shift.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.shift.specialty.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesHospital =
      filterHospital === 'all' || app.shift.hospitalName === filterHospital;

    const shiftMonth = app.shift.date.substring(0, 7); // e.g. "2026-08"
    const matchesMonth = selectedMonth === 'all' || shiftMonth === selectedMonth;

    return matchesSearch && matchesHospital && matchesMonth;
  });

  // Financial Running Tallies
  const totalGrossEarnings = approvedApplications.reduce(
    (acc, app) => acc + app.shift.totalPay,
    0
  );

  const completedEarnings = approvedApplications
    .filter((app) => app.status === 'Completed')
    .reduce((acc, app) => acc + app.shift.totalPay, 0);

  const pendingPayouts = approvedApplications
    .filter((app) => app.status === 'Approved')
    .reduce((acc, app) => acc + app.shift.totalPay, 0);

  const totalShiftsWorked = approvedApplications.length;

  const averageHourlyRate =
    approvedApplications.length > 0
      ? Math.round(
          approvedApplications.reduce((acc, app) => acc + app.shift.hourlyRate, 0) /
            approvedApplications.length
        )
      : 0;

  // Extract unique hospital names for filter dropdown
  const uniqueHospitals = Array.from(
    new Set(approvedApplications.map((app) => app.shift.hospitalName))
  );

  // Extract unique months for filter dropdown
  const uniqueMonths = Array.from(
    new Set(approvedApplications.map((app) => app.shift.date.substring(0, 7)))
  ).sort().reverse();

  // Export to CSV helper
  const handleExportCSV = () => {
    const headers = ['Date', 'Hospital Institution', 'Role / Title', 'Specialty', 'Hours', 'Hourly Rate ($)', 'Total Pay ($)', 'Status'];
    const rows = filteredShifts.map((app) => [
      app.shift.date,
      `"${app.shift.hospitalName}"`,
      `"${app.shift.title}"`,
      app.shift.specialty,
      app.shift.durationHours,
      app.shift.hourlyRate,
      app.shift.totalPay,
      app.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MoonDoc_Earnings_Statement_${profile.lastName}_2026.csv`);
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
                Financial Ledger
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Dr. {profile.firstName} {profile.lastName} • {profile.residencyProgram.split('/')[0]}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900 mt-1 tracking-tight">
              Moonlighting Earnings & Finances
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Verified payouts, accepted rates, and running totals across partner medical centers.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Earnings CSV</span>
            </button>
          </div>
        </div>

        {/* Running Tallies Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Total Approved Tally</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-900 tracking-tight">
              ${totalGrossEarnings.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-emerald-600 inline" />
              <span>{totalShiftsWorked} total approved shifts</span>
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Completed & Deposited</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              ${completedEarnings.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500">
              Direct deposit processed to bank
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Scheduled / Upcoming</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-700 tracking-tight">
              ${pendingPayouts.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500">
              Approved shifts awaiting shift date
            </p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Avg. Hourly Rate</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ${averageHourlyRate}<span className="text-xs text-slate-500 font-normal">/hr</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Across Internal & Urgent Care shifts
            </p>
          </div>

        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search institution, specialty, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-600 transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
          
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Hospital:</span>
            <select
              value={filterHospital}
              onChange={(e) => setFilterHospital(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:border-blue-600"
            >
              <option value="all">All Institutions</option>
              {uniqueHospitals.map((hosp) => (
                <option key={hosp} value={hosp}>
                  {hosp}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:border-blue-600"
            >
              <option value="all">All Months</option>
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Finances Shift Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Shift Earnings Ledger ({filteredShifts.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Running Total: <strong className="text-blue-900">${filteredShifts.reduce((acc, a) => acc + a.shift.totalPay, 0).toLocaleString()}</strong>
          </span>
        </div>

        {filteredShifts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800">No Approved Moonlighting Shifts Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once your applications get approved by partner hospital medical staff offices, they will automatically appear here with exact pay statements.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Shift Date</th>
                  <th className="px-6 py-3.5">Institution / Facility</th>
                  <th className="px-6 py-3.5">Role & Specialty</th>
                  <th className="px-6 py-3.5">Shift Hours</th>
                  <th className="px-6 py-3.5">Pay Rate</th>
                  <th className="px-6 py-3.5 text-right">Gross Total Pay</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredShifts.map((app) => {
                  const isCompleted = app.status === 'Completed';
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
                          <div>
                            <span className="text-slate-900 font-bold block">{app.shift.hospitalName}</span>
                            <span className="text-[10px] text-slate-500">{app.shift.department}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-slate-900 font-semibold block">{app.shift.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 inline-block mt-0.5">
                          {app.shift.specialty}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-800 font-semibold">{app.shift.durationHours} hrs</span>
                        <span className="text-[10px] text-slate-500 block">
                          {app.shift.startTime} - {app.shift.endTime}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                        ${app.shift.hourlyRate}/hr
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right font-black text-blue-900 text-sm">
                        ${app.shift.totalPay.toLocaleString()}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isCompleted ? 'Paid (Direct Deposit)' : 'Approved for Shift'}</span>
                        </span>
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
