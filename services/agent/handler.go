package agent

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/services/agent/llm"
	"github.com/peterouob/doctor-backend/services/agent/model"
	"github.com/peterouob/doctor-backend/services/agent/orchestrator"
	"github.com/peterouob/doctor-backend/services/agent/synthesizer"
)

type AgentHandler struct {
	synthesizerAgent *synthesizer.SynthesizerAgent
	scribeAgent      *llm.ScribeAgent
	taskAgent        *orchestrator.TaskAgent
	orchestrator     *orchestrator.Orchestrator
}

func NewAgentHandler(synthesizerAgent *synthesizer.SynthesizerAgent, scribeAgent *llm.ScribeAgent, taskAgent *orchestrator.TaskAgent, orchestrator *orchestrator.Orchestrator) *AgentHandler {
	return &AgentHandler{
		synthesizerAgent: synthesizerAgent,
		scribeAgent:      scribeAgent,
		taskAgent:        taskAgent,
		orchestrator:     orchestrator,
	}
}

func (h *AgentHandler) GetScribeAgent() *llm.ScribeAgent {
	return h.scribeAgent
}

func (h *AgentHandler) GetSynthesizerAgent() *synthesizer.SynthesizerAgent {
	return h.synthesizerAgent
}

func (h *AgentHandler) Analyze(c *gin.Context) {
	var input []*model.TodoItem
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	output, err := h.taskAgent.Analyze(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.String(http.StatusOK, output)
}

func (h *AgentHandler) RunAgent(c *gin.Context) {
	var input struct {
		Type    string `json:"type"`
		TodoRef string `json:"todoRef"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	output, err := h.taskAgent.RunSpecificAgent(c.Request.Context(), input.Type, input.TodoRef)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.String(http.StatusOK, output)
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
