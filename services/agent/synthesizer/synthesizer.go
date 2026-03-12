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
	var validTranscripts []string
	for _, t := range input.Transcripts {
		trimmed := strings.TrimSpace(t)
		if trimmed != "" {
			validTranscripts = append(validTranscripts, trimmed)
		}
	}

	if len(validTranscripts) == 0 {
		return nil, fmt.Errorf("no valid transcription content provided for SOAP generation")
	}

	fullTranscript := strings.Join(validTranscripts, "\n")

	prompt := fmt.Sprintf(`### System:
You are a senior clinical documentation specialist. Your task is to extract clinical information from the doctor-patient transcript below and format it into a professional SOAP note.

### MANDATORY CONSTRAINTS:
1. **TRANSCRIPT FIDELITY**: Do NOT include any information (age, vitals, ECG, lab values, etc.) unless it is explicitly mentioned in the transcript.
2. **NO PLACEHOLDERS**: If a section (like Objective) has no data in the transcript, write "Not verbalized" or "Not discussed". Do NOT invent "normal" values.
3. **NO CHATTER**: Do not explain your process. Do not ask for more info. Do not use emojis. Output ONLY the SOAP note.
4. **DIRECT OUTPUT**: Start your response directly with "# SOAP Note".

### TRANSCRIPT:
%s

### Generated SOAP Note (Markdown):
# SOAP Note`, fullTranscript)

	soap, err := s.tritonClient.InferLLM(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to call LLM for SOAP generation: %w", err)
	}

	// Clean up output to prevent repetition and hallucinations
	soap = s.cleanOutput(soap)

	// Ensure the output starts with the header if the LLM omitted it due to our prompt ending
	if !strings.HasPrefix(strings.TrimSpace(soap), "# SOAP Note") {
		soap = "# SOAP Note\n" + soap
	}

	return &SynthesizerOutput{SOAPNote: soap}, nil
}

func (s *SynthesizerAgent) cleanOutput(soap string) string {
	// Truncate at common hallucination delimiters
	delimiters := []string{
		"---",
		"#### Explanation",
		"Explanation of Output",
		"### Provided Transcript",
		"### TRANSCRIPT",
		"Generated SOAP Note",
		"Note:",
	}

	for _, delim := range delimiters {
		if idx := strings.Index(soap, delim); idx != -1 {
			soap = soap[:idx]
		}
	}

	return strings.TrimSpace(soap)
}

func (s *SynthesizerAgent) Run(ctx context.Context, input *SynthesizerInput) (*SynthesizerOutput, error) {
	return s.chain.Invoke(ctx, input)
}
