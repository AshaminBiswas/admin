import React from "react";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminLayout } from "./components/layout/AdminLayout";

function AppContent() {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] dark:bg-[#09090B] flex items-center justify-center text-[#8B5CF6]">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold font-serif text-[#FAFAFA] dark:text-[#FAFAFA]">Loading Executive Console...</p>
        </div>
      </div>
    );
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
