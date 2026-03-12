import { createContext, useContext, useState, useCallback } from "react";

/**
 * Agent statuses: "pending" | "running" | "done" | "error"
 *
 * Agent shape:
 * {
 *   id: string,
 *   type: "summarize" | "diagnose" | "schedule" | "followup",
 *   label: string,
 *   todoRef: string,       // todo text that triggered this agent
 *   status: AgentStatus,
 *   result: string | null,
 *   startedAt: number | null,
 *   finishedAt: number | null,
 * }
 *
 * Notification shape:
 * { id: string, agentId: string, message: string, read: boolean }
 */

const AgentContext = createContext(null);

export function AgentProvider({ children }) {
  const [agents, setAgents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const addAgents = useCallback((newAgents) => {
    setAgents((prev) => [...prev, ...newAgents]);
  }, []);

  const updateAgent = useCallback((id, updates) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const pushNotification = useCallback((agentId, message) => {
    setNotifications((prev) => [...prev, { id: `notif-${Date.now()}`, agentId, message, read: false }]);
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setAgents([]);
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AgentContext.Provider
      value={{ agents, notifications, unreadCount, addAgents, updateAgent, pushNotification, markRead, clearAll }}
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
