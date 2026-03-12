package synthesizer

import (
	"context"
	"fmt"
	"strings"

	"github.com/cloudwego/eino/compose"
	"github.com/peterouob/doctor-backend/services/asr"
)

type SynthesizerInput struct {
	Transcripts []string `json:"transcripts"`
}

type SynthesizerOutput struct {
	SOAPNote string `json:"soap_note"`
}

type SynthesizerAgent struct {
	tritonClient *asr.TritonClient
	chain        compose.Runnable[*SynthesizerInput, *SynthesizerOutput]
}

func NewSynthesizerAgent(tritonClient *asr.TritonClient) *SynthesizerAgent {
	s := &SynthesizerAgent{
		tritonClient: tritonClient,
	}

	// Create Eino chain
	chain := compose.NewChain[*SynthesizerInput, *SynthesizerOutput]()
	chain.AppendLambda(compose.InvokableLambda(s.generateSOAP))

	r, err := chain.Compile(context.Background())
	if err != nil {
		panic(fmt.Errorf("failed to compile synthesizer agent chain: %w", err))
	}

	s.chain = r
	return s
}

func (s *SynthesizerAgent) generateSOAP(ctx context.Context, input *SynthesizerInput) (*SynthesizerOutput, error) {
	fullTranscript := strings.Join(input.Transcripts, "\n")

	prompt := fmt.Sprintf(`You are an expert medical scribe. Convert the following doctor-patient consultation transcript into a professional SOAP note (Subjective, Objective, Assessment, Plan).
Use standard medical formatting and terminology. Use Markdown for formatting.

Transcript:
%s

SOAP Note:`, fullTranscript)

	soap, err := s.tritonClient.InferLLM(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to call LLM for SOAP generation: %w", err)
	}

	return &SynthesizerOutput{SOAPNote: soap}, nil
}

func (s *SynthesizerAgent) Run(ctx context.Context, input *SynthesizerInput) (*SynthesizerOutput, error) {
	return s.chain.Invoke(ctx, input)
}
