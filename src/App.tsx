import React from "react";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminLayout } from "./components/layout/AdminLayout";

/* ─── Instant Admin App Shell Skeleton (Zero Blank Screen) ──────────────────── */
export function AdminAppShellSkeleton() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col animate-pulse font-sans">
      {/* Top Header Skeleton */}
      <div className="h-16 bg-[#18181B] border-b border-[#27272A] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#27272A]" />
          <div className="space-y-1.5 hidden sm:block">
            <div className="h-3.5 w-32 bg-[#27272A] rounded" />
            <div className="h-2.5 w-20 bg-[#27272A] rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-44 bg-[#27272A] rounded-xl hidden md:block" />
          <div className="w-8 h-8 rounded-lg bg-[#27272A]" />
          <div className="w-8 h-8 rounded-full bg-[#27272A]" />
        </div>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-64 bg-[#18181B] border-r border-[#27272A] p-3 space-y-4 hidden md:block">
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 bg-[#27272A] rounded-xl" />
            ))}
          </div>
          <div className="pt-3 border-t border-[#27272A] space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 bg-[#27272A] rounded-xl" />
            ))}
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
            <div className="space-y-2">
              <div className="h-6 w-56 bg-[#27272A] rounded" />
              <div className="h-3 w-80 bg-[#27272A] rounded" />
            </div>
            <div className="h-9 w-32 bg-[#27272A] rounded-xl" />
          </div>

          {/* 4 Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-[#27272A]" />
                <div className="h-5 w-16 bg-[#27272A] rounded" />
                <div className="h-2.5 w-24 bg-[#27272A] rounded" />
              </div>
            ))}
          </div>

          {/* Large Body Area */}
          <div className="p-6 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-4">
            <div className="h-4 w-40 bg-[#27272A] rounded" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-[#27272A] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return <AdminAppShellSkeleton />;
  }

  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  return <AdminLayout />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <AppContent />
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
