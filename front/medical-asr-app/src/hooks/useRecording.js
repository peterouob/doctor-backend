import { useState, useRef, useCallback } from "react";
import { CONFIG } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export function useRecording() {
  const { user } = useAuth();
  const [isRecording, setIsRecording]   = useState(false);
  const [transcript,  setTranscript]    = useState([]);
  const [soapNote,    setSoapNote]      = useState("");
  const [error,       setError]         = useState(null);
  const [packetCount, setPacketCount]   = useState(0);
  const [wsState,     setWsState]       = useState("closed");

  const wsRef        = useRef(null);
  const audioCtxRef  = useRef(null);
  const processorRef = useRef(null);
  const streamRef    = useRef(null);
  const sourceRef    = useRef(null);      // 新增 Ref
  const silentGainRef = useRef(null);     // 新增 Ref

  const start = useCallback(async () => {
    setError(null);
    setSoapNote("");
    setWsState("connecting");

    try {
      const doctorId = user?.id || "anonymous";
      const ws = new WebSocket(`${CONFIG.WS_BASE}/ws?doctorId=${doctorId}`);
      ws.binaryType = "arraybuffer";
      wsRef.current  = ws;

      await new Promise((resolve, reject) => {
        ws.onopen  = () => { setWsState("open"); resolve(); };
        ws.onerror = () => reject(new Error("WebSocket 連線失敗"));
        setTimeout(() => reject(new Error("WebSocket 連線逾時")), 5000);
      });

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          
          if (event.event_type === "soap_note") {
            console.log("📝 Received SOAP Note");
            setSoapNote(event.content);
          } else if (event.transcript) {
            setTranscript((prev) => {
              // 如果是 final，嘗試替換或追加
              // 這裡簡單處理：如果是同一個 session 的結果，我們可能需要更好的邏輯
              // 但目前後端一次性回傳，所以直接追加或更新即可
              return [
                ...prev,
                { id: event.event_id || `${Date.now()}`, text: event.transcript, ts: event.timestamp || Date.now(), isFinal: event.is_final },
              ];
            });
          }
        } catch {
          console.error("Failed to parse WebSocket message", e.data);
        }
      };

      ws.onclose = () => { setWsState("closed"); setIsRecording(false); };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;

      await ctx.audioWorklet.addModule('/record.js');

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const recorderNode = new AudioWorkletNode(ctx, 'audio-processor');
      processorRef.current = recorderNode;

      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      silentGainRef.current = silentGain;

      source.connect(recorderNode);
      recorderNode.connect(silentGain);
      silentGain.connect(ctx.destination);

      let audioBuf = new Float32Array(4096);
      let offset = 0;

      recorderNode.port.onmessage = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.data;
        audioBuf.set(inputData, offset);
        offset += inputData.length;

        // 當累積到足夠長度時才發送
        if (offset >= audioBuf.length) {
          wsRef.current.send(audioBuf.buffer);
          setPacketCount((prev) => prev + 1);
          offset = 0;
        }
      };

      setIsRecording(true);
    } catch (err) {
      setError(err.message);
      setWsState("error");
    }
  }, [user?.id]);

  const stop = useCallback(() => {
    console.log("⏹ Stopping and waiting for result...");

    if (processorRef.current) {
      processorRef.current.port.onmessage = null;
      processorRef.current.disconnect();
    }

    sourceRef.current?.disconnect();
    silentGainRef.current?.disconnect();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // 發送結束訊號，通知後端可以開始全量推理
      wsRef.current.send("EOS");
      console.log("📤 Sent EOS signal, waiting for final transcript...");

      // 設定延遲關閉，給予後端推理時間
      const timeoutId = setTimeout(() => {
        if (wsRef.current) {
          console.log("⌛ Timeout: Closing WebSocket");
          wsRef.current.close();
          wsRef.current = null;
          setWsState("closed");
          setIsRecording(false);
        }
      }, 30000); // 給 30 秒推理時間

      // 監聽後端回傳後主動關閉
      const originalOnMessage = wsRef.current.onmessage;
      wsRef.current.onmessage = (e) => {
        if (originalOnMessage) originalOnMessage(e);
        console.log("✅ Received final result, closing WS");
        clearTimeout(timeoutId);
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      };
    } else {
      setIsRecording(false);
      setWsState("closed");
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(console.error);
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  return { isRecording, transcript, soapNote, error, packetCount, wsState, start, stop, clearTranscript: () => { setTranscript([]); setSoapNote(""); } };
}

