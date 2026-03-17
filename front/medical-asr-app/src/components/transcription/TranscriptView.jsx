import { useRef, useEffect } from "react";
import { Waves } from "lucide-react";

export default function TranscriptView({ transcript, clearTranscript, user }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-3">
                <h3 className="text-[11px] font-black text-brand-900 uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-medical-500 shadow-sm shadow-medical-200" /> 轉錄即時動態
                </h3>
                {transcript.length > 0 && (
                    <button onClick={clearTranscript} className="text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest cursor-pointer">
                        清空
                    </button>
                )}
            </div>
            <div className="card h-[calc(100vh-320px)] min-h-[500px] overflow-hidden flex flex-col bg-white border-slate-100 shadow-xl shadow-slate-100/50">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {transcript.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-6 opacity-40">
                            <Waves size={56} /> <p className="text-xs font-black uppercase tracking-[0.4em]">待命錄製...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {transcript.map((entry) => (
                                <div key={entry.id} className="flex items-start gap-4 animate-slide-up group">
                                    <div className="w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] font-black shrink-0 border border-slate-100 group-hover:bg-medical-50 group-hover:text-medical-600 transition-all duration-300">
                                        {user?.name?.[0]?.toUpperCase() || "D"}
                                    </div>
                                    <div className="flex-1 bg-slate-50/50 rounded-[1.25rem] rounded-tl-none px-5 py-4 border border-transparent group-hover:border-slate-100 group-hover:bg-white transition-all duration-300">
                                        <p className="text-sm text-brand-900 leading-relaxed font-bold">{entry.text}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}