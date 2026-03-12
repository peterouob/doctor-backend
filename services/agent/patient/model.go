package patient

import (
	"context"

	"github.com/cloudwego/eino/compose"
	"github.com/peterouob/doctor-backend/services/agent/model"
)

type AgentPatient struct {
	AgentChain compose.Runnable[*model.PatientDataInput, string]
	ctx        context.Context
}

func NewAgentPatient(chain compose.Runnable[*model.PatientDataInput, string], ctx context.Context) *AgentPatient {
	return &AgentPatient{
		AgentChain: chain,
		ctx:        ctx,
	}
}
