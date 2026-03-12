import { useRef, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Trash2, Waves, Wifi, WifiOff, FileText, Loader2, Bot, Sparkles, User, UserPlus, History, Save, ArrowRight, ClipboardCheck, RefreshCw, UserCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRecording } from "../hooks/useRecording";
import { synthesizeSOAP, fetchPatients, saveConsultation } from "../lib/api";
import clsx from "clsx";
import MarkdownResult from "../components/MarkdownResult";

const WS_STATE_CONFIG = {
  closed:      { label: "未連線",  color: "text-slate-400",  dot: "bg-slate-300" },
  connecting:  { label: "連線中",  color: "text-amber-500",  dot: "bg-amber-400 animate-pulse" },
  open:        { label: "已連線",  color: "text-emerald-600",dot: "bg-emerald-500" },
  error:       { label: "連線錯誤",color: "text-red-600",    dot: "bg-red-500" },
};

export default function TranscriptionPage() {
  const { user, authHeader }  = useAuth();
  const queryClient = useQueryClient();
  const { isRecording, transcript, error, packetCount, wsState, start, stop, clearTranscript } =
    useRecording();

  // ── Patient Queue State (from Backend) ──────────────────────────────────
  const { data: patients = [], isLoading: isLoadingPatients, refetch: refetchPatients } = useQuery({
    queryKey: ["patients"],
    queryFn: () => fetchPatients(authHeader),
  });

  const [patientIndex, setPatientIndex] = useState(0);
  const currentPatient = patients[patientIndex];
  const [isPatientInfoLoaded, setIsPatientInfoLoaded] = useState(false);

  const [soapNote, setSoapNote] = useState(() => {
    return localStorage.getItem("last_soap_note") || "";
  });
  const [testInput, setTestInput] = useState("");

  // Persist SOAP note locally during session
  useEffect(() => {
    if (soapNote) localStorage.setItem("last_soap_note", soapNote);
  }, [soapNote]);

  const [synthLogs, setSynthLogs] = useState([]);

  const addSynthLog = (msg) => {
    setSynthLogs((prev) => [...prev, { msg, time: new Date().toLocaleTimeString() }]);
  };

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const soapMutation = useMutation({
    mutationFn: async (manualInput) => {
      addSynthLog("正在彙整看診資料...");
      const texts = manualInput ? [manualInput] : transcript.map((t) => t.text);
      
      // Inject patient clinical context if "loaded" by doctor
      let payload = [...texts];
      if (isPatientInfoLoaded && currentPatient) {
        const context = `[Patient Context: ${currentPatient.name}, ${currentPatient.age}y/o ${currentPatient.gender}. History: ${currentPatient.history || 'None'}]`;
        payload = [context, ...texts];
        addSynthLog("已將病患臨床背景加入分析環境");
      }

      addSynthLog("正在呼叫 Eino Synthesizer Agent...");
      const res = await synthesizeSOAP(payload, authHeader);
      addSynthLog("LLM 臨床推理完成，正在格式化 SOAP 病歷...");
      return res;
    },
    onSuccess: (data) => {
      setSoapNote(data.soap_note);
      addSynthLog("SOAP 病歷生成成功！");
    },
    onError: (err) => {
      addSynthLog(`推理錯誤: ${err.message}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => saveConsultation(payload, authHeader),
    onSuccess: () => {
      addSynthLog("看診紀錄已成功儲存至電子病歷系統 (EMR)");
      queryClient.invalidateQueries(["patients"]);
    },
    onError: (err) => {
      addSynthLog(`儲存失敗: ${err.message}`);
    }
  });

  const handleSynthesize = () => {
    if (transcript.length === 0) return;
    setSynthLogs([]);
    soapMutation.mutate(null);
  };

  const handleManualTest = () => {
    if (!testInput.trim()) return;
    setSynthLogs([]);
    soapMutation.mutate(testInput);
  };

  const loadPatientInfo = () => {
    if (!currentPatient) return;
    setIsPatientInfoLoaded(true);
    addSynthLog(`已載入病患 ${currentPatient.name} 的基本資訊與歷史病歷`);
  };

  const finishAndNext = async () => {
    if (currentPatient) {
      addSynthLog(`正在歸檔 ${currentPatient.name} 的看診紀錄...`);
      try {
        await saveMutation.mutateAsync({
          patient_id: currentPatient.id,
          doctor: user?.name || "Unknown Doctor",
          transcript: transcript.map(t => t.text).join("\n"),
          soap: soapNote
        });
      } catch (e) {
        console.error("Save failed", e);
      }
    }

    // Reset current session state
    clearTranscript();
    setSoapNote("");
    setIsPatientInfoLoaded(false);
    setSynthLogs([]);
    setTestInput("");
    localStorage.removeItem("last_soap_note");

    // Move to next in queue
    if (patientIndex + 1 < patients.length) {
      setPatientIndex((prev) => prev + 1);
      addSynthLog("載入下一位預約病患...");
    } else {
      setPatientIndex(patients.length); // End of list
      addSynthLog("今日門診預約已全數處理完畢");
    }
  };

  const isSynthesizing = soapMutation.isPending;
  const synthError = soapMutation.error?.message || "";

  if (isLoadingPatients) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
        <p className="text-slate-500 font-medium">從後端系統載入病患清單...</p>
      </div>
    );
  }

  const wsConfig = WS_STATE_CONFIG[wsState] || WS_STATE_CONFIG.closed;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── Left Sidebar: Patient & Controls ── */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          
          {/* Patient Info Card (Vertical) */}
          {patients.length > 0 && currentPatient ? (
            <div className="glass-card p-6 border-blue-100/50 bg-white/90 animate-fade-in ring-4 ring-blue-500/5">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-medical-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-medical-200/50 ring-4 ring-white mb-4">
                  <User size={40} />
                </div>
                <h2 className="text-2xl font-black text-brand-900 tracking-tight">{currentPatient.name}</h2>
                <div className="flex gap-2 mt-2">
                  <span className="badge bg-medical-50 text-medical-700 border border-medical-100">
                    {currentPatient.gender}
                  </span>
                  <span className="badge bg-slate-50 text-slate-600 border border-slate-100">
                    {currentPatient.age}歲
                  </span>
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
                <button
                  onClick={finishAndNext}
                  disabled={saveMutation.isPending}
                  className="btn-secondary w-full py-3 border-2 border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                >
                  {saveMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  結束並存檔 (EMR)
                </button>
              </div>

              {/* Highlights Section */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <History size={14} /> 歷史病歷要點
                </h3>
                <div className="flex flex-col gap-2">
                  {currentPatient.highlights && currentPatient.highlights.length > 0 ? (
                    currentPatient.highlights.map((h, i) => (
                      <div key={i} className="px-4 py-2.5 bg-slate-50 border border-slate-100 text-brand-900 text-[11px] font-bold rounded-xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-medical-400 shrink-0" />
                        {h}
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400 font-medium italic p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      暫無歷史紀錄要點
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
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
          )}

          {/* Recording Controls Card */}
          {currentPatient && (
            <div className={clsx(
              "glass-card p-6 border-2 transition-all duration-500 ring-4",
              isRecording ? "border-red-500/20 bg-red-50/20 ring-red-500/5 shadow-xl" : "border-slate-100 bg-white ring-slate-100"
            )}>
              <div className="flex flex-col items-center gap-6">
                {/* Compact Waveform */}
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
                  {isRecording && (
                    <span className="text-[10px] font-black text-red-600 animate-pulse">RECORDING...</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Main Content: Results ── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section Header */}
          <div className="px-2">
            <h1 className="text-4xl font-black text-brand-900 tracking-tight">AI 臨床語音助手</h1>
            <p className="text-slate-500 mt-2 font-bold text-sm">
              Real-time Transcription & Automated Clinical Reasoning
            </p>
          </div>

          {currentPatient ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* Left: Transcript View */}
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

              {/* Right: AI Output (SOAP) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-3">
                  <h3 className="text-[11px] font-black text-brand-900 uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" /> Eino 臨床推理 (SOAP)
                  </h3>
                  {soapNote && (
                    <button onClick={() => { navigator.clipboard.writeText(soapNote); alert("已複製到剪貼簿"); }} className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest underline underline-offset-4">
                      複製全文
                    </button>
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

            </div>
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 opacity-60">
               <Bot size={64} className="text-slate-300 mb-6" />
               <p className="text-lg font-black text-slate-400 uppercase tracking-widest">請先載入病患資料</p>
            </div>
          )}

          {/* Test Tool Container */}
          {currentPatient && (
            <div className="glass-card p-8 border-slate-100 bg-slate-50/30 opacity-40 hover:opacity-100 transition-all duration-500">
              <div className="flex items-center gap-3 mb-6">
                <Bot size={18} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">手動推理覆核工具</span>
              </div>
              <div className="flex gap-4">
                <textarea className="input flex-1 font-mono text-xs bg-white/70 min-h-[80px]" placeholder="輸入測試用逐字稿數據..." value={testInput} onChange={(e) => setTestInput(e.target.value)} />
                <div className="flex flex-col justify-end">
                  <button onClick={handleManualTest} disabled={isSynthesizing || !testInput.trim()} className="btn-secondary border-2 uppercase tracking-[0.2em] text-[10px] px-8 py-3 h-fit">
                    執行測試
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return "--:--:--";
  return new Date(ts).toLocaleTimeString();
}
