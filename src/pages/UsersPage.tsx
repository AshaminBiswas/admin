import React, { useState } from "react";
import { Users, Search, Plus, ShieldCheck, Mail, Phone } from "lucide-react";

export function UsersPage() {
  const [users] = useState([
    { id: "USR-301", name: "Rahul Sharma", email: "rahul.sharma@example.com", phone: "+91 9876543210", type: "B2C Retail", ordersCount: 4, spent: "₹14,280", status: "ACTIVE" },
    { id: "USR-302", name: "Acme Constructions (Pankaj Mehta)", email: "procurement@acmeconstructions.in", phone: "+91 9811223344", type: "B2B Verified", ordersCount: 35, spent: "₹18,45,000", status: "ACTIVE" },
    { id: "USR-303", name: "Sneha Reddy", email: "sneha.reddy@gmail.com", phone: "+91 9988776655", type: "B2C Retail", ordersCount: 2, spent: "₹3,890", status: "ACTIVE" },
    { id: "USR-304", name: "Pacific Design Studio (Vikram Singh)", email: "projects@pacificdesigns.com", phone: "+91 9765432109", type: "B2B Verified", ordersCount: 18, spent: "₹9,24,000", status: "ACTIVE" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#1F1929] to-[#18181B] border border-[#27272A] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[#8B5CF6]" />
            <h1 className="text-2xl font-extrabold text-[#FAFAFA] tracking-tight">Customers & Users Management</h1>
          </div>
          <p className="text-xs text-[#A1A1AA]">Manage registered B2B architects, corporate clients, retail buyers, and GST accounts.</p>
        </div>
      </div>

      <div className="rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">User ID</th>
              <th className="py-3.5 px-4">Customer Name</th>
              <th className="py-3.5 px-4">Account Type</th>
              <th className="py-3.5 px-4">Total Orders</th>
              <th className="py-3.5 px-4">Lifetime Spend</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-[#27272A]/50 transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-[#A855F7]">{u.id}</td>
                <td className="py-3.5 px-4">
                  <div className="font-bold">{u.name}</div>
                  <div className="text-[10px] text-[#A1A1AA]">{u.email} • {u.phone}</div>
                </td>
                <td className="py-3.5 px-4 font-semibold text-[#8B5CF6]">{u.type}</td>
                <td className="py-3.5 px-4 font-semibold">{u.ordersCount} orders</td>
                <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{u.spent}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {u.status}
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
