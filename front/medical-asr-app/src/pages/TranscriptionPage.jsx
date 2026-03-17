// src/pages/TranscriptionPage/index.jsx
import { RefreshCw, Bot } from "lucide-react";
import { useTranscription } from "../hooks/transcription/useTranscription.js";
import PatientSidebar from "../components/transcription/PatientSidebar";
import TranscriptView from "../components/transcription/TranscriptView";
import SoapResultView from "../components/transcription/SoapResultView";
import ManualTestTool from "../components/transcription/ManualTestTool";

export default function TranscriptionPage() {
  const { state, recording, actions } = useTranscription();

  if (state.isLoadingPatients) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
          <p className="text-slate-500 font-medium">從後端系統載入病患清單...</p>
        </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          <div className="lg:col-span-4">
            <PatientSidebar state={state} recording={recording} actions={actions} />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="px-2">
              <h1 className="text-4xl font-black text-brand-900 tracking-tight">AI 臨床語音助手</h1>
              <p className="text-slate-500 mt-2 font-bold text-sm">Real-time Transcription & Automated Clinical Reasoning</p>
            </div>

            {state.currentPatient ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <TranscriptView
                      transcript={recording.transcript}
                      clearTranscript={recording.clearTranscript}
                      user={state.user}
                  />
                  <SoapResultView
                      isSynthesizing={state.isSynthesizing}
                      synthError={state.synthError}
                      soapNote={state.soapNote}
                      synthLogs={state.synthLogs}
                      onClearSoap={actions.clearSoapNote}
                  />
                </div>
            ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center p-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 opacity-60">
                  <Bot size={64} className="text-slate-300 mb-6" />
                  <p className="text-lg font-black text-slate-400 uppercase tracking-widest">請先載入病患資料</p>
                </div>
            )}

            <ManualTestTool
                testInput={state.testInput}
                setTestInput={actions.setTestInput}
                handleManualTest={actions.handleManualTest}
                isSynthesizing={state.isSynthesizing}
                currentPatient={state.currentPatient}
            />
          </div>

        </div>
      </div>
  );
}
