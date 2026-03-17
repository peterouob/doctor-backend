import { useState, useEffect } from "react";
import { Plus, Trash2, Sparkles, RefreshCw, ChevronUp, ChevronDown, Activity, ClipboardList, Stethoscope, Calendar, Bell, ChevronRight, Bot } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAgents } from "../contexts/AgentContext";
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
  1: "bg-red-50 text-red-700 border-red-100 shadow-sm shadow-red-100/50",
  2: "bg-amber-50 text-amber-700 border-amber-100 shadow-sm shadow-amber-100/50",
  3: "bg-medical-50 text-medical-700 border-medical-100 shadow-sm shadow-medical-100/50",
};

function PriorityBadge({ value }) {
  const label = value === 1 ? "高優先級" : value === 2 ? "中優先級" : "低優先級";
  return (
    <span className={clsx("badge border px-4 py-1.5 rounded-xl uppercase tracking-widest text-[9px]", PRIORITY_THEME[value] || PRIORITY_THEME[3])}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { 
    agents, pushNotification, 
    runAIPipeline, isRunning, routingError,
    runBackendOrchestration, isProcessing, backendError
  } = useAgents();

  const [todos, setTodos] = useState(() => {
    try {
      const stored = localStorage.getItem("medical_todos");
      return stored
        ? JSON.parse(stored)
        : [
            { ID: "t1", Type: "summarize", Priority: 1, Detail: "整理王先生的血液檢查報告並摘要異常值" },
            { ID: "t2", Type: "diagnose", Priority: 1, Detail: "評估李小姐持續性頭痛的可能診斷" },
            { ID: "t3", Type: "schedule", Priority: 2, Detail: "安排陳老先生術後三個月回診追蹤" },
          ];
    } catch {
      return [];
    }
  });

  // Sync todos to localStorage
  useEffect(() => {
    localStorage.setItem("medical_todos", JSON.stringify(todos));
  }, [todos]);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ Detail: "", Type: "general", Priority: 2 });

  const addTodo = () => {
    if (!form.Detail.trim()) return;
    setTodos((prev) => [...prev, { ...form, ID: `t${Date.now()}` }]);
    setForm({ Detail: "", Type: "general", Priority: 2 });
    setShowForm(false);
  };

  const removeTodo = (id) => setTodos((prev) => prev.filter((t) => t.ID !== id));

  const adjustPriority = (id, delta) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.ID === id ? { ...t, Priority: Math.min(3, Math.max(1, t.Priority + delta)) } : t
      )
    );
  };

  const sortedTodos = [...todos].sort((a, b) => a.Priority - b.Priority);

  return (
    <div className="min-h-screen">
      {/* ── Sub-header (Glass) ── */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="glass-card flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <ClipboardList size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">臨床狀態</span>
              <span className="text-sm font-bold text-brand-900">今日臨床概覽</span>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold">
            <div className="flex flex-col items-end">
              <span className="text-slate-400 uppercase tracking-tighter">伺服器狀態</span>
              <span className="text-emerald-500">正常運作中</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex flex-col items-end">
              <span className="text-slate-400 uppercase tracking-tighter">最後更新時間</span>
              <span className="text-brand-900">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left Side: Core Tasks ── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Greeting & Quick Action */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
              <div className="animate-fade-in">
                <h1 className="text-4xl font-black text-brand-900 mb-2">
                  您好，{user?.name} 醫師
                </h1>
                <p className="text-slate-500 text-sm font-medium">
                  目前有 <span className="text-medical-600 font-black tracking-tight">{todos.length} 項</span> 臨床任務等待處理。
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-secondary"
                >
                  <Plus size={18} />
                  新增任務
                </button>
                <button
                  onClick={runBackendOrchestration}
                  disabled={isProcessing}
                  className="btn-secondary"
                  title="從資料庫讀取待辦事項並使用後端 Eino Graph 執行"
                >
                  {isProcessing ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Bot size={18} className="text-medical-600" />
                  )}
                  後端編排
                </button>
                <button
                  onClick={() => runAIPipeline(todos)}
                  disabled={isRunning || todos.length === 0}
                  className="btn-primary min-w-[180px]"
                >
                  {isRunning ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  執行 AI 分流
                </button>
              </div>
            </div>

            {/* Task Creation Modal-like form (Inline) */}
            {showForm && (
              <div className="glass-card p-8 border-medical-200/50 bg-white/90 animate-slide-up ring-4 ring-medical-500/5">
                <h3 className="text-base font-black text-brand-900 mb-6 flex items-center gap-3">
                  <div className="w-2 h-6 rounded-full bg-medical-500" />
                  快速新增臨床任務
                </h3>
                <textarea
                  className="input mb-4 min-h-[100px]"
                  placeholder="請輸入臨床任務詳細內容..."
                  value={form.Detail}
                  onChange={(e) => setForm((f) => ({ ...f, Detail: e.target.value }))}
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">任務類別</label>
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
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">優先程度</label>
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
                <div className="flex gap-4 justify-end">
                  <button onClick={() => setShowForm(false)} className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest cursor-pointer">取消</button>
                  <button onClick={addTodo} className="btn-primary">確認新增項目</button>
                </div>
              </div>
            )}

            {/* Main Task List */}
            <div className="card overflow-hidden border-slate-200/40">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-sm font-black text-brand-900 flex items-center gap-3">
                  臨床待辦清單
                  <span className="bg-brand-900 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-tighter">{todos.length}</span>
                </h2>
                <button className="text-[11px] font-black text-medical-600 hover:text-medical-700 cursor-pointer uppercase tracking-widest transition-colors">批量管理</button>
              </div>

              {sortedTodos.length === 0 ? (
                <div className="py-24 text-center flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-6 border border-slate-100 shadow-inner">
                    <ClipboardList size={40} />
                  </div>
                  <h3 className="text-brand-900 font-black text-lg">目前尚無待辦事項</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-xs font-medium">您的臨床清單目前是空的，點擊上方按鈕建立新任務。</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sortedTodos.map((todo) => (
                    <div
                      key={todo.ID}
                      className="group flex items-start gap-6 p-8 hover:bg-medical-50/30 transition-all duration-300 relative cursor-default"
                    >
                      {/* Priority Shifter */}
                      <div className="flex flex-col gap-2 mt-1">
                        <button
                          onClick={() => adjustPriority(todo.ID, -1)}
                          className="text-slate-300 hover:text-medical-600 cursor-pointer transition-colors p-1 hover:bg-white rounded-lg shadow-sm"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          onClick={() => adjustPriority(todo.ID, 1)}
                          className="text-slate-300 hover:text-medical-600 cursor-pointer transition-colors p-1 hover:bg-white rounded-lg shadow-sm"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-3">
                          <PriorityBadge value={todo.Priority} />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-slate-200 pl-4">
                            {TYPE_LABEL[todo.Type]}
                          </span>
                        </div>
                        <p className="text-base font-bold text-brand-900 leading-relaxed group-hover:text-medical-900 transition-colors">
                          {todo.Detail}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button
                          onClick={() => removeTodo(todo.ID)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 cursor-pointer transition-all duration-300"
                          title="刪除任務"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-300">
                          <ChevronRight size={18} />
                        </div>
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
