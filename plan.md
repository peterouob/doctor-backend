# Plan: Real-time Streaming SOAP Note Generation

## 1. Objective
Enable the system to generate and update SOAP notes dynamically during a medical consultation, providing immediate feedback to the doctor rather than waiting for manual trigger at the end.

## 2. Implementation Strategy

### A. Session State Management (Redis)
- **Key Schema**: `session:{session_id}:transcripts` (List or Set)
- **Operation**: Append new "Final" transcripts from `ASREvent` to the Redis list as they arrive.
- **TTL**: Set a reasonable expiry (e.g., 2 hours) to clean up session data.

### B. Real-time Trigger Logic
- **Location**: `services/asr/websocket.go`
- **Mechanism**: 
    - **Threshold-based**: Trigger every $N$ new sentences (e.g., $N=5$).
    - **Time-based**: Trigger every $T$ seconds (e.g., $T=15s$) if new content exists.
- **Concurrency**: Use a non-blocking goroutine to call `SynthesizerAgent` to avoid stuttering in the audio stream.

### C. WebSocket Protocol Enhancement
- **New Event Type**: Introduce `SOAPUpdateEvent` or add a `type` field to the existing message structure.
- **Payload**: The latest full "Snapshot" of the SOAP note.
- **Frontend Integration**: The client should detect the event type and update the report panel UI reactively.

### D. Refined Prompting
- Update `SynthesizerAgent` to handle "Partial" transcripts gracefully.
- Instruct the LLM to maintain consistency with previous sections while incorporating new information.

## 3. Potential Issues & Improvements

### Challenges
- **Latency**: LLM inference (especially on larger models) might take several seconds, causing the report UI to "jump" or lag behind the spoken word.
- **Resource Intensive**: Frequent polling/inference significantly increases GPU/CPU load on the Triton server.
- **Inconsistent Assessment**: Early in the consultation, the LLM might hallucinate a diagnosis (Assessment) based on limited data, which could change drastically as the patient provides more context.

### Future Improvements
- **Incremental Diffing**: Instead of sending the full snapshot, send only the changes (diffs) to reduce bandwidth.
- **Intent Recognition**: Only trigger synthesis when the LLM detects "key medical facts" have been exchanged, rather than simple time/count intervals.
- **Manual Override**: Allow the doctor to pause the auto-generation if they find it distracting during a sensitive part of the examination.
