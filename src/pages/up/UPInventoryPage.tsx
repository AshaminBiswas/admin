import React, { useState, useEffect } from 'react';
import { Factory, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { upApi } from '../../api/upApi';
import { UPInventoryHub } from './components/UPInventoryHub';

export function UPInventoryPage({ onBack }: { onBack?: () => void }) {
  const { setCurrentView } = useAdminAuth();
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkUserAccess = async () => {
      try {
        const res = await upApi.checkAccess();
        if (isMounted) {
          setHasAccess(Boolean(res.data?.hasAccess));
          setIsSuperAdmin(Boolean(res.data?.isSuperAdmin));
          setAccessChecked(true);
        }
      } catch {
        if (isMounted) {
          setHasAccess(false);
          setAccessChecked(true);
        }
      }
    };
    checkUserAccess();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!accessChecked) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-zinc-400">
        <RefreshCw size={24} className="animate-spin text-indigo-500 mr-2" />
        <span>Verifying UP Factory Access...</span>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">UP Factory Access Required</h2>
        <p className="text-sm text-zinc-400 max-w-md mb-6">
          Access to the UP Factory Inventory & Manufacturing Hub is restricted to authorized factory personnel and super administrators.
        </p>
        <button
          type="button"
          onClick={() => (onBack ? onBack() : setCurrentView('dashboard'))}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Top Breadcrumb & Return Nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all border border-zinc-700"
              title="Return to UP Operations"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Factory className="text-indigo-400" size={24} /> UP Factory Inventory
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                Supplier to PRC Hardware
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Independent Manufacturing Plant, Raw Materials & Finished Hardware Dispatches to PRC Depots
            </p>
          </div>
        </div>
      </div>

      {/* Success / Error notification toasts */}
      {errorMessage && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Render the core inventory hub */}
      <UPInventoryHub
        isSuperAdmin={isSuperAdmin}
        onShowSuccess={(msg) => {
          setSuccessMessage(msg);
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
        onShowError={(msg) => {
          setErrorMessage(msg);
          setTimeout(() => setErrorMessage(null), 6000);
        }}
      />
    </div>
  );
}
