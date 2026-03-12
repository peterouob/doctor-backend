import { useCallback, useState } from "react";
import { useAgents } from "../contexts/AgentContext";
import { useAuth } from "../contexts/AuthContext";
import { analyseTodos, runAgent } from "../lib/api";

/**
 * Orchestrates the multi-agent pipeline:
 * 1. Calls Backend to classify TODOs into agent assignments
 * 2. Spawns a "specialist agent" coroutine per assignment
 * 3. Updates AgentContext in real-time
 * 4. Pushes a notification when each agent finishes
 */
export function useAgentRunner() {
  const { addAgents, updateAgent, pushNotification } = useAgents();
  const { authHeader } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [routingError, setRoutingError] = useState(null);

  const run = useCallback(
    async (todos) => {
      if (!todos.length) return;
      setIsRunning(true);
      setRoutingError(null);

      try {
        // ── Step 1: Route todos to agents ──────────────────────────
        const assignments = await analyseTodos(todos, authHeader);

        const newAgents = assignments.map((a, i) => ({
          id:       `agent-${Date.now()}-${i}`,
          type:     a.type,
          label:    a.label,
          todoRef:  a.todoRef,          // verbatim Detail text from Go model
          priority: a.priority ?? 2,
          status:   "pending",
          result:   null,
          startedAt:   null,
          finishedAt:  null,
        }));

        addAgents(newAgents);

        // ── Step 2: Run each agent concurrently ────────────────────
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

  return { run, isRunning, routingError };
}
