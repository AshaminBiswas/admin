import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  X,
  FileText,
  Mail,
  Paperclip,
  Clock,
  MessageSquare,
  Building,
  User,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Shield,
  Send,
  Eye,
  Tag,
  ChevronDown,
  RefreshCw,
  Edit2,
  Check,
} from 'lucide-react';
import {
  PoSubmissionDetail,
  PoStatus,
  PoPriority,
  PoClassification,
} from '../../types/poManagement';
import {
  getPoSubmissionById,
  updatePoStatus,
  updatePoPriority,
  assignPoSubmission,
  reclassifyPo,
  updateCustomerPoNumber,
  addInternalNote,
} from '../../api/poManagementService';
import { fetchAdminApi, API_BASE_URL } from '../../api/adminApi';

function getAttachmentUrl(storageUrl?: string): string {
  if (!storageUrl) return '#';
  if (storageUrl.startsWith('http://') || storageUrl.startsWith('https://') || storageUrl.startsWith('data:')) {
    return storageUrl;
  }
  const cleanPath = storageUrl.replace(/^\/api\/v1/, '');
  const baseServer = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${baseServer}/api/v1${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}${tokenParam}`;
}

interface PODossierModalProps {
  poId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export function PODossierModal({ poId, onClose, onUpdated }: PODossierModalProps) {
  const [po, setPo] = useState<PoSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'email' | 'attachments' | 'timeline' | 'notes'>('overview');
  const [htmlViewMode, setHtmlViewMode] = useState<'html' | 'text'>('html');

  // Action states
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusComment, setStatusComment] = useState('');
  const [showStatusModal, setShowStatusModal] = useState<PoStatus | null>(null);

  const [editingPoNumber, setEditingPoNumber] = useState(false);
  const [customPoNoInput, setCustomPoNoInput] = useState('');
  const [savingPoNumber, setSavingPoNumber] = useState(false);

  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<{ url: string; title: string; type: string } | null>(null);

  useEffect(() => {
    loadData();
    loadStaff();
  }, [poId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPoSubmissionById(poId);
      setPo(data);
      setCustomPoNoInput(data.customerPoNumber || '');
    } catch (err: any) {
      console.error('Failed to load PO details:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await fetchAdminApi<any[]>('/users?role=admin,staff,super_admin,manager&limit=50');
      if (res.success && res.data) {
        setStaffList(
          res.data.map((u: any) => ({
            id: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            email: u.email,
          }))
        );
      }
    } catch {
      // Ignore
    }
  };

  const handleStatusChange = async (newStatus: PoStatus) => {
    if (!po) return;
    try {
      setUpdatingStatus(true);
      await updatePoStatus(po.id, newStatus, statusComment.trim() || undefined);
      setShowStatusModal(null);
      setStatusComment('');
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: PoPriority) => {
    if (!po) return;
    try {
      await updatePoPriority(po.id, newPriority);
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    }
  };

  const handleClassificationChange = async (newClass: PoClassification) => {
    if (!po) return;
    if (!confirm(`Are you sure you want to reclassify this record to ${newClass}?`)) return;
    try {
      await reclassifyPo(po.id, newClass);
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to reclassify');
    }
  };

  const handleAssignStaff = async (staffId: string) => {
    if (!po) return;
    try {
      await assignPoSubmission(po.id, staffId || null);
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to assign');
    }
  };

  const handleSaveCustomerPoNumber = async () => {
    if (!po) return;
    try {
      setSavingPoNumber(true);
      await updateCustomerPoNumber(po.id, customPoNoInput);
      setEditingPoNumber(false);
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to save customer PO #');
    } finally {
      setSavingPoNumber(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!po || !newNote.trim()) return;
    try {
      setSavingNote(true);
      await addInternalNote(po.id, newNote.trim());
      setNewNote('');
      await loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <RefreshCw className="animate-spin text-[#8B5CF6] mx-auto" size={32} />
          <p className="text-sm font-semibold text-slate-700 dark:text-[#E4E4E7]">Loading PO Dossier...</p>
        </div>
      </div>
    );
  }

  if (!po) return null;

  const originalEmail = po.emails?.[0];
  const threadedReplies = po.emails?.slice(1) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#18181B]/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-[#FAFAFA] tracking-tight font-mono">
                {po.poSubmissionId || 'GENERAL INQUIRY'}
              </span>

              {/* Classification Pill */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  po.classification === 'PO_DETECTED'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : po.classification === 'POSSIBLE_PO'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                }`}
              >
                {po.classification.replace('_', ' ')}
              </span>

              {/* Priority Pill */}
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                  po.priority === 'URGENT'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse border border-rose-500/40'
                    : po.priority === 'HIGH'
                    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                    : po.priority === 'MEDIUM'
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-500/15 text-slate-500'
                }`}
              >
                {po.priority} PRIORITY
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#A1A1AA]">
              <span>Customer PO #:</span>
              {editingPoNumber ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customPoNoInput}
                    onChange={(e) => setCustomPoNoInput(e.target.value)}
                    placeholder="e.g. ABC/PO/2026/01"
                    className="px-2 py-0.5 rounded bg-white dark:bg-[#09090B] border border-[#8B5CF6] text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomerPoNumber}
                    disabled={savingPoNumber}
                    className="p-1 rounded bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPoNumber(false)}
                    className="p-1 rounded bg-slate-200 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA]"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <span className="font-semibold text-slate-700 dark:text-[#E4E4E7] flex items-center gap-1">
                  {po.customerPoNumber || 'Not extracted'}
                  <button
                    type="button"
                    onClick={() => setEditingPoNumber(true)}
                    className="text-slate-400 hover:text-[#8B5CF6] p-0.5"
                    title="Edit Customer PO #"
                  >
                    <Edit2 size={11} />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="flex items-center gap-2">
            {/* Status Selector */}
            <div className="relative">
              <select
                value={po.status}
                onChange={(e) => setShowStatusModal(e.target.value as PoStatus)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="NEW">🟢 NEW</option>
                <option value="UNDER_REVIEW">🟡 UNDER REVIEW</option>
                <option value="PROCESSING">🟣 PROCESSING</option>
                <option value="WAITING_FOR_CUSTOMER">🟠 WAITING FOR CUSTOMER</option>
                <option value="COMPLETED">✅ COMPLETED</option>
                <option value="ON_HOLD">⏸️ ON HOLD</option>
                <option value="CANCELLED">❌ CANCELLED</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 border-b border-slate-200 dark:border-[#27272A] bg-slate-100/50 dark:bg-[#09090B]/50 overflow-x-auto no-scrollbar gap-2">
          {[
            { id: 'overview', label: 'Overview & Metadata', icon: <FileText size={15} /> },
            { id: 'email', label: `Original Email & Thread (${po.emails?.length || 1})`, icon: <Mail size={15} /> },
            { id: 'attachments', label: `Attachments (${po.attachments?.length || 0})`, icon: <Paperclip size={15} /> },
            { id: 'timeline', label: `Timeline & Audit (${po.activityLogs?.length || 0})`, icon: <Clock size={15} /> },
            { id: 'notes', label: `Internal Notes (${po.internalNotes?.length || 0})`, icon: <MessageSquare size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-[#8B5CF6] text-[#8B5CF6] dark:text-[#A855F7]'
                  : 'border-transparent text-slate-500 dark:text-[#71717A] hover:text-slate-800 dark:hover:text-[#FAFAFA]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6">
          {/* TAB 1: OVERVIEW & METADATA */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Details Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Sender Information */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <User size={13} />
                    <span>Sender Profile</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {po.customerName || 'Anonymous Sender'}
                  </p>
                  <p className="text-xs text-[#8B5CF6] font-mono">{po.customerEmail}</p>
                  {po.companyName && (
                    <p className="text-xs text-slate-600 dark:text-[#A1A1AA] flex items-center gap-1.5 pt-1">
                      <Building size={12} /> {po.companyName}
                    </p>
                  )}
                  {po.customerPhone && (
                    <p className="text-xs text-slate-600 dark:text-[#A1A1AA] flex items-center gap-1.5">
                      <Phone size={12} /> {po.customerPhone}
                    </p>
                  )}
                </div>

                {/* Classification & Confidence */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Tag size={13} />
                    <span>Classification Engine</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-[#E4E4E7]">Confidence Score</span>
                    <span className="text-xs font-bold text-[#8B5CF6]">{Math.round(po.confidenceScore * 100)}%</span>
                  </div>
                  {/* Confidence Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-[#27272A] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#8B5CF6] h-full rounded-full transition-all"
                      style={{ width: `${Math.round(po.confidenceScore * 100)}%` }}
                    />
                  </div>
                  <div className="pt-2">
                    <label className="text-[11px] text-slate-500 dark:text-[#71717A] block mb-1">Override Classification:</label>
                    <select
                      value={po.classification}
                      onChange={(e) => handleClassificationChange(e.target.value as PoClassification)}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-[#FAFAFA]"
                    >
                      <option value="PO_DETECTED">PO DETECTED (High Confidence)</option>
                      <option value="POSSIBLE_PO">POSSIBLE PO (Needs Review)</option>
                      <option value="GENERAL_EMAIL">GENERAL EMAIL (Non-PO)</option>
                    </select>
                  </div>
                </div>

                {/* Operations & Assignment */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Shield size={13} />
                    <span>Assignment & Priority</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-[#71717A] block mb-1">Assigned Staff:</label>
                    <select
                      value={po.assignedUserId || ''}
                      onChange={(e) => handleAssignStaff(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-[#FAFAFA]"
                    >
                      <option value="">-- Unassigned --</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-1">
                    <label className="text-[11px] text-slate-500 dark:text-[#71717A] block mb-1">Change Priority:</label>
                    <select
                      value={po.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as PoPriority)}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-[#FAFAFA]"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">🚨 URGENT</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Subject & Preview Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Subject</span>
                  <span className="text-xs text-slate-500 dark:text-[#71717A] flex items-center gap-1">
                    <Calendar size={12} /> {new Date(po.receivedAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-[#FAFAFA]">{po.subject}</h3>
                {po.previewText && (
                  <p className="text-xs text-slate-600 dark:text-[#A1A1AA] leading-relaxed pt-1 border-t border-slate-200 dark:border-[#27272A]/60">
                    {po.previewText}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ORIGINAL EMAIL & THREAD */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              {/* Mode Switcher */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#27272A]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-[#E4E4E7]">View Format:</span>
                  <button
                    type="button"
                    onClick={() => setHtmlViewMode('html')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      htmlViewMode === 'html'
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA]'
                    }`}
                  >
                    HTML Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setHtmlViewMode('text')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      htmlViewMode === 'text'
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA]'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>

                <span className="text-xs text-slate-400 font-mono">
                  Message-ID: {originalEmail?.messageId?.slice(0, 32)}...
                </span>
              </div>

              {/* Email Envelope Header */}
              {originalEmail && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-1.5 text-xs">
                  <p>
                    <strong className="text-slate-500 dark:text-[#71717A]">From:</strong>{' '}
                    <span className="text-slate-900 dark:text-white font-medium">
                      {originalEmail.senderName ? `${originalEmail.senderName} <${originalEmail.senderEmail}>` : originalEmail.senderEmail}
                    </span>
                  </p>
                  <p>
                    <strong className="text-slate-500 dark:text-[#71717A]">To:</strong>{' '}
                    <span className="text-slate-700 dark:text-[#D4D4D8]">{originalEmail.recipientEmail}</span>
                  </p>
                  {originalEmail.cc && originalEmail.cc.length > 0 && (
                    <p>
                      <strong className="text-slate-500 dark:text-[#71717A]">CC:</strong>{' '}
                      <span className="text-slate-700 dark:text-[#D4D4D8]">{originalEmail.cc.join(', ')}</span>
                    </p>
                  )}
                  <p>
                    <strong className="text-slate-500 dark:text-[#71717A]">Date:</strong>{' '}
                    <span className="text-slate-700 dark:text-[#D4D4D8]">{new Date(originalEmail.receivedAt).toLocaleString()}</span>
                  </p>
                </div>
              )}

              {/* Rendered Email Content with Sanitization */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] overflow-x-auto min-h-[250px]">
                {htmlViewMode === 'html' && originalEmail?.htmlBody ? (
                  <div
                    className="prose dark:prose-invert max-w-none text-xs sm:text-sm"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(originalEmail.htmlBody),
                    }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800 dark:text-[#D4D4D8]">
                    {originalEmail?.plainTextBody || 'No text content available'}
                  </pre>
                )}
              </div>

              {/* Threaded Customer Replies Accordion */}
              {threadedReplies.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-[#27272A]">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Threaded Conversation Replies ({threadedReplies.length})
                  </h4>
                  {threadedReplies.map((reply, i) => (
                    <div
                      key={reply.id}
                      className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#09090B]/80 border border-slate-200 dark:border-[#27272A] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Reply #{i + 1} from {reply.senderEmail}
                        </span>
                        <span className="text-slate-400">{new Date(reply.receivedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-semibold text-[#8B5CF6]">{reply.subject}</p>
                      <div
                        className="prose dark:prose-invert max-w-none text-xs pt-2 border-t border-slate-200 dark:border-[#27272A]/50"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(reply.htmlBody || reply.plainTextBody || ''),
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              {po.attachments && po.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {po.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] flex items-center justify-between gap-3 hover:border-[#8B5CF6] transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                          <Paperclip size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 dark:text-[#FAFAFA] truncate" title={att.fileName}>
                            {att.fileName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-[#71717A]">
                            {(att.fileSize / 1024).toFixed(1)} KB • {att.fileType.split('/')[1] || 'FILE'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {att.storageUrl && (
                          <a
                            href={getAttachmentUrl(att.storageUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-slate-200 dark:bg-[#27272A] text-slate-700 dark:text-[#E4E4E7] hover:text-[#8B5CF6] transition-colors"
                            title="Preview / Open in New Tab"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <a
                          href={getAttachmentUrl(att.storageUrl)}
                          download={att.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#8B5CF6] text-white hover:bg-[#7C3AED] transition-colors"
                          title="Download File"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Paperclip className="mx-auto text-slate-300 dark:text-slate-600" size={36} />
                  <p className="text-sm font-semibold">No attachments found for this email.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TIMELINE & AUDIT */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-[#27272A]">
                {po.activityLogs && po.activityLogs.length > 0 ? (
                  po.activityLogs.map((log) => (
                    <div key={log.id} className="relative space-y-1">
                      {/* Node Dot */}
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#8B5CF6] border-2 border-white dark:border-[#18181B]" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-[#FAFAFA]">{log.title}</span>
                        <span className="text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-[#A1A1AA] leading-relaxed">{log.description}</p>
                      {log.performedByUser && (
                        <p className="text-[10px] text-slate-400">
                          By: {log.performedByUser.firstName} {log.performedByUser.lastName} ({log.performedByUser.email})
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No activity recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: INTERNAL NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-5">
              {/* Note Creator Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add an internal note (visible to staff only, never sent to customer)..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingNote || !newNote.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] disabled:opacity-50 transition-all"
                  >
                    <Send size={13} />
                    <span>{savingNote ? 'Adding...' : 'Post Internal Note'}</span>
                  </button>
                </div>
              </form>

              {/* Notes Feed */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-[#27272A]">
                {po.internalNotes && po.internalNotes.length > 0 ? (
                  po.internalNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {note.user ? `${note.user.firstName} ${note.user.lastName}` : 'Admin Staff'}
                        </span>
                        <span className="text-[11px] text-slate-400">{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-[#D4D4D8] whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No internal notes added yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Transition Comment Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Update Status to <span className="text-[#8B5CF6]">{showStatusModal}</span>
            </h3>
            <textarea
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              placeholder="Add an optional comment for this status change..."
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#8B5CF6]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(showStatusModal)}
                disabled={updatingStatus}
                className="px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED]"
              >
                {updatingStatus ? 'Updating...' : 'Confirm Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
