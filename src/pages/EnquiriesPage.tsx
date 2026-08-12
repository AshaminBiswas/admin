import React, { useState } from "react";
import { HelpCircle, Mail, Phone, Clock, CheckCircle2, Search } from "lucide-react";

export function EnquiriesPage() {
  const [enquiries] = useState([
    { id: "ENQ-801", name: "Vikram Malhotra", email: "vikram@malhotrainterior.com", phone: "+91 9811234567", subject: "Bulk Inquiry for 150 Glass Patch Fittings", status: "PENDING", date: "2026-08-09 14:20" },
    { id: "ENQ-802", name: "Ananya Sharma", email: "ananya@designstudio.in", phone: "+91 9922334455", subject: "Custom Antique Brass Mortise Lock Request", status: "RESPONDED", date: "2026-08-08 11:05" },
    { id: "ENQ-803", name: "Rajesh Kumar", email: "rajesh@buildtech.com", phone: "+91 9733445566", subject: "Restroom Cubicle Nylon Hardware Warranty Specs", status: "CLOSED", date: "2026-08-06 09:40" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#1F1929] to-[#18181B] border border-[#27272A] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HelpCircle size={20} className="text-[#8B5CF6]" />
            <h1 className="text-2xl font-extrabold text-[#FAFAFA] tracking-tight">Customer Enquiries & Support</h1>
          </div>
          <p className="text-xs text-[#A1A1AA]">Manage incoming lead inquiries, product questions, and B2B requests.</p>
        </div>
      </div>

      <div className="rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Ref ID</th>
              <th className="py-3.5 px-4">Contact Person</th>
              <th className="py-3.5 px-4">Subject</th>
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
            {enquiries.map((e) => (
              <tr key={e.id} className="hover:bg-[#27272A]/50 transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-[#A855F7]">{e.id}</td>
                <td className="py-3.5 px-4">
                  <div className="font-bold">{e.name}</div>
                  <div className="text-[10px] text-[#A1A1AA]">{e.email} • {e.phone}</div>
                </td>
                <td className="py-3.5 px-4 font-semibold text-[#FAFAFA]">{e.subject}</td>
                <td className="py-3.5 px-4 font-mono text-[#A1A1AA]">{e.date}</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${e.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {e.status}
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
