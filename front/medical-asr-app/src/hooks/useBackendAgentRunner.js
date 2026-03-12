import { useMutation } from "@tanstack/react-query";
import { processTodos } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

/**
 * Hook to trigger the Backend Eino Orchestrator using React Query Mutation
 */
export function useBackendAgentRunner() {
  const { authHeader } = useAuth();

  const mutation = useMutation({
    mutationFn: () => processTodos(authHeader),
  });

  return {
    runBackendOrchestration: mutation.mutateAsync,
    isProcessing: mutation.isPending,
    error: mutation.error?.message || null,
    results: mutation.data?.results || [],
  };
}
