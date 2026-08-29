import React, { useState } from 'react';
import {
  ArrowLeft, Printer, Download, Mail, CheckCircle2,
  Building2, MapPin, Phone, CreditCard, ShieldCheck,
  Calendar, FileText, Send, Copy, RefreshCw, AlertCircle
} from 'lucide-react';
import { ProformaInvoice } from '../../types/proforma';
import { printProformaInvoice } from '../../utils/proformaPdfGenerator';

interface Props {
  invoice: ProformaInvoice;
  onBack: () => void;
}

export function ProformaInvoiceDetailView({ invoice, onBack }: Props) {
  const [copied, setCopied] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const isInterState = invoice.igstTotal > 0;
  const facility = invoice.facility;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(invoice.piNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = () => {
    setEmailing(true);
    setTimeout(() => {
      setEmailing(false);
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* Top Header & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
            title="Back to List"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/30">
                PROFORMA INVOICE
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight font-mono">{invoice.piNumber}</h1>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title="Copy PI Number"
              >
                <Copy size={13} />
              </button>
              {copied && <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Issued for <strong>{invoice.companyName || invoice.customerName}</strong> • Origin: {facility.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => printProformaInvoice(invoice)}
            className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-zinc-300 hover:text-white text-xs font-bold rounded-xl border border-[#27272A] flex items-center gap-2 transition-all shadow-xs"
          >
            <Printer size={14} /> Print Document
          </button>

          <button
            type="button"
            onClick={() => printProformaInvoice(invoice)}
            className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-2 transition-all shadow-xs"
          >
            <Download size={14} /> Download PDF
          </button>

          <button
            type="button"
            onClick={handleSendEmail}
            disabled={emailing || emailSent}
            className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-purple-900/20"
          >
            {emailing ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Sending...
              </>
            ) : emailSent ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-300" /> Dispatched to Client
              </>
            ) : (
              <>
                <Send size={14} /> Email PI to Client
              </>
            )}
          </button>
        </div>
      </div>

      {emailSent && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center gap-2.5">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Proforma Invoice PDF successfully dispatched to <strong>{invoice.customerEmail}</strong></span>
        </div>
      )}

      {/* ─── OFFICIAL PRINTABLE PREVIEW CONTAINER ────────────────────────── */}
      <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl border border-zinc-300 space-y-6">
        
        {/* Document Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-[#34150F] pb-6">
          <div className="space-y-1 max-w-md">
            <h2 className="text-2xl font-black text-[#34150F] tracking-tight" style={{ fontFamily: "'Gilda Display', serif" }}>
              PRC HARDWARE
            </h2>
            <p className="text-[11px] font-bold uppercase text-[#85431E] tracking-wider">
              Architectural & Commercial Hardware Solutions
            </p>
            <div className="pt-2">
              <span className="inline-block bg-[#EACEAA] text-[#34150F] text-[10px] font-black px-2 py-0.5 rounded uppercase">
                {facility.name}
              </span>
              <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                <div><strong>Dispatch Works:</strong> {facility.address}, {facility.city}, {facility.state} - {facility.pincode}</div>
                <div><strong>GSTIN:</strong> <span className="font-mono font-bold text-slate-800">{facility.gstin}</span> | <strong>State Code:</strong> {facility.stateCode}</div>
                <div><strong>Email:</strong> {facility.email} | <strong>Phone:</strong> {facility.phone}</div>
              </div>
            </div>
          </div>

          <div className="text-right space-y-2">
            <div>
              <span className="text-xs font-black uppercase text-[#85431E] tracking-widest block">OFFICIAL DOCUMENT</span>
              <h3 className="text-2xl font-black text-[#34150F] tracking-tight uppercase">PROFORMA INVOICE</h3>
              <div className="text-sm font-mono font-black text-[#85431E]">{invoice.piNumber}</div>
            </div>

            <div className="bg-[#FAF5EE] border border-[#EACEAA] rounded-xl p-3 text-xs text-right space-y-1 inline-block min-w-[220px]">
              <div><strong className="text-[#34150F]">Date of Issue:</strong> {new Date(invoice.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div><strong className="text-[#34150F]">Valid Until:</strong> {new Date(invoice.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              {invoice.poReference && <div><strong className="text-[#34150F]">PO Reference:</strong> {invoice.poReference}</div>}
              {invoice.quoteReference && <div><strong className="text-[#34150F]">Quote Reference:</strong> {invoice.quoteReference}</div>}
              <div><strong className="text-[#34150F]">Place of Supply:</strong> {invoice.placeOfSupply} ({invoice.placeOfSupplyCode})</div>
            </div>
          </div>
        </div>

        {/* Buyer & Consignee Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-[#85431E] tracking-wider block border-b border-slate-200 pb-1 mb-1.5">
              Billed To (Customer / Entity)
            </span>
            <div className="text-sm font-extrabold text-[#34150F]">{invoice.companyName || invoice.customerName}</div>
            <div><strong>Contact Person:</strong> {invoice.customerName}</div>
            <div><strong>Billing Address:</strong> {invoice.billingAddress}</div>
            <div><strong>GSTIN / Tax ID:</strong> <span className="font-mono font-bold text-slate-800">{invoice.customerGstin || 'Unregistered / B2C'}</span></div>
            <div><strong>Email:</strong> {invoice.customerEmail} | <strong>Phone:</strong> {invoice.customerPhone}</div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase text-[#85431E] tracking-wider block border-b border-slate-200 pb-1 mb-1.5">
              Shipped / Delivered To (Site Destination)
            </span>
            <div className="text-sm font-extrabold text-[#34150F]">{invoice.companyName || invoice.customerName}</div>
            <div><strong>Site Destination:</strong> {invoice.shippingAddress || invoice.billingAddress}</div>
            <div><strong>Dispatch Timeline:</strong> {invoice.deliveryTimeline}</div>
            <div><strong>Payment Terms:</strong> {invoice.paymentTerms}</div>
            <div><strong>Mode of Transport:</strong> Surface Express / Dedicated Logistics</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#34150F] text-[#EACEAA] text-[10.5px] uppercase font-bold">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Item Description & Specification</th>
                <th className="p-3 w-28">HSN/SAC</th>
                <th className="p-3 w-20 text-right">Qty</th>
                <th className="p-3 w-28 text-right">Rate (₹)</th>
                <th className="p-3 w-28 text-right">Taxable (₹)</th>
                <th className="p-3 w-20 text-center">GST %</th>
                <th className="p-3 w-32 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF5EE]/60'}>
                  <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="p-3">
                    <strong className="text-[#34150F] block">{item.productName}</strong>
                    <span className="font-mono text-[10px] text-slate-500">SKU: {item.sku}</span>
                    {item.description && <p className="text-[11px] text-slate-600 mt-0.5">{item.description}</p>}
                  </td>
                  <td className="p-3 font-mono text-slate-700">{item.hsnCode}</td>
                  <td className="p-3 text-right">
                    <strong className="text-[#34150F]">{item.quantity}</strong> <span className="text-[10px] text-slate-500">{item.unit}</span>
                  </td>
                  <td className="p-3 text-right font-mono">₹{Number(item.unitPrice).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono">₹{Number(item.taxableAmount).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-center font-mono">{item.gstRate}%</td>
                  <td className="p-3 text-right font-mono font-bold text-[#34150F]">
                    ₹{Number(item.totalAmount).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Banking Details & Commercial Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* Bank Instructions */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5 text-xs text-emerald-950">
            <span className="text-[10.5px] font-black uppercase text-emerald-900 tracking-wider block border-b border-emerald-200 pb-1">
              Bank Account Details for RTGS / NEFT / IMPS
            </span>
            <div><strong>Bank Name:</strong> {facility.bankName}</div>
            <div><strong>Account Name:</strong> {facility.accountName}</div>
            <div><strong>Account Number:</strong> <span className="font-mono font-bold text-sm text-emerald-900">{facility.accountNumber}</span></div>
            <div><strong>IFSC Code:</strong> <span className="font-mono font-bold">{facility.ifscCode}</span></div>
            <div><strong>Branch:</strong> {facility.branch}</div>
            {facility.upiId && <div><strong>UPI Virtual ID:</strong> <span className="font-mono font-bold">{facility.upiId}</span></div>}
            <p className="text-[10px] text-emerald-700 pt-1">
              * Please mention PI Number <strong>{invoice.piNumber}</strong> in NEFT payment remarks for automated reconciliation.
            </p>
          </div>

          {/* Totals Summary */}
          <div className="p-4 bg-[#FAF5EE] border border-[#EACEAA] rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Basic Subtotal:</span>
              <span className="font-mono font-bold">₹{invoice.subtotal.toLocaleString('en-IN')}</span>
            </div>

            {isInterState ? (
              <div className="flex justify-between text-slate-700">
                <span>Integrated GST (IGST 18%):</span>
                <span className="font-mono font-bold text-amber-800">₹{invoice.igstTotal.toLocaleString('en-IN')}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-700">
                  <span>Central GST (CGST 9%):</span>
                  <span className="font-mono font-bold">₹{invoice.cgstTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>State GST (SGST 9%):</span>
                  <span className="font-mono font-bold">₹{invoice.sgstTotal.toLocaleString('en-IN')}</span>
                </div>
              </>
            )}

            <div className="border-t-2 border-[#34150F] pt-2 flex justify-between text-sm font-black text-[#34150F]">
              <span>Grand Total (All Taxes Incl.):</span>
              <span className="font-mono text-base">₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl flex justify-between items-center text-xs font-bold text-amber-900 mt-2">
              <span>Advance Payable ({invoice.advancePercentage}%):</span>
              <span className="font-mono font-black text-sm">₹{invoice.advancePayable.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 px-1">
              <span>Balance due at dispatch:</span>
              <span className="font-mono">₹{invoice.balancePayable.toLocaleString('en-IN')}</span>
            </div>
          </div>

        </div>

        {/* Footer Notes & Digital Stamp */}
        <div className="border-t border-slate-200 pt-4 flex flex-wrap items-end justify-between gap-4 text-[11px] text-slate-500">
          <div className="max-w-md space-y-1">
            <strong>Commercial Terms:</strong>
            <p className="text-[10px] leading-relaxed">
              1. This Proforma Invoice is valid for 30 calendar days.<br/>
              2. Production lead time starts upon receipt of advance deposit.<br/>
              3. All disputes subject to Delhi jurisdiction only.
            </p>
          </div>

          <div className="text-right space-y-1 min-w-[180px]">
            <div className="h-10 border-b border-slate-400 mb-1" />
            <strong className="text-slate-800 text-xs block">Authorized Signatory</strong>
            <span className="text-[10px]">Pacific Products and Solutions</span>
          </div>
        </div>

      </div>

    </div>
  );
}
