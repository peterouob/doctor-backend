import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { processTodos, analyseTodos, runAgent } from "../lib/api";

/**
 * Agent statuses: "pending" | "running" | "done" | "error"
 */

const AgentContext = createContext(null);

const TYPE_LABEL = {
  general:   "一般",
  summarize: "摘要",
  diagnose:  "診斷",
  schedule:  "排程",
  followup:  "追蹤",
};

export function AgentProvider({ children }) {
  const { authHeader } = useAuth();
  // Load state from localStorage on init
  const [agents, setAgents] = useState(() => {
    try {
      const stored = localStorage.getItem("medical_agents");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem("medical_notifications");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [routingError, setRoutingError] = useState(null);
  const [backendError, setBackendError] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("medical_agents", JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    localStorage.setItem("medical_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addAgents = useCallback((newAgents) => {
    setAgents((prev) => [...prev, ...newAgents]);
  }, []);

  const updateAgent = useCallback((id, updates) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const pushNotification = useCallback((agentId, message) => {
    setNotifications((prev) => [
      ...prev,
      { id: `notif-${Date.now()}`, agentId, message, read: false, time: new Date().toLocaleTimeString() },
    ]);
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setAgents([]);
    setNotifications([]);
    localStorage.removeItem("medical_agents");
    localStorage.removeItem("medical_notifications");
  }, []);

  const runAIPipeline = useCallback(
    async (todos) => {
      if (!todos.length) return;
      setIsRunning(true);
      setRoutingError(null);

      try {
        const assignments = await analyseTodos(todos, authHeader);
        const newAgents = assignments.map((a, i) => ({
          id:       `agent-${Date.now()}-${i}`,
          type:     a.type,
          label:    a.label,
          todoRef:  a.todoRef,
          priority: a.priority ?? 2,
          status:   "pending",
          result:   null,
          startedAt:   null,
          finishedAt:  null,
        }));

        addAgents(newAgents);

        await Promise.all(
          newAgents.map(async (agent) => {
            updateAgent(agent.id, { status: "running", startedAt: Date.now() });

            try {
              const result = await runAgent(agent.type, agent.todoRef, authHeader);
              updateAgent(agent.id, {
                status: "done",
                result,
                finishedAt: Date.now(),
              });
              pushNotification(agent.id, `${agent.label} 已完成`);
            } catch (err) {
              updateAgent(agent.id, {
                status: "error",
                result: `Error: ${err.message}`,
                finishedAt: Date.now(),
              });
              pushNotification(agent.id, `${agent.label} 執行失敗`);
            }
          })
        );
      } catch (err) {
        setRoutingError(`任務分流失敗：${err.message}`);
      } finally {
        setIsRunning(false);
      }
    },
    [addAgents, updateAgent, pushNotification, authHeader]
  );

  const runBackendOrchestration = useCallback(async () => {
    setIsProcessing(true);
    setBackendError(null);
    try {
      const data = await processTodos(authHeader);
      const { items, results } = data;

      if (items && items.length > 0) {
        const newAgents = items.map((item, i) => ({
          id:       `agent-backend-${Date.now()}-${i}`,
          type:     item.Type,
          label:    TYPE_LABEL[item.Type] || "後端任務",
          todoRef:  item.Detail,
          priority: item.Priority ?? 2,
          status:   "done",
          result:   results[i],
          startedAt:   Date.now(),
          finishedAt:  Date.now(),
        }));

        addAgents(newAgents);
        newAgents.forEach(agent => {
          pushNotification(agent.id, `${agent.label} (後端) 已完成`);
        });
      } else {
        pushNotification("backend-orchestrator", "沒有待處理的後端事項");
      }
    } catch (err) {
      setBackendError(err.message);
      pushNotification("backend-orchestrator", `後端編排失敗: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [addAgents, pushNotification, authHeader]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AgentContext.Provider
      value={{
        agents,
        notifications,
        unreadCount,
        isRunning,
        isProcessing,
        routingError,
        backendError,
        addAgents,
        updateAgent,
        pushNotification,
        markRead,
        clearAll,
        runAIPipeline,
        runBackendOrchestration,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgents must be used within AgentProvider");
  return ctx;
}
