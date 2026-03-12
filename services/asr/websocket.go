package asr

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"log"
	"math"
	"net/http"
	"time"

	"github.com/IBM/sarama"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/peterouob/doctor-backend/model"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func WSHandleStream(producer sarama.AsyncProducer, tritonClient *TritonClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("error upgrading websocket: %v", err)
			return
		}

		defer conn.Close()

		// Try to get doctorId from query if not in param
		doctorId := c.Param("doctorId")
		if doctorId == "" {
			doctorId = c.Query("doctorId")
		}
		if doctorId == "" {
			doctorId = "unknown"
		}

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		audioStreamC := make(chan []byte, 100)
		resultStreamC := make(chan *model.ASREvent, 10)

		go tritonClient.StreamAudio(ctx, doctorId, audioStreamC, resultStreamC)

		go func() {
			for asrEvent := range resultStreamC {
				eventBytes, err := json.Marshal(asrEvent)
				if err != nil {
					log.Printf("Error marshalling ASREvent for Kafka: %v", err)
					continue
				}

				msg := &sarama.ProducerMessage{
					Topic: "medical-asr-events",
					Key:   sarama.StringEncoder(doctorId),
					Value: sarama.ByteEncoder(eventBytes),
				}

				producer.Input() <- msg

				if err := conn.WriteJSON(asrEvent); err != nil {
					log.Printf("❌ Error writing ASREvent to WebSocket: %v", err)
					return
				}
			}
		}()

		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.SetPongHandler(func(string) error {
			err := conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			if err != nil {
				return err
			}
			return nil
		})

		for {
			messageType, pcmBytes, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Println("expect stopped")
				} else {
					log.Println("stop record")
				}
				break
			}

			if messageType == websocket.BinaryMessage {
				_ = conn.SetReadDeadline(time.Now().Add(30 * time.Second))

				audioFloat32 := PcmBytesToFloat32(pcmBytes)
				tritonPayload := Float32ToBytes(audioFloat32)
				select {
				case audioStreamC <- tritonPayload:
				default:
				}
			}
		}

		close(audioStreamC)
	}
}

func PcmBytesToFloat32(pcmData []byte) []float32 {
	sampleCount := len(pcmData) / 2
	floatData := make([]float32, sampleCount)

	for i := 0; i < sampleCount; i++ {
		sampleInt16 := int16(binary.LittleEndian.Uint16(pcmData[i*2:]))
		floatData[i] = float32(sampleInt16) / 32768.0
	}
	return floatData
}

func Float32ToBytes(floatData []float32) []byte {
	byteData := make([]byte, len(floatData)*4)
	for i, f := range floatData {
		binary.LittleEndian.PutUint32(byteData[i*4:], math.Float32bits(f))
	}
	return byteData
}
