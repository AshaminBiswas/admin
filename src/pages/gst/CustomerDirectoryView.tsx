import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Edit, Check, X, ChevronLeft, ChevronRight,
  Building, MapPin, RefreshCw, UserPlus, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  searchGSTCustomers,
  createGSTCustomer,
  updateGSTCustomer,
  validateGSTIN,
} from '../../api/gstInvoiceService';
import { GSTCustomer, GSTAddress, INDIA_STATE_CODES } from '../../types/admin';

const EMPTY_ADDRESS: GSTAddress = {
  addr1: '', addr2: '', city: '', state: '', state_code: '', pincode: '',
};

const EMPTY_CUSTOMER: Omit<GSTCustomer, 'id' | 'created_at' | 'updated_at'> = {
  legal_name: '',
  trade_name: '',
  gstin: '',
  pan: '',
  email: '',
  phone: '',
  billing_address: { ...EMPTY_ADDRESS },
  shipping_address: undefined,
  is_active: true,
};

function AddressForm({
  label,
  address,
  onChange,
}: {
  label: string;
  address: GSTAddress;
  onChange: (addr: GSTAddress) => void;
}) {
  const handleStateChange = (stateName: string) => {
    const found = INDIA_STATE_CODES.find((s) => s.name === stateName);
    onChange({ ...address, state: stateName, state_code: found?.code || '' });
  };

  const inp = (
    field: keyof GSTAddress,
    placeholder: string,
    required?: boolean
  ) => (
    <input
      placeholder={placeholder}
      value={(address[field] as string) || ''}
      onChange={(e) => onChange({ ...address, [field]: e.target.value })}
      className="w-full px-2 py-1.5 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
    />
  );

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">{label}</p>
      {inp('addr1', 'Address Line 1 *', true)}
      {inp('addr2', 'Address Line 2 (optional)')}
      <div className="grid grid-cols-2 gap-2">
        {inp('city', 'City *', true)}
        {inp('pincode', 'Pincode *', true)}
      </div>
      <select
        value={address.state || ''}
        onChange={(e) => handleStateChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
      >
        <option value="">— Select State —</option>
        {INDIA_STATE_CODES.map((s) => (
          <option key={s.code} value={s.name}>
            {s.code} — {s.name}
          </option>
        ))}
      </select>
      <input
        readOnly
        value={address.state_code || ''}
        placeholder="State Code (auto)"
        className="w-full px-2 py-1.5 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#71717A] text-xs cursor-not-allowed"
      />
    </div>
  );
}

