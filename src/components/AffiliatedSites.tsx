import React, { useState } from 'react';
import { HospitalFacility, Application, ResidentProfile, MoonlightingShift } from '../types';
import {
  Building2,
  MapPin,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  Hospital,
  ArrowRight,
  UserCheck,
  Send,
  Check
} from 'lucide-react';
import { ApplicationChatModal } from './ApplicationChatModal';

interface AffiliatedSitesProps {
  hospitals: HospitalFacility[];
  applications: Application[];
  shifts: MoonlightingShift[];
  profile: ResidentProfile;
  onConnectSite: (hospital: HospitalFacility) => void;
  onSendMessage: (
    appId: string,
    text: string,
    senderRole: 'resident' | 'hospital',
    senderName: string
  ) => void;
}

export const AffiliatedSites: React.FC<AffiliatedSitesProps> = ({
  hospitals,
  applications,
  shifts,
  profile,
  onConnectSite,
  onSendMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystemFilter, setSelectedSystemFilter] = useState('all');
  const [activeChatApp, setActiveChatApp] = useState<Application | null>(null);

  // Filter hospitals
  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.systemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.emrSystem.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedSystemFilter === 'all') return matchesSearch;
    return matchesSearch && h.systemName === selectedSystemFilter;
  });

  // Extract unique health systems for filter
  const healthSystems = Array.from(new Set(hospitals.map((h) => h.systemName)));

  // Helper to find if resident is connected to a hospital
  const getExistingConnection = (hospitalId: string, hospitalName: string) => {
    return applications.find(
      (app) =>
        app.shift?.hospitalId === hospitalId ||
        app.shift?.hospitalName === hospitalName
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-200 text-xs font-bold">
            <Building2 className="w-4 h-4 text-blue-300" />
            <span>MoonDoc Partner Network</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Affiliated Healthcare Sites & Hospitals
          </h1>

          <p className="text-sm text-blue-100/90 leading-relaxed">
            Select partnered hospital networks and clinic systems where you are interested in future moonlighting opportunities. Expressing interest connects your <strong>MoonDoc Passport</strong> directly with that site's Medical Staff Office (MSO) under their candidate review list and opens direct live chat messaging.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-blue-200">
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Instant MSO Notification</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-300" />
              <span>Live Passport Document Sync</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <MessageSquare className="w-4 h-4 text-amber-300" />
              <span>Direct Physician-to-MSO Chat</span>
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by hospital name, city, EMR (e.g. Epic, Cerner)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
          />
        </div>

        {/* System Filter */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-bold text-slate-600 whitespace-nowrap">System:</span>
          <select
            value={selectedSystemFilter}
            onChange={(e) => setSelectedSystemFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-600"
          >
            <option value="all">All Systems ({hospitals.length})</option>
            {healthSystems.map((sys) => (
              <option key={sys} value={sys}>
                {sys}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Affiliated Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHospitals.map((hospital) => {
          const PRE_CLEARED_SITE_IDS = ['hosp_st_francis', 'hosp_exer_sm'];
          const isPreCleared = PRE_CLEARED_SITE_IDS.includes(hospital.id);
          const existingApp = getExistingConnection(hospital.id, hospital.name);
          const isConnected = !!existingApp;
          const siteShifts = shifts.filter((s) => s.hospitalId === hospital.id || s.hospitalName === hospital.name);

          return (
            <div
              key={hospital.id}
              className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between p-6 shadow-sm hover:shadow-md ${
                isPreCleared
                  ? 'border-blue-300 ring-2 ring-blue-500/10'
                  : isConnected
                  ? 'border-amber-300 ring-2 ring-amber-500/10'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {hospital.logoUrl ? (
                        <img
                          src={hospital.logoUrl}
                          alt={hospital.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Hospital className="w-6 h-6 text-blue-600" />
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {hospital.systemName}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 mt-1 leading-snug">
                        {hospital.name}
                      </h3>
                    </div>
                  </div>

                  {isPreCleared ? (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-[10px] font-black whitespace-nowrap flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-600" /> Pre-Cleared
                    </span>
                  ) : hospital.badge ? (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-extrabold whitespace-nowrap">
                      {hospital.badge}
                    </span>
                  ) : null}
                </div>

                {/* Location & EMR Metadata */}
                <div className="space-y-2 text-xs text-slate-600 mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{hospital.address}, {hospital.city}, {hospital.state}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">
                      EMR System: <strong className="text-slate-900 font-bold">{hospital.emrSystem}</strong>
                    </span>
                  </div>
                </div>

                {/* Contact Person & Active Shifts info */}
                <div className="text-xs text-slate-500 space-y-1 mb-6">
                  <p>
                    Medical Director / MSO Lead:{' '}
                    <strong className="text-slate-800 font-bold">{hospital.contactPerson}</strong>
                  </p>
                  <p className="text-[11px] text-blue-700 font-semibold flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>{siteShifts.length} active moonlighting shifts posted</span>
                  </p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                {isPreCleared ? (
                  <>
                    <div className="flex-1 px-3 py-2 bg-blue-50 text-blue-900 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 border border-blue-200">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Pre-Cleared • Ready for Shifts</span>
                    </div>

                    {existingApp && (
                      <button
                        onClick={() => setActiveChatApp(existingApp)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                        title="Open Live Chat with Site MSO"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    )}
                  </>
                ) : isConnected ? (
                  <>
                    <div className="flex-1 px-3 py-2 bg-amber-50 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 border border-amber-200">
                      <Check className="w-4 h-4 text-amber-700" />
                      <span>Connected & Under Review</span>
                    </div>

                    {existingApp && (
                      <button
                        onClick={() => setActiveChatApp(existingApp)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                        title="Open Live Chat with Site MSO"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onConnectSite(hospital);
                      setTimeout(() => {
                        const newApp = getExistingConnection(hospital.id, hospital.name);
                        if (newApp) setActiveChatApp(newApp);
                      }, 100);
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Connect & Express Interest 🤝</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Chat Modal if resident clicks Chat -- always re-derive the freshest
          Application from the live `applications` prop (by id) rather than
          the stale snapshot captured when the modal was opened, otherwise
          newly sent/received messages never show up until the modal is
          closed and reopened. */}
      {activeChatApp && (
        <ApplicationChatModal
          application={applications.find((a) => a.id === activeChatApp.id) || activeChatApp}
          onSendMessage={onSendMessage}
          onClose={() => setActiveChatApp(null)}
          initialRole="resident"
        />
      )}

    </div>
  );
};
