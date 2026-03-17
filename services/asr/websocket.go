package asr

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/IBM/sarama"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

var (
	activeConns = make(map[string]*websocket.Conn)
	mu          sync.Mutex
)

// NotifyResult allows other packages to send results back to a specific client
func NotifyResult(doctorId string, data interface{}) error {
	mu.Lock()
	conn, ok := activeConns[doctorId]
	mu.Unlock()
	if !ok {
		return fmt.Errorf("client %s not connected", doctorId)
	}
	return conn.WriteJSON(data)
}

func WSHandleStream(producer sarama.AsyncProducer, tritonClient *TritonClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("error upgrading websocket: %v", err)
			return
		}

		doctorId := c.Query("doctorId")
		if doctorId == "" {
			doctorId = "anonymous"
		}

		mu.Lock()
		activeConns[doctorId] = conn
		mu.Unlock()

		defer func() {
			mu.Lock()
			delete(activeConns, doctorId)
			mu.Unlock()
			conn.Close()
		}()

		var fullAudio []float32

		for {
			messageType, pcmBytes, err := conn.ReadMessage()
			if err != nil {
				break
			}

			if messageType == websocket.BinaryMessage {
				var audioFloat32 []float32
				if len(pcmBytes)%4 == 0 && len(pcmBytes) > 0 {
					audioFloat32 = make([]float32, len(pcmBytes)/4)
					for i := range audioFloat32 {
						audioFloat32[i] = math.Float32frombits(binary.LittleEndian.Uint32(pcmBytes[i*4:]))
					}
				} else {
					audioFloat32 = PcmBytesToFloat32(pcmBytes)
				}
				fullAudio = append(fullAudio, audioFloat32...)
			} else if messageType == websocket.TextMessage {
				if string(pcmBytes) == "EOS" {
					break
				}
			}
		}

		if len(fullAudio) > 0 {
			log.Printf("[WS] Starting Whisper inference for %s...", doctorId)
			transcript, err := tritonClient.InferWhisper(context.Background(), fullAudio)
			if err != nil || transcript == "" {
				log.Printf("[WS] Whisper inference failed or empty: %v", err)
				return
			}

			asrEvent := &model.ASREvent{
				EventID:     uuid.New().String(),
				SessionID:   doctorId,
				Timestamp:   time.Now().UnixMilli(),
				SpeakerRole: "doctor",
				Transcript:  transcript,
				IsFinal:     true,
			}

			_ = conn.WriteJSON(asrEvent)

			eventBytes, _ := json.Marshal(asrEvent)
			msg := &sarama.ProducerMessage{
				Topic: "medical-asr-events",
				Key:   sarama.StringEncoder(doctorId),
				Value: sarama.ByteEncoder(eventBytes),
			}
			producer.Input() <- msg
			log.Printf("[WS] Sent ASR to Kafka for %s", doctorId)

			//time.Sleep(30 * time.Second)
		}
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