export function CustomerDirectoryView() {
  const [customers, setCustomers] = useState<GSTCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GSTCustomer | null>(null);
  const [form, setForm] = useState({ ...EMPTY_CUSTOMER });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchGSTCustomers(search, page, 20);
      setCustomers(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_CUSTOMER, billing_address: { ...EMPTY_ADDRESS }, shipping_address: undefined });
    setSameAsBilling(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (c: GSTCustomer) => {
    setEditing(c);
    setForm({
      legal_name: c.legal_name,
      trade_name: c.trade_name || '',
      gstin: c.gstin || '',
      pan: c.pan || '',
      email: c.email || '',
      phone: c.phone || '',
      billing_address: { ...c.billing_address },
      shipping_address: c.shipping_address ? { ...c.shipping_address } : undefined,
      is_active: c.is_active,
    });
    setSameAsBilling(!c.shipping_address);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.legal_name.trim()) { setFormError('Legal Name is required'); return; }
    if (form.gstin && !validateGSTIN(form.gstin)) { setFormError('Invalid GSTIN format'); return; }
    if (!form.billing_address.addr1.trim()) { setFormError('Billing address line 1 is required'); return; }
    if (!form.billing_address.city.trim()) { setFormError('Billing city is required'); return; }
    if (!form.billing_address.state.trim()) { setFormError('Billing state is required'); return; }
    if (!form.billing_address.pincode.trim()) { setFormError('Billing pincode is required'); return; }

    const payload = {
      ...form,
      gstin: form.gstin?.toUpperCase() || undefined,
      pan: form.pan?.toUpperCase() || undefined,
      shipping_address: sameAsBilling ? undefined : form.shipping_address,
    };

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateGSTCustomer(editing.id, payload);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createGSTCustomer(payload);
        setCustomers((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      }
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: GSTCustomer) => {
    try {
      const updated = await updateGSTCustomer(c.id, { is_active: !c.is_active });
      setCustomers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-[#FAFAFA]">GST Customer Directory</h2>
            <p className="text-xs text-[#A1A1AA]">{total} customers · Used for invoice billing</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="p-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#8B5CF6] hover:border-[#8B5CF6]/40 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] transition-colors"
          >
            <UserPlus size={14} /> Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, GSTIN, phone…"
          className="w-full pl-9 pr-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
        />
      </div>

      {/* Table */}
      <div className="rounded-tr-2xl rounded-bl-2xl border border-[#27272A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#18181B] border-b border-[#27272A]">
                {['Legal Name', 'Trade Name', 'GSTIN', 'Phone', 'State', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#71717A]">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Loading customers…
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#71717A]">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No customers found. Create your first GST customer.</p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#27272A]/50 hover:bg-[#18181B]/60 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] text-[10px] font-bold flex-shrink-0">
                          {c.legal_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-[#FAFAFA]">{c.legal_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[#A1A1AA]">{c.trade_name || '—'}</td>
                    <td className="px-3 py-3 font-mono text-[#8B5CF6]">{c.gstin || '—'}</td>
                    <td className="px-3 py-3 text-[#A1A1AA]">{c.phone || '—'}</td>
                    <td className="px-3 py-3 text-[#A1A1AA]">{c.billing_address?.state || '—'}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                          c.is_active
                            ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                            : 'bg-slate-500/15 text-[#71717A] hover:bg-slate-500/25'
                        }`}
                      >
                        {c.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-colors"
                        title="Edit customer"
                      >
                        <Edit size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#71717A]">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] disabled:opacity-40 hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] disabled:opacity-40 hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-[#27272A]">
              <h3 className="text-sm font-bold text-[#FAFAFA]">
                {editing ? 'Edit Customer' : 'Add GST Customer'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {formError}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                    Legal Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.legal_name}
                    onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))}
                    placeholder="Company Pvt Ltd"
                    className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Trade Name</label>
                  <input
                    value={form.trade_name || ''}
                    onChange={(e) => setForm((f) => ({ ...f, trade_name: e.target.value }))}
                    placeholder="Brand name (optional)"
                    className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">GSTIN</label>
                  <input
                    value={form.gstin || ''}
                    onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                    placeholder="27AAPFU0939F1ZV (optional for B2C)"
                    className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">PAN</label>
                  <input
                    value={form.pan || ''}
                    onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
                    placeholder="AAPFU0939F (optional)"
                    className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="accounts@company.com"
                    className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone || ''}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] bg-[#09090B] text-[#FAFAFA] text-xs focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#09090B] border border-[#27272A]">
                <AddressForm
                  label="Billing Address *"
                  address={form.billing_address}
                  onChange={(addr) => setForm((f) => ({ ...f, billing_address: addr }))}
                />
              </div>

              {/* Shipping Address */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#A1A1AA]">
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(e) => {
                      setSameAsBilling(e.target.checked);
                      if (e.target.checked) {
                        setForm((f) => ({ ...f, shipping_address: undefined }));
                      } else {
                        setForm((f) => ({ ...f, shipping_address: { ...EMPTY_ADDRESS } }));
                      }
                    }}
                    className="rounded accent-[#8B5CF6]"
                  />
                  Shipping address same as billing
                </label>
                {!sameAsBilling && form.shipping_address && (
                  <div className="mt-3 p-4 rounded-tr-xl rounded-bl-xl bg-[#09090B] border border-[#27272A]">
                    <AddressForm
                      label="Shipping Address"
                      address={form.shipping_address}
                      onChange={(addr) => setForm((f) => ({ ...f, shipping_address: addr }))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[#27272A]">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-tr-xl rounded-bl-xl border border-[#27272A] text-[#A1A1AA] text-xs font-semibold hover:border-[#8B5CF6]/40 hover:text-[#FAFAFA] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                {saving ? 'Saving…' : editing ? 'Update Customer' : 'Create Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
