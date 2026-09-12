import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  MapPin,
  Mail,
  User,
  Phone,
  ShieldCheck,
  CreditCard,
  Send,
  Building2,
  Sparkles,
  Layers,
  Package,
} from 'lucide-react';
import { installerPaymentsService } from '../api/installerPaymentsService';
import { isNcrPinCode } from '../utils/ncrPincodes';
import type {
  CubicleModel,
  CubicleInstaller,
  CreateInstallerBillPayload,
} from '../types/installerPayment';

interface CreateInstallerBillPageProps {
  onBack: () => void;
}

interface LineItemRow {
  id: string;
  category: 'CUBICLE' | 'UMP' | 'LOCKER';
  modelId: string;
  quantity: number;
  unitPrice: number;
}

export function CreateInstallerBillPage({ onBack }: CreateInstallerBillPageProps) {
  const [models, setModels] = useState<CubicleModel[]>([]);
  const [installers, setInstallers] = useState<CubicleInstaller[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Form State
  const [selectedInstallerId, setSelectedInstallerId] = useState<string>('');
  const [installerName, setInstallerName] = useState<string>('');
  const [installerEmail, setInstallerEmail] = useState<string>('');
  const [installerPhone, setInstallerPhone] = useState<string>('');
  const [isAutoPopulated, setIsAutoPopulated] = useState<boolean>(false);

  const [installDate, setInstallDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isNcr, setIsNcr] = useState<boolean>(false);
  const [travelExpenses, setTravelExpenses] = useState<number>(0);
  const [siteAddress, setSiteAddress] = useState<string>('');
  const [sitePin, setSitePin] = useState<string>('');

  // 3 Dynamic Item Categories - By default all values start at 0!
  const [cubicleItems, setCubicleItems] = useState<LineItemRow[]>([
    { id: 'cubicle-1', category: 'CUBICLE', modelId: '', quantity: 0, unitPrice: 0 },
  ]);
  const [umpItems, setUmpItems] = useState<LineItemRow[]>([
    { id: 'ump-1', category: 'UMP', modelId: '', quantity: 0, unitPrice: 0 },
  ]);
  const [lockerItems, setLockerItems] = useState<LineItemRow[]>([
    { id: 'locker-1', category: 'LOCKER', modelId: '', quantity: 0, unitPrice: 0 },
  ]);

  // Deduction details
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState<string>('');

  // Payment details
  const [initialAmountPaid, setInitialAmountPaid] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [sendEmailImmediately, setSendEmailImmediately] = useState<boolean>(true);

  // Fetch registered models & installers on mount
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        setLoadingInitial(true);
        const [modelsRes, installersRes] = await Promise.all([
          installerPaymentsService.listModels(true),
          installerPaymentsService.listInstallers(false),
        ]);
        if (isMounted) {
          const safeModels = Array.isArray(modelsRes) ? modelsRes : [];
          const safeInstallers = Array.isArray(installersRes) ? installersRes : [];
          setModels(safeModels);
          setInstallers(safeInstallers);
          // By default, all values stay at 0 and unselected! Admin actively selects models and enters quantities.
        }
      } catch (err: any) {
        if (isMounted) {
          setModels([]);
          setInstallers([]);
          setFeedback({
            type: 'error',
            message: `Failed to load models or installers: ${err?.message || err}`,
          });
        }
      } finally {
        if (isMounted) {
          setLoadingInitial(false);
        }
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle installer dropdown change (Auto-fetch)
  const handleInstallerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const instId = e.target.value;
    setSelectedInstallerId(instId);

    if (!instId) {
      setIsAutoPopulated(false);
      return;
    }

    const found = installers.find((i) => i.id === instId);
    if (found) {
      setInstallerName(found.name);
      setInstallerEmail(found.email);
      setInstallerPhone(found.phone || '');
      setIsAutoPopulated(true);
    }
  };

  // Handle site PIN input & automated NCR classification
  const handlePinChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 6);
    setSitePin(cleaned);

    if (cleaned.length === 6) {
      const matched = isNcrPinCode(cleaned);
      if (matched) {
        setIsNcr(true);
        setTravelExpenses(0);
      } else {
        setIsNcr(false);
      }
    }
  };

  // ─── Cubicle Line Items Operations ─────────────────────────────────────────
  const handleCubicleModelChange = (itemId: string, newModelId: string) => {
    const selected = models.find((m) => m.id === newModelId);
    const unitPrice = selected ? Number(selected.installationPrice) : 0;
    setCubicleItems((prev) =>
      prev.map((row) =>
        row.id === itemId ? { ...row, modelId: newModelId, unitPrice } : row
      )
    );
  };

  const handleCubicleQuantityChange = (itemId: string, qty: number) => {
    const validQty = Math.max(0, qty);
    setCubicleItems((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, quantity: validQty } : row))
    );
  };

  const addCubicleItem = () => {
    setCubicleItems((prev) => [
      ...prev,
      { id: `cubicle-${Date.now()}`, category: 'CUBICLE', modelId: '', quantity: 0, unitPrice: 0 },
    ]);
  };

  const removeCubicleItem = (itemId: string) => {
    setCubicleItems((prev) =>
      prev.length > 1
        ? prev.filter((row) => row.id !== itemId)
        : [{ id: `cubicle-${Date.now()}`, category: 'CUBICLE', modelId: '', quantity: 0, unitPrice: 0 }]
    );
  };

  // ─── UMP Line Items Operations ─────────────────────────────────────────────
  const handleUmpModelChange = (itemId: string, newModelId: string) => {
    const selected = models.find((m) => m.id === newModelId);
    const unitPrice = selected ? Number(selected.installationPrice) : 0;
    setUmpItems((prev) =>
      prev.map((row) =>
        row.id === itemId ? { ...row, modelId: newModelId, unitPrice } : row
      )
    );
  };

  const handleUmpQuantityChange = (itemId: string, qty: number) => {
    const validQty = Math.max(0, qty);
    setUmpItems((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, quantity: validQty } : row))
    );
  };

  const addUmpItem = () => {
    setUmpItems((prev) => [
      ...prev,
      { id: `ump-${Date.now()}`, category: 'UMP', modelId: '', quantity: 0, unitPrice: 0 },
    ]);
  };

  const removeUmpItem = (itemId: string) => {
    setUmpItems((prev) =>
      prev.length > 1
        ? prev.filter((row) => row.id !== itemId)
        : [{ id: `ump-${Date.now()}`, category: 'UMP', modelId: '', quantity: 0, unitPrice: 0 }]
    );
  };

  // ─── Locker Line Items Operations ──────────────────────────────────────────
  const handleLockerModelChange = (itemId: string, newModelId: string) => {
    const selected = models.find((m) => m.id === newModelId);
    const unitPrice = selected ? Number(selected.installationPrice) : 0;
    setLockerItems((prev) =>
      prev.map((row) =>
        row.id === itemId ? { ...row, modelId: newModelId, unitPrice } : row
      )
    );
  };

  const handleLockerQuantityChange = (itemId: string, qty: number) => {
    const validQty = Math.max(0, qty);
    setLockerItems((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, quantity: validQty } : row))
    );
  };

  const addLockerItem = () => {
    setLockerItems((prev) => [
      ...prev,
      { id: `locker-${Date.now()}`, category: 'LOCKER', modelId: '', quantity: 0, unitPrice: 0 },
    ]);
  };

  const removeLockerItem = (itemId: string) => {
    setLockerItems((prev) =>
      prev.length > 1
        ? prev.filter((row) => row.id !== itemId)
        : [{ id: `locker-${Date.now()}`, category: 'LOCKER', modelId: '', quantity: 0, unitPrice: 0 }]
    );
  };

  // Category-specific model options from Master
  const cubicleModels = (Array.isArray(models) ? models : []).filter(
    (m) => (m.category || 'CUBICLE') === 'CUBICLE'
  );
  const umpModels = (Array.isArray(models) ? models : []).filter(
    (m) => m.category === 'UMP'
  );
  const lockerModels = (Array.isArray(models) ? models : []).filter(
    (m) => m.category === 'LOCKER'
  );

  // Auto-calculated scope totals
  const cubicleModelsSubtotal = cubicleItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity * row.unitPrice : 0),
    0
  );
  const totalCubicleQty = cubicleItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity : 0),
    0
  );

  const umpSubtotal = umpItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity * row.unitPrice : 0),
    0
  );
  const totalUmpQty = umpItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity : 0),
    0
  );

  const lockerSubtotal = lockerItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity * row.unitPrice : 0),
    0
  );
  const totalLockerQty = lockerItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity : 0),
    0
  );

  const subtotal = cubicleModelsSubtotal + umpSubtotal + lockerSubtotal;
  const effectiveTravelExpenses = isNcr ? 0 : Number(travelExpenses || 0);
  const effectiveDeductionAmount = Math.max(0, Number(deductionAmount || 0));
  const rawTotal = subtotal + effectiveTravelExpenses - effectiveDeductionAmount;
  const totalAmount = Math.max(0, rawTotal);
  const balanceDue = Math.max(0, totalAmount - Number(initialAmountPaid || 0));
  const willBeCleared = totalAmount > 0 && initialAmountPaid >= totalAmount;

  // Quick fill full payment
  const handlePayFull = () => {
    setInitialAmountPaid(totalAmount);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Client-side validations
    if (!installerName.trim()) {
      setFeedback({ type: 'error', message: 'Installer Name is required.' });
      return;
    }
    if (!installerEmail.trim() || !installerEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'A valid Installer Email address is required.' });
      return;
    }
    if (!siteAddress.trim()) {
      setFeedback({ type: 'error', message: 'Installation Site Address is required.' });
      return;
    }
    if (!sitePin.trim() || !/^\d{6}$/.test(sitePin.trim())) {
      setFeedback({ type: 'error', message: 'Site Postal PIN must be a valid 6-digit code.' });
      return;
    }

    // Deduction validation
    if (effectiveDeductionAmount > 0 && !deductionReason.trim()) {
      setFeedback({
        type: 'error',
        message: 'A deduction reason is required when specifying a deduction amount.',
      });
      return;
    }

    // Collect all valid line items where model is selected and quantity > 0
    const validCubicles = cubicleItems.filter((i) => i.modelId && i.quantity > 0);
    const validUmps = umpItems.filter((i) => i.modelId && i.quantity > 0);
    const validLockers = lockerItems.filter((i) => i.modelId && i.quantity > 0);
    const allValidItems = [...validCubicles, ...validUmps, ...validLockers];

    if (allValidItems.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please select at least one Cubicle, UMP, or Locker model with a quantity greater than 0.',
      });
      return;
    }

    // Mandatory Internal Notes Validation!
    if (!internalNotes.trim()) {
      setFeedback({
        type: 'error',
        message: 'Internal Notes are mandatory. Please provide internal verification notes, site audit notes, or job instructions.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateInstallerBillPayload = {
        installerId: selectedInstallerId || undefined,
        installerName: installerName.trim(),
        installerEmail: installerEmail.trim().toLowerCase(),
        installDate,
        isNcr,
        travelExpenses: effectiveTravelExpenses,
        deductionAmount: effectiveDeductionAmount,
        deductionReason: effectiveDeductionAmount > 0 ? deductionReason.trim() : undefined,
        siteAddress: siteAddress.trim(),
        sitePin: sitePin.trim(),
        items: allValidItems.map((item) => ({
          modelId: item.modelId,
          category: item.category,
          quantity: item.quantity,
        })),
        umpQuantity: totalUmpQty,
        umpRate: totalUmpQty > 0 ? umpSubtotal / totalUmpQty : 0,
        initialAmountPaid: Number(initialAmountPaid || 0),
        paymentDate: initialAmountPaid > 0 ? paymentDate : undefined,
        paymentMode: initialAmountPaid > 0 ? paymentMode : undefined,
        notes: internalNotes.trim(), // Mandatory!
        sendEmailToInstaller: sendEmailImmediately,
      };

      const createdBill = await installerPaymentsService.createBill(payload);
      setFeedback({
        type: 'success',
        message: `Installer Bill ${createdBill.billNo} generated successfully! ${
          sendEmailImmediately
            ? `Official PDF payment voucher dispatched to ${installerEmail.trim()}.`
            : willBeCleared
            ? 'Status is CLEARED.'
            : ''
        }`,
      });

      // Redirect back to list after short delay
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to create installer bill. Please check inputs.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-[#27272A] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Sales & Fulfillment</span>
            <span>/</span>
            <button
              onClick={onBack}
              className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              Cubicle Installer Payments
            </button>
            <span>/</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">New Installer Bill</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
              <FileText size={22} />
            </div>
            Generate New Installer Payment Bill
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create an itemized cubicle installation job bill with automatic sequence numbering (PPSI-XXXXX), NCR travel logic, and optional settlement.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl hover:bg-gray-50 dark:hover:bg-[#27272A] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Bills
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          )}
          <div className="text-sm font-medium">{feedback.message}</div>
        </div>
      )}

      {loadingInitial ? (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-[#27272A]">
          <div className="animate-spin w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Loading cubicle models and registered installers...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main Column: Form Inputs (2 Cols wide on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Installer Identification & Auto-Fetch */}
            <div className="bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
                <div className="flex items-center gap-2">
                  <User className="text-violet-600 dark:text-violet-400" size={18} />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    1. Installer Details & Auto-Fetch
                  </h2>
                </div>
                {isAutoPopulated && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 rounded-full">
                    <Sparkles size={12} />
                    Auto-Populated from Directory
                  </span>
                )}
              </div>

              {/* Registered Installer Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                  Select Registered Installer (Auto-populate)
                </label>
                <select
                  value={selectedInstallerId}
                  onChange={handleInstallerSelect}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#27272A]/50 border border-gray-300 dark:border-[#3F3F46] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500 transition-colors"
                >
                  <option value="">-- Choose from Registered Installers or type custom below --</option>
                  {(Array.isArray(installers) ? installers : []).map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.email}) {inst.phone ? `• ${inst.phone}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Selecting a registered installer instantly fills their legal name, registered email, and contact phone.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Installer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      required
                      value={installerName}
                      onChange={(e) => {
                        setInstallerName(e.target.value);
                        if (isAutoPopulated) setIsAutoPopulated(false);
                      }}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Installer Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="email"
                      required
                      value={installerEmail}
                      onChange={(e) => {
                        setInstallerEmail(e.target.value);
                        if (isAutoPopulated) setIsAutoPopulated(false);
                      }}
                      placeholder="e.g. rajesh.sharma@example.com"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              {installerPhone && (
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 pt-0.5">
                  <Phone size={13} className="text-gray-400" />
                  <span>Contact Phone: <strong className="text-gray-700 dark:text-gray-300">{installerPhone}</strong></span>
                </div>
              )}
            </div>

            {/* 2. Installation Site & Date */}
            <div className="bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-[#27272A] pb-3">
                <MapPin className="text-violet-600 dark:text-violet-400" size={18} />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  2. Installation Site & Location
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date of Installation <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="date"
                      required
                      value={installDate}
                      onChange={(e) => setInstallDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Site Postal PIN Code <span className="text-rose-500">*</span>
                    </label>
                    {sitePin.length === 6 && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isNcrPinCode(sitePin)
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
                        }`}
                      >
                        {isNcrPinCode(sitePin) ? (
                          <>
                            <CheckCircle2 size={12} /> NCR Territory Matched
                          </>
                        ) : (
                          <>
                            <MapPin size={12} /> Outstation Territory
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={sitePin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="e.g. 110001"
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm font-mono text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                  />
                  {sitePin.length === 6 && (
                    <p className="text-[11px] mt-1">
                      {isNcrPinCode(sitePin) ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          PIN <strong>{sitePin}</strong> is recognized in the NCR master list. Inside NCR auto-selected (Travel ₹0.00).
                        </span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                          <MapPin size={12} />
                          PIN <strong>{sitePin}</strong> is outside NCR. Outstation auto-selected (Travel expenses enabled).
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Installation Site Full Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g. DLF Cyber City, Tower B, 5th Floor, Sector 24, Gurugram, Haryana"
                  className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* NCR Toggle & Travel Expenses Logic */}
              <div className="p-4 bg-gray-50 dark:bg-[#27272A]/40 rounded-xl border border-gray-200 dark:border-[#27272A] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Building2 size={16} className="text-violet-500" />
                      NCR Location Job (National Capital Region)?
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Auto-detected from Postal PIN. Delhi-NCR sites waive travel expenses to ₹0.00. Non-NCR requires travel reimbursement.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNcr(true);
                        setTravelExpenses(0);
                      }}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        isNcr
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#18181B] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#27272A] hover:bg-gray-100'
                      }`}
                    >
                      Yes (NCR)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNcr(false)}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        !isNcr
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#18181B] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#27272A] hover:bg-gray-100'
                      }`}
                    >
                      No (Outstation)
                    </button>
                  </div>
                </div>

                {isNcr ? (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>NCR Job:</strong> Travel Expenses locked to <strong>₹0.00</strong> (Installation site is within NCR radius).
                    </span>
                  </div>
                ) : (
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Travel & Boarding Expenses (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-semibold text-gray-500">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        required={!isNcr}
                        value={travelExpenses || ''}
                        onChange={(e) => setTravelExpenses(Number(e.target.value))}
                        placeholder="e.g. 1500"
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Add bus/train fares, fuel allowance, or outstation night stay allowance for non-NCR site.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Cubicle Models Installed */}
            <div className="bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="text-violet-600 dark:text-violet-400" size={18} />
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      3. Restroom Cubicle Models Installed
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Select cubicle models and specify units installed. Standard rates are populated from Model Master.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addCubicleItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Add Cubicle Model
                </button>
              </div>

              <div className="space-y-3">
                {cubicleItems.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 dark:bg-[#27272A]/40 rounded-xl border border-gray-200 dark:border-[#27272A] grid grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Cubicle Model
                        </label>
                        <select
                          value={item.modelId}
                          onChange={(e) => handleCubicleModelChange(item.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#3F3F46] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 font-medium"
                        >
                          <option value="">-- Select Cubicle Model --</option>
                          {cubicleModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.modelName} (Rate: ₹{Number(m.installationPrice).toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Qty (Units)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity === 0 ? '' : item.quantity}
                          placeholder="0"
                          onChange={(e) => handleCubicleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#3F3F46] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 text-center font-bold"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Rate / Unit
                        </label>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white py-1.5">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-10 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Line Total
                        </label>
                        <div className="text-sm font-bold text-violet-600 dark:text-violet-400 py-1.5">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                        {cubicleItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCubicleItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove Model"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. UMP Models Installed (Dynamic) */}
            <div className="bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="text-violet-600 dark:text-violet-400" size={18} />
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      4. Urinal Modesty Panel (UMP) Models Installed
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Dynamic UMP divider models. Select model and enter quantities (starts at 0).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addUmpItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Add UMP Model
                </button>
              </div>

              <div className="space-y-3">
                {umpItems.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 dark:bg-[#27272A]/40 rounded-xl border border-gray-200 dark:border-[#27272A] grid grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          UMP Model
                        </label>
                        <select
                          value={item.modelId}
                          onChange={(e) => handleUmpModelChange(item.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#3F3F46] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 font-medium"
                        >
                          <option value="">-- Select UMP Model (Default: None) --</option>
                          {umpModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.modelName} (Rate: ₹{Number(m.installationPrice).toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Qty (Panels)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity === 0 ? '' : item.quantity}
                          placeholder="0"
                          onChange={(e) => handleUmpQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#3F3F46] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 text-center font-bold"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Rate / Panel
                        </label>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white py-1.5">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-10 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Line Total
                        </label>
                        <div className="text-sm font-bold text-violet-600 dark:text-violet-400 py-1.5">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                        {umpItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUmpItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove UMP Model"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Locker Models Installed (Dynamic) */}
            <div className="bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272A] pb-3">
                <div className="flex items-center gap-2">
                  <Package className="text-blue-600 dark:text-blue-400" size={18} />
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      5. Locker Models Installed
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Dynamic Locker installation models. Select model and enter quantities (starts at 0).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addLockerItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Add Locker Model
                </button>
              </div>

              <div className="space-y-3">
                {lockerItems.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 dark:bg-[#27272A]/40 rounded-xl border border-gray-200 dark:border-[#27272A] grid grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Locker Model
                        </label>
                        <select
                          value={item.modelId}
                          onChange={(e) => handleLockerModelChange(item.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#3F3F46] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                          <option value="">-- Select Locker Model (Default: None) --</option>
                          {lockerModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.modelName} (Rate: ₹{Number(m.installationPrice).toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Qty (Lockers)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity === 0 ? '' : item.quantity}
                          placeholder="0"
                          onChange={(e) => handleLockerQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#3F3F46] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-center font-bold"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Rate / Unit
                        </label>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white py-1.5">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-10 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Line Total
                        </label>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 py-1.5">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                        {lockerItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLockerItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove Locker Model"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6. Deductions & Adjustments (Optional) */}
            <div className="bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-[#27272A] pb-3">
                <AlertCircle className="text-rose-600 dark:text-rose-400" size={18} />
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    6. Deductions & Penalties (Optional)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Record damage deduction, unfinished scope penalty, or site delay adjustment (deducted from bill).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deduction Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm font-bold text-rose-500">-₹</span>
                    <input
                      type="number"
                      min={0}
                      value={deductionAmount || ''}
                      onChange={(e) => setDeductionAmount(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 font-bold"
                    />
                  </div>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deduction Reason {deductionAmount > 0 && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    placeholder="e.g. Damage to restroom hardware, unfinished silicon work, client complaint penalty"
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* 7. Payment Details & Mandatory Internal Notes */}
            <div className="bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-[#27272A] pb-3">
                <CreditCard className="text-violet-600 dark:text-violet-400" size={18} />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  7. Payment Settlement & Audit Notes
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-violet-500" />
                    Payment Date <span className="text-gray-400 font-normal">(if paying now)</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Amount Paid Now */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Amount Paid Now (₹)
                    </label>
                    <button
                      type="button"
                      onClick={handlePayFull}
                      className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      Pay Full (100%)
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm font-semibold text-gray-500">₹</span>
                    <input
                      type="number"
                      min={0}
                      max={totalAmount}
                      value={initialAmountPaid || ''}
                      onChange={(e) => setInitialAmountPaid(Math.min(totalAmount, Number(e.target.value)))}
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 font-semibold"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    disabled={initialAmountPaid <= 0}
                    className="w-full px-3 py-2 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#27272A] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Mandatory Internal Notes */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    Internal Notes <span className="text-rose-500 text-sm">*</span>
                    <span className="text-[11px] font-normal text-rose-500 lowercase">(Mandatory audit log)</span>
                  </span>
                  <span className="text-[11px] font-normal text-gray-400">
                    Visible to Admin team
                  </span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Enter mandatory internal audit notes, site verification notes, work completion remarks, or job instructions..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#18181B] border border-rose-300 dark:border-rose-900/60 focus:border-violet-500 dark:focus:border-violet-500 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Required: Internal notes are logged into the permanent bill audit ledger for tracking and accountability.
                </p>
              </div>

              {/* Dispatch Voucher Option */}
              <div className="pt-2 border-t border-gray-100 dark:border-[#27272A]">
                <label className="flex items-start gap-3 p-3.5 bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-800/40 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmailImmediately}
                    onChange={(e) => setSendEmailImmediately(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Send size={13} className="text-violet-600 dark:text-violet-400" />
                      Send Bill & PDF Payment Voucher to Installer Email
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 block mt-0.5">
                      Automatically sends the payment advice and attached PDF statement directly to{' '}
                      <strong className="text-gray-800 dark:text-gray-200">
                        {installerEmail.trim() || "the installer's email address"}
                      </strong>{' '}
                      upon bill generation.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Calculation Summary & Submit (1 Col wide) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-gray-200 dark:border-[#27272A] shadow-sm sticky top-6 space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#27272A] pb-3 flex items-center gap-2">
                <DollarSign className="text-emerald-500" size={18} />
                Financial Calculation Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    Cubicle Models:
                    {totalCubicleQty > 0 && (
                      <span className="text-[10px] text-violet-600 font-bold bg-violet-50 dark:bg-violet-950/50 px-1.5 py-0.5 rounded-sm">
                        {totalCubicleQty} unit(s)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ₹{cubicleModelsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    UMP Installation:
                    {totalUmpQty > 0 && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-sm">
                        {totalUmpQty} panel(s)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ₹{umpSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    Locker Models:
                    {totalLockerQty > 0 && (
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded-sm">
                        {totalLockerQty} unit(s)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ₹{lockerSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-700 dark:text-gray-300 font-medium pt-1 border-t border-dashed border-gray-100 dark:border-[#27272A]">
                  <span>Installation Subtotal:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    Travel Expenses:
                    {isNcr && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-sm">
                        NCR ₹0
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ₹{effectiveTravelExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {effectiveDeductionAmount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                    <span className="flex items-center gap-1">
                      Deductions / Penalty:
                      {deductionReason && (
                        <span className="text-[10px] bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded-sm truncate max-w-[120px]" title={deductionReason}>
                          {deductionReason}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">
                      -₹{effectiveDeductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 dark:border-[#27272A] flex justify-between items-baseline">
                  <span className="text-base font-bold text-gray-900 dark:text-white">Net Disbursement Due:</span>
                  <span className="text-xl font-extrabold text-violet-600 dark:text-violet-400">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600 dark:text-gray-400 pt-1">
                  <span>Amount Paid Now:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(initialAmountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Remaining Balance Due:</span>
                  <span className={`font-bold ${balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                    ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Status Indicator Preview */}
              <div className="pt-3 border-t border-gray-100 dark:border-[#27272A]">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Projected Payment Status
                </div>
                {willBeCleared ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                      <CheckCircle2 size={16} />
                      CLEARED (Full Settlement)
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      ⚡ <strong>Auto-Dispatch:</strong> Upon creation, official PDF bill will be immediately generated and auto-emailed to <strong>{installerEmail || 'installer'}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-sm">
                      <AlertCircle size={16} />
                      PARTIAL (Balance Pending)
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Bill will be generated with status PARTIAL. Further installment payments can be logged at any time from the Bills table.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Bill...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Issue & Create Installer Bill</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onBack}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27272A] rounded-xl transition-colors"
                >
                  Cancel & Discard
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
