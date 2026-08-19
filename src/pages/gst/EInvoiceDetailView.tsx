import React, { useState } from 'react';
import {
  ShieldCheck, Copy, Download, ArrowLeft,
  CheckCircle, FileText, QrCode, Hash, Calendar, Building,
} from 'lucide-react';
import { downloadGSTInvoicePdf } from '../../api/gstInvoiceService';
import { downloadIRNJson, copyToClipboard } from '../../utils/invoicePdfDownloader';
import { GSTInvoice } from '../../types/admin';
import { AsyncActionButton } from '../../components/common/AsyncActionButton';

interface Props {
  invoice: GSTInvoice;
  onBack: () => void;
}

export function EInvoiceDetailView({ invoice, onBack }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const einvoice = invoice.einvoice;

  const handleCopy = async (text: string, label: string) => {
    await copyToClipboard(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadGSTInvoicePdf(invoice.id, invoice.invoice_number);
    } catch (e: any) {
      alert(e.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (!einvoice) {
    return (
      <div className="p-8 text-center bg-[#18181B] border border-[#27272A] rounded-tr-2xl rounded-bl-2xl">
        <p className="text-sm text-[#A1A1AA]">No E-Invoice data found for this invoice.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-[#8B5CF6] hover:underline"
        >
          ← Return to Invoice
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-tr-lg rounded-bl-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#8B5CF6]/40 transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-[#FAFAFA]">
              E-Invoice Registration & IRN Certificate
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Invoice Ref: <span className="font-mono text-[#8B5CF6] font-semibold">{invoice.invoice_number}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AsyncActionButton
            mode="download"
            onAction={() => downloadGSTInvoicePdf(invoice.id, invoice.invoice_number)}
            idleIcon={<Download size={14} />}
            idleLabel="Tax Invoice PDF (with IRN & QR)"
            loadingLabel="Preparing PDF…"
            successLabel="Downloaded!"
            className="flex items-center gap-1.5 px-4 py-2 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7C3AED] transition-colors shadow-md shadow-[#8B5CF6]/20"
            variant="custom"
          />
          <AsyncActionButton
            mode="download"
            onAction={() => downloadIRNJson(invoice.id, invoice.invoice_number)}
            idleIcon={<FileText size={14} />}
            idleLabel="Raw Signed JSON"
            loadingLabel="Downloading…"
            successLabel="Downloaded!"
            className="flex items-center gap-1.5 px-3 py-2 rounded-tr-xl rounded-bl-xl border border-[#27272A] text-[#A1A1AA] text-xs font-semibold hover:border-[#8B5CF6]/40 hover:text-[#FAFAFA] transition-colors"
            variant="custom"
          />
        </div>
      </div>

      {/* Verification Banner */}
      <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-green-500/10 border border-green-500/30 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 flex-shrink-0">
          <ShieldCheck size={26} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-green-400">Government Registered E-Invoice</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-300">
              IRN GENERATED
            </span>
          </div>
          <p className="text-xs text-green-300/90">
            Registered on Goods and Services Tax Network (GSTN) via <strong className="text-white">IRIS Business Services Ltd. (IRP 6)</strong>.
          </p>
          <p className="text-[11px] text-[#A1A1AA]">
            Statutory invoice data and hash are cryptographically locked on the Government IRP repository.
          </p>
        </div>
      </div>

      {/* Grid of Key Info & QR Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: IRN, Ack No, Ack Date, Customer */}
        <div className="md:col-span-2 space-y-4">
          {/* IRN Card */}
          <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
                <Hash size={12} className="text-[#8B5CF6]" />
                Invoice Reference Number (IRN)
              </span>
              <AsyncActionButton
                mode="copy"
                onAction={() => copyToClipboard(einvoice.irn!)}
                idleIcon={<Copy size={12} />}
                idleLabel="Copy IRN"
                loadingLabel="Copying…"
                successLabel="Copied!"
                className="flex items-center gap-1 text-[11px] text-[#8B5CF6] hover:underline"
                variant="custom"
              />
            </div>
            <div className="p-3 bg-[#09090B] border border-[#27272A] rounded-lg">
              <p className="font-mono text-xs text-[#FAFAFA] break-all select-all leading-relaxed">
                {einvoice.irn || '—'}
              </p>
            </div>
          </div>

          {/* Ack Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
                <Hash size={12} className="text-blue-400" />
                Acknowledgement Number
              </span>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-sm font-bold text-[#FAFAFA]">{einvoice.ack_number || '—'}</span>
                {einvoice.ack_number && (
                  <AsyncActionButton
                    mode="copy"
                    onAction={() => copyToClipboard(einvoice.ack_number!)}
                    idleIcon={<Copy size={13} />}
                    size="icon"
                    className="text-[#71717A] hover:text-[#8B5CF6]"
                    variant="custom"
                    title="Copy Ack No"
                  />
                )}
              </div>
            </div>

            <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
                <Calendar size={12} className="text-amber-400" />
                Acknowledgement Date & Time
              </span>
              <p className="text-sm font-semibold text-[#FAFAFA] pt-1">
                {einvoice.ack_date ? new Date(einvoice.ack_date).toLocaleString('en-IN') : '—'}
              </p>
            </div>
          </div>

          {/* Parties & Supply Info */}
          <div className="p-4 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
              <Building size={12} className="text-emerald-400" />
              Recipient & Supply Details
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <p className="text-[#71717A]">Recipient Legal Name</p>
                <p className="font-semibold text-[#FAFAFA]">{invoice.customer_legal_name}</p>
              </div>
              <div>
                <p className="text-[#71717A]">Recipient GSTIN</p>
                <p className="font-mono text-[#8B5CF6]">{invoice.customer_gstin || 'B2C (Unregistered)'}</p>
              </div>
              <div>
                <p className="text-[#71717A]">Place of Supply</p>
                <p className="text-[#FAFAFA]">{invoice.place_of_supply} ({invoice.place_of_supply_state_code})</p>
              </div>
              <div>
                <p className="text-[#71717A]">Supply Category</p>
                <p className="text-[#FAFAFA]">{invoice.supply_type} · {invoice.transaction_type}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: IRIS Signed QR Code */}
        <div className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] flex flex-col items-center justify-between text-center space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] flex items-center justify-center gap-1.5">
              <QrCode size={13} className="text-green-400" />
              Government Signed QR Code
            </span>
            <p className="text-[11px] text-[#A1A1AA]">
              Cryptographically signed by IRIS IRP 6
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border-2 border-green-500/40 shadow-lg">
            {einvoice.signed_qr_code ? (
              <img
                src={
                  einvoice.signed_qr_code.startsWith('data:') || einvoice.signed_qr_code.startsWith('http')
                    ? einvoice.signed_qr_code
                    : `data:image/png;base64,${einvoice.signed_qr_code}`
                }
                alt="Government Signed QR Code"
                className="w-48 h-48 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-slate-100 text-slate-400 text-xs p-4">
                QR Image not embedded in response payload
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#71717A] max-w-xs leading-relaxed">
            Verify authenticity using the official GSTN e-Invoice QR Code Verifier mobile app.
          </p>
        </div>
      </div>
    </div>
  );
}
