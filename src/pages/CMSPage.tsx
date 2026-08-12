import React, { useState } from "react";
import { FileCode, Plus, Search, Edit, Eye, Trash2, CheckCircle2 } from "lucide-react";

export function CMSPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [pages] = useState([
    { id: "CMS-101", title: "About PRC Architectural Hardware", slug: "about-us", author: "Admin", status: "PUBLISHED", views: 4210, updatedAt: "2026-08-01" },
    { id: "CMS-102", title: "Privacy Policy & GDPR Statement", slug: "privacy-policy", author: "Legal Team", status: "PUBLISHED", views: 1820, updatedAt: "2026-07-28" },
    { id: "CMS-103", title: "Warranty & Return Policy", slug: "warranty-returns", author: "Support", status: "PUBLISHED", views: 2950, updatedAt: "2026-08-04" },
    { id: "CMS-104", title: "Commercial Restroom Installation Guide", slug: "cubicle-guide", author: "Technical Team", status: "DRAFT", views: 0, updatedAt: "2026-08-08" },
  ]);

  const filtered = pages.filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#1F1929] to-[#18181B] border border-[#27272A] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileCode size={20} className="text-[#8B5CF6]" />
            <h1 className="text-2xl font-extrabold text-[#FAFAFA] tracking-tight">Content Management System (CMS)</h1>
          </div>
          <p className="text-xs text-[#A1A1AA]">Manage custom pages, FAQs, blog articles, and storefront policy content.</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] text-[#FAFAFA] text-xs font-bold hover:bg-[#7C3AED] shadow-lg shadow-[#8B5CF6]/25 transition-all self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Create New Page</span>
        </button>
      </div>

      <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between">
        <div className="relative w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search pages & articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#09090B] border border-[#27272A] text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      <div className="rounded-xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Page Title</th>
              <th className="py-3.5 px-4">Slug</th>
              <th className="py-3.5 px-4">Author</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Views</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-[#27272A]/50 transition-colors">
                <td className="py-3.5 px-4 font-bold">{p.title}</td>
                <td className="py-3.5 px-4 font-mono text-[#A1A1AA]">/{p.slug}</td>
                <td className="py-3.5 px-4 text-[#A1A1AA]">{p.author}</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono">{p.views.toLocaleString()}</td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button type="button" className="p-1 rounded text-[#A1A1AA] hover:text-[#FAFAFA]"><Eye size={14} /></button>
                  <button type="button" className="p-1 rounded text-[#A1A1AA] hover:text-[#FAFAFA]"><Edit size={14} /></button>
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
