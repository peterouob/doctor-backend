import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AgentProvider } from "./contexts/AgentContext";
import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AgentResultPage from "./pages/AgentResultPage";
import TranscriptionPage from "./pages/TranscriptionPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AgentProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<AuthLayout />}>
                <Route path="/dashboard"        element={<DashboardPage />} />
                <Route path="/agent/:agentId"   element={<AgentResultPage />} />
                <Route path="/transcription"    element={<TranscriptionPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AgentProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
