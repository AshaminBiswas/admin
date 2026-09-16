import React, { useState } from 'react';
import { Warehouse, X } from 'lucide-react';
import { inventoryApi } from '../../api/adminApi';
import type { Branch } from '../../types/admin';

export interface BranchModalProps {
  branch?: Branch | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({ branch, onClose, onSuccess }) => {
  const isEditing = !!branch;
  const [name, setName] = useState<string>(branch?.name || '');
  const [code, setCode] = useState<string>(branch?.code || '');
  const [city, setCity] = useState<string>(branch?.city || '');
  const [state, setState] = useState<string>(branch?.state || '');
  const [address, setAddress] = useState<string>(branch?.address || '');
  const [isActive, setIsActive] = useState<boolean>(branch ? branch.isActive : true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Facility name and code are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (isEditing && branch) {
        const res = await inventoryApi.updateBranch(branch.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          address: address.trim() || undefined,
          isActive,
        });
        if (res.success) {
          onSuccess();
        }
      } else {
        const res = await inventoryApi.createBranch({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          address: address.trim() || undefined,
          isActive,
        });
        if (res.success) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save branch facility');
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
              <Warehouse className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#FAFAFA]">
              {isEditing ? 'Edit Fulfillment Facility' : 'Register New Branch Facility'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Facility Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Delhi Central Depot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Facility Code (3-4 Letters) *</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. DEL, KOL"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">City</label>
              <input
                type="text"
                placeholder="e.g. New Delhi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">State</label>
              <input
                type="text"
                placeholder="e.g. Delhi"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-medium text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA] mb-1">Full Physical Address</label>
            <textarea
              rows={2}
              placeholder="e.g. Plot 42, Okhla Industrial Area Phase III, New Delhi 110020"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            ></textarea>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="branchIsActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-[#8B5CF6] rounded focus:ring-[#8B5CF6]"
            />
            <label htmlFor="branchIsActive" className="text-xs font-semibold text-slate-700 dark:text-[#A1A1AA]">
              Facility is active and operational for fulfillments
            </label>
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
              {submitting ? 'Saving Facility...' : isEditing ? 'Save Changes' : 'Register Facility'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
