import React, { useState } from 'react';
import { ResidentProfile, ResidentNotification } from '../types';
import { Stethoscope, MapPin, ShieldCheck, FileCheck, DollarSign, Clock, Building2, LogOut, Hospital, Bell, Sparkles, CheckCircle2, MessageSquare, X } from 'lucide-react';

interface HeaderProps {
  activeTab: 'map' | 'vault' | 'applications' | 'communications' | 'finances' | 'hours' | 'affiliated_sites' | 'hospital_preview';
  setActiveTab: (tab: 'map' | 'vault' | 'applications' | 'communications' | 'finances' | 'hours' | 'affiliated_sites' | 'hospital_preview') => void;
  profile: ResidentProfile;
  completionPercentage: number;
  appliedCount: number;
  approvedCount?: number;
  notifications?: ResidentNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onSelectNotificationShift?: (shiftId: string) => void;
  onLogout?: () => void;
  onSwitchToAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  profile,
  completionPercentage,
  appliedCount,
  approvedCount = 0,
  notifications = [],
  onMarkNotificationRead,
  onSelectNotificationShift,
  onLogout,
  onSwitchToAdmin,
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('map')}>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold tracking-tight text-blue-900">
                  Moon<span className="text-blue-600">Doc</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden xl:block">
                Physician Moonlighting and Document Vault
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto min-w-0">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'map'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <MapPin className={`w-4 h-4 ${activeTab === 'map' ? 'text-white' : 'text-amber-500'}`} />
              <span>Opportunity Map</span>
            </button>

            <button
              onClick={() => setActiveTab('affiliated_sites')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'affiliated_sites'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Hospital className={`w-4 h-4 ${activeTab === 'affiliated_sites' ? 'text-white' : 'text-blue-600'}`} />
              <span>Affiliated Sites</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 relative ${
                activeTab === 'vault'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'vault' ? 'text-white' : 'text-emerald-500'}`} />
              <span>Credential Vault</span>
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                  completionPercentage === 100
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {completionPercentage}%
              </span>
            </button>

            <button
              onClick={() => setActiveTab('hospital_preview')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'hospital_preview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Building2 className={`w-4 h-4 ${activeTab === 'hospital_preview' ? 'text-white' : 'text-sky-400'}`} />
              <span>Passport</span>
            </button>

            <button
              onClick={() => setActiveTab('applications')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'applications'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <FileCheck className={`w-4 h-4 ${activeTab === 'applications' ? 'text-white' : 'text-purple-500'}`} />
              <span>My Shifts</span>
              {appliedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-blue-600 text-white font-bold">
                  {appliedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('communications')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'communications'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <MessageSquare className={`w-4 h-4 ${activeTab === 'communications' ? 'text-white' : 'text-blue-500'}`} />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('finances')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'finances'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <DollarSign className={`w-4 h-4 ${activeTab === 'finances' ? 'text-white' : 'text-emerald-600'}`} />
              <span>Finances</span>
              {approvedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  {approvedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('hours')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'hours'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Clock className={`w-4 h-4 ${activeTab === 'hours' ? 'text-white' : 'text-indigo-600'}`} />
              <span>Hours Tracker</span>
            </button>
          </nav>

          {/* User Profile Summary, Notification Bell & Admin Toggle */}
          <div className="flex items-center space-x-2">
            
            {onSwitchToAdmin && (
              <button
                onClick={onSwitchToAdmin}
                className="hidden xl:flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-blue-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-800 shadow-xs cursor-pointer"
                title="Switch to Hospital Admin / MSO View"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>MSO Admin Portal</span>
              </button>
            )}

            {/* Profile Pill */}
            <div
              onClick={() => setActiveTab('vault')}
              className="flex items-center space-x-3 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl cursor-pointer transition-all duration-200 group"
            >
              <div className="text-right hidden xl:block">
                <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Dr. {profile.firstName} {profile.lastName}
                </span>
                <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                  {profile.residencyProgram.split('/')[0]}
                </p>
              </div>
            </div>

            {/* Resident Notification Bell Center (Positioned at far right before Return) */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                  unreadCount > 0
                    ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
                title="Connected Sites - New Job Notifications"
              >
                <Bell className="w-4 h-4 text-amber-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Drawer */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-extrabold tracking-wide uppercase">Connected Site Job Alerts</h3>
                    </div>
                    <button
                      onClick={() => setShowNotifDropdown(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">
                        <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
                        <p className="text-xs font-bold text-slate-700">No New Job Alerts Yet</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          When partner hospitals where you have worked or selected on the <strong className="text-slate-600">Sites</strong> tab publish new shifts, you'll receive instant alerts here!
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3.5 transition-colors ${
                            notif.read ? 'bg-white' : 'bg-amber-50/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${
                              notif.connectionReason === 'worked_before'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}>
                              {notif.connectionReason === 'worked_before' ? '⭐ Worked Here Before' : '🏥 Connected Site'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{notif.timestamp}</span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800 mt-1.5 leading-snug">
                            {notif.message}
                          </p>

                          <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-slate-100/80">
                            <span className="font-extrabold text-blue-600">${notif.hourlyRate}/hr (${notif.totalPay} total)</span>
                            
                            <div className="flex items-center space-x-2">
                              {!notif.read && onMarkNotificationRead && (
                                <button
                                  onClick={() => onMarkNotificationRead(notif.id)}
                                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                                >
                                  Mark read
                                </button>
                              )}
                              
                              {onSelectNotificationShift && (
                                <button
                                  onClick={() => {
                                    if (onMarkNotificationRead) onMarkNotificationRead(notif.id);
                                    onSelectNotificationShift(notif.shiftId);
                                    setShowNotifDropdown(false);
                                  }}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                                >
                                  View Shift & Apply
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Return / Log Out Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Return / Log out to Landing Page"
                className="p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* Compact Navigation Row (shown below the xl breakpoint, where the full nav would overflow) */}
        <div className="flex xl:hidden items-center justify-around py-2.5 border-t border-slate-200 text-xs overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'map' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <MapPin className={`w-3.5 h-3.5 ${activeTab === 'map' ? 'text-white' : 'text-amber-500'}`} />
            <span>Map</span>
          </button>
          <button
            onClick={() => setActiveTab('affiliated_sites')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'affiliated_sites' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <Hospital className={`w-3.5 h-3.5 ${activeTab === 'affiliated_sites' ? 'text-white' : 'text-blue-600'}`} />
            <span>Sites</span>
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'vault' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'vault' ? 'text-white' : 'text-emerald-500'}`} />
            <span>Vault ({completionPercentage}%)</span>
          </button>
          <button
            onClick={() => setActiveTab('hospital_preview')}
            className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'hospital_preview' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 ${activeTab === 'hospital_preview' ? 'text-white' : 'text-sky-400'}`} />
            <span>Passport</span>
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'applications' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <FileCheck className={`w-3.5 h-3.5 ${activeTab === 'applications' ? 'text-white' : 'text-purple-500'}`} />
            <span>Shifts ({appliedCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('communications')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'communications' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'communications' ? 'text-white' : 'text-blue-500'}`} />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('finances')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'finances' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <DollarSign className={`w-3.5 h-3.5 ${activeTab === 'finances' ? 'text-white' : 'text-emerald-600'}`} />
            <span>Finances</span>
          </button>
          <button
            onClick={() => setActiveTab('hours')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'hours' ? 'bg-blue-600 text-white' : 'text-slate-600'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${activeTab === 'hours' ? 'text-white' : 'text-indigo-600'}`} />
            <span>Hours</span>
          </button>
        </div>

      </div>

    </header>
  );
};

