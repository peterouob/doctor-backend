package kafka

import (
	"log"
	"time"

	"github.com/IBM/sarama"
)

func InitSaramaProducer(brokers []string) (sarama.AsyncProducer, error) {
	config := sarama.NewConfig()

	config.Producer.RequiredAcks = sarama.WaitForLocal
	config.Producer.Return.Successes = false
	config.Producer.Return.Errors = true

	config.Producer.Compression = sarama.CompressionSnappy
	config.Producer.Flush.Frequency = 500 * time.Millisecond
	config.Producer.Flush.Bytes = 1024 * 1024

	producer, err := sarama.NewAsyncProducer(brokers, config)
	if err != nil {
		return nil, err
	}

	go func() {
		for err := range producer.Errors() {
			log.Printf("⚠️ [Kafka 寫入失敗] Topic: %s, Error: %v", err.Msg.Topic, err.Err)
		}
	}()

	return producer, nil
}
