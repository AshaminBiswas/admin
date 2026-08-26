import React, { useState, useEffect } from 'react';
import { Building2, X, AlertTriangle } from 'lucide-react';
import { inventoryApi } from '../../api/adminApi';
import type { Supplier } from '../../types/admin';

export interface SupplierModalProps {
  supplier?: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({ supplier, onClose, onSuccess }) => {
  const isEditing = !!supplier;
  const [name, setName] = useState<string>(supplier?.name || '');
  const [contactPerson, setContactPerson] = useState<string>(supplier?.contactPerson || '');
  const [phone, setPhone] = useState<string>(supplier?.phone || '');
  const [email, setEmail] = useState<string>(supplier?.email || '');
  const [address, setAddress] = useState<string>(supplier?.address || '');
  const [gstNumber, setGstNumber] = useState<string>(supplier?.gstNumber || '');
  const [isActive, setIsActive] = useState<boolean>(supplier ? supplier.isActive !== false : true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setContactPerson(supplier.contactPerson || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setGstNumber(supplier.gstNumber || '');
      setIsActive(supplier.isActive !== false);
    } else {
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setGstNumber('');
      setIsActive(true);
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (isEditing && supplier) {
        const res = await inventoryApi.updateSupplier(supplier.id, {
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          gstNumber: gstNumber.trim() || undefined,
          isActive,
        });
        if (res && (res as any).success !== false) {
          onSuccess();
        }
      } else {
        const res = await inventoryApi.createSupplier({
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          gstNumber: gstNumber.trim() || undefined,
          isActive,
        });

        if (res && (res as any).success !== false) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-[#27272A] animate-in fade-in zoom-in-95">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
                {isEditing ? 'Edit Supplier / Vendor Details' : 'Register New Supplier / Vendor'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEditing ? 'Update vendor profile, contact points, and GST information' : 'Add new procurement partner to directory'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Company / Vendor Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Hardware & Fasteners Pvt Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="e.g. Rajesh Sharma"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Email Address</label>
              <input
                type="email"
                placeholder="vendor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">GSTIN Number</label>
              <input
                type="text"
                placeholder="e.g. 07AAAAA0000A1Z5"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Registered Address / Depot</label>
            <textarea
              rows={2}
              placeholder="e.g. Plot 44, Naraina Industrial Area Phase 1, New Delhi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A]">
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-[#FAFAFA]">Vendor Active Status</span>
              <span className="text-[10px] text-slate-500">Enable or disable this vendor for new procurement orders</span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-[#8B5CF6]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-md shadow-[#8B5CF6]/25 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
