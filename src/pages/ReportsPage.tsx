import React, { useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  Package,
  ShieldCheck,
} from "lucide-react";
import { AsyncActionButton } from "../components/common/AsyncActionButton";

type ReportType = "sales" | "quotes" | "inventory" | "tax";

interface ReportItem {
  id: string;
  name: string;
  category: string;
  dateRange: string;
  recordsCount: number;
  type: ReportType;
  description: string;
}

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("sales");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("current-month");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Report Definitions
  const REPORTS_LIST: ReportItem[] = [
    {
      id: "rep-1",
      name: "Monthly Sales & Order Audit Report",
      category: "Sales & Revenue",
      dateRange: "Aug 1 - Aug 31, 2026",
      recordsCount: 342,
      type: "sales",
      description: "Detailed transactional audit of all executive B2B and retail customer orders, payment statuses, and fulfillment.",
    },
    {
      id: "rep-2",
      name: "B2B Price Quotation & Conversion Report",
      category: "B2B Deals",
      dateRange: "Aug 1 - Aug 31, 2026",
      recordsCount: 68,
      type: "quotes",
      description: "Complete log of B2B bulk price requests, approved discounts, contract values, and conversion rates.",
    },
    {
      id: "rep-3",
      name: "Inventory Valuation & Stock Level Audit",
      category: "Inventory",
      dateRange: "As of Aug 2026",
      recordsCount: 154,
      type: "inventory",
      description: "Comprehensive hardware SKU inventory asset valuation, unit prices, minimum stock alerts, and reorder levels.",
    },
    {
      id: "rep-4",
      name: "GST & Tax Compliance Summary Report",
      category: "Tax & Finance",
      dateRange: "Q2 2026 Audit",
      recordsCount: 280,
      type: "tax",
      description: "GSTIN tax breakdown, CGST, SGST, IGST tax liability summaries and corporate billing records.",
    },
  ];

  // Table Data Mock Sets
  const SALES_TABLE_DATA = [
    { id: "ORD-2026-8801", customer: "BuildCorp Infra Ltd", date: "2026-08-07", items: 42, amount: 245000, status: "DELIVERED", gst: 44100, carrier: "BlueDart Express" },
    { id: "ORD-2026-8802", customer: "Apex Contractors", date: "2026-08-06", items: 15, amount: 89000, status: "SHIPPED", gst: 16020, carrier: "Delhivery Surface" },
    { id: "ORD-2026-8803", customer: "Metro Plumbing Works", date: "2026-08-05", items: 28, amount: 134500, status: "PROCESSING", gst: 24210, carrier: "VRL Logistics" },
    { id: "ORD-2026-8804", customer: "Sharma Enterprise", date: "2026-08-04", items: 8, amount: 42000, status: "DELIVERED", gst: 7560, carrier: "BlueDart Express" },
    { id: "ORD-2026-8805", customer: "Urban Builders Corp", date: "2026-08-03", items: 60, amount: 410000, status: "DELIVERED", gst: 73800, carrier: "TCI Freight" },
    { id: "ORD-2026-8806", customer: "Pacific Heavy Hardware", date: "2026-08-02", items: 12, amount: 67500, status: "PENDING", gst: 12150, carrier: "Self Pickup" },
  ];

  const QUOTES_TABLE_DATA = [
    { id: "QT-2026-4401", client: "BuildCorp Infra", company: "BuildCorp Group", reqValue: 500000, finalValue: 475000, status: "APPROVED", margin: "14.5%", date: "2026-08-06" },
    { id: "QT-2026-4402", client: "Rajesh Kumar", company: "RK Hardware Agency", reqValue: 180000, finalValue: 170000, status: "APPROVED", margin: "12.0%", date: "2026-08-05" },
    { id: "QT-2026-4403", client: "Sunil Verma", company: "Verma Infra Solutions", reqValue: 950000, finalValue: 900000, status: "UNDER_REVIEW", margin: "16.2%", date: "2026-08-04" },
    { id: "QT-2026-4404", client: "Anil Kapoor", company: "AK Steel & Fasteners", reqValue: 320000, finalValue: 320000, status: "REJECTED", margin: "0.0%", date: "2026-08-02" },
  ];

  const INVENTORY_TABLE_DATA = [
    { sku: "DWT-DCD791", name: "DeWalt 18V XR Brushless Drill", category: "Power Tools", stock: 45, unitPrice: 12999, totalAsset: 584955, status: "IN_STOCK" },
    { sku: "BSH-GSB-600", name: "Bosch GSB 600 Impact Drill Kit", category: "Power Tools", stock: 8, unitPrice: 4500, totalAsset: 36000, status: "LOW_STOCK" },
    { sku: "ANC-M12-100", name: "M12 Heavy Expansion Anchors (Box 50)", category: "Fasteners", stock: 180, unitPrice: 1850, totalAsset: 333000, status: "IN_STOCK" },
    { sku: "PLM-SS304-P", name: "SS 304 High-Pressure Ball Valve 2\"", category: "Plumbing", stock: 92, unitPrice: 2400, totalAsset: 220800, status: "IN_STOCK" },
    { sku: "SFT-HELMET-I", name: "Industrial Hard Safety Helmet Yellow", category: "Safety Gear", stock: 3, unitPrice: 850, totalAsset: 2550, status: "CRITICAL_LOW" },
  ];

  const TAX_TABLE_DATA = [
    { invoice: "INV-2026-101", date: "2026-08-07", gstin: "07AAAAA0000A1Z5", taxable: 207627, cgst: 18686, sgst: 18686, igst: 0, totalTax: 37372, grandTotal: 245000 },
    { invoice: "INV-2026-102", date: "2026-08-06", gstin: "03BBBBB1111B2Z4", taxable: 75424, cgst: 6788, sgst: 6788, igst: 0, totalTax: 13576, grandTotal: 89000 },
    { invoice: "INV-2026-103", date: "2026-08-05", gstin: "06CCCCC2222C3Z3", taxable: 113983, cgst: 0, sgst: 0, igst: 20517, totalTax: 20517, grandTotal: 134500 },
    { invoice: "INV-2026-104", date: "2026-08-03", gstin: "07DDDDD3333D4Z2", taxable: 347458, cgst: 31271, sgst: 31271, igst: 0, totalTax: 62542, grandTotal: 410000 },
  ];

  // Excel (.xlsx) Table Generator Function
  const exportToExcel = () => {
    const activeRep = REPORTS_LIST.find((r) => r.type === selectedReport);
    let tableHtml = "";

    if (selectedReport === "sales") {
      tableHtml = `
        <table border="1">
          <thead>
            <tr style="background-color: #8B5CF6; color: #ffffff; font-weight: bold;">
              <th>Order ID</th>
              <th>Customer / Corporate Entity</th>
              <th>Date</th>
              <th>Items Count</th>
              <th>Total Amount (INR)</th>
              <th>GST (18%)</th>
              <th>Fulfillment Status</th>
              <th>Dispatch Carrier</th>
            </tr>
          </thead>
          <tbody>
            ${SALES_TABLE_DATA.map(
              (r) => `
              <tr>
                <td>${r.id}</td>
                <td>${r.customer}</td>
                <td>${r.date}</td>
                <td>${r.items}</td>
                <td>INR ${r.amount}</td>
                <td>INR ${r.gst}</td>
                <td>${r.status}</td>
                <td>${r.carrier}</td>
              </tr>
            `
            ).join("")}
          </tbody>
        </table>
      `;
    } else if (selectedReport === "quotes") {
      tableHtml = `
        <table border="1">
          <thead>
            <tr style="background-color: #8B5CF6; color: #ffffff; font-weight: bold;">
              <th>Quote ID</th>
              <th>Client Contact</th>
              <th>Company Name</th>
              <th>Requested Value (INR)</th>
              <th>Approved Value (INR)</th>
              <th>Margin (%)</th>
              <th>Deal Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${QUOTES_TABLE_DATA.map(
              (r) => `
              <tr>
                <td>${r.id}</td>
                <td>${r.client}</td>
                <td>${r.company}</td>
                <td>INR ${r.reqValue}</td>
                <td>INR ${r.finalValue}</td>
                <td>${r.margin}</td>
                <td>${r.status}</td>
                <td>${r.date}</td>
              </tr>
            `
            ).join("")}
          </tbody>
        </table>
      `;
    } else if (selectedReport === "inventory") {
      tableHtml = `
        <table border="1">
          <thead>
            <tr style="background-color: #8B5CF6; color: #ffffff; font-weight: bold;">
              <th>SKU Code</th>
              <th>Hardware Product Name</th>
              <th>Category</th>
              <th>Stock Level</th>
              <th>Unit Price (INR)</th>
              <th>Total Asset Valuation (INR)</th>
              <th>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            ${INVENTORY_TABLE_DATA.map(
              (r) => `
              <tr>
                <td>${r.sku}</td>
                <td>${r.name}</td>
                <td>${r.category}</td>
                <td>${r.stock}</td>
                <td>INR ${r.unitPrice}</td>
                <td>INR ${r.totalAsset}</td>
                <td>${r.status}</td>
              </tr>
            `
            ).join("")}
          </tbody>
        </table>
      `;
    } else {
      tableHtml = `
        <table border="1">
          <thead>
            <tr style="background-color: #8B5CF6; color: #ffffff; font-weight: bold;">
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer GSTIN</th>
              <th>Taxable Value (INR)</th>
              <th>CGST (9%)</th>
              <th>SGST (9%)</th>
              <th>IGST (18%)</th>
              <th>Total Tax (INR)</th>
              <th>Grand Total (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${TAX_TABLE_DATA.map(
              (r) => `
              <tr>
                <td>${r.invoice}</td>
                <td>${r.date}</td>
                <td>${r.gstin}</td>
                <td>INR ${r.taxable}</td>
                <td>INR ${r.cgst}</td>
                <td>INR ${r.sgst}</td>
                <td>INR ${r.igst}</td>
                <td>INR ${r.totalTax}</td>
                <td>INR ${r.grandTotal}</td>
              </tr>
            `
            ).join("")}
          </tbody>
        </table>
      `;
    }

    const excelFile = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${activeRep?.name || 'Report'}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        </head>
        <body>
          <h2>PRC Hardware Enterprise — ${activeRep?.name}</h2>
          <p>Generated Date: ${new Date().toLocaleString()}</p>
          ${tableHtml}
        </body>
      </html>
    `;

    const blob = new Blob([excelFile], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRC_Report_${selectedReport.toUpperCase()}_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    triggerToast(`Excel Report (.xlsx) downloaded successfully!`);
  };

  // PDF Table Printer & Exporter Function
  const exportToPDF = () => {
    const activeRep = REPORTS_LIST.find((r) => r.type === selectedReport);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      triggerToast("Please allow popups to generate PDF report documents.");
      return;
    }

    let tableHeaders = "";
    let tableBody = "";

    if (selectedReport === "sales") {
      tableHeaders = `<th>Order ID</th><th>Customer</th><th>Date</th><th>Items</th><th>Amount</th><th>GST</th><th>Status</th>`;
      tableBody = SALES_TABLE_DATA.map(
        (r) => `<tr><td><b>${r.id}</b></td><td>${r.customer}</td><td>${r.date}</td><td>${r.items}</td><td>₹${r.amount.toLocaleString()}</td><td>₹${r.gst.toLocaleString()}</td><td><span class="badge">${r.status}</span></td></tr>`
      ).join("");
    } else if (selectedReport === "quotes") {
      tableHeaders = `<th>Quote ID</th><th>Client Name</th><th>Company</th><th>Req. Value</th><th>Approved Value</th><th>Margin</th><th>Status</th>`;
      tableBody = QUOTES_TABLE_DATA.map(
        (r) => `<tr><td><b>${r.id}</b></td><td>${r.client}</td><td>${r.company}</td><td>₹${r.reqValue.toLocaleString()}</td><td>₹${r.finalValue.toLocaleString()}</td><td>${r.margin}</td><td><span class="badge">${r.status}</span></td></tr>`
      ).join("");
    } else if (selectedReport === "inventory") {
      tableHeaders = `<th>SKU Code</th><th>Product Name</th><th>Category</th><th>Stock</th><th>Unit Price</th><th>Asset Value</th><th>Status</th>`;
      tableBody = INVENTORY_TABLE_DATA.map(
        (r) => `<tr><td><b>${r.sku}</b></td><td>${r.name}</td><td>${r.category}</td><td>${r.stock}</td><td>₹${r.unitPrice.toLocaleString()}</td><td>₹${r.totalAsset.toLocaleString()}</td><td><span class="badge">${r.status}</span></td></tr>`
      ).join("");
    } else {
      tableHeaders = `<th>Invoice</th><th>Date</th><th>GSTIN</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Grand Total</th>`;
      tableBody = TAX_TABLE_DATA.map(
        (r) => `<tr><td><b>${r.invoice}</b></td><td>${r.date}</td><td>${r.gstin}</td><td>₹${r.taxable.toLocaleString()}</td><td>₹${r.cgst.toLocaleString()}</td><td>₹${r.sgst.toLocaleString()}</td><td>₹${r.igst.toLocaleString()}</td><td>₹${r.grandTotal.toLocaleString()}</td></tr>`
      ).join("");
    }

    const pdfHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PRC Hardware — ${activeRep?.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #111827; }
            .header { border-bottom: 3px solid #8B5CF6; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 20px; font-weight: bold; color: #1E1B4B; }
            .subtitle { font-size: 11px; color: #6B7280; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th { background-color: #8B5CF6; color: #ffffff; padding: 10px 8px; text-align: left; font-size: 11px; border: 1px solid #7C3AED; }
            td { border: 1px solid #E5E7EB; padding: 8px; text-align: left; }
            tr:nth-child(even) { background-color: #F9FAFB; }
            .badge { background-color: #EDE9FE; color: #6D28D9; padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
            .footer { margin-top: 40px; font-size: 10px; color: #9CA3AF; border-top: 1px solid #E5E7EB; padding-top: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">PRC HARDWARE ENTERPRISE</div>
              <div class="subtitle">Official Financial & Operations Audit Document — ${activeRep?.name}</div>
            </div>
            <div style="text-align: right; font-size: 10px; color: #6B7280;">
              <div>Date: ${new Date().toLocaleDateString()}</div>
              <div>Security Status: VERIFIED EXECUTIVE REPORT</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableBody}
            </tbody>
          </table>

          <div class="footer">
            Confidential PRC Hardware Audit Report. Generated for internal executive review only.
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(pdfHtml);
    printWindow.document.close();
    triggerToast("PDF document print & export dialog generated!");
  };

  const currentReportObj = REPORTS_LIST.find((r) => r.type === selectedReport);

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18181B] border border-[#8B5CF6] text-[#FAFAFA] px-4 py-3 rounded-tr-xl rounded-bl-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={20} className="text-[#8B5CF6]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#18181B] p-6 rounded-tr-3xl rounded-bl-3xl border border-[#27272A]">
        <div>
          <div className="flex items-center gap-2 text-[#8B5CF6]">
            <FileSpreadsheet size={22} />
            <h1 className="text-2xl font-bold font-serif text-[#FAFAFA]">Reports & Downloads Center</h1>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Download structured executive audit reports strictly in formatted **Excel (.xlsx)** or **PDF (.pdf)** formats.
          </p>
        </div>

        {/* Global Export Action Buttons */}
        <div className="flex items-center gap-3">
          <AsyncActionButton
            mode="download"
            onAction={exportToExcel}
            idleIcon={<FileSpreadsheet size={16} />}
            idleLabel="Download Excel (.xlsx)"
            loadingLabel="Generating XLSX…"
            successLabel="Downloaded!"
            className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-[#FAFAFA] font-bold text-xs px-4 py-2.5 rounded-tr-xl rounded-bl-xl shadow-lg shadow-[#10B981]/20 transition-all"
            variant="custom"
          />

          <AsyncActionButton
            mode="view"
            onAction={exportToPDF}
            idleIcon={<Printer size={16} />}
            idleLabel="Download PDF (.pdf)"
            loadingLabel="Generating PDF…"
            className="flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-[#FAFAFA] font-bold text-xs px-4 py-2.5 rounded-tr-xl rounded-bl-xl shadow-lg shadow-[#8B5CF6]/20 transition-all"
            variant="custom"
          />
        </div>
      </div>

      {/* Reports Selection Tabs / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORTS_LIST.map((rep) => {
          const isSelected = selectedReport === rep.type;
          return (
            <button
              key={rep.id}
              type="button"
              onClick={() => setSelectedReport(rep.type)}
              className={`p-4 rounded-tr-2xl rounded-bl-2xl border text-left transition-all duration-200 relative ${
                isSelected
                  ? "bg-[#8B5CF6]/15 border-[#8B5CF6] text-[#FAFAFA] shadow-lg shadow-[#8B5CF6]/10"
                  : "bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:border-[#8B5CF6]/50 hover:text-[#FAFAFA]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#09090B] text-[#A855F7] border border-[#27272A]">
                  {rep.category}
                </span>
                {isSelected && <CheckCircle2 size={16} className="text-[#8B5CF6]" />}
              </div>
              <h3 className="text-xs font-bold text-[#FAFAFA]">{rep.name}</h3>
              <p className="text-[10px] text-[#A1A1AA] mt-1 line-clamp-2">{rep.description}</p>
              <div className="mt-3 flex items-center justify-between text-[10px] text-[#A1A1AA] pt-2 border-t border-[#27272A]/50">
                <span>{rep.dateRange}</span>
                <span className="font-bold text-[#FAFAFA]">{rep.recordsCount} records</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Selected Report Preview Card */}
      <div className="bg-[#18181B] rounded-tr-3xl rounded-bl-3xl border border-[#27272A] p-6 space-y-6">
        {/* Table Search & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#FAFAFA] font-serif flex items-center gap-2">
              <span>{currentReportObj?.name}</span>
              <span className="text-xs font-normal text-[#A1A1AA]">({currentReportObj?.recordsCount} Entries)</span>
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">{currentReportObj?.description}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Table Search */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search report rows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#A1A1AA]/50 pl-9 pr-3 py-1.5 rounded-tr-xl rounded-bl-xl text-xs border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
            </div>

            {/* Excel Download Direct */}
            <button
              type="button"
              onClick={exportToExcel}
              className="p-2 bg-[#09090B] border border-[#27272A] hover:border-[#10B981] text-[#10B981] rounded-tr-xl rounded-bl-xl transition-colors"
              title="Download Excel (.xlsx)"
            >
              <FileSpreadsheet size={18} />
            </button>

            {/* PDF Download Direct */}
            <button
              type="button"
              onClick={exportToPDF}
              className="p-2 bg-[#09090B] border border-[#27272A] hover:border-[#8B5CF6] text-[#8B5CF6] rounded-tr-xl rounded-bl-xl transition-colors"
              title="Download PDF (.pdf)"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>

        {/* Structured Data Table */}
        <div className="overflow-x-auto border border-[#27272A] rounded-tr-2xl rounded-bl-2xl bg-[#09090B]">
          {selectedReport === "sales" && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181B] text-[#A1A1AA] uppercase tracking-wider font-bold text-[10px] border-b border-[#27272A]">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Customer / Entity</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Gross Amount</th>
                  <th className="p-3">GST (18%)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Carrier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
                {SALES_TABLE_DATA.filter((r) =>
                  r.customer.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((row) => (
                  <tr key={row.id} className="hover:bg-[#18181B]/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#8B5CF6]">{row.id}</td>
                    <td className="p-3 font-bold">{row.customer}</td>
                    <td className="p-3 text-[#A1A1AA]">{row.date}</td>
                    <td className="p-3 font-mono">{row.items}</td>
                    <td className="p-3 font-bold font-mono">₹{row.amount.toLocaleString()}</td>
                    <td className="p-3 font-mono text-[#A1A1AA]">₹{row.gst.toLocaleString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#A1A1AA]">{row.carrier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === "quotes" && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181B] text-[#A1A1AA] uppercase tracking-wider font-bold text-[10px] border-b border-[#27272A]">
                <tr>
                  <th className="p-3">Quote ID</th>
                  <th className="p-3">Client Contact</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Req. Value</th>
                  <th className="p-3">Approved Value</th>
                  <th className="p-3">Margin</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
                {QUOTES_TABLE_DATA.filter((r) =>
                  r.client.toLowerCase().includes(searchTerm.toLowerCase()) || r.company.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((row) => (
                  <tr key={row.id} className="hover:bg-[#18181B]/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#8B5CF6]">{row.id}</td>
                    <td className="p-3 font-bold">{row.client}</td>
                    <td className="p-3 text-[#A1A1AA]">{row.company}</td>
                    <td className="p-3 font-mono">₹{row.reqValue.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-[#10B981]">₹{row.finalValue.toLocaleString()}</td>
                    <td className="p-3 font-bold">{row.margin}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8B5CF6]/15 text-[#A855F7] border border-[#8B5CF6]/30">
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#A1A1AA]">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === "inventory" && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181B] text-[#A1A1AA] uppercase tracking-wider font-bold text-[10px] border-b border-[#27272A]">
                <tr>
                  <th className="p-3">SKU Code</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Stock Level</th>
                  <th className="p-3">Unit Price</th>
                  <th className="p-3">Total Asset Value</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
                {INVENTORY_TABLE_DATA.filter((r) =>
                  r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.sku.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((row) => (
                  <tr key={row.sku} className="hover:bg-[#18181B]/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#8B5CF6]">{row.sku}</td>
                    <td className="p-3 font-bold">{row.name}</td>
                    <td className="p-3 text-[#A1A1AA]">{row.category}</td>
                    <td className="p-3 font-mono font-bold">{row.stock} units</td>
                    <td className="p-3 font-mono">₹{row.unitPrice.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-[#10B981]">₹{row.totalAsset.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        row.status === "IN_STOCK" ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30" : "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === "tax" && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181B] text-[#A1A1AA] uppercase tracking-wider font-bold text-[10px] border-b border-[#27272A]">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Taxable Value</th>
                  <th className="p-3">CGST (9%)</th>
                  <th className="p-3">SGST (9%)</th>
                  <th className="p-3">IGST (18%)</th>
                  <th className="p-3">Total Tax</th>
                  <th className="p-3">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-[#FAFAFA]">
                {TAX_TABLE_DATA.filter((r) =>
                  r.invoice.toLowerCase().includes(searchTerm.toLowerCase()) || r.gstin.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((row) => (
                  <tr key={row.invoice} className="hover:bg-[#18181B]/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#8B5CF6]">{row.invoice}</td>
                    <td className="p-3 text-[#A1A1AA]">{row.date}</td>
                    <td className="p-3 font-mono text-[#A1A1AA]">{row.gstin}</td>
                    <td className="p-3 font-mono">₹{row.taxable.toLocaleString()}</td>
                    <td className="p-3 font-mono text-[#A1A1AA]">₹{row.cgst.toLocaleString()}</td>
                    <td className="p-3 font-mono text-[#A1A1AA]">₹{row.sgst.toLocaleString()}</td>
                    <td className="p-3 font-mono text-[#A1A1AA]">₹{row.igst.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-[#F59E0B]">₹{row.totalTax.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-[#10B981]">₹{row.grandTotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Audit Stamp */}
        <div className="flex items-center justify-between text-xs text-[#A1A1AA] pt-4 border-t border-[#27272A]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#10B981]" />
            <span>PRC Hardware Audit Verified Document</span>
          </div>
          <span>Strictly Exportable to Excel (.xlsx) & PDF (.pdf) Formats Only</span>
        </div>
      </div>
    </div>
  );
}
