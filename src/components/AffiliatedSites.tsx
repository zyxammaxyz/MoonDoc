import React, { useState } from 'react';
import { HospitalFacility, Application, ResidentProfile, MoonlightingShift } from '../types';
import { LANDING_PREVIEW_HOSPITALS } from '../data/mockData';
import {
  Building2,
  MapPin,
  Search,
  Hospital,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';

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
  // When a site has specific jobs posted, each job gets its own "Apply"
  // entry point (opens the shared Shift Detail Modal so the resident sees
  // that exact job's document requirements) instead of one generic
  // "Connect" button for the whole site.
  onViewShift?: (shift: MoonlightingShift) => void;
}

// NOTE ON DATA SOURCE: this page intentionally renders the same fictional
// `LANDING_PREVIEW_HOSPITALS` list used on the public landing page's map
// preview instead of the `hospitals` prop. MoonCall does not have any live,
// onboarded partner sites yet, so this page previews the *kind* of network
// we're building toward without implying that any specific hospital below
// is a real, ready partner a resident can actually connect with today. The
// `hospitals`/`applications`/`shifts`/connect/chat props are kept in the
// interface so the call site in App.tsx doesn't need to change, but this
// preview-only page deliberately does not wire up real connect/chat
// functionality against fictional site IDs.
export const AffiliatedSites: React.FC<AffiliatedSitesProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystemFilter, setSelectedSystemFilter] = useState('all');

  const previewHospitals = LANDING_PREVIEW_HOSPITALS;

  // Filter hospitals
  const filteredHospitals = previewHospitals.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.systemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.emrSystem.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedSystemFilter === 'all') return matchesSearch;
    return matchesSearch && h.systemName === selectedSystemFilter;
  });

  // Extract unique health systems for filter
  const healthSystems = Array.from(new Set(previewHospitals.map((h) => h.systemName)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-200 text-xs font-bold">
            <Building2 className="w-4 h-4 text-blue-300" />
            <span>MoonCall Partner Network — Preview</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Affiliated Healthcare Sites & Hospitals
          </h1>

          <p className="text-sm text-blue-100/90 leading-relaxed">
            This page previews the kinds of hospital networks and clinic systems MoonCall is building toward — it is <strong>not a list of live partner sites</strong>. The names, contacts, and shift details below are fictional placeholders, not real institutions you can currently apply to or message.
          </p>

          <div className="pt-3 flex items-start space-x-2 bg-white/10 border border-white/15 rounded-2xl px-4 py-3">
            <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-100 leading-relaxed">
              <strong className="text-white">Nothing on this page is real yet.</strong> No hospital below has an active MoonCall partnership, and no shifts are actually posted. As real partner sites go live, they'll replace these previews and you'll be notified.
            </p>
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
            <option value="all">All Systems ({previewHospitals.length})</option>
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
          return (
            <div
              key={hospital.id}
              className="bg-white rounded-3xl border border-slate-200 flex flex-col justify-between p-6 shadow-sm"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      <Hospital className="w-6 h-6 text-slate-400" />
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {hospital.systemName}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 mt-1 leading-snug">
                        {hospital.name}
                      </h3>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-black whitespace-nowrap flex items-center gap-1">
                    Preview
                  </span>
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

                {/* Contact line -- deliberately labeled as a placeholder so
                    nobody mistakes it for a real MSO contact. */}
                <div className="text-xs text-slate-500 space-y-1 mb-2">
                  <p>
                    Contact on file:{' '}
                    <strong className="text-slate-800 font-bold">{hospital.contactPerson}</strong>
                  </p>
                </div>
              </div>

              {/* Card Footer -- static, non-interactive. There is no real
                  connect/chat flow against a fictional site ID. */}
              <div className="pt-4 border-t border-slate-100">
                <div className="w-full py-2.5 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border border-slate-200">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Preview Only — Not a Live Partner Site Yet</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Coming Soon placeholder -- same card footprint as the preview
            sites above, styled distinctly (dashed border, muted) so it
            reads as an open slot rather than another fake listing. */}
        <div className="rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-6 min-h-[280px] bg-slate-50/60">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="font-extrabold text-base text-slate-700 mb-1.5">
            New Opportunities Coming Soon
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
            We're actively onboarding real hospitals and clinics. Check back here as live partner sites and shifts go live.
          </p>
        </div>
      </div>

    </div>
  );
};
