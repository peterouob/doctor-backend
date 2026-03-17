import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useRecording } from "../useRecording.js";
import { synthesizeSOAP, fetchPatients, saveConsultation } from "../../lib/api";

export function useTranscription() {
    const { user, authHeader } = useAuth();
    const queryClient = useQueryClient();
    const { isRecording, transcript, soapNote: liveSoapNote, error, packetCount, wsState, start, stop, clearTranscript } = useRecording();

    const { data: patients = [], isLoading: isLoadingPatients, refetch: refetchPatients } = useQuery({
        queryKey: ["patients"],
        queryFn: () => fetchPatients(authHeader),
    });

    const [patientIndex, setPatientIndex] = useState(0);
    const currentPatient = patients[patientIndex];
    const [isPatientInfoLoaded, setIsPatientInfoLoaded] = useState(false);

    const [soapNote, setSoapNote] = useState(() => localStorage.getItem("last_soap_note") || "");
    const [testInput, setTestInput] = useState("");
    const [synthLogs, setSynthLogs] = useState([]);

    // 當 WS 傳回 liveSoapNote 時，自動同步到 state
    useEffect(() => {
        if (liveSoapNote) {
            setSoapNote(liveSoapNote);
            addSynthLog("收到自動生成之 SOAP 病歷");
        }
    }, [liveSoapNote]);

    useEffect(() => {
        if (soapNote) localStorage.setItem("last_soap_note", soapNote);
    }, [soapNote]);

    const addSynthLog = (msg) => {
        setSynthLogs((prev) => [...prev, { msg, time: new Date().toLocaleTimeString() }]);
    };

    const soapMutation = useMutation({
        mutationFn: async (manualInput) => {
            addSynthLog("正在彙整看診資料...");
            const texts = manualInput ? [manualInput] : transcript.map((t) => t.text);

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

    const clearSoapNote = () => {
        setSoapNote(""); // 清空狀態
        localStorage.removeItem("last_soap_note");
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

        clearTranscript();
        setSoapNote("");
        setIsPatientInfoLoaded(false);
        setSynthLogs([]);
        setTestInput("");
        localStorage.removeItem("last_soap_note");

        if (patientIndex + 1 < patients.length) {
            setPatientIndex((prev) => prev + 1);
            addSynthLog("載入下一位預約病患...");
        } else {
            setPatientIndex(patients.length);
            addSynthLog("今日門診預約已全數處理完畢");
        }
    };

    return {
        state: {
            user,
            patients,
            currentPatient,
            isLoadingPatients,
            isPatientInfoLoaded,
            soapNote,
            testInput,
            synthLogs,
            isSynthesizing: soapMutation.isPending,
            synthError: soapMutation.error?.message || "",
            isSaving: saveMutation.isPending,
        },
        recording: { isRecording, transcript, wsState, start, stop, clearTranscript },
        actions: {
            setTestInput,
            refetchPatients,
            setPatientIndex,
            handleSynthesize,
            handleManualTest,
            loadPatientInfo,
            finishAndNext,
            clearSoapNote,
        }
    };
}
