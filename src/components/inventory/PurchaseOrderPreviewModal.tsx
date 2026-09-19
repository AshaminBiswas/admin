import React from 'react';
import {
  Printer,
  Download,
  Mail,
  X,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import {
  generatePurchaseOrderHtml,
  printPurchaseOrder,
} from '../../utils/purchaseOrderPdfGenerator';
import { purchaseOrderApi } from '../../api/purchaseOrderApi';

export interface PurchaseOrderPreviewModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onOpenEmailModal?: (po: PurchaseOrder) => void;
}

export const PurchaseOrderPreviewModal: React.FC<PurchaseOrderPreviewModalProps> = ({
  po,
  onClose,
  onOpenEmailModal,
}) => {
  const htmlContent = generatePurchaseOrderHtml(po);
  const fullPoNo = po.revision && po.revision > 0 ? `${po.poNumber}-R${po.revision}` : po.poNumber;

  const handlePrint = () => {
    printPurchaseOrder(po);
  };

  const handleDownload = () => {
    window.open(purchaseOrderApi.getPdfDownloadUrl(po.id), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#18181B] border border-zinc-700 w-full max-w-5xl rounded-2xl shadow-2xl text-white overflow-hidden my-auto max-h-[95vh] flex flex-col animate-fadeIn">
        {/* Modal Toolbar Header */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-800 bg-[#09090B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-700">
              <FileText size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-mono">{fullPoNo}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    po.status === 'SENT'
                      ? 'bg-blue-950/60 text-blue-400 border border-blue-500/20'
                      : po.status === 'RECEIVED'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                      : po.status === 'PARTIALLY_RECEIVED'
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-500/20'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {po.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Issued by {po.companyEntity === 'PRC_HARDWARE' ? 'PRC Hardware' : 'Pacific Products & Solutions'} to {po.supplier?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition flex items-center gap-1.5 border border-zinc-700"
              title="Browser Print / Save PDF"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition flex items-center gap-1.5 border border-zinc-700"
              title="Download Vector PDF"
            >
              <Download size={14} />
              <span>Vector PDF</span>
            </button>

            {onOpenEmailModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEmailModal(po);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/30"
              >
                <Mail size={14} />
                <span>{po.status === 'DRAFT' ? 'Send via Email' : 'Resend Email'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body: Rendered A4 Document Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-zinc-900/60 flex justify-center">
          <div className="bg-white text-black w-full max-w-[820px] rounded-lg shadow-xl p-6 sm:p-8 min-h-[900px] border border-zinc-300">
            <iframe
              title="PO Preview"
              srcDoc={htmlContent}
              className="w-full h-[850px] border-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800 bg-[#09090B] flex items-center justify-between text-xs text-zinc-400">
          <span>Pure Monochrome Black & White Print Format (A4 Standard)</span>
          <span>Grand Total: <strong>₹{Number(po.grandTotal).toLocaleString('en-IN')}</strong></span>
        </div>
      </div>
    </div>
  );
};
