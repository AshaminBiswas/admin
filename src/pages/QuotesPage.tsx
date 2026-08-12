import React, { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { INITIAL_QUOTES } from "../data/mockAdminData";
import { QuoteItem } from "../types/admin";

export function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>(INITIAL_QUOTES);

  const updateQuoteStatus = (id: string, status: QuoteItem["status"]) => {
    setQuotes(quotes.map(q => q.id === id ? { ...q, status } : q));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-md">
        <h3 className="text-lg font-bold font-serif text-[#FAFAFA]">B2B Bulk Price Quotation Management</h3>
        <p className="text-xs text-[#A1A1AA]">Approve or modify custom price quote requests submitted by architects, contractors & commercial clients.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quotes.map((q) => (
          <div key={q.id} className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-lg space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#8B5CF6]">{q.quoteNumber}</span>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  q.status === "APPROVED"
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                    : q.status === "REJECTED"
                    ? "bg-red-950/80 text-red-400 border border-red-500/40"
                    : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                }`}
              >
                {q.status}
              </span>
            </div>

            <div>
              <p className="text-sm font-bold text-[#FAFAFA]">{q.clientName}</p>
              <p className="text-xs text-[#A855F7] font-semibold">{q.companyName}</p>
              <p className="text-[11px] text-[#A1A1AA]">{q.email} • {q.phone}</p>
            </div>

            <div className="p-3 bg-[#09090B] rounded-tr-xl rounded-bl-xl text-xs space-y-1 border border-[#27272A]">
              <p className="text-[#A1A1AA] font-semibold">Requested SKUs & Scope:</p>
              <p className="text-[#FAFAFA]">{q.requestedProducts}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#27272A]">
              <div>
                <p className="text-[10px] text-[#A1A1AA] uppercase">Est. Deal Value</p>
                <p className="text-base font-extrabold text-[#8B5CF6]">₹{q.estimatedValue.toLocaleString('en-IN')}</p>
              </div>

              {q.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuoteStatus(q.id, "APPROVED")}
                    className="flex items-center gap-1 bg-emerald-900/60 hover:bg-emerald-700 text-emerald-200 font-bold text-xs px-3 py-1.5 rounded-tr-lg rounded-bl-lg transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateQuoteStatus(q.id, "REJECTED")}
                    className="flex items-center gap-1 bg-red-900/60 hover:bg-red-700 text-red-200 font-bold text-xs px-3 py-1.5 rounded-tr-lg rounded-bl-lg transition-colors"
                  >
                    <XCircle size={14} />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
