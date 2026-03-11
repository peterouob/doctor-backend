package asr

import (
	"context"
	"encoding/binary"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/peterouob/doctor-backend/model"
	"github.com/peterouob/doctor-backend/protobuf/triton"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type TritonClient struct {
	conn   *grpc.ClientConn
	client triton.GRPCInferenceServiceClient
}

func NewTritonClient(addr string) (*TritonClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to triton: %w", err)
	}

	return &TritonClient{
		conn:   conn,
		client: triton.NewGRPCInferenceServiceClient(conn),
	}, nil
}

func (c *TritonClient) Close() {
	c.conn.Close()
}

func (c *TritonClient) InferWhisper(ctx context.Context, audioFloat32 []float32) (string, error) {
	audioBytes := make([]byte, len(audioFloat32)*4)
	for i, f := range audioFloat32 {
		binary.LittleEndian.PutUint32(audioBytes[i*4:], math.Float32bits(f))
	}

	req := &triton.ModelInferRequest{
		ModelName:    "whisper",
		ModelVersion: "1",
		Inputs: []*triton.ModelInferRequest_InferInputTensor{
			{
				Name:     "AUDIO_SIGNAL",
				Datatype: "FP32",
				Shape:    []int64{int64(len(audioFloat32))}},
		},
		RawInputContents: [][]byte{audioBytes},
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	resp, err := c.client.ModelInfer(ctx, req)
	if err != nil {
		return "", fmt.Errorf("triton infer failed: %w", err)
	}

	if len(resp.RawOutputContents) == 0 || len(resp.RawOutputContents[0]) <= 4 {
		return "", fmt.Errorf("empty or invalid response from triton")
	}

	rawOutput := resp.RawOutputContents[0]

	strLen := binary.LittleEndian.Uint32(rawOutput[0:4])

	transcript := string(rawOutput[4 : 4+strLen])

	return transcript, nil
}

const (
	SampleRate = 16000
	WindowSecs = 5
	StepSecs   = 2
	MinSecs    = 1
	SilenceRMS = float32(0.01)
)

func (c *TritonClient) StreamAudio(ctx context.Context, sessionID string, audioStreamChan <-chan []byte, resultStreamChan chan<- *model.ASREvent) {
	defer close(resultStreamChan)

	var buffer []float32
	windowSize := SampleRate * WindowSecs // 80000 samples
	stepSize := SampleRate * StepSecs     // 32000 samples
	minSize := SampleRate * MinSecs       // 16000 samples

	for {
		select {
		case <-ctx.Done():
			if len(buffer) >= minSize {
				c.inferAndSend(ctx, sessionID, buffer, resultStreamChan)
			}
			return

		case payloadBytes, ok := <-audioStreamChan:
			if !ok {
				if len(buffer) >= minSize {
					c.inferAndSend(ctx, sessionID, buffer, resultStreamChan)
				}
				return
			}

			chunk := bytesToFloat32(payloadBytes)
			buffer = append(buffer, chunk...)

			if len(buffer) >= windowSize {
				c.inferAndSend(ctx, sessionID, buffer[:windowSize], resultStreamChan)
				buffer = buffer[stepSize:]
			}
		}
	}
}

func (c *TritonClient) inferAndSend(ctx context.Context, sessionID string, audio []float32, resultStreamChan chan<- *model.ASREvent) {
	if isSilence(audio) {
		return
	}
	transcript, err := c.InferWhisper(ctx, audio)
	if err != nil {
		return
	}
	if transcript == "" {
		return
	}

	resultStreamChan <- &model.ASREvent{
		EventID:     uuid.New().String(),
		SessionID:   sessionID,
		Timestamp:   time.Now().UnixMilli(),
		SpeakerRole: "doctor",
		Transcript:  transcript,
		IsFinal:     true,
	}
}

func bytesToFloat32(b []byte) []float32 {
	out := make([]float32, len(b)/4)
	for i := range out {
		out[i] = math.Float32frombits(binary.LittleEndian.Uint32(b[i*4:]))
	}
	return out
}

func isSilence(audio []float32) bool {
	var sum float32
	for _, v := range audio {
		sum += v * v
	}
	rms := float32(math.Sqrt(float64(sum / float32(len(audio)))))
	log.Printf("🔊 RMS: %.4f", rms)
	return rms < SilenceRMS
}
