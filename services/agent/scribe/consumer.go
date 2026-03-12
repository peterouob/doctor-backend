package scribe

import (
	"context"
	"encoding/json"
	"log"

	"github.com/IBM/sarama"
	"github.com/peterouob/doctor-backend/model"
)

type ScribeConsumer struct {
	agent *ScribeAgent
	group sarama.ConsumerGroup
}

func NewScribeConsumer(agent *ScribeAgent, addrs []string) (*ScribeConsumer, error) {
	config := sarama.NewConfig()
	config.Consumer.Return.Errors = true
	config.Consumer.Offsets.Initial = sarama.OffsetNewest
	config.Version = sarama.V3_0_0_0 // Consumer group needs a minimum version

	group, err := sarama.NewConsumerGroup(addrs, "medical-asr-events", config)
	if err != nil {
		return nil, err
	}

	return &ScribeConsumer{
		agent: agent,
		group: group,
	}, nil
}

func (s *ScribeConsumer) Start(ctx context.Context, topic string) {
	handler := &scribeGroupHandler{
		agent: s.agent,
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

// scribeGroupHandler implements sarama.ConsumerGroupHandler
type scribeGroupHandler struct {
	agent *ScribeAgent
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

		_, err := h.agent.Run(session.Context(), &ScribeInput{Transcription: event.Transcript})
		if err != nil {
			log.Printf("failed to refine transcription: %v", err)
			continue
		}

		session.MarkMessage(msg, "")
	}
	return nil
}
