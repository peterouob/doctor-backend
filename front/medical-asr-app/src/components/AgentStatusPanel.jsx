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
        "group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 animate-slide-up",
        agent.status === "done"
          ? "border-emerald-100 bg-emerald-50/20 cursor-pointer hover:bg-emerald-50/40 hover:shadow-lg hover:shadow-emerald-100/20"
          : agent.status === "error"
          ? "border-red-100 bg-red-50/20"
          : agent.status === "running"
          ? "border-medical-200 bg-white shadow-xl shadow-medical-100/10 ring-4 ring-medical-500/5"
          : "border-slate-100 bg-white/50"
      )}
      onClick={() => agent.status === "done" && navigate(`/agent/${agent.id}`)}
    >
      <div className={clsx(
        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm transition-all duration-300 group-hover:scale-110",
        agent.status === "done" ? "bg-white shadow-emerald-100" : 
        agent.status === "running" ? "bg-white shadow-medical-100" : 
        "bg-slate-100"
      )}>
        {meta.icon}
      </div>

      <div className="flex-1 min-w-0 ml-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-black text-brand-900 tracking-tight">{meta.label}</p>
          {duration && (
            <span className="text-[9px] font-black text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-slate-100">
              {duration}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 truncate font-bold leading-none uppercase tracking-tighter">REF: {agent.todoRef}</p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-end gap-1.5">
          <StatusIcon size={16} className={status.className} />
          <span className={clsx("text-[9px] font-black uppercase tracking-[0.2em]", {
            "text-slate-400": agent.status === "pending",
            "text-medical-600":  agent.status === "running",
            "text-emerald-600": agent.status === "done",
            "text-red-600":   agent.status === "error",
          })}>
            {status.label}
          </span>
        </div>
        {agent.status === "done" && (
          <ArrowRight size={16} className="text-slate-300 group-hover:text-medical-600 transition-colors transform group-hover:translate-x-1 duration-300" />
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
    <div className="card p-8 animate-fade-in bg-white border-slate-200/40 shadow-2xl shadow-slate-200/30">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-black text-brand-900 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-medical-50 flex items-center justify-center text-medical-600">
              <Terminal size={18} />
            </div>
            AI Pipeline Engine
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 ml-11">Real-time Clinical Processing</p>
        </div>
        {running > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-medical-50 border border-medical-100 shadow-sm shadow-medical-50">
            <span className="w-2 h-2 rounded-full bg-medical-500 animate-pulse" />
            <span className="text-[10px] font-black text-medical-600 uppercase tracking-widest">Processing</span>
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div className="mb-8 px-1">
        <div className="flex justify-between items-end mb-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">系統總執行進度</span>
          <span className="text-xs font-black text-brand-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{Math.round((done / total) * 100)}%</span>
        </div>
        <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-medical-400 to-medical-600 rounded-full transition-all duration-700 ease-out shadow-lg shadow-medical-200"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {agents.map((a) => <AgentRow key={a.id} agent={a} />)}
      </div>

      {done === total && total > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[11px] text-center text-emerald-600 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 bg-emerald-50/50 py-3 rounded-2xl border border-emerald-100 animate-fade-in">
            <CheckCircle size={14} />
            Pipeline Task Complete
          </p>
        </div>
      )}
    </div>
  );
}
