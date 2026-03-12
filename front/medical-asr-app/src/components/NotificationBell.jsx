import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { useAgents } from "../contexts/AgentContext";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

const TYPE_ICON = {
  summarize: "📋",
  diagnose: "🩺",
  schedule: "📅",
  followup: "🔔",
};

export default function NotificationBell() {
  const { notifications, agents, markRead, unreadCount } = useAgents();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (notif) => {
    markRead(notif.id);
    setOpen(false);
    navigate(`/agent/${notif.agentId}`);
  };

  const getAgent = (agentId) => agents.find((a) => a.id === agentId);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "relative p-2 rounded-xl transition-colors",
          open ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        )}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px]
                           font-bold rounded-full flex items-center justify-center animate-pulse-dot">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 card shadow-lg overflow-hidden z-50 animate-slide-up">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold">通知</span>
            {unreadCount > 0 && (
              <span className="badge bg-red-100 text-red-600">{unreadCount} 未讀</span>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">目前無通知</div>
            ) : (
              [...notifications].reverse().map((n) => {
                const agent = getAgent(n.agentId);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={clsx(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors",
                      !n.read && "bg-blue-50/50"
                    )}
                  >
                    <span className="text-lg mt-0.5">{TYPE_ICON[agent?.type] || "🤖"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{n.message}</p>
                      {agent?.todoRef && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{agent.todoRef}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      {agent?.status === "done"
                        ? <CheckCircle size={13} className="text-emerald-500" />
                        : <AlertCircle size={13} className="text-red-500" />
                      }
                      <ChevronRight size={13} className="text-slate-300" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
