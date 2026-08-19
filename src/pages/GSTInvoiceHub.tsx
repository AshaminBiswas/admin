import React, { useState } from 'react';
import {
  Receipt, Users, BarChart3, ScrollText, Settings,
  Plus, Shield, FileCheck, ArrowLeft,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { InvoiceListView } from './gst/InvoiceListView';
import { InvoiceFormView } from './gst/InvoiceFormView';
import { InvoiceDetailView } from './gst/InvoiceDetailView';
import { CustomerDirectoryView } from './gst/CustomerDirectoryView';
import { GSTReportsView } from './gst/GSTReportsView';
import { GSTAuditLogsView } from './gst/GSTAuditLogsView';
import { CompanySettingsView } from './gst/CompanySettingsView';
import { GSTInvoice } from '../types/admin';

type GSTSubView =
  | 'invoices'
  | 'invoice-create'
  | 'invoice-edit'
  | 'invoice-detail'
  | 'customers'
  | 'reports'
  | 'audit'
  | 'settings';

export default function GSTInvoiceHub() {
  const { adminUser } = useAdminAuth();
  const [subView, setSubView] = useState<GSTSubView>('invoices');
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  const role = typeof adminUser?.role === 'string' ? adminUser.role : (adminUser?.role as any)?.slug || 'admin';

  const handleCreateNew = () => {
    setActiveInvoiceId(null);
    setSubView('invoice-create');
  };

  const handleViewInvoice = (id: string) => {
    setActiveInvoiceId(id);
    setSubView('invoice-detail');
  };

  const handleEditInvoice = (id: string) => {
    setActiveInvoiceId(id);
    setSubView('invoice-edit');
  };

  const handleSaved = (inv: GSTInvoice) => {
    setActiveInvoiceId(inv.id);
    setSubView('invoice-detail');
  };

  const navTabs = [
    { id: 'invoices', label: 'Tax Invoices', icon: <Receipt size={14} /> },
    { id: 'customers', label: 'Customers', icon: <Users size={14} /> },
    { id: 'reports', label: 'Compliance Reports', icon: <BarChart3 size={14} /> },
    { id: 'audit', label: 'Audit Trail', icon: <ScrollText size={14} /> },
    { id: 'settings', label: 'GST & IRP Settings', icon: <Settings size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
            <Receipt size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-[#FAFAFA]">
                GST Tax Invoicing & Government E-Invoice
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30">
                IRIS IRP 6
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              India Statutory Compliance · IRN Generation · Signed QR Codes · B2B / B2C Supply
            </p>
          </div>
        </div>

        {/* Global Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#18181B] border border-[#27272A] p-1 rounded-tr-xl rounded-bl-xl overflow-x-auto">
          {navTabs.map((tab) => {
            const isActive =
              subView === tab.id ||
              (tab.id === 'invoices' &&
                ['invoice-create', 'invoice-edit', 'invoice-detail'].includes(subView));

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSubView(tab.id as GSTSubView);
                  setActiveInvoiceId(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-tr-lg rounded-bl-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subview Routing */}
      {subView === 'invoices' && (
        <InvoiceListView
          onCreateNew={handleCreateNew}
          onViewInvoice={handleViewInvoice}
          onEditInvoice={handleEditInvoice}
        />
      )}

      {subView === 'invoice-create' && (
        <InvoiceFormView
          onSaved={handleSaved}
          onCancel={() => setSubView('invoices')}
        />
      )}

      {subView === 'invoice-edit' && activeInvoiceId && (
        <InvoiceFormView
          invoiceId={activeInvoiceId}
          onSaved={handleSaved}
          onCancel={() => setSubView('invoices')}
        />
      )}

      {subView === 'invoice-detail' && activeInvoiceId && (
        <InvoiceDetailView
          invoiceId={activeInvoiceId}
          adminRole={role}
          onBack={() => setSubView('invoices')}
          onEdit={(id) => handleEditInvoice(id)}
        />
      )}

      {subView === 'customers' && <CustomerDirectoryView />}

      {subView === 'reports' && <GSTReportsView />}

      {subView === 'audit' && <GSTAuditLogsView />}

      {subView === 'settings' && <CompanySettingsView />}
    </div>
  );
}
