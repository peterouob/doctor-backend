import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useAgents } from "../contexts/AgentContext";

const TYPE_META = {
  summarize: { label: "病歷摘要",   icon: "📋", color: "blue" },
  diagnose:  { label: "診斷協助",   icon: "🩺", color: "purple" },
  schedule:  { label: "排程建議",   icon: "📅", color: "amber" },
  followup:  { label: "追蹤事項",   icon: "🔔", color: "emerald" },
};

const COLOR_MAP = {
  blue:    "bg-blue-50 text-blue-700 border-blue-200",
  purple:  "bg-purple-50 text-purple-700 border-purple-200",
  amber:   "bg-amber-50 text-amber-700 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

/** Very minimal markdown renderer — bold, bullets, headings */
function MarkdownResult({ text }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        if (line.startsWith("### ")) return <h3 key={i} className="font-semibold text-slate-800 mt-3">{line.slice(4)}</h3>;
        if (line.startsWith("## "))  return <h2 key={i} className="text-base font-semibold text-slate-900 mt-4">{line.slice(3)}</h2>;
        if (line.startsWith("# "))   return <h1 key={i} className="text-lg font-bold text-slate-900 mt-4">{line.slice(2)}</h1>;
        if (line.match(/^[-*]\s/))   return (
          <div key={i} className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5 shrink-0">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        // inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**")
                ? <strong key={j} className="font-semibold text-slate-800">{p.slice(2, -2)}</strong>
                : p
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function AgentResultPage() {
  const { agentId } = useParams();
  const { agents } = useAgents();
  const navigate = useNavigate();

  const agent = agents.find((a) => a.id === agentId);
  const meta = agent ? (TYPE_META[agent.type] || { label: agent.type, icon: "🤖", color: "slate" }) : null;
  const colorClass = meta ? (COLOR_MAP[meta.color] || "bg-slate-50 text-slate-700 border-slate-200") : "";

  const duration = agent?.startedAt && agent?.finishedAt
    ? ((agent.finishedAt - agent.startedAt) / 1000).toFixed(1)
    : null;

  if (!agent) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">找不到此 Agent 結果</h2>
        <p className="text-sm text-slate-500 mb-6">可能已被清除，請回到 Dashboard 重新執行</p>
        <button onClick={() => navigate("/dashboard")} className="btn-primary">
          <ArrowLeft size={14} /> 回 Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800
                   mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> 返回
      </button>

      {/* Header card */}
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-4">
          <span className="text-3xl">{meta.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-slate-900">{agent.label}</h1>
              <span className={`badge border ${colorClass}`}>{meta.label}</span>
            </div>
            <p className="text-sm text-slate-500">{agent.todoRef}</p>
          </div>
          {agent.status === "done"
            ? <CheckCircle className="text-emerald-500 shrink-0" size={20} />
            : <AlertCircle className="text-red-500 shrink-0" size={20} />
          }
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100
                        text-xs text-slate-400 font-mono">
          {agent.startedAt && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(agent.startedAt).toLocaleTimeString("zh-TW")}
            </span>
          )}
          {duration && <span>⏱ {duration}s</span>}
          <span className="ml-auto">{agent.id}</span>
        </div>
      </div>

      {/* Result card */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">分析結果</h2>
        {agent.status === "running" ? (
          <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
            <span className="w-5 h-5 border-2 border-slate-200 border-t-blue-500
                             rounded-full animate-spin" />
            <span className="text-sm">AI 分析中，請稍候...</span>
          </div>
        ) : agent.result ? (
          <MarkdownResult text={agent.result} />
        ) : (
          <p className="text-sm text-slate-400 italic">無結果</p>
        )}
      </div>
    </div>
  );
}
