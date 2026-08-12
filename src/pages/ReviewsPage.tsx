import React, { useState } from "react";
import { Star, CheckCircle2, XCircle, Trash2, MessageSquare } from "lucide-react";

export function ReviewsPage() {
  const [reviews] = useState([
    { id: "REV-501", product: "Architectural Mortise Door Handle", user: "Rohan Kapoor", rating: 5, comment: "Exceptional build quality and finish. Heavy brass feel with ultra-smooth key operation.", status: "APPROVED", date: "2026-08-07" },
    { id: "REV-502", product: "SS 304 Glass Door Patch Fitting Set", user: "Meera Sen", rating: 4, comment: "Very sturdy fitting kit. Installation instructions were clear.", status: "APPROVED", date: "2026-08-05" },
    { id: "REV-503", product: "Digital Electronic Locker Lock", user: "Karan Patel", rating: 2, comment: "Battery cover was loose in shipping.", status: "PENDING_MODERATION", date: "2026-08-08" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#1F1929] to-[#18181B] border border-[#27272A] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Star size={20} className="text-[#8B5CF6]" />
            <h1 className="text-2xl font-extrabold text-[#FAFAFA] tracking-tight">Customer Ratings & Reviews</h1>
          </div>
          <p className="text-xs text-[#A1A1AA]">Moderate customer reviews, rating scores, and product feedback.</p>
        </div>
      </div>

      <div className="rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Product Name</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Rating</th>
              <th className="py-3.5 px-4">Review Text</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
            {reviews.map((r) => (
              <tr key={r.id} className="hover:bg-[#27272A]/50 transition-colors">
                <td className="py-3.5 px-4 font-bold">{r.product}</td>
                <td className="py-3.5 px-4 font-semibold text-[#A855F7]">{r.user}</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center text-amber-400 font-bold">
                    {"★".repeat(r.rating)}
                    <span className="text-[#A1A1AA] ml-1">({r.rating}/5)</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-[#A1A1AA] max-w-xs truncate">{r.comment}</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button type="button" className="p-1 rounded text-[#A1A1AA] hover:text-emerald-400"><CheckCircle2 size={14} /></button>
                  <button type="button" className="p-1 rounded text-[#A1A1AA] hover:text-rose-400"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
