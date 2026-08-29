import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
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
  X,
  Inbox,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  PoSubmissionDetail,
  PoStatus,
  PoPriority,
  PoClassification,
} from '../types/poManagement';
import {
  getPoSubmissionById,
  updatePoStatus,
  updatePoPriority,
  assignPoSubmission,
  reclassifyPo,
  updateCustomerPoNumber,
  addInternalNote,
  deletePoSubmission,
} from '../api/poManagementService';
import { fetchAdminApi, API_BASE_URL } from '../api/adminApi';

function getAttachmentUrl(storageUrl?: string): string {
  if (!storageUrl) return '#';
  if (storageUrl.startsWith('http://') || storageUrl.startsWith('https://') || storageUrl.startsWith('data:')) {
    return storageUrl;
  }
  const cleanPath = storageUrl.replace(/^\/api\/v1/, '');
  const baseServer = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${baseServer}/api/v1${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
}

interface PODetailPageProps {
  poId: string | null;
  onBack: () => void;
}

export function PODetailPage({ poId, onBack }: PODetailPageProps) {
  const [po, setPo] = useState<PoSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'email' | 'overview' | 'attachments' | 'timeline' | 'notes'>('email');
  const [htmlViewMode, setHtmlViewMode] = useState<'html' | 'text'>('html');

  // Status Modal & actions
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusComment, setStatusComment] = useState('');
  const [showStatusModal, setShowStatusModal] = useState<PoStatus | null>(null);

  // Customer PO # editing
  const [editingPoNumber, setEditingPoNumber] = useState(false);
  const [customPoNoInput, setCustomPoNoInput] = useState('');
  const [savingPoNumber, setSavingPoNumber] = useState(false);

  // Notes
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [deleting, setDeleting] = useState(false);

  const currentPoId = poId || (typeof window !== 'undefined' ? localStorage.getItem('prc_admin_selected_po_id') : null);

  useEffect(() => {
    if (currentPoId) {
      loadData(currentPoId);
      loadStaff();
    } else {
      setLoading(false);
    }
  }, [currentPoId]);

  const handleDeletePo = async () => {
    if (!po) return;
    const confirmMsg = `Are you sure you want to delete "${po.poSubmissionId || po.subject}"? This will permanently remove the record and all attached documents.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeleting(true);
      await deletePoSubmission(po.id);
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to delete PO submission');
      setDeleting(false);
    }
  };

  const loadData = async (id: string) => {
    try {
      setLoading(true);
      const data = await getPoSubmissionById(id);
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
      await loadData(po.id);
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
      await loadData(po.id);
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    }
  };

  const handleClassificationChange = async (newClass: PoClassification) => {
    if (!po) return;
    if (!confirm(`Are you sure you want to change classification to ${newClass}?`)) return;
    try {
      await reclassifyPo(po.id, newClass);
      await loadData(po.id);
    } catch (err: any) {
      alert(err.message || 'Failed to reclassify');
    }
  };

  const handleAssignStaff = async (staffId: string) => {
    if (!po) return;
    try {
      await assignPoSubmission(po.id, staffId || null);
      await loadData(po.id);
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
      await loadData(po.id);
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
      await loadData(po.id);
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-4 max-w-[1600px] mx-auto">
        <RefreshCw className="animate-spin text-[#8B5CF6] mx-auto" size={36} />
        <p className="text-sm font-semibold text-slate-700 dark:text-[#E4E4E7]">Loading PO Dossier Page...</p>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-16 text-center space-y-4 max-w-[1600px] mx-auto">
        <Inbox className="text-slate-400 mx-auto" size={48} />
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">PO Record Not Found</h3>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED]"
        >
          <ArrowLeft size={14} /> Back to PO Management
        </button>
      </div>
    );
  }

  const originalEmail = po.emails?.[0];
  const threadedReplies = po.emails?.slice(1) || [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-24">
      {/* Top Header & Breadcrumbs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#27272A]">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#A1A1AA] hover:text-[#8B5CF6] dark:hover:text-[#A855F7] transition-colors pb-1"
          >
            <ArrowLeft size={14} />
            <span>Back to All POs</span>
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {po.poSubmissionId || 'GENERAL INQUIRY'}
            </h1>

            {/* Classification Pill */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
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
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
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
        </div>

        {/* Quick Action Status Selector & Delete Button */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-[#A1A1AA] hidden sm:inline">Status:</span>
          <select
            value={po.status}
            onChange={(e) => setShowStatusModal(e.target.value as PoStatus)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] text-xs font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] shadow-xs"
          >
            <option value="NEW">🟢 NEW</option>
            <option value="UNDER_REVIEW">🟡 UNDER REVIEW</option>
            <option value="PROCESSING">🟣 PROCESSING</option>
            <option value="WAITING_FOR_CUSTOMER">🟠 WAITING FOR CUSTOMER</option>
            <option value="COMPLETED">✅ COMPLETED</option>
            <option value="ON_HOLD">⏸️ ON HOLD</option>
            <option value="CANCELLED">❌ CANCELLED</option>
          </select>

          <button
            type="button"
            onClick={handleDeletePo}
            disabled={deleting}
            title="Delete this PO submission"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors disabled:opacity-40"
          >
            <Trash2 size={14} className={deleting ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Delete PO</span>
          </button>
        </div>
      </div>

      {/* Top 3 Strategic Metric & Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sender Profile */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <User size={14} className="text-[#8B5CF6]" />
            <span>Sender Profile</span>
          </div>
          <p className="text-base font-extrabold text-slate-900 dark:text-white">
            {po.customerName || 'Anonymous Sender'}
          </p>
          <p className="text-xs text-[#8B5CF6] font-mono font-semibold">{po.customerEmail}</p>
          {po.companyName && (
            <p className="text-xs text-slate-600 dark:text-[#A1A1AA] flex items-center gap-1.5 pt-1">
              <Building size={13} /> {po.companyName}
            </p>
          )}
          {po.customerPhone && (
            <p className="text-xs text-slate-600 dark:text-[#A1A1AA] flex items-center gap-1.5">
              <Phone size={13} /> {po.customerPhone}
            </p>
          )}
        </div>

        {/* Customer PO Number & Classification */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Tag size={14} className="text-[#8B5CF6]" />
              <span>Customer PO Number</span>
            </div>
            <span className="text-xs text-slate-400">Confidence: {Math.round(po.confidenceScore * 100)}%</span>
          </div>

          {editingPoNumber ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPoNoInput}
                onChange={(e) => setCustomPoNoInput(e.target.value)}
                placeholder="e.g. ABC/PO/2026/01"
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-[#8B5CF6] text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveCustomerPoNumber}
                disabled={savingPoNumber}
                className="p-2 rounded-lg bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => setEditingPoNumber(false)}
                className="p-2 rounded-lg bg-slate-200 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA]"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-slate-800 dark:text-[#FAFAFA]">
                {po.customerPoNumber || <span className="text-slate-400 font-normal">Not extracted</span>}
              </span>
              <button
                type="button"
                onClick={() => setEditingPoNumber(true)}
                className="flex items-center gap-1 text-xs font-semibold text-[#8B5CF6] hover:underline"
              >
                <Edit2 size={12} /> Edit
              </button>
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Override Classification:</label>
            <select
              value={po.classification}
              onChange={(e) => handleClassificationChange(e.target.value as PoClassification)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-[#FAFAFA]"
            >
              <option value="PO_DETECTED">PO DETECTED (High Confidence)</option>
              <option value="POSSIBLE_PO">POSSIBLE PO (Needs Review)</option>
              <option value="GENERAL_EMAIL">GENERAL EMAIL (Non-PO)</option>
            </select>
          </div>
        </div>

        {/* Staff Assignment & Priority */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Shield size={14} className="text-[#8B5CF6]" />
            <span>Staff Assignment & Priority</span>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Assigned Staff Member:</label>
            <select
              value={po.assignedUserId || ''}
              onChange={(e) => handleAssignStaff(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-[#FAFAFA]"
            >
              <option value="">-- Unassigned --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Change Priority:</label>
            <select
              value={po.priority}
              onChange={(e) => handlePriorityChange(e.target.value as PoPriority)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-800 dark:text-[#FAFAFA]"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">🚨 URGENT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <div className="rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xs overflow-hidden">
        {/* Navigation Tab Bar */}
        <div className="flex items-center px-6 border-b border-slate-200 dark:border-[#27272A] bg-slate-50/50 dark:bg-[#09090B]/50 overflow-x-auto no-scrollbar gap-3">
          {[
            { id: 'email', label: `Original Email & Thread (${po.emails?.length || 1})`, icon: <Mail size={15} /> },
            { id: 'overview', label: 'Order Metadata & Subject', icon: <FileText size={15} /> },
            { id: 'attachments', label: `Attachments (${po.attachments?.length || 0})`, icon: <Paperclip size={15} /> },
            { id: 'timeline', label: `Timeline & Audit Log (${po.activityLogs?.length || 0})`, icon: <Clock size={15} /> },
            { id: 'notes', label: `Internal Notes (${po.internalNotes?.length || 0})`, icon: <MessageSquare size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-[#8B5CF6] text-[#8B5CF6] dark:text-[#A855F7]'
                  : 'border-transparent text-slate-500 dark:text-[#71717A] hover:text-slate-900 dark:hover:text-[#FAFAFA]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-6">
          {/* TAB 1: ORIGINAL EMAIL & THREAD */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              {/* Header Info & Format Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#27272A]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-[#E4E4E7]">Email Format:</span>
                  <button
                    type="button"
                    onClick={() => setHtmlViewMode('html')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      htmlViewMode === 'html'
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA]'
                    }`}
                  >
                    Sanitized HTML
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
                    Raw Plain Text
                  </button>
                </div>

                <span className="text-xs text-slate-400 font-mono">
                  Message-ID: {originalEmail?.messageId}
                </span>
              </div>

              {/* Envelope Header Box */}
              {originalEmail && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-1.5 text-xs">
                  <p>
                    <strong className="text-slate-500 dark:text-[#71717A]">From:</strong>{' '}
                    <span className="text-slate-900 dark:text-white font-semibold">
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
                    <strong className="text-slate-500 dark:text-[#71717A]">Subject:</strong>{' '}
                    <span className="text-slate-900 dark:text-white font-bold">{originalEmail.subject}</span>
                  </p>
                  <p>
                    <strong className="text-slate-500 dark:text-[#71717A]">Date:</strong>{' '}
                    <span className="text-slate-700 dark:text-[#D4D4D8]">{new Date(originalEmail.receivedAt).toLocaleString()}</span>
                  </p>
                </div>
              )}

              {/* Rendered Email Body */}
              <div className="p-6 rounded-2xl bg-slate-50/50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] min-h-[350px]">
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

              {/* Threaded Customer Replies */}
              {threadedReplies.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-[#27272A]">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Threaded Conversation History ({threadedReplies.length} Replies)
                  </h4>
                  {threadedReplies.map((reply, i) => (
                    <div
                      key={reply.id}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Reply #{i + 1} from {reply.senderEmail}
                        </span>
                        <span className="text-slate-400">{new Date(reply.receivedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-semibold text-[#8B5CF6]">{reply.subject}</p>
                      <div
                        className="prose dark:prose-invert max-w-none text-xs pt-3 border-t border-slate-200 dark:border-[#27272A]/50"
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

          {/* TAB 2: OVERVIEW & SUBJECT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Subject</span>
                  <span className="text-xs text-slate-500 dark:text-[#71717A] flex items-center gap-1">
                    <Calendar size={13} /> Received: {new Date(po.receivedAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-[#FAFAFA]">{po.subject}</h3>
                {po.previewText && (
                  <p className="text-xs text-slate-600 dark:text-[#A1A1AA] leading-relaxed pt-2 border-t border-slate-200 dark:border-[#27272A]/60">
                    {po.previewText}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              {po.attachments && po.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {po.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] flex items-center justify-between gap-3 hover:border-[#8B5CF6] transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-11 h-11 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                          <Paperclip size={20} />
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
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Paperclip className="mx-auto text-slate-300 dark:text-slate-600" size={40} />
                  <p className="text-sm font-semibold">No attachments found in this email.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TIMELINE & AUDIT */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 max-w-3xl">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-[#27272A]">
                {po.activityLogs && po.activityLogs.length > 0 ? (
                  po.activityLogs.map((log) => (
                    <div key={log.id} className="relative space-y-1">
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
            <div className="space-y-6 max-w-3xl">
              {/* Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add an internal staff note (never visible to customer)..."
                  rows={3}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#8B5CF6]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingNote || !newNote.trim()}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] disabled:opacity-50 transition-all"
                  >
                    <Send size={13} />
                    <span>{savingNote ? 'Posting...' : 'Post Internal Note'}</span>
                  </button>
                </div>
              </form>

              {/* Notes List */}
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

      {/* Status Modal */}
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
