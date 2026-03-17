import { Bot, ClipboardCheck } from "lucide-react";
import MarkdownResult from "../MarkdownResult";

export default function SoapResultView({ isSynthesizing, synthError, soapNote, synthLogs, onClearSoap }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-3">
                <h3 className="text-[11px] font-black text-brand-900 uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" /> Eino 臨床推理 (SOAP)
                </h3>
                {soapNote && (
                    <>
                        <button onClick={() => { navigator.clipboard.writeText(soapNote); alert("已複製到剪貼簿"); }} className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest underline underline-offset-4">
                            複製全文
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm("確定要清空這份 SOAP 紀錄嗎？")) {
                                    onClearSoap?.();
                                }
                            }}
                            className="text-[10px] font-black text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest underline underline-offset-4"
                        >
                            刪除全文
                        </button>
                    </>
                )}
            </div>
            <div className="card h-[calc(100vh-320px)] min-h-[500px] overflow-hidden flex flex-col bg-white border-slate-100 shadow-xl shadow-slate-100/50">
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {isSynthesizing ? (
                        <div className="h-full flex flex-col items-center justify-center py-6 text-slate-400 gap-8 animate-fade-in">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-slate-50 border-t-medical-500 animate-spin" />
                                <Bot size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-medical-600 animate-pulse" />
                            </div>
                            <div className="w-full mt-6 bg-brand-900 rounded-[1.5rem] p-6 font-mono text-[9px] text-emerald-400 space-y-2 shadow-2xl border border-white/10">
                                {synthLogs.map((log, i) => (
                                    <div key={i} className="flex gap-3 opacity-90 animate-slide-up">
                                        <span className="text-emerald-700 font-black shrink-0">[{log.time}]</span>
                                        <span className="font-bold">{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : synthError ? (
                        <div className="p-8 bg-red-50 border border-red-100 rounded-[1.5rem] text-sm text-red-600 font-black flex items-center gap-4">
                            <Bot size={24} /> <span>推理錯誤: {synthError}</span>
                        </div>
                    ) : soapNote ? (
                        <div className="animate-fade-in">
                            <MarkdownResult text={soapNote} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-6 opacity-40">
                            <ClipboardCheck size={56} /> <p className="text-xs font-black uppercase tracking-[0.4em]">等待臨床指令...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
