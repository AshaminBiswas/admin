import React, { useState } from "react";
import {
  QrCode,
  Barcode as BarcodeIcon,
  Download,
  Printer,
  Search,
  Sparkles,
  Layers,
  Copy,
  Check
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";

export function InventoryBarcodePage() {
  const [sku, setSku] = useState("");
  const [barcodeType, setBarcodeType] = useState<"code128" | "qr">("code128");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!sku.trim()) return;
    setGeneratedCode(sku.trim().toUpperCase());
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <BarcodeIcon size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Barcode & QR Code Generator Studio
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Generate Code-128 barcodes, 2D QR stickers & bulk label print sheets for warehouse logistics
            </p>
          </div>
        </div>
      </div>

      {/* Generator Studio Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Parameters */}
        <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA]">Label Configuration</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#FAFAFA] mb-1">
              SKU or Serial Code
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. PRC-SSD-512GB"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono uppercase text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#FAFAFA] mb-1">
              Barcode Symbology
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBarcodeType("code128")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  barcodeType === "code128"
                    ? "bg-purple-50 dark:bg-purple-950/30 border-purple-500 text-purple-600 dark:text-purple-400"
                    : "bg-slate-50 dark:bg-[#18181B] border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA]"
                }`}
              >
                <BarcodeIcon size={16} />
                <span>Code-128 (1D)</span>
              </button>

              <button
                type="button"
                onClick={() => setBarcodeType("qr")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  barcodeType === "qr"
                    ? "bg-purple-50 dark:bg-purple-950/30 border-purple-500 text-purple-600 dark:text-purple-400"
                    : "bg-slate-50 dark:bg-[#18181B] border-slate-200 dark:border-[#27272A] text-slate-600 dark:text-[#A1A1AA]"
                }`}
              >
                <QrCode size={16} />
                <span>QR Code (2D)</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!sku.trim()}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            Generate Barcode Label
          </button>
        </div>

        {/* Live Preview Canvas */}
        <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex flex-col items-center justify-center min-h-[280px]">
          {generatedCode ? (
            <div className="text-center space-y-4">
              <div className="p-6 bg-white rounded-xl border-2 border-dashed border-slate-200 shadow-sm inline-block">
                {barcodeType === "code128" ? (
                  <div className="space-y-2">
                    <div className="font-mono text-3xl tracking-widest font-black text-slate-900">
                      ||||| | |||| ||| || |||
                    </div>
                    <div className="font-mono text-xs font-bold tracking-wider text-slate-800">
                      *{generatedCode}*
                    </div>
                  </div>
                ) : (
                  <div className="w-36 h-36 bg-slate-900 text-white rounded-lg flex items-center justify-center font-mono text-xs p-2 text-center">
                    [QR: {generatedCode}]
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-[#27272A] text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  <Printer size={15} />
                  Print Label
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 text-xs">
              <BarcodeIcon size={32} className="mx-auto mb-2 opacity-40" />
              Enter an SKU code to render a printable sticker preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
