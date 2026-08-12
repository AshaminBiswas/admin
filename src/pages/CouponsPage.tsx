import React, { useState } from "react";
import { Ticket, Plus, Search, Tag, CheckCircle2, Clock } from "lucide-react";

export function CouponsPage() {
  const [coupons] = useState([
    { id: "CPN-1", code: "PRCFIRST15", discount: "15% OFF", minOrder: "₹2,500", uses: 342, maxUses: 1000, status: "ACTIVE", validUntil: "2026-12-31" },
    { id: "CPN-2", code: "B2BBULK20", discount: "20% OFF", minOrder: "₹50,000", uses: 89, maxUses: 500, status: "ACTIVE", validUntil: "2026-10-15" },
    { id: "CPN-3", code: "FREESHIP500", discount: "Free Shipping", minOrder: "₹1,000", uses: 1240, maxUses: 5000, status: "ACTIVE", validUntil: "2026-09-30" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#1F1929] to-[#18181B] border border-[#27272A] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Ticket size={20} className="text-[#8B5CF6]" />
            <h1 className="text-2xl font-extrabold text-[#FAFAFA] tracking-tight">Coupons & Promo Codes</h1>
          </div>
          <p className="text-xs text-[#A1A1AA]">Manage promotional discount codes, B2B vouchers, and cart rules.</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] text-[#FAFAFA] text-xs font-bold hover:bg-[#7C3AED] shadow-lg shadow-[#8B5CF6]/25 transition-all self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Create Coupon Code</span>
        </button>
      </div>

      <div className="rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Coupon Code</th>
              <th className="py-3.5 px-4">Discount Rate</th>
              <th className="py-3.5 px-4">Min. Order</th>
              <th className="py-3.5 px-4">Redemptions</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Valid Until</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-[#27272A]/50 transition-colors">
                <td className="py-3.5 px-4 font-mono font-black text-[#A855F7] tracking-wider">{c.code}</td>
                <td className="py-3.5 px-4 font-bold text-emerald-400">{c.discount}</td>
                <td className="py-3.5 px-4">{c.minOrder}</td>
                <td className="py-3.5 px-4 font-semibold">{c.uses} / {c.maxUses}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {c.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[#A1A1AA]">{c.validUntil}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
