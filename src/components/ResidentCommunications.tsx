import React, { useState, useMemo } from 'react';
import {
  Application,
  HospitalFacility,
  ResidentProfile,
  ChatMessage,
  CredentialDocument
} from '../types';
import {
  MessageSquare,
  Send,
  Building2,
  Paperclip,
  CheckCircle2,
  FileText,
  Search,
  Check,
  Hospital,
  ShieldCheck,
  ArrowRight,
  Clock,
  Sparkles,
  User,
  ChevronRight,
  ExternalLink,
  Download,
  AlertCircle
} from 'lucide-react';

interface ResidentCommunicationsProps {
  applications: Application[];
  hospitals: HospitalFacility[];
  profile: ResidentProfile;
  onSendMessage: (
    appId: string,
    text: string,
    senderRole: 'resident' | 'hospital',
    senderName: string
  ) => void;
  onConnectSite: (hospital: HospitalFacility) => void;
  onNavigateToSites?: () => void;
}

export const ResidentCommunications: React.FC<ResidentCommunicationsProps> = ({
  applications,
  hospitals,
  profile,
  onSendMessage,
  onConnectSite,
  onNavigateToSites
}) => {
  const [selectedThreadKey, setSelectedThreadKey] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<'all' | 'connected' | 'applied'>('all');

  // Build the unified list of site conversation threads:
  // Each site that the resident has interacted with (via shift application or expressed interest)
  const conversationThreads = useMemo(() => {
    const threadMap = new Map<
      string,
      {
        siteKey: string;
        hospitalName: string;
        hospitalId?: string;
        hospitalFacility?: HospitalFacility;
        primaryApp: Application;
        allApps: Application[];
        allMessages: ChatMessage[];
        lastMessage: ChatMessage | null;
        isExpressedInterestOnly: boolean;
        shiftCount: number;
      }
    >();

    // 1. Group all applications by hospital name/id
    applications.forEach((app) => {
      const siteKey = app.shift.hospitalName;
      const matchedFacility = hospitals.find(
        (h) => h.name.toLowerCase() === app.shift.hospitalName.toLowerCase() || h.id === app.shift.hospitalId
      );

      if (!threadMap.has(siteKey)) {
        threadMap.set(siteKey, {
          siteKey,
          hospitalName: app.shift.hospitalName,
          hospitalId: app.shift.hospitalId,
          hospitalFacility: matchedFacility,
          primaryApp: app,
          allApps: [app],
          allMessages: [...(app.messages || [])],
          lastMessage: null,
          isExpressedInterestOnly: app.shift.id.startsWith('shift_pool_'),
          shiftCount: app.shift.id.startsWith('shift_pool_') ? 0 : 1
        });
      } else {
        const existing = threadMap.get(siteKey)!;
        existing.allApps.push(app);
        if (!app.shift.id.startsWith('shift_pool_')) {
          existing.shiftCount += 1;
          existing.isExpressedInterestOnly = false;
        }
        // Collect messages
        if (app.messages && app.messages.length > 0) {
          app.messages.forEach((msg) => {
            if (!existing.allMessages.some((m) => m.id === msg.id)) {
              existing.allMessages.push(msg);
            }
          });
        }
      }
    });

    const threads = Array.from(threadMap.values()).map((thread) => {
      // Find latest message
      const msgs = thread.allMessages;
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      return {
        ...thread,
        lastMessage: lastMsg
      };
    });

    return threads;
  }, [applications, hospitals]);

  // Filtered threads by search and tab filter
  const filteredThreads = useMemo(() => {
    return conversationThreads.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.hospitalName.toLowerCase().includes(q);
        const matchesMsg = t.allMessages.some((m) => m.text.toLowerCase().includes(q));
        if (!matchesName && !matchesMsg) return false;
      }

      if (siteFilter === 'connected' && !t.isExpressedInterestOnly) return false;
      if (siteFilter === 'applied' && t.shiftCount === 0) return false;

      return true;
    });
  }, [conversationThreads, searchQuery, siteFilter]);

  // Active Thread Selection
  const activeThread = useMemo(() => {
    if (selectedThreadKey) {
      const found = conversationThreads.find((t) => t.siteKey === selectedThreadKey);
      if (found) return found;
    }
    return filteredThreads[0] || conversationThreads[0] || null;
  }, [conversationThreads, filteredThreads, selectedThreadKey]);

  // Handle Sending a Text Message or Document to the active site thread
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeThread) return;

    if (!messageInput.trim() && !selectedDocId) return;

    let textToSend = messageInput.trim();
    if (selectedDocId) {
      const attachedDoc = profile.documents.find((d) => d.id === selectedDocId);
      if (attachedDoc) {
        const docBadge = `[Attached Document: ${attachedDoc.name} (${attachedDoc.docNumber || 'Verified Doc'})]`;
        textToSend = textToSend ? `${textToSend}\n\n📎 ${docBadge}` : `📎 ${docBadge}`;
      }
    }

    if (!textToSend) return;

    onSendMessage(
      activeThread.primaryApp.id,
      textToSend,
      'resident',
      `Dr. ${profile.firstName} ${profile.lastName}`
    );

    setMessageInput('');
    setSelectedDocId('');
    setShowDocPicker(false);
  };

  // Quick prompt presets for resident
  const quickPrompts = [
    'Here are my updated credential documents for your MSO review. 📄',
    'Where should I report for orientation on arrival? 📍',
    'Is physician parking validated in the main garage? 🚗',
    'Can you confirm my EMR / EPIC credentials login? 💻'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-32">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-bold">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Site Communication & Document Exchange</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Direct Messaging with Hospital MSO Teams
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Message and transmit verified credential documents directly to the Medical Staff Offices (MSO) and clinical coordinators at sites you have expressed interest in or applied to.
          </p>
        </div>

        {onNavigateToSites && (
          <button
            onClick={onNavigateToSites}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition-all shrink-0 cursor-pointer self-start md:self-auto"
          >
            <Hospital className="w-4 h-4" />
            <span>Explore More Affiliated Sites</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Dual-Pane Inbox Layout */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* Left Column: Sites / Conversation Thread List (4 cols) */}
        <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50/60 flex flex-col">
          
          {/* List Header & Search */}
          <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Connected Hospital Sites</span>
              </span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                {conversationThreads.length} Sites
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search connected sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Threads List */}
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 max-h-[600px]">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">No Site Conversations Yet</h4>
                <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
                  Express interest in an affiliated site or apply for a shift to open a live chat thread with their MSO.
                </p>
                {onNavigateToSites && (
                  <button
                    onClick={onNavigateToSites}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                  >
                    View Affiliated Sites
                  </button>
                )}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = activeThread?.siteKey === thread.siteKey;
                const lastMsg = thread.lastMessage;
                const hospitalFacility = thread.hospitalFacility;

                return (
                  <div
                    key={thread.siteKey}
                    onClick={() => setSelectedThreadKey(thread.siteKey)}
                    className={`p-4 transition-all cursor-pointer flex items-start space-x-3 ${
                      isSelected
                        ? 'bg-blue-50/90 border-l-4 border-blue-600'
                        : 'hover:bg-slate-100/70 bg-white'
                    }`}
                  >
                    {/* Site Logo or Icon */}
                    <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {hospitalFacility?.logoUrl ? (
                        <img
                          src={hospitalFacility.logoUrl}
                          alt={thread.hospitalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Hospital className="w-5 h-5 text-blue-600" />
                      )}
                    </div>

                    {/* Site Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {thread.hospitalName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                          {lastMsg?.timestamp || 'Active'}
                        </span>
                      </div>

                      <p className="text-[11px] text-blue-700 font-semibold truncate flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-blue-600 inline shrink-0" />
                        <span>
                          {thread.isExpressedInterestOnly
                            ? 'Expressed Interest • Under Review'
                            : `${thread.shiftCount} Applied / Cleared Shift${thread.shiftCount > 1 ? 's' : ''}`}
                        </span>
                      </p>

                      <p className="text-[11px] text-slate-500 truncate mt-1">
                        {lastMsg
                          ? `${lastMsg.senderRole === 'resident' ? 'You: ' : 'MSO: '}${lastMsg.text}`
                          : 'Chat connected. Send a message or upload documents.'}
                      </p>

                      <div className="mt-2 flex items-center space-x-2">
                        <span className="px-2 py-0.2 text-[9px] font-extrabold rounded-md uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {hospitalFacility?.systemName || 'Partner System'}
                        </span>
                        {hospitalFacility?.emrSystem && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            EMR: {hospitalFacility.emrSystem}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation & Document Sender (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white">
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">Select a Site to Begin Messaging</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Choose a hospital network on the left or connect with new affiliated sites to chat directly with their Medical Staff Office.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              
              {/* Site Header Bar */}
              <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {activeThread.hospitalName}
                      </h3>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-extrabold rounded-md border border-blue-400/30">
                        {activeThread.hospitalFacility?.systemName || 'Affiliated Network'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Medical Staff Office (MSO) • Coordinator:{' '}
                      <span className="text-white font-semibold">
                        {activeThread.hospitalFacility?.contactPerson || 'Clinical Staffing Office'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl text-[10px] font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Passport Synced</span>
                  </span>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-50/60 min-h-[380px]">
                
                {/* System Welcome Message */}
                <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3.5 text-xs text-blue-900 flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      Direct Channel with {activeThread.hospitalName} MSO
                    </p>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      You are connected with the Medical Staff Office. Messages and attached documents sent here are directly delivered to their review coordinator.
                    </p>
                  </div>
                </div>

                {activeThread.allMessages.length > 0 ? (
                  activeThread.allMessages.map((msg) => {
                    const isResident = msg.senderRole === 'resident';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isResident ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isResident
                              ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-xs'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between gap-4 mb-1.5 pb-1 border-b ${
                              isResident ? 'border-blue-500 text-blue-100' : 'border-slate-100 text-slate-400'
                            }`}
                          >
                            <span className="font-bold text-[10px]">
                              {isResident ? `You (${msg.senderName})` : msg.senderName}
                            </span>
                            <span className="text-[9px]">{msg.timestamp}</span>
                          </div>

                          <div className="whitespace-pre-line text-xs font-medium">
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No message history yet. Introduce yourself or transmit a document below!
                  </div>
                )}
              </div>

              {/* Document Picker Drawer (if open) */}
              {showDocPicker && (
                <div className="p-3.5 bg-indigo-50/90 border-t border-indigo-100 animate-fade-in text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 flex items-center space-x-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Select Document from Credential Vault to Transmit:</span>
                    </span>
                    <button
                      onClick={() => setShowDocPicker(false)}
                      className="text-slate-400 hover:text-slate-600 text-[11px] font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pt-1">
                    {profile.documents
                      .filter((d) => d.status === 'verified')
                      .map((doc) => {
                        const isSelected = selectedDocId === doc.id;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => setSelectedDocId(isSelected ? '' : doc.id)}
                            className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <FileText
                                className={`w-4 h-4 shrink-0 ${
                                  isSelected ? 'text-white' : 'text-indigo-600'
                                }`}
                              />
                              <div className="truncate">
                                <p className="font-bold text-[11px] truncate">{doc.name}</p>
                                <p
                                  className={`text-[9px] truncate ${
                                    isSelected ? 'text-indigo-100' : 'text-slate-400'
                                  }`}
                                >
                                  {doc.docNumber || 'Verified Credential'}
                                </p>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-1" />}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Quick Prompts Bar */}
              <div className="p-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center space-x-2 overflow-x-auto text-[11px]">
                <span className="text-slate-400 font-bold shrink-0 text-[10px] uppercase">
                  Quick Messages:
                </span>
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSendMessage(
                        activeThread.primaryApp.id,
                        prompt,
                        'resident',
                        `Dr. ${profile.firstName} ${profile.lastName}`
                      );
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg shrink-0 font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Message Input & Document Transmit Form */}
              <form
                onSubmit={handleSend}
                className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
              >
                <button
                  type="button"
                  onClick={() => setShowDocPicker(!showDocPicker)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    showDocPicker || selectedDocId
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                  title="Attach verified document from Credential Vault"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={
                    selectedDocId
                      ? 'Add an optional note to your attached document...'
                      : `Message ${activeThread.hospitalName} MSO...`
                  }
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
                />

                <button
                  type="submit"
                  disabled={!messageInput.trim() && !selectedDocId}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
