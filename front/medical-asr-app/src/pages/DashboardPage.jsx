import { useState } from "react";
import { Plus, Trash2, Sparkles, RefreshCw, ChevronUp, ChevronDown, Activity, ClipboardList, Stethoscope, Calendar, Bell, ChevronRight, Bot } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAgents } from "../contexts/AgentContext";
import { useAgentRunner } from "../hooks/useAgentRunner";
import { useBackendAgentRunner } from "../hooks/useBackendAgentRunner";
import AgentStatusPanel from "../components/AgentStatusPanel";
import clsx from "clsx";

const TODO_TYPES = ["general", "summarize", "diagnose", "schedule", "followup"];

const TYPE_LABEL = {
  general:   "一般",
  summarize: "摘要",
  diagnose:  "診斷",
  schedule:  "排程",
  followup:  "追蹤",
};

const PRIORITY_THEME = {
  1: "bg-red-50 text-red-700 border-red-200",
  2: "bg-amber-50 text-amber-700 border-amber-200",
  3: "bg-medical-50 text-medical-700 border-medical-200",
};

function PriorityBadge({ value }) {
  const label = value === 1 ? "高優先" : value === 2 ? "中優先" : "低優先";
  return (
    <span className={clsx("badge border font-medium", PRIORITY_THEME[value] || PRIORITY_THEME[3])}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const { user }                          = useAuth();
  const { clearAll, agents, pushNotification } = useAgents();
  const { run, isRunning, routingError }  = useAgentRunner();
  const { runBackendOrchestration, isProcessing, error: backendError } = useBackendAgentRunner();

  const [todos,    setTodos]    = useState([
    { ID: "t1", Type: "summarize", Priority: 1, Detail: "整理王先生的血液檢查報告並摘要異常值" },
    { ID: "t2", Type: "diagnose",  Priority: 1, Detail: "評估李小姐持續性頭痛的可能診斷" },
    { ID: "t3", Type: "schedule",  Priority: 2, Detail: "安排陳老先生術後三個月回診追蹤" },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ Detail: "", Type: "general", Priority: 2 });

  const addTodo = () => {
    if (!form.Detail.trim()) return;
    setTodos((prev) => [...prev, { ...form, ID: `t${Date.now()}` }]);
    setForm({ Detail: "", Type: "general", Priority: 2 });
    setShowForm(false);
  };

  const removeTodo = (id) => setTodos((prev) => prev.filter((t) => t.ID !== id));

  const handleBackendOrchestration = async () => {
    try {
      const data = await runBackendOrchestration();
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
      pushNotification("backend-orchestrator", `後端編排失敗: ${err.message}`);
    }
  };

  const adjustPriority = (id, delta) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.ID === id ? { ...t, Priority: Math.min(3, Math.max(1, t.Priority + delta)) } : t
      )
    );
  };

  const sortedTodos = [...todos].sort((a, b) => a.Priority - b.Priority);

  return (
    <div className="min-h-screen bg-slate-50/30">
      {/* ── Sub-header ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">今日臨床概覽</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <span>伺服器狀態: <span className="text-emerald-500">正常</span></span>
            <div className="w-px h-3 bg-slate-200" />
            <span>最後更新: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left Side: Core Tasks ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Greeting & Quick Action */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
              <div className="animate-fade-in">
                <h1 className="text-3xl font-bold text-slate-900 mb-1">
                  您好，{user?.name} 醫師
                </h1>
                <p className="text-slate-500 text-sm">
                  目前有 <span className="text-slate-900 font-bold">{todos.length} 項</span> 待處理任務，建議優先處理高優先級事項。
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-secondary px-6"
                >
                  <Plus size={16} />
                  新增任務
                </button>
                <button
                  onClick={handleBackendOrchestration}
                  disabled={isProcessing}
                  className="btn-secondary px-6"
                  title="從資料庫讀取待辦事項並使用後端 Eino Graph 執行"
                >
                  {isProcessing ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Bot size={16} className="text-medical-600" />
                  )}
                  後端 Eino 編排
                </button>
                <button
                  onClick={() => run(todos)}
                  disabled={isRunning || todos.length === 0}
                  className="btn-primary px-8 min-w-[180px]"
                >
                  {isRunning ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  執行 AI 分流
                </button>
              </div>
            </div>

            {/* Task Creation Modal-like form (Inline) */}
            {showForm && (
              <div className="card p-6 border-medical-200 bg-medical-50/10 animate-slide-up ring-1 ring-medical-500/5">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-medical-500" />
                  快速新增任務項目
                </h3>
                <textarea
                  className="input mb-4"
                  rows={2}
                  placeholder="請輸入臨床任務詳細內容..."
                  value={form.Detail}
                  onChange={(e) => setForm((f) => ({ ...f, Detail: e.target.value }))}
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">任務類別</label>
                    <select
                      className="input"
                      value={form.Type}
                      onChange={(e) => setForm((f) => ({ ...f, Type: e.target.value }))}
                    >
                      {TODO_TYPES.map((t) => (
                        <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">優先程度</label>
                    <select
                      className="input"
                      value={form.Priority}
                      onChange={(e) => setForm((f) => ({ ...f, Priority: Number(e.target.value) }))}
                    >
                      <option value={1}>高優先</option>
                      <option value={2}>中優先</option>
                      <option value={3}>低優先</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">取消</button>
                  <button onClick={addTodo} className="btn-primary px-8">確認新增</button>
                </div>
              </div>
            )}

            {/* Main Task List */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  待辦事項清單
                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{todos.length}</span>
                </h2>
                <button className="text-[11px] font-bold text-medical-600 hover:underline cursor-pointer uppercase tracking-wider">批量操作</button>
              </div>

              {sortedTodos.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                    <ClipboardList size={32} />
                  </div>
                  <h3 className="text-slate-800 font-bold">目前無待辦事項</h3>
                  <p className="text-slate-400 text-xs mt-1">點擊上方按鈕開始建立任務</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sortedTodos.map((todo) => (
                    <div
                      key={todo.ID}
                      className="group flex items-start gap-4 p-6 hover:bg-slate-50/80 transition-all duration-200 relative cursor-default"
                    >
                      {/* Priority Shifter (Professional style) */}
                      <div className="flex flex-col gap-1 mt-1">
                        <button
                          onClick={() => adjustPriority(todo.ID, -1)}
                          className="text-slate-300 hover:text-medical-600 cursor-pointer"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => adjustPriority(todo.ID, 1)}
                          className="text-slate-300 hover:text-medical-600 cursor-pointer"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <PriorityBadge value={todo.Priority} />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-3">
                            {TYPE_LABEL[todo.Type]}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">
                          {todo.Detail}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => removeTodo(todo.ID)}
                          className="p-2 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 cursor-pointer transition-colors"
                          title="刪除任務"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={16} className="text-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {routingError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700">
                <Activity size={18} className="shrink-0" />
                <p className="text-xs font-medium">{routingError}</p>
              </div>
            )}

            {backendError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700">
                <Bot size={18} className="shrink-0" />
                <p className="text-xs font-medium">後端編排錯誤：{backendError}</p>
              </div>
            )}
          </div>

          {/* ── Right Side: Analytics & Summary ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Quick Metrics Card */}
            <div className="card grid grid-cols-2 divide-x divide-slate-100">
              <div className="p-6 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">今日任務</span>
                <span className="text-3xl font-bold text-slate-900">{todos.length}</span>
              </div>
              <div className="p-6 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">已分析項</span>
                <span className="text-3xl font-bold text-medical-600">{agents.filter(a => a.status === 'done').length}</span>
              </div>
            </div>

            {/* Active Agents / Real-time Status */}
            <AgentStatusPanel />


          </div>

        </div>
      </main>
    </div>
  );
}
