// src/pages/TranscriptionPage/components/ManualTestTool.jsx
import { Bot } from "lucide-react";

export default function ManualTestTool({ testInput, setTestInput, handleManualTest, isSynthesizing, currentPatient }) {
    if (!currentPatient) return null;

    return (
        <div className="glass-card p-8 border-slate-100 bg-slate-50/30 opacity-40 hover:opacity-100 transition-all duration-500">
            <div className="flex items-center gap-3 mb-6">
                <Bot size={18} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">手動推理覆核工具</span>
            </div>
            <div className="flex gap-4">
        <textarea
            className="input flex-1 font-mono text-xs bg-white/70 min-h-[80px]"
            placeholder="輸入測試用逐字稿數據..."
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
        />
                <div className="flex flex-col justify-end">
                    <button
                        onClick={handleManualTest}
                        disabled={isSynthesizing || !testInput.trim()}
                        className="btn-secondary border-2 uppercase tracking-[0.2em] text-[10px] px-8 py-3 h-fit"
                    >
                        執行測試
                    </button>
                </div>
            </div>
        </div>
    );
}