// src/pages/TranscriptionPage/components/PatientSidebar.jsx
import { User, UserPlus, UserCheck, ArrowRight, Loader2, History, RefreshCw, Mic, MicOff, Sparkles } from "lucide-react";
import clsx from "clsx";
import { WS_STATE_CONFIG } from "../../lib/websocket_state.js";

export default function PatientSidebar({ state, recording, actions }) {
    const { currentPatient, patients, isPatientInfoLoaded, isSynthesizing, isSaving } = state;
    const { isRecording, transcript, wsState, start, stop } = recording;
    const { loadPatientInfo, finishAndNext, handleSynthesize, refetchPatients, setPatientIndex } = actions;

    const wsConfig = WS_STATE_CONFIG[wsState] || WS_STATE_CONFIG.closed;

    if (!patients.length || !currentPatient) {
        return (
            <div className="glass-card p-10 text-center animate-fade-in border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 mx-auto mb-4 border-2 border-dashed border-slate-200">
                    <User size={32} />
                </div>
                <h3 className="text-lg font-black text-brand-900">無病患資訊</h3>
                <p className="text-xs text-slate-500 mt-2 mb-6">請重新載入或檢查連線</p>
                <button onClick={() => { setPatientIndex(0); refetchPatients(); }} className="btn-secondary w-full text-xs">
                    <RefreshCw size={14} /> 重新讀取
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:sticky lg:top-24">
            {/* 病患資訊卡片 */}
            <div className="glass-card p-6 border-blue-100/50 bg-white/90 animate-fade-in ring-4 ring-blue-500/5">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-medical-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-medical-200/50 ring-4 ring-white mb-4">
                        <User size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-brand-900 tracking-tight">{currentPatient.name}</h2>
                    <div className="flex gap-2 mt-2">
                        <span className="badge bg-medical-50 text-medical-700 border border-medical-100">{currentPatient.gender}</span>
                        <span className="badge bg-slate-50 text-slate-600 border border-slate-100">{currentPatient.age}歲</span>
                    </div>
                    <div className="mt-3">
                        <code className="text-[10px] font-mono text-medical-600 font-black tracking-tighter bg-medical-50 px-3 py-1 rounded-full border border-medical-100">
                            ID: {currentPatient.id}
                        </code>
                    </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                    {!isPatientInfoLoaded ? (
                        <button onClick={loadPatientInfo} className="btn-primary w-full py-3">
                            <UserPlus size={18} /> 載入病患背景
                        </button>
                    ) : (
                        <div className="flex items-center justify-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[13px] font-bold border border-emerald-100 shadow-sm">
                            <UserCheck size={18} /> 臨床數據已同步
                        </div>
                    )}
                    <button onClick={finishAndNext} disabled={isSaving} className="btn-secondary w-full py-3 border-2 border-slate-900 bg-slate-900 text-white hover:bg-slate-800">
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                        結束並存檔 (EMR)
                    </button>
                </div>

                {/* 歷史病歷 */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <History size={14} /> 歷史病歷要點
                    </h3>
                    <div className="flex flex-col gap-2">
                        {currentPatient.highlights?.length > 0 ? (
                            currentPatient.highlights.map((h, i) => (
                                <div key={i} className="px-4 py-2.5 bg-slate-50 border border-slate-100 text-brand-900 text-[11px] font-bold rounded-xl flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-medical-400 shrink-0" />{h}
                                </div>
                            ))
                        ) : (
                            <p className="text-[11px] text-slate-400 font-medium italic p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">暫無歷史紀錄要點</p>
                        )}
                    </div>
                </div>
            </div>

            {/* 錄音控制卡片 */}
            <div className={clsx("glass-card p-6 border-2 transition-all duration-500 ring-4", isRecording ? "border-red-500/20 bg-red-50/20 ring-red-500/5 shadow-xl" : "border-slate-100 bg-white ring-slate-100")}>
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-end justify-center gap-1 h-12 w-full px-4">
                        {Array.from({ length: 30 }).map((_, i) => {
                            const height = isRecording ? `${Math.max(4, 8 + Math.abs(Math.sin((Date.now() / 150) + i * 0.3)) * 30)}px` : "4px";
                            return <div key={i} className={clsx("flex-1 rounded-full transition-all duration-150", isRecording ? "bg-red-500" : "bg-slate-200")} style={{ height }} />;
                        })}
                    </div>

                    <div className="flex flex-col w-full gap-3">
                        {!isRecording ? (
                            <button onClick={start} className="group flex items-center justify-center gap-3 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-sm transition-all shadow-lg shadow-red-200">
                                <Mic size={18} /> 開始錄製
                            </button>
                        ) : (
                            <button onClick={stop} className="flex items-center justify-center gap-3 py-4 bg-slate-900 text-white font-black rounded-2xl text-sm transition-all shadow-xl">
                                <MicOff size={18} /> 停止錄音
                            </button>
                        )}
                        {transcript.length > 0 && !isRecording && (
                            <button onClick={handleSynthesize} disabled={isSynthesizing} className="flex items-center justify-center gap-3 py-4 bg-medical-600 hover:bg-medical-700 text-white font-black rounded-2xl text-sm transition-all shadow-lg shadow-medical-200 disabled:bg-slate-300">
                                {isSynthesizing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} 生成 SOAP
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between w-full px-2">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">系統狀態</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={clsx("w-2 h-2 rounded-full", wsConfig.dot)} />
                                <span className={clsx("text-[10px] font-black", wsConfig.color)}>{wsConfig.label}</span>
                            </div>
                        </div>
                        {isRecording && <span className="text-[10px] font-black text-red-600 animate-pulse">RECORDING...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}