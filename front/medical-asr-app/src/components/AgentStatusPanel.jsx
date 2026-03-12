import { useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader, Clock, ArrowRight, Activity, Terminal } from "lucide-react";
import { useAgents } from "../contexts/AgentContext";
import clsx from "clsx";

const TYPE_META = {
  summarize: { label: "Medical Summary", color: "medical", icon: "📋" },
  diagnose:  { label: "Diagnosis Assist", color: "medical", icon: "🩺" },
  schedule:  { label: "Patient Schedule", color: "amber",   icon: "📅" },
  followup:  { label: "Follow-up Task", color: "emerald", icon: "🔔" },
  general:   { label: "General Analysis", color: "slate",   icon: "🤖" },
};

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock,    className: "text-slate-400" },
  running: { label: "Processing", icon: Loader,   className: "text-medical-500 animate-spin" },
  done:    { label: "Completed",   icon: CheckCircle, className: "text-emerald-500" },
  error:   { label: "Failed",   icon: AlertCircle, className: "text-red-500" },
};

function AgentRow({ agent }) {
  const navigate = useNavigate();
  const meta   = TYPE_META[agent.type]   || TYPE_META.general;
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const duration = agent.startedAt && agent.finishedAt
    ? `${((agent.finishedAt - agent.startedAt) / 1000).toFixed(1)}s`
    : null;

  return (
    <div
      className={clsx(
        "group flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 animate-slide-up",
        agent.status === "done"
          ? "border-emerald-100 bg-emerald-50/10 cursor-pointer hover:bg-emerald-50/30"
          : agent.status === "error"
          ? "border-red-100 bg-red-50/10"
          : agent.status === "running"
          ? "border-medical-200 bg-white shadow-sm ring-1 ring-medical-500/5"
          : "border-slate-100 bg-white/50"
      )}
      onClick={() => agent.status === "done" && navigate(`/agent/${agent.id}`)}
    >
      <div className={clsx(
        "w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm transition-transform",
        agent.status === "done" ? "bg-emerald-100/50" : 
        agent.status === "running" ? "bg-medical-100/50" : 
        "bg-slate-100"
      )}>
        {meta.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-800 tracking-tight">{meta.label}</p>
          {duration && (
            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest">
              {duration}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium leading-none">REF: {agent.todoRef}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-end gap-1">
          <StatusIcon size={14} className={status.className} />
          <span className={clsx("text-[9px] font-bold uppercase tracking-widest", {
            "text-slate-400": agent.status === "pending",
            "text-medical-600":  agent.status === "running",
            "text-emerald-600": agent.status === "done",
            "text-red-600":   agent.status === "error",
          })}>
            {status.label}
          </span>
        </div>
        {agent.status === "done" && (
          <ArrowRight size={14} className="text-slate-300 group-hover:text-medical-500 transition-colors" />
        )}
      </div>
    </div>
  );
}

export default function AgentStatusPanel() {
  const { agents } = useAgents();

  if (!agents.length) return null;

  const done    = agents.filter((a) => a.status === "done").length;
  const running = agents.filter((a) => a.status === "running").length;
  const total   = agents.length;

  return (
    <div className="card p-6 animate-fade-in bg-white border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Terminal size={16} className="text-medical-600" />
            AI Pipeline Engine
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Clinical Processing</p>
        </div>
        {running > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-medical-50 border border-medical-100">
            <span className="w-1.5 h-1.5 rounded-full bg-medical-500 animate-pulse" />
            <span className="text-[10px] font-bold text-medical-600 uppercase tracking-widest">Running</span>
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">系統總進度</span>
          <span className="text-xs font-bold text-slate-900">{Math.round((done / total) * 100)}%</span>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-medical-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {agents.map((a) => <AgentRow key={a.id} agent={a} />)}
      </div>

      {done === total && total > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-[10px] text-center text-emerald-600 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <CheckCircle size={12} />
            Pipeline Task Complete
          </p>
        </div>
      )}
    </div>
  );
}
