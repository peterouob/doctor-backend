package llm

import (
	"context"
	"fmt"
	"strings"
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
		panic(fmt.Errorf("failed to compile llm agent chain: %w", err))
	}

	s.chain = r
	return s
}

func (s *ScribeAgent) refineTranscription(_ context.Context, input *ScribeInput) (*ScribeOutput, error) {
	trimmed := strings.TrimSpace(input.Transcription)
	if len(trimmed) < 2 {
		return &ScribeOutput{RefinedText: input.Transcription}, nil
	}

	prompt := fmt.Sprintf(`You are a Medical Transcription Refinement Agent. Correct grammar, punctuation, and medical terminology.

### RULES:
1. **NO HALLUCINATION**: Do not add information not in the input.
2. **NO CONVERSATION**: Output ONLY the refined text. No introductory or concluding remarks.
3. **NO SUMMARIZATION**: Keep the original meaning exactly.

### Transcription:
%s

### Refined:`, input.Transcription)

	inferCtx, cancel := context.WithTimeout(context.Background(), LLMTimeout)
	defer cancel()

	refined, err := s.tritonClient.InferLLM(inferCtx, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to call LLM for refinement: %w", err)
	}

	return &ScribeOutput{RefinedText: refined}, nil
}

func (s *ScribeAgent) Run(_ context.Context, input *ScribeInput) (*ScribeOutput, error) {
	chainCtx, cancel := context.WithTimeout(context.Background(), LLMTimeout)
	defer cancel()

	return s.chain.Invoke(chainCtx, input)
}
