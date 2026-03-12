import { createContext, useContext, useState, useCallback, useEffect } from "react";

/**
 * Agent statuses: "pending" | "running" | "done" | "error"
 */

const AgentContext = createContext(null);

export function AgentProvider({ children }) {
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AgentContext.Provider
      value={{
        agents,
        notifications,
        unreadCount,
        addAgents,
        updateAgent,
        pushNotification,
        markRead,
        clearAll,
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
