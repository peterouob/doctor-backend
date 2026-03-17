package llm

import (
	"context"
	"encoding/json"
	"log"

	"github.com/IBM/sarama"
	"github.com/peterouob/doctor-backend/model"
	"github.com/peterouob/doctor-backend/services/agent/synthesizer"
	"github.com/peterouob/doctor-backend/services/asr"
)

type ScribeConsumer struct {
	agent            *ScribeAgent
	synthesizerAgent *synthesizer.SynthesizerAgent // 新增：聯動 SOAP Agent
	group            sarama.ConsumerGroup
}

func NewScribeConsumer(agent *ScribeAgent, synth *synthesizer.SynthesizerAgent, addrs []string) (*ScribeConsumer, error) {
	config := sarama.NewConfig()
	config.Consumer.Return.Errors = true
	config.Consumer.Offsets.Initial = sarama.OffsetNewest
	config.Version = sarama.V3_0_0_0

	group, err := sarama.NewConsumerGroup(addrs, "medical-asr-events", config)
	if err != nil {
		return nil, err
	}

	return &ScribeConsumer{
		agent:            agent,
		synthesizerAgent: synth,
		group:            group,
	}, nil
}

func (s *ScribeConsumer) Start(ctx context.Context, topic string) {
	handler := &scribeGroupHandler{
		agent:            s.agent,
		synthesizerAgent: s.synthesizerAgent,
	}

	for {
		if err := s.group.Consume(ctx, []string{topic}, handler); err != nil {
			log.Printf("Error from consumer group: %v", err)
		}
		if ctx.Err() != nil {
			return
		}
	}
}

func (s *ScribeConsumer) Close() {
	s.group.Close()
}

type scribeGroupHandler struct {
	agent            *ScribeAgent
	synthesizerAgent *synthesizer.SynthesizerAgent
}

func (h *scribeGroupHandler) Setup(_ sarama.ConsumerGroupSession) error   { return nil }
func (h *scribeGroupHandler) Cleanup(_ sarama.ConsumerGroupSession) error { return nil }

func (h *scribeGroupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for msg := range claim.Messages() {
		var event model.ASREvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			log.Printf("failed to unmarshal asr event: %v", err)
			continue
		}

		// 1. 執行 Scribe 修正
		refined, err := h.agent.Run(session.Context(), &ScribeInput{Transcription: event.Transcript})
		if err != nil {
			log.Printf("[Consumer] ❌ Scribe 修正失敗: %v", err)
			continue
		}
		log.Printf("[Consumer] ✅ Scribe 修正完成: [%s]", refined.RefinedText)

		// 將修正後的文字傳回前端
		event.Transcript = refined.RefinedText
		event.IsFinal = true
		_ = asr.NotifyResult(event.SessionID, event)

		// 2. 自動執行 SOAP 推理 (Synthesizer)
		if h.synthesizerAgent != nil {
			log.Printf("[Consumer] 🚀 啟動自動 SOAP 推理...")
			soap, err := h.synthesizerAgent.Run(session.Context(), &synthesizer.SynthesizerInput{
				Transcripts: []string{refined.RefinedText},
			})
			if err != nil {
				log.Printf("[Consumer] ❌ SOAP 生成失敗: %v", err)
			} else {
				log.Printf("[Consumer] ✨ SOAP 生成成功! 內容長度: %d", len(soap.SOAPNote))

				// 將 SOAP 結果傳回前端
				_ = asr.NotifyResult(event.SessionID, map[string]interface{}{
					"event_type": "soap_note",
					"content":    soap.SOAPNote,
					"timestamp":  event.Timestamp,
				})
			}
		}

		session.MarkMessage(msg, "")
	}
	return nil
}
