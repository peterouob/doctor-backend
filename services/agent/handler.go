package agent

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/services/agent/orchestrator"
	"github.com/peterouob/doctor-backend/services/agent/synthesizer"
)

type AgentHandler struct {
	synthesizerAgent *synthesizer.SynthesizerAgent
	orchestrator     *orchestrator.Orchestrator
}

func NewAgentHandler(synthesizerAgent *synthesizer.SynthesizerAgent, orchestrator *orchestrator.Orchestrator) *AgentHandler {
	return &AgentHandler{
		synthesizerAgent: synthesizerAgent,
		orchestrator:     orchestrator,
	}
}

func (h *AgentHandler) ProcessTodos(c *gin.Context) {
	output, err := h.orchestrator.ExecutePending(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, output)
}

func (h *AgentHandler) Synthesize(c *gin.Context) {
	var input synthesizer.SynthesizerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	output, err := h.synthesizerAgent.Run(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, output)
}
