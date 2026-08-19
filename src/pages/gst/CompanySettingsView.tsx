import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle, CheckCircle, Globe, Building, Shield } from 'lucide-react';
import {
  getCompanySettings,
  updateCompanySettings,
  validateGSTIN,
  validatePAN,
  validatePincode,
} from '../../api/gstInvoiceService';
import { CompanySettings, INDIA_STATE_CODES } from '../../types/admin';

const EMPTY_SETTINGS: Partial<CompanySettings> = {
  legal_name: '',
  trade_name: '',
  gstin: '',
  pan: '',
  address: '',
  city: '',
  state: '',
  state_code: '',
  pincode: '',
  phone: '',
  email: '',
  irn_cancellation_window_hours: 24,
  irp_configured: false,
};

export function CompanySettingsView() {
  const [settings, setSettings] = useState<Partial<CompanySettings>>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const data = await getCompanySettings();
        if (data) setSettings(data);
      } catch {
        /* backend not yet set up — show blank form */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!settings.legal_name?.trim()) e.legal_name = 'Legal name is required';
    if (!settings.gstin?.trim()) {
      e.gstin = 'GSTIN is required';
    } else if (!validateGSTIN(settings.gstin)) {
      e.gstin = 'Invalid GSTIN format (e.g. 27AAPFU0939F1ZV)';
    }
    if (!settings.pan?.trim()) {
      e.pan = 'PAN is required';
    } else if (!validatePAN(settings.pan)) {
      e.pan = 'Invalid PAN format (e.g. AAPFU0939F)';
    }
    if (!settings.address?.trim()) e.address = 'Address is required';
    if (!settings.city?.trim()) e.city = 'City is required';
    if (!settings.state?.trim()) e.state = 'State is required';
    if (!settings.pincode?.trim()) {
      e.pincode = 'Pincode is required';
    } else if (!validatePincode(settings.pincode)) {
      e.pincode = 'Invalid pincode (6 digits)';
    }
    if (
      !settings.irn_cancellation_window_hours ||
      settings.irn_cancellation_window_hours < 1 ||
      settings.irn_cancellation_window_hours > 168
    ) {
      e.irn_cancellation_window_hours = 'Must be between 1 and 168 hours';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await updateCompanySettings(settings);
      setSettings(saved);
      showToast('success', 'Company settings saved successfully.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleStateChange = (stateName: string) => {
    const found = INDIA_STATE_CODES.find((s) => s.name === stateName);
    setSettings((prev) => ({
      ...prev,
      state: stateName,
      state_code: found?.code || '',
    }));
  };

  const field = (
    label: string,
    key: keyof CompanySettings,
    opts?: {
      required?: boolean;
      readOnly?: boolean;
      type?: string;
      min?: number;
      max?: number;
      placeholder?: string;
    }
  ) => (
    <div>
      <label className="block text-xs font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] text-slate-600 mb-1">
        {label} {opts?.required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={opts?.type || 'text'}
        min={opts?.min}
        max={opts?.max}
        readOnly={opts?.readOnly}
        placeholder={opts?.placeholder}
        value={(settings[key] as string | number) ?? ''}
        onChange={(e) =>
          setSettings((prev) => ({
            ...prev,
            [key]: opts?.type === 'number' ? Number(e.target.value) : e.target.value,
          }))
        }
        className={`w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border text-sm transition-colors focus:outline-none
          ${opts?.readOnly
            ? 'bg-slate-100 dark:bg-[#09090B] text-slate-500 dark:text-[#71717A] border-slate-200 dark:border-[#27272A] cursor-not-allowed'
            : errors[key]
            ? 'border-red-500 bg-white dark:bg-[#09090B] text-slate-900 dark:text-[#FAFAFA]'
            : 'border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#09090B] text-slate-900 dark:text-[#FAFAFA] focus:border-[#8B5CF6]'
          }`}
      />
      {errors[key] && <p className="text-[11px] text-red-400 mt-1">{errors[key]}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-[#FAFAFA]">Company GST Settings</h2>
            <p className="text-xs text-[#A1A1AA]">Supplier details used on every GST tax invoice</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] transition-colors disabled:opacity-60"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-tr-xl rounded-bl-xl text-sm font-semibold ${
            toast.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* IRP Not Configured Warning */}
      {!settings.irp_configured && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-tr-xl rounded-bl-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-400">IRIS IRP Integration Not Yet Configured</p>
            <p className="text-xs text-amber-300/80 mt-0.5">
              IRN generation is disabled until the backend team configures IRIS IRP 6 API credentials (client_id, client_secret) as server-side secrets. No invoice can reach IRN_GENERATED status without a genuine IRIS API response.
            </p>
          </div>
        </div>
      )}

      {/* IRP Info Banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30">
        <Globe size={16} className="text-[#8B5CF6] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-[#8B5CF6]">IRP/GSP: IRIS Business Services Ltd. (IRP 6)</p>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Sandbox: api.sandbox.core.irisirp.com &nbsp;·&nbsp; Production: api.irisirp.com &nbsp;·&nbsp; Auth: POST /eivital/v1.04/auth &nbsp;·&nbsp; Generate: POST /eicore/v1.03/Invoice
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building size={14} className="text-[#8B5CF6]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">Business Identity</span>
          </div>
          {field('Legal Name', 'legal_name', { required: true, placeholder: 'Pacific Products & Solutions Pvt Ltd' })}
          {field('Trade Name', 'trade_name', { placeholder: 'PRC Hardware (optional)' })}
          {field('GSTIN', 'gstin', { required: true, placeholder: '27AAPFU0939F1ZV' })}
          {field('PAN', 'pan', { required: true, placeholder: 'AAPFU0939F' })}
          {field('Phone', 'phone', { type: 'tel', placeholder: '+91 9876543210' })}
          {field('Email', 'email', { type: 'email', placeholder: 'gst@prchardware.com' })}
        </div>

        {/* Right column */}
        <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-[#8B5CF6]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">Address & GST Config</span>
          </div>
          {field('Address Line', 'address', { required: true, placeholder: 'Plot No. 12, Industrial Area' })}
          {field('City', 'city', { required: true, placeholder: 'Mumbai' })}

          {/* State dropdown */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
              State <span className="text-red-400">*</span>
            </label>
            <select
              value={settings.state || ''}
              onChange={(e) => handleStateChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border text-sm bg-[#09090B] text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                errors.state ? 'border-red-500' : 'border-[#27272A]'
              }`}
            >
              <option value="">— Select State —</option>
              {INDIA_STATE_CODES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
            {errors.state && <p className="text-[11px] text-red-400 mt-1">{errors.state}</p>}
          </div>

          {/* State Code (auto-set) */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">State Code (GST)</label>
            <input
              readOnly
              value={settings.state_code || ''}
              className="w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-sm bg-[#09090B] text-[#71717A] cursor-not-allowed"
              placeholder="Auto-set from state selection"
            />
          </div>

          {field('Pincode', 'pincode', { required: true, placeholder: '400001' })}

          {/* IRN Cancellation Window */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
              IRN Cancellation Window (hours) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={settings.irn_cancellation_window_hours ?? 24}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  irn_cancellation_window_hours: Number(e.target.value),
                }))
              }
              className={`w-full px-3 py-2 rounded-tr-lg rounded-bl-lg border text-sm bg-[#09090B] text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition-colors ${
                errors.irn_cancellation_window_hours ? 'border-red-500' : 'border-[#27272A]'
              }`}
            />
            {errors.irn_cancellation_window_hours && (
              <p className="text-[11px] text-red-400 mt-1">{errors.irn_cancellation_window_hours}</p>
            )}
            <p className="text-[11px] text-[#71717A] mt-1">
              Current IRIS IRP regulatory limit: 24 hours from generation. Confirm with your GSP before changing.
            </p>
          </div>

          {/* IRP Configured status */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">IRP Connection Status</label>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-tr-lg rounded-bl-lg border text-xs font-bold ${
                settings.irp_configured
                  ? 'border-green-500/40 bg-green-500/10 text-green-400'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              }`}
            >
              {settings.irp_configured ? (
                <><CheckCircle size={14} /> Connected — IRIS IRP 6 Live</>
              ) : (
                <><AlertTriangle size={14} /> Not Connected — Awaiting Backend Configuration</>
              )}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">Set by backend only after successful IRP credential test.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
