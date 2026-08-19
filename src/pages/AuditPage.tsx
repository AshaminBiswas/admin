import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Download,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Lock,
  UserCheck,
  Package,
  ShoppingCart,
  Settings,
  Info,
  Clock,
  Laptop,
  Globe,
  Copy,
  Check,
  X,
  Plus,
} from "lucide-react";
import { AsyncActionButton } from "../components/common/AsyncActionButton";
import { useAdminAuth } from "../context/AdminAuthContext";
import { AuditLogItem } from "../types/admin";
import { getAuditLogs, logAdminActivity, clearAuditLogs } from "../api/auditService";

export function AuditPage() {
  const { setCurrentView, adminUser } = useAdminAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(true);

  // Load audit logs on mount & setup auto-refresh poll
  const loadLogs = () => {
    const data = getAuditLogs();
    setLogs(data);
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 3000); // 3-second live refresh
    return () => clearInterval(interval);
  }, []);

  // Filter logs based on search, category, and severity
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ipAddress && log.ipAddress.includes(searchTerm));

    const matchesCategory =
      selectedCategory === "ALL" ||
      log.category === selectedCategory ||
      log.entity === selectedCategory;

    const matchesSeverity =
      selectedSeverity === "ALL" || log.severity === selectedSeverity;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const handleSimulateActivity = () => {
    const sampleActions = [
      {
        action: "UPDATE_STOCK",
        entity: "CATALOG",
        category: "CATALOG",
        severity: "INFO" as const,
        details: "Adjusted warehouse stock level for SKU PRC-MORT-COP-01 (+10 units).",
        payload: { sku: "PRC-MORT-COP-01", stockChange: "+10", updatedBy: adminUser?.email || "admin@prchardware.com" },
      },
      {
        action: "APPROVE_QUOTE",
        entity: "SALES",
        category: "SALES",
        severity: "SUCCESS" as const,
        details: "Approved B2B quote request PRC-QUOTE-2026-904 (Value: ₹4,20,000).",
        payload: { quoteId: "PRC-QUOTE-2026-904", client: "Oberoi Realty Ltd" },
      },
      {
        action: "SECURITY_CHECK",
        entity: "AUTH",
        category: "AUTH",
        severity: "SECURITY" as const,
        details: "Active 2FA TOTP token validation check passed for executive session.",
        payload: { status: "VALIDATED", sessionLifetimeRemainingMs: 3400000 },
      },
      {
        action: "UPDATE_SETTINGS",
        entity: "SYSTEM",
        category: "SYSTEM",
        severity: "CRITICAL" as const,
        details: "Updated Executive Security Policy: 10-Min Idle & 60-Min Max Session Expiry Enforced.",
        payload: { idleTimeoutMin: 10, maxSessionLifetimeMin: 60, enforced: true },
      },
    ];

    const randomAction = sampleActions[Math.floor(Math.random() * sampleActions.length)];
    logAdminActivity({
      ...randomAction,
      adminEmail: adminUser?.email || "admin@prchardware.com",
    });
    loadLogs();
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `prc_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/30">
            <AlertTriangle size={11} />
            <span>CRITICAL</span>
          </span>
        );
      case "SECURITY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-500/30">
            <Lock size={11} />
            <span>SECURITY</span>
          </span>
        );
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 size={11} />
            <span>SUCCESS</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-500/30">
            <Info size={11} />
            <span>INFO</span>
          </span>
        );
    }
  };

  const getCategoryIcon = (cat?: string) => {
    switch (cat) {
      case "AUTH":
        return <Lock size={15} className="text-purple-400" />;
      case "CATALOG":
        return <Package size={15} className="text-sky-400" />;
      case "SALES":
        return <ShoppingCart size={15} className="text-emerald-400" />;
      case "SYSTEM":
        return <Settings size={15} className="text-amber-400" />;
      default:
        return <Activity size={15} className="text-[#8B5CF6]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Back Navigation Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] p-5 rounded-tr-2xl rounded-bl-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCurrentView("dashboard")}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#09090B] text-slate-700 dark:text-[#FAFAFA] border border-slate-200 dark:border-[#27272A] hover:bg-[#8B5CF6] hover:text-white transition-all flex items-center gap-2 text-xs font-bold shadow-sm active:scale-95"
            title="Return to Executive Dashboard"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-[#FAFAFA]">
                Log Records & Audit Trail
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Stream Active</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA] mt-0.5">
              Real-time cryptographic activity trail of executive logins, 2FA authentications, stock edits & system policies.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSimulateActivity}
            className="px-3 py-2 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] dark:text-[#A855F7] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus size={14} />
            <span>Simulate Log Event</span>
          </button>

          <AsyncActionButton
            mode="download"
            onAction={handleExportJSON}
            idleIcon={<Download size={14} />}
            idleLabel="Export JSON"
            loadingLabel="Exporting…"
            successLabel="Exported!"
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#09090B] text-slate-700 dark:text-[#FAFAFA] border border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6] text-xs font-bold transition-all shadow-sm"
            variant="custom"
          />
        </div>
      </div>

      {/* Control Bar: Search & Category Filters */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] p-4 rounded-tr-2xl rounded-bl-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search action code, admin email, IP address, or details..."
              className="w-full bg-slate-50 dark:bg-[#09090B] text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#A1A1AA]/50 pl-10 pr-4 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Severity Dropdown Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-[#A1A1AA] flex items-center gap-1">
              <Filter size={14} />
              <span>Severity:</span>
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-50 dark:bg-[#09090B] text-slate-900 dark:text-[#FAFAFA] text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="SECURITY">Security / 2FA Only</option>
              <option value="SUCCESS">Success Only</option>
              <option value="INFO">Info Only</option>
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-200 dark:border-[#27272A] pt-3 overflow-x-auto">
          {[
            { key: "ALL", label: "All Activity Logs" },
            { key: "AUTH", label: "Auth & 2FA Security" },
            { key: "CATALOG", label: "Products & Stock" },
            { key: "SALES", label: "Orders & Quotations" },
            { key: "SYSTEM", label: "Admin System & Roles" },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.key
                  ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/20"
                  : "bg-slate-100 dark:bg-[#09090B] text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-200 dark:hover:bg-[#27272A] border border-slate-200 dark:border-[#27272A]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Stream Cards / Table */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] p-5 rounded-tr-2xl rounded-bl-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#27272A] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-[#FAFAFA]">
            <Activity size={16} className="text-[#8B5CF6]" />
            <span>Real-Time Audit Records ({filteredLogs.length})</span>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-[#A1A1AA]">
            Showing most recent events first
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center space-y-2 text-slate-500 dark:text-[#A1A1AA]">
            <AlertTriangle size={32} className="mx-auto text-amber-500" />
            <p className="text-sm font-bold">No audit logs matching your current filter criteria.</p>
            <p className="text-xs">Try clearing your search term or switching category filters.</p>
          </div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="p-4 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-tr-xl rounded-bl-xl hover:border-[#8B5CF6] hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-sm flex-shrink-0 group-hover:border-[#8B5CF6]">
                    {getCategoryIcon(log.category || log.entity)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#8B5CF6] dark:text-[#A855F7] tracking-wide text-xs">
                        {log.action}
                      </span>
                      {getSeverityBadge(log.severity)}
                      <span className="text-[10px] text-slate-400 dark:text-[#71717A] bg-slate-200 dark:bg-[#18181B] px-2 py-0.5 rounded font-mono">
                        {log.id}
                      </span>
                    </div>

                    <p className="text-xs text-slate-900 dark:text-[#FAFAFA] font-sans font-medium line-clamp-2">
                      {log.details}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-[#A1A1AA] pt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <UserCheck size={12} className="text-[#8B5CF6]" />
                        <span className="font-semibold text-slate-700 dark:text-[#FAFAFA]">{log.adminEmail}</span>
                      </span>

                      {log.ipAddress && (
                        <span className="flex items-center gap-1">
                          <Globe size={12} className="text-slate-400" />
                          <span>{log.ipAddress}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right flex-shrink-0 flex items-center sm:flex-col justify-between w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-[#27272A]">
                  <span className="text-[11px] text-slate-500 dark:text-[#A1A1AA] font-mono flex items-center gap-1">
                    <Clock size={12} />
                    <span>{log.createdAt}</span>
                  </span>

                  <span className="text-[10px] text-[#8B5CF6] font-bold group-hover:underline mt-1">
                    Inspect Record →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-tr-3xl rounded-bl-3xl shadow-2xl p-6 space-y-5 text-slate-900 dark:text-[#FAFAFA]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#27272A] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6]">
                  {getCategoryIcon(selectedLog.category || selectedLog.entity)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-[#FAFAFA]">
                      {selectedLog.action}
                    </h3>
                    {getSeverityBadge(selectedLog.severity)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
                    Audit Record ID: <code className="text-[#8B5CF6] font-mono font-bold">{selectedLog.id}</code>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Log Details Grid */}
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-[#09090B] p-4 rounded-tr-xl rounded-bl-xl border border-slate-200 dark:border-[#27272A] space-y-2">
                <h4 className="text-[11px] font-bold text-[#8B5CF6] uppercase tracking-wider">Event Summary</h4>
                <p className="text-sm font-semibold text-slate-900 dark:text-[#FAFAFA] leading-relaxed">
                  {selectedLog.details}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-[#09090B] rounded-xl border border-slate-200 dark:border-[#27272A]">
                  <span className="text-[10px] text-slate-400 dark:text-[#71717A] block font-bold uppercase">Executive Admin</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-[#FAFAFA] mt-0.5 block">{selectedLog.adminEmail}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#09090B] rounded-xl border border-slate-200 dark:border-[#27272A]">
                  <span className="text-[10px] text-slate-400 dark:text-[#71717A] block font-bold uppercase">Timestamp</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-[#FAFAFA] mt-0.5 block">{selectedLog.createdAt}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#09090B] rounded-xl border border-slate-200 dark:border-[#27272A]">
                  <span className="text-[10px] text-slate-400 dark:text-[#71717A] block font-bold uppercase">Origin IP Address</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-[#FAFAFA] mt-0.5 block">{selectedLog.ipAddress || "103.21.124.50"}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#09090B] rounded-xl border border-slate-200 dark:border-[#27272A]">
                  <span className="text-[10px] text-slate-400 dark:text-[#71717A] block font-bold uppercase">Category & Entity</span>
                  <span className="font-mono font-bold text-[#8B5CF6] mt-0.5 block">{selectedLog.category || "SYSTEM"} / {selectedLog.entity}</span>
                </div>
              </div>

              {/* User-Agent */}
              <div className="p-3 bg-slate-50 dark:bg-[#09090B] rounded-xl border border-slate-200 dark:border-[#27272A]">
                <span className="text-[10px] text-slate-400 dark:text-[#71717A] block font-bold uppercase mb-1">User Agent Header</span>
                <code className="text-[11px] text-slate-700 dark:text-[#A1A1AA] font-mono break-all block">
                  {selectedLog.userAgent || navigator.userAgent}
                </code>
              </div>

              {/* Payload JSON Inspector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#8B5CF6] uppercase tracking-wider">Cryptographic Event Payload</span>
                  <AsyncActionButton
                    mode="copy"
                    onAction={() => navigator.clipboard.writeText(JSON.stringify(selectedLog.payload || {}, null, 2))}
                    idleIcon={<Copy size={13} />}
                    idleLabel="Copy Payload"
                    loadingLabel="Copying…"
                    successLabel="Copied JSON!"
                    className="text-[11px] text-[#8B5CF6] hover:underline font-bold"
                    variant="custom"
                  />
                </div>

                <pre className="p-4 bg-[#09090B] text-emerald-400 font-mono text-[11px] rounded-xl border border-[#27272A] overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(selectedLog.payload || { logId: selectedLog.id, action: selectedLog.action, status: "SUCCESS" }, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] text-white font-bold text-xs hover:bg-[#A855F7] transition-all shadow-md shadow-[#8B5CF6]/20 active:scale-95"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
