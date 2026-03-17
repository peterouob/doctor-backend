package kafka

import (
	"log"
	"os"
	"time"

	"github.com/IBM/sarama"
)

func InitSaramaProducer(brokers []string) (sarama.AsyncProducer, error) {
	// Enable Sarama internal logging for debugging
	sarama.Logger = log.New(os.Stdout, "[Sarama] ", log.LstdFlags)

	config := sarama.NewConfig()

	config.Producer.RequiredAcks = sarama.WaitForLocal
	config.Producer.Return.Successes = true
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

	go func() {
		for msg := range producer.Successes() {
			log.Printf("✅ [Kafka 寫入成功] Topic: %s, Partition: %d, Offset: %d", msg.Topic, msg.Partition, msg.Offset)
		}
	}()

	return producer, nil
}
