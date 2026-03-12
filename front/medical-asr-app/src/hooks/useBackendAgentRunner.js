import { useCallback, useState } from "react";
import { processTodos } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

/**
 * Hook to trigger the Backend Eino Orchestrator
 */
export function useBackendAgentRunner() {
  const { authHeader } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const runBackendOrchestration = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await processTodos(authHeader);
      setResults(data.results || []);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [authHeader]);

  return { runBackendOrchestration, isProcessing, error, results };
}
