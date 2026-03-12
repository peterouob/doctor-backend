import { useRef, useEffect, useState, useCallback } from "react";
import { Mic, MicOff, Trash2, Waves, Wifi, WifiOff, FileText, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRecording } from "../hooks/useRecording";
import { synthesizeSOAP } from "../lib/api";
import clsx from "clsx";

const WS_STATE_CONFIG = {
  closed:      { label: "未連線",  color: "text-slate-400",  dot: "bg-slate-300" },
  connecting:  { label: "連線中",  color: "text-amber-500",  dot: "bg-amber-400 animate-pulse" },
  open:        { label: "已連線",  color: "text-emerald-600",dot: "bg-emerald-500" },
  error:       { label: "連線錯誤",color: "text-red-600",    dot: "bg-red-500" },
};

export default function TranscriptionPage() {
  const { user, authHeader }  = useAuth();
  const { isRecording, transcript, error, packetCount, wsState, start, stop, clearTranscript } =
    useRecording();

  const [soapNote, setSoapNote] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState("");
  const [synthLogs, setSynthLogs] = useState([]);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const addSynthLog = (msg) => {
    setSynthLogs((prev) => [...prev, { msg, time: new Date().toLocaleTimeString() }]);
  };

  const handleSynthesize = useCallback(async () => {
    if (transcript.length === 0) return;
    setIsSynthesizing(true);
    setSynthError("");
    setSynthLogs([]);
    
    try {
      addSynthLog("正在彙整逐字稿資料...");
      const texts = transcript.map(t => t.text);
      
      addSynthLog("正在呼叫 Eino Synthesizer Agent...");
      const res = await synthesizeSOAP(texts, authHeader);
      
      addSynthLog("LLM 分析完成，正在格式化 SOAP 病歷...");
      setSoapNote(res.soap_note);
      addSynthLog("SOAP 病歷生成成功！");
    } catch (err) {
      addSynthLog(`錯誤: ${err.message}`);
      setSynthError(err.message);
    } finally {
      setIsSynthesizing(false);
    }
  }, [transcript, authHeader]);

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString("zh-TW", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  const wsConfig = WS_STATE_CONFIG[wsState] || WS_STATE_CONFIG.closed;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">語音辨識</h1>
        <p className="text-sm text-slate-500 mt-1">
          按下錄音後，系統即時將音訊串流至 Triton Whisper 並回傳文字
        </p>
      </div>

      {/* Recording card */}
      <div className={clsx(
        "card p-6 mb-5 transition-all duration-300",
        isRecording && "border-red-200 bg-red-50/30"
      )}>
        {/* Status bar */}
        <div className="flex items-center justify-between mb-5">
          {/* WS connection state */}
          <div className="flex items-center gap-2">
            <div className={clsx("w-2.5 h-2.5 rounded-full", wsConfig.dot)} />
            <span className={clsx("text-sm font-medium", wsConfig.color)}>
              {wsConfig.label}
            </span>
            {wsState === "open"
              ? <Wifi size={13} className="text-emerald-500" />
              : <WifiOff size={13} className="text-slate-300" />
            }
          </div>

          {/* Live packet counter */}
          {isRecording && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {packetCount} 封包已送出
            </div>
          )}
        </div>

        {/* Waveform */}
        <div className="flex items-end justify-center gap-0.5 h-14 mb-6 px-4">
          {Array.from({ length: 40 }).map((_, i) => {
            const height = isRecording
              ? `${Math.max(4, 10 + Math.abs(Math.sin((Date.now() / 300) + i * 0.5)) * 32)}px`
              : "4px";
            return (
              <div
                key={i}
                className={clsx(
                  "flex-1 rounded-full transition-all duration-75",
                  isRecording ? "bg-red-400" : "bg-slate-200"
                )}
                style={{ height }}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <button
              onClick={start}
              className="flex items-center gap-2.5 px-8 py-3 bg-red-500 hover:bg-red-600
                         text-white font-semibold rounded-2xl text-sm transition-all
                         active:scale-95 shadow-lg shadow-red-200/60"
            >
              <Mic size={16} />
              開始錄音
            </button>
          ) : (
            <button
              onClick={stop}
              className="recording-ring flex items-center gap-2.5 px-8 py-3 bg-red-600
                         hover:bg-red-700 text-white font-semibold rounded-2xl text-sm
                         transition-all active:scale-95"
            >
              <MicOff size={16} />
              停止錄音
            </button>
          )}

          {transcript.length > 0 && !isRecording && (
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="flex items-center gap-2.5 px-8 py-3 bg-blue-600 hover:bg-blue-700
                         text-white font-semibold rounded-2xl text-sm transition-all
                         active:scale-95 shadow-lg shadow-blue-200/60 disabled:bg-slate-300"
            >
              {isSynthesizing ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              生成 SOAP 病歷
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg
                        px-3 py-2 mt-4 text-center">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Transcript card */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-800">辨識結果</h2>
            {transcript.length > 0 && (
              <span className="badge bg-slate-100 text-slate-600">{transcript.length} 條</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {transcript.length > 0 && (
              <button
                onClick={clearTranscript}
                className="flex items-center gap-1.5 text-xs text-slate-400
                           hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} /> 清除
              </button>
            )}
          </div>
        </div>

        <div className="min-h-48 max-h-96 overflow-y-auto p-5">
          {transcript.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-300 gap-2">
              <Waves size={28} />
              <p className="text-sm">開始錄音後辨識結果將顯示於此</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {transcript.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 animate-slide-up">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                                  flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {user?.name?.[0]?.toUpperCase() || "D"}
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-2xl rounded-tl-none px-4 py-3">
                    <p className="text-sm text-slate-800 leading-relaxed">{entry.text}</p>
                    <span className="text-xs text-slate-400 mt-1 block font-mono">
                      {formatTime(entry.ts)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* SOAP Note result card */}
      { (soapNote || isSynthesizing || synthError) && (
        <div className="card p-6 mb-6 border-blue-100 bg-blue-50/10 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              生成的 SOAP 病歷
            </h2>
            <button 
              onClick={() => setSoapNote("")}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              關閉
            </button>
          </div>
          
          {isSynthesizing ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-3">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <p className="text-sm font-medium">Eino Synthesizer Agent 分析中...</p>
              
              <div className="w-full mt-4 bg-slate-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 space-y-1">
                {synthLogs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="opacity-50">[{log.time}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
                <div className="animate-pulse">_</div>
              </div>
            </div>
          ) : synthError ? (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              ⚠️ {synthError}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {soapNote}
              </pre>
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(soapNote);
                    alert("已複製到剪貼簿");
                  }}
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                >
                  複製內容
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tech note */}
      <p className="text-xs text-slate-400 text-center mt-4 font-mono">
        ws://localhost:8081/ws · 16kHz Int16 PCM · 5s 滑動視窗 · Triton Whisper
      </p>
    </div>
  );
}
