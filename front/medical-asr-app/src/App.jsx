import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AgentProvider } from "./contexts/AgentContext";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AgentResultPage from "./pages/AgentResultPage";
import TranscriptionPage from "./pages/TranscriptionPage";

/** Wraps all authenticated pages with the shared Navbar layout */
function AuthLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AgentProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route element={<AuthLayout />}>
              <Route path="/dashboard"        element={<DashboardPage />} />
              <Route path="/agent/:agentId"   element={<AgentResultPage />} />
              <Route path="/transcription"    element={<TranscriptionPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AgentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
