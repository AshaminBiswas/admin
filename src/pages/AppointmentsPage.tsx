import React, { useState } from "react";
import { Calendar, MapPin, User } from "lucide-react";
import { INITIAL_APPOINTMENTS } from "../data/mockAdminData";
import { AppointmentItem } from "../types/admin";

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>(INITIAL_APPOINTMENTS);

  const toggleStatus = (id: string) => {
    setAppointments(appointments.map(a => {
      if (a.id === id) {
        const next = a.status === "SCHEDULED" ? "COMPLETED" : "SCHEDULED";
        return { ...a, status: next };
      }
      return a;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-md">
        <h3 className="text-lg font-bold font-serif text-[#FAFAFA]">Hardware Service & Installation Schedule</h3>
        <p className="text-xs text-[#A1A1AA]">Track and manage site inspection, cubicle fitting & repair technician appointments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {appointments.map((apt) => (
          <div key={apt.id} className="p-5 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#8B5CF6]">{apt.bookingNumber}</span>
              <button
                type="button"
                onClick={() => toggleStatus(apt.id)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  apt.status === "COMPLETED"
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                    : "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                }`}
              >
                {apt.status}
              </button>
            </div>

            <div>
              <p className="text-sm font-bold text-[#FAFAFA]">{apt.serviceType}</p>
              <div className="flex items-center gap-2 text-xs text-[#A855F7] mt-1">
                <User size={14} />
                <span>{apt.clientName} ({apt.phone})</span>
              </div>
            </div>

            <div className="p-3 bg-[#09090B] rounded-tr-xl rounded-bl-xl text-xs space-y-2 border border-[#27272A]">
              <div className="flex items-center gap-2 text-[#FAFAFA]">
                <Calendar size={14} className="text-[#8B5CF6]" />
                <span>{apt.date} • {apt.timeSlot}</span>
              </div>
              <div className="flex items-start gap-2 text-[#A1A1AA]">
                <MapPin size={14} className="text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                <span>{apt.address}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
