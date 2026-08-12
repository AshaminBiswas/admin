import React, { useState } from "react";
import { Truck, Plus, Search, MapPin, CheckCircle2 } from "lucide-react";

export function ShippingsPage() {
  const [shippingZones] = useState([
    { id: "ZONE-1", name: "Metro Cities Express (Delhi NCR, Mumbai, Blr)", carrier: "BlueDart Express", rate: "Free over ₹2,000", deliveryTime: "1-2 Days", status: "ACTIVE" },
    { id: "ZONE-2", name: "Tier-2 & Tier-3 Standard Ground", carrier: "Delhivery Surface", rate: "₹150 flat", deliveryTime: "3-5 Days", status: "ACTIVE" },
    { id: "ZONE-3", name: "B2B Heavy Cargo Freight", carrier: "GATI KWE Commercial", rate: "Calculated by Weight", deliveryTime: "4-7 Days", status: "ACTIVE" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#1F1929] to-[#18181B] border border-[#27272A] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Truck size={20} className="text-[#8B5CF6]" />
            <h1 className="text-2xl font-extrabold text-[#FAFAFA] tracking-tight">Shipping Rates & Zones</h1>
          </div>
          <p className="text-xs text-[#A1A1AA]">Configure courier partners, shipping zone rates, SLA timelines, and freight rules.</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] text-[#FAFAFA] text-xs font-bold hover:bg-[#7C3AED] shadow-lg shadow-[#8B5CF6]/25 transition-all self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Add Shipping Zone</span>
        </button>
      </div>

      <div className="rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Zone Name</th>
              <th className="py-3.5 px-4">Carrier Integration</th>
              <th className="py-3.5 px-4">Rate Structure</th>
              <th className="py-3.5 px-4">Est. SLA</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
            {shippingZones.map((z) => (
              <tr key={z.id} className="hover:bg-[#27272A]/50 transition-colors">
                <td className="py-3.5 px-4 font-bold">{z.name}</td>
                <td className="py-3.5 px-4 font-semibold text-[#8B5CF6]">{z.carrier}</td>
                <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{z.rate}</td>
                <td className="py-3.5 px-4 font-medium text-[#A1A1AA]">{z.deliveryTime}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {z.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
