package model

// ASREvent 代表語音辨識服務產生的單一文本事件
type ASREvent struct {
	EventID     string  `json:"event_id"`     // UUID，用於追蹤與除錯 (Idempotency)
	SessionID   string  `json:"session_id"`   // 關聯到特定醫師與病患的看診 Session
	Timestamp   int64   `json:"timestamp"`    // 事件發生的 Unix Timestamp (毫秒)
	SpeakerRole string  `json:"speaker_role"` // 聲紋辨識結果: "doctor", "patient", "nurse", "unknown"
	Transcript  string  `json:"transcript"`   // 辨識出的文字片段
	Confidence  float32 `json:"confidence"`   // ASR 模型的信心水準 (0.0 ~ 1.0)
	IsFinal     bool    `json:"is_final"`     // 串流控制旗標
}
