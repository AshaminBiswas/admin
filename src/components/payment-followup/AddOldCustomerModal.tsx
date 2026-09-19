import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UserPlus,
  Building2,
  Phone,
  Mail,
  Receipt,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { paymentFollowupApi } from '../../api/paymentFollowupApi';
import type { AddOldCustomerInput, DuplicateWarningMatch } from '../../types/paymentFollowup';

interface AddOldCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddOldCustomerModal: React.FC<AddOldCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');

  // Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Delhi');
  const [postalCode, setPostalCode] = useState('');

  // Opening Balance
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState<number | ''>('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [openingBalanceNotes, setOpeningBalanceNotes] = useState('');

  // Duplicate check states
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateWarningMatch[]>([]);
  const [overrideDuplicateWarning, setOverrideDuplicateWarning] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced duplicate detection
  useEffect(() => {
    if (!isOpen) return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanGstin = gstin.trim();
    const cleanCompany = companyName.trim();

    if (cleanPhone.length >= 10 || (cleanEmail && cleanEmail.includes('@')) || cleanGstin.length >= 15) {
      debounceTimeoutRef.current = setTimeout(async () => {
        setCheckingDuplicates(true);
        try {
          const res = await paymentFollowupApi.checkDuplicateCustomer({
            phone: cleanPhone || undefined,
            email: cleanEmail || undefined,
            gstin: cleanGstin || undefined,
            companyName: cleanCompany || undefined,
          });
          if (res.success && res.data) {
            setDuplicateMatches(res.data.matches || []);
            setOverrideDuplicateWarning(false);
          }
        } catch (err) {
          console.error('Failed to check customer duplicates:', err);
        } finally {
          setCheckingDuplicates(false);
        }
      }, 500);
    } else {
      setDuplicateMatches([]);
    }

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [phone, email, gstin, companyName, isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setCompanyName('');
      setPhone('');
      setAlternatePhone('');
      setEmail('');
      setGstin('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('Delhi');
      setPostalCode('');
      setOpeningBalanceAmount('');
      setOpeningBalanceDate(new Date().toISOString().slice(0, 10));
      setOpeningBalanceNotes('');
      setDuplicateMatches([]);
      setOverrideDuplicateWarning(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter Customer / Contact Person name.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit primary phone number.');
      return;
    }

    if (openingBalanceAmount === '' || Number(openingBalanceAmount) <= 0) {
      setErrorMessage('Please enter a valid Opening Balance amount greater than 0.');
      return;
    }

    if (duplicateMatches.length > 0 && !overrideDuplicateWarning) {
      setErrorMessage('Please acknowledge the potential duplicate customer match before proceeding.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: AddOldCustomerInput = {
        customerName: name.trim(),
        companyName: companyName.trim() || undefined,
        contactPerson: alternatePhone.trim() ? `Alt: ${alternatePhone.trim()}` : undefined,
        phone: cleanPhone,
        email: email.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
        billingAddress: addressLine1.trim() || undefined,
        shippingAddress: addressLine2.trim() || undefined,
        openingDueBalance: Number(openingBalanceAmount),
        referenceDate: openingBalanceDate,
        notes: openingBalanceNotes.trim() || 'Opening balance from historical ledger',
      };

      const res = await paymentFollowupApi.addOldCustomer(payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.data?.message || 'Failed to onboard old customer.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while onboarding old customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Onboard Old Customer with Opening Dues
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Legacy Account
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Register historical customers with verifiable opening balance without creating synthetic invoices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Duplicate Warning Banner */}
        {duplicateMatches.length > 0 && (
          <div className="px-5 py-3.5 bg-amber-950/40 border-b border-amber-800/60 text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-bold text-amber-300">
                  Duplicate Warning: {duplicateMatches.length} existing customer(s) found with matching phone/GSTIN!
                </div>
                <div className="mt-1 space-y-1">
                  {duplicateMatches.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-lg bg-black/40 border border-amber-800/40 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white">{m.name}</span>
                        {m.companyName && <span className="text-zinc-300"> ({m.companyName})</span>}
                        <span className="text-zinc-400"> • Ph: {m.phone}</span>
                        {m.gstin && <span className="text-zinc-400"> • GST: {m.gstin}</span>}
                      </div>
                      <div className="text-right font-mono text-xs text-amber-400 font-semibold">
                        Matched: {m.matchedFields.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 mt-2.5 cursor-pointer select-none text-xs text-amber-300">
                  <input
                    type="checkbox"
                    checked={overrideDuplicateWarning}
                    onChange={(e) => setOverrideDuplicateWarning(e.target.checked)}
                    className="rounded border-amber-600 bg-amber-950/60 text-amber-500 focus:ring-0"
                  />
                  <span>I confirm this is a distinct customer account and wish to proceed anyway</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-950/50 border-b border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Customer Profile */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={14} />
              <span>Customer Identification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Contact / Customer Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Company / Firm Name</label>
                <input
                  type="text"
                  placeholder="e.g. Balaji Hardware Traders"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Primary Mobile Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-11 pr-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Alternate Phone (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9811223344"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                  <span>Email Address</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Auto-placeholder if blank</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@balajihardware.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white font-mono placeholder-zinc-500 uppercase focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Opening Balance Entry */}
          <div className="p-4 rounded-xl bg-[#09090B] border border-purple-500/30 space-y-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <IndianRupee size={14} />
              <span>Opening Balance / Outstanding Dues</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Opening Balance Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="25000.00"
                    value={openingBalanceAmount}
                    onChange={(e) =>
                      setOpeningBalanceAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-emerald-400 font-mono font-bold placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Balance Effective As Of Date <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={openingBalanceDate}
                    onChange={(e) => setOpeningBalanceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Opening Balance Narration / Reference Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ledger balance carried forward from physical books / Tally export as on 31-Mar-2025"
                  value={openingBalanceNotes}
                  onChange={(e) => setOpeningBalanceNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Billing Address (Optional) */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={14} />
              <span>Billing Address (Optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Address Line 1 (Shop / Plot / Street)"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  placeholder="PIN Code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#27272A]">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              {checkingDuplicates && (
                <span className="flex items-center gap-1.5 text-purple-400">
                  <Loader2 size={12} className="animate-spin" />
                  Checking duplicates...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (duplicateMatches.length > 0 && !overrideDuplicateWarning)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Onboarding...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Onboard Old Customer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
