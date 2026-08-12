import React from "react";
import { Activity } from "lucide-react";
import { INITIAL_AUDIT_LOGS } from "../data/mockAdminData";

export function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-md">
        <h3 className="text-lg font-bold font-serif text-[#FAFAFA]">System Audit Logs & Security Audit Trail</h3>
        <p className="text-xs text-[#A1A1AA]">Cryptographic activity trail of executive actions, stock modifications & admin logins.</p>
      </div>

      <div className="p-6 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-lg">
        <div className="space-y-3 font-mono text-xs">
          {INITIAL_AUDIT_LOGS.map((log) => (
            <div key={log.id} className="p-3 bg-[#09090B] border border-[#27272A] rounded-tr-xl rounded-bl-xl flex items-start gap-3">
              <div className="p-2 bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#8B5CF6] rounded-lg">
                <Activity size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#8B5CF6]">{log.action}</span>
                  <span className="text-[10px] text-[#A1A1AA]">{log.createdAt}</span>
                </div>
                <p className="text-xs text-[#FAFAFA] mt-0.5">{log.details}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-1">Performed by: {log.adminEmail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
