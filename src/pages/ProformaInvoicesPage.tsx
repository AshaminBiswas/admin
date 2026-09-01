import React, { useState, useEffect } from 'react';
import {
  FileCheck, Plus, Search, Filter, RefreshCw, Printer, Download,
  Eye, Building2, MapPin, CheckCircle2, Clock, AlertCircle,
  FileText, ArrowRight, ShieldCheck, ChevronRight, Layers, Trash2, QrCode
} from 'lucide-react';
import { ProformaInvoice } from '../types/proforma';
import { useAdminAuth } from '../context/AdminAuthContext';
import { proformaService } from '../api/proformaService';
import { ProformaInvoiceCreateView } from './proforma/ProformaInvoiceCreateView';
import { ProformaInvoiceDetailView } from './proforma/ProformaInvoiceDetailView';
import { printProformaInvoice } from '../utils/proformaPdfGenerator';

type SubView = 'list' | 'create' | 'detail';

export function ProformaInvoicesPage() {
  const [subView, setSubView] = useState<SubView>('list');
  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<ProformaInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const { adminUser, setCurrentView } = useAdminAuth();
  const isSuperAdmin = Boolean(
    adminUser && (
      String(adminUser.role || '').toUpperCase() === 'SUPER_ADMIN' ||
      String(adminUser.role || '').toUpperCase() === 'SUPER-ADMIN' ||
      String(adminUser.role || '').toLowerCase() === 'super_admin' ||
      String(adminUser.role || '').toLowerCase() === 'superadmin' ||
      (adminUser as any).isSuperAdmin
    )
  );

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteInvoice = async (inv: ProformaInvoice) => {
    if (!isSuperAdmin) {
      alert('Only Super Administrators have permission to delete Proforma Invoices.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete / void Proforma Invoice ${inv.piNumber}?`
    );
    if (!confirmed) return;

    setDeletingId(inv.id);
    try {
      await proformaService.deleteProformaInvoice(inv.id);
      await loadInvoices();
    } catch (err: any) {
      console.error('Failed to delete PI:', err);
      alert(err.message || 'Failed to delete Proforma Invoice.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [facilityFilter, setFacilityFilter] = useState('ALL');

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await proformaService.listProformaInvoices({
        search: searchQuery || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setInvoices(res.data || []);
    } catch (err) {
      console.error('Failed to load proforma invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, facilityFilter]);

  const filteredInvoices = invoices.filter((inv) => {
    if (facilityFilter !== 'ALL' && inv.facilityCode !== facilityFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.piNumber.toLowerCase().includes(q) ||
      inv.companyName.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q)) ||
      (inv.poReference && inv.poReference.toLowerCase().includes(q))
    );
  });

  // KPI Calculations
  const totalCount = invoices.length;
  const totalValue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
  const totalAdvanceExpected = invoices.reduce((sum, inv) => sum + Number(inv.advancePayable || 0), 0);
  const activeCount = invoices.filter((inv) => inv.status === 'SENT' || inv.status === 'DRAFT').length;

  if (subView === 'create') {
    return (
      <ProformaInvoiceCreateView
        onBack={() => setSubView('list')}
        onSaved={(newPI) => {
          setSelectedInvoice(newPI);
          setSubView('detail');
          loadInvoices();
        }}
      />
    );
  }

  if (subView === 'detail' && selectedInvoice) {
    return (
      <ProformaInvoiceDetailView
        invoice={selectedInvoice}
        onBack={() => {
          setSelectedInvoice(null);
          setSubView('list');
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
              <FileCheck size={18} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Proforma Invoices (PI)</h1>
            <span className="text-[11px] font-mono font-bold bg-[#8B5CF6]/10 text-[#C4B5FD] px-2 py-0.5 rounded-full border border-[#8B5CF6]/20">
              Commercial Hub
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Generate and dispatch commercial Proforma Invoices with 2-facility origin routing, B2B customer auto-fill, and official PDF generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadInvoices}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            title="Refresh Invoices"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#8B5CF6]' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('qr-validator')}
            className="px-3.5 py-2 bg-[#18181B] border border-[#27272A] hover:border-violet-500 text-zinc-200 hover:text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            title="Scan or inspect document for tampering"
          >
            <QrCode size={15} className="text-violet-400" /> QR Scanner & Validator
          </button>

          <button
            type="button"
            onClick={() => setSubView('create')}
            className="px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-950/30 flex items-center gap-2 transition-all"
          >
            <Plus size={15} /> + Generate New Proforma Invoice
          </button>
        </div>
      </div>

      {/* ─── KPI METRICS ROW ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400">Total Proforma Invoices</span>
          <div className="text-xl font-extrabold text-white font-mono">{totalCount}</div>
          <span className="text-[10px] text-zinc-500 block">Issued commercial PIs</span>
        </div>

        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400">Total Proforma Value</span>
          <div className="text-xl font-extrabold text-purple-400 font-mono">
            ₹{totalValue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-zinc-500 block">Gross quote value with GST</span>
        </div>

        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400">Expected Advance Value</span>
          <div className="text-xl font-extrabold text-amber-400 font-mono">
            ₹{totalAdvanceExpected.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-zinc-500 block">Deposits to commence dispatch</span>
        </div>

        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400">Active Valid Documents</span>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{activeCount}</div>
          <span className="text-[10px] text-zinc-500 block">Under 30-day validity</span>
        </div>

      </div>

      {/* ─── FILTERS & SEARCH ROW ────────────────────────────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PI number, customer, GSTIN, PO ref..."
            className="w-full pl-9 pr-4 py-2 bg-[#27272A]/50 border border-[#27272A] focus:border-[#8B5CF6] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Facility Filter */}
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="px-3 py-2 bg-[#27272A]/50 border border-[#27272A] rounded-xl text-zinc-300 font-bold focus:outline-none"
          >
            <option value="ALL">All Facilities</option>
            <option value="DELHI_WORKS">Delhi HQ & Works (07)</option>
            <option value="MUMBAI_DEPOT">Western Depot (27)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#27272A]/50 border border-[#27272A] rounded-xl text-zinc-300 font-bold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SENT">Issued / Sent</option>
            <option value="DRAFT">Draft</option>
            <option value="CONVERTED">Converted to Order</option>
            <option value="EXPIRED">Expired</option>
          </select>

        </div>

      </div>

      {/* ─── INVOICES LIST TABLE ─────────────────────────────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-xs">
        
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-400 font-bold">Loading Proforma Invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText size={32} className="text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No Proforma Invoices Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Generate official proforma invoices for enterprise B2B customers with complete line items, tax breakdown, and PDF export.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubView('create')}
              className="mt-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Create First Proforma Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#121214] border-b border-[#27272A] text-[11px] font-bold text-zinc-400 uppercase">
                  <th className="p-3.5">PI Number</th>
                  <th className="p-3.5">Customer & Entity</th>
                  <th className="p-3.5">Origin Facility</th>
                  <th className="p-3.5 text-right">Grand Total (₹)</th>
                  <th className="p-3.5 text-right">Advance Required</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5">Issue Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#27272A]/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#8B5CF6]">{inv.piNumber}</span>
                      </div>
                      {inv.poReference && (
                        <span className="text-[10px] text-zinc-500 font-sans block">
                          PO: {inv.poReference}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-white">{inv.companyName || inv.customerName}</div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                        <span>{inv.customerName}</span>
                        {inv.customerGstin && (
                          <span className="font-mono text-[9.5px] text-zinc-500">
                            GST: {inv.customerGstin}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="text-xs font-bold text-zinc-300 block">
                        {inv.facility?.name || (inv.facilityCode === 'DELHI_WORKS' ? 'Delhi HQ Works' : 'Western Depot')}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        State: {inv.facility?.stateCode || '07'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                      ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="p-3.5 text-right font-mono text-amber-400 font-bold">
                      ₹{Number(inv.advancePayable || 0).toLocaleString('en-IN')}
                      <span className="text-[10px] text-zinc-500 block font-sans">
                        ({inv.advancePercentage || 30}%)
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                        {inv.status || 'SENT'}
                      </span>
                    </td>

                    <td className="p-3.5 text-zinc-400 text-[11px]">
                      {new Date(inv.issueDate || inv.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setSubView('detail');
                          }}
                          className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 hover:text-white rounded-lg transition-all"
                          title="View PI Dossier"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => proformaService.downloadProformaPdf(inv.id, inv.piNumber)}
                          className="p-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 hover:text-white rounded-lg transition-all"
                          title="Download Official Black & White PDF"
                        >
                          <Download size={14} />
                        </button>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv)}
                            disabled={deletingId === inv.id}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg transition-all disabled:opacity-50"
                            title="Delete / Void PI (Super Admin Only)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
