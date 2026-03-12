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
          "relative p-3 rounded-xl transition-all duration-300 cursor-pointer",
          open 
            ? "bg-medical-50 text-medical-600 shadow-inner" 
            : "text-slate-500 hover:bg-slate-50 hover:text-brand-900"
        )}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[9px]
                           font-black rounded-full flex items-center justify-center animate-pulse border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 w-80 card shadow-2xl overflow-hidden z-50 animate-slide-up ring-4 ring-slate-900/5 bg-white border-slate-200/50">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-[11px] font-black text-brand-900 uppercase tracking-[0.2em]">系統即時通知</span>
            {unreadCount > 0 && (
              <span className="badge bg-red-50 text-red-600 border border-red-100">{unreadCount} 未讀事項</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 shadow-inner">
                  <Bell size={24} />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">目前尚無新通知</p>
              </div>
            ) : (
              [...notifications].reverse().map((n) => {
                const agent = getAgent(n.agentId);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={clsx(
                      "w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-medical-50/30 transition-all duration-300 group cursor-pointer",
                      !n.read && "bg-medical-50/10"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-sm group-hover:shadow-md transition-all">
                      {TYPE_ICON[agent?.type] || "🤖"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-brand-900 truncate group-hover:text-medical-700 transition-colors">{n.message}</p>
                      {agent?.todoRef && (
                        <p className="text-[10px] text-slate-400 truncate mt-1 font-bold uppercase tracking-tight">{agent.todoRef}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 mt-0.5">
                      {agent?.status === "done"
                        ? <CheckCircle size={14} className="text-emerald-500" />
                        : <AlertCircle size={14} className="text-red-500" />
                      }
                      <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 text-center">
            <button className="text-[9px] font-black text-slate-400 hover:text-medical-600 transition-colors uppercase tracking-[0.2em] cursor-pointer">
              查看所有臨床歷史
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
