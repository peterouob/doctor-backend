import { useState, useRef, useCallback } from "react";
import { CONFIG } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

/**
 * Manages the full recording lifecycle against the real Go backend.
 *
 * Backend route (router.go):  r.GET("/ws", asr.WSHandleStream(...))
 * → WebSocket URL: ws://host:8081/ws  (no path param)
 *
 * Audio flow:
 *   mic → Web Audio API (16 kHz mono)
 *   → Int16 PCM chunks (4096 samples / chunk)
 *   → WebSocket binary frames
 *   → Go Gateway accumulates → Triton Whisper
 *   → ASREvent JSON pushed back over same WS
 *
 * ASREvent shape (model/asr.go):
 *   { event_id, session_id, timestamp, speaker_role, transcript, is_final }
 */
export function useRecording() {
  const { user } = useAuth(); // Get user from AuthContext
  const [isRecording, setIsRecording]   = useState(false);
  const [transcript,  setTranscript]    = useState([]);
  const [error,       setError]         = useState(null);
  const [packetCount, setPacketCount]   = useState(0);
  const [wsState,     setWsState]       = useState("closed"); 

  const wsRef        = useRef(null);
  const audioCtxRef  = useRef(null);
  const processorRef = useRef(null);
  const streamRef    = useRef(null);

  const start = useCallback(async () => {
    setError(null);
    setWsState("connecting");

    try {
      // Pass doctorId as query param
      const doctorId = user?.id || "anonymous";
      const ws = new WebSocket(`${CONFIG.WS_BASE}/ws?doctorId=${doctorId}`);
      ws.binaryType = "arraybuffer";
      wsRef.current  = ws;

      await new Promise((resolve, reject) => {
        ws.onopen  = () => { setWsState("open"); resolve(); };
        ws.onerror = () => reject(new Error("WebSocket 連線失敗，請確認後端是否啟動"));
        setTimeout(() => reject(new Error("WebSocket 連線逾時")), 5000);
      });

      // ── 2. Handle incoming ASREvents ──────────────────────────────
      ws.onmessage = (e) => {
        try {
          // Go sends: json.Marshal(asrEvent)
          // Fields: event_id, session_id, timestamp, speaker_role, transcript, is_final
          const event = JSON.parse(e.data);
          if (event.transcript) {
            setTranscript((prev) => [
              ...prev,
              {
                id:   event.event_id || `${Date.now()}`,
                text: event.transcript,
                ts:   event.timestamp || Date.now(),
              },
            ]);
          }
        } catch { /* ignore malformed frames */ }
      };

      ws.onclose = () => { setWsState("closed"); setIsRecording(false); };
      ws.onerror = () => { setError("WebSocket 連線中斷"); setWsState("error"); };

      // ── 3. Grab microphone ────────────────────────────────────────
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate:      16000,
          channelCount:    1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // ── 4. Wire up audio processing ───────────────────────────────
      // Web Audio API → ScriptProcessor (4096 samples = ~256 ms at 16 kHz)
      const ctx       = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;

      const source    = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const f32 = e.inputBuffer.getChannelData(0);

        // Convert Float32 [-1,1] → Int16  (matches PcmBytesToFloat32 on Go side)
        const i16 = new Int16Array(f32.length);
        for (let i = 0; i < f32.length; i++) {
          i16[i] = Math.max(-1, Math.min(1, f32[i])) * 0x7fff;
        }
        ws.send(i16.buffer);
        setPacketCount((n) => n + 1);
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      setIsRecording(true);
    } catch (err) {
      setError(err.message);
      setWsState("error");
    }
  }, []);

  const stop = useCallback(() => {
    console.log("⏹ Stopping recording and closing WebSocket...");
    
    // Tear down audio pipeline
    processorRef.current?.disconnect();
    if (audioCtxRef.current?.state !== "closed") {
      audioCtxRef.current?.close();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());

    // Close WebSocket
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }
    wsRef.current = null;

    setIsRecording(false);
    setPacketCount(0);
    setWsState("closed");
  }, []);

  const clearTranscript = useCallback(() => setTranscript([]), []);

  return { isRecording, transcript, error, packetCount, wsState, start, stop, clearTranscript };
}
