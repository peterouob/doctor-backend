package scribe

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/eino/compose"
	"github.com/peterouob/doctor-backend/services/asr"
)

const LLMTimeout = 180 * time.Minute

type ScribeInput struct {
	Transcription string `json:"transcription"`
}

type ScribeOutput struct {
	RefinedText string `json:"refined_text"`
}

type ScribeAgent struct {
	tritonClient *asr.TritonClient
	chain        compose.Runnable[*ScribeInput, *ScribeOutput]
}

func NewScribeAgent(tritonClient *asr.TritonClient) *ScribeAgent {
	s := &ScribeAgent{tritonClient: tritonClient}

	chain := compose.NewChain[*ScribeInput, *ScribeOutput]()
	chain.AppendLambda(compose.InvokableLambda(s.refineTranscription))

	r, err := chain.Compile(context.Background())
	if err != nil {
		panic(fmt.Errorf("failed to compile scribe agent chain: %w", err))
	}

	s.chain = r
	return s
}

func (s *ScribeAgent) refineTranscription(ctx context.Context, input *ScribeInput) (*ScribeOutput, error) {
	prompt := fmt.Sprintf(`You are a professional medical scribe. Please refine the following transcription to ensure correct medical terminology, grammar, and punctuation while preserving the original meaning.
Output ONLY the refined text.

Transcription: %s
Refined:`, input.Transcription)

	inferCtx, cancel := context.WithTimeout(context.Background(), LLMTimeout)
	defer cancel()

	refined, err := s.tritonClient.InferLLM(inferCtx, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to call LLM for refinement: %w", err)
	}

	return &ScribeOutput{RefinedText: refined}, nil
}

// Run 使用獨立 context，避免外層 WebSocket ctx 的 deadline 污染 chain
func (s *ScribeAgent) Run(ctx context.Context, input *ScribeInput) (*ScribeOutput, error) {
	chainCtx, cancel := context.WithTimeout(context.Background(), LLMTimeout)
	defer cancel()

	return s.chain.Invoke(chainCtx, input)
}
