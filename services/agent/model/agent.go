package model

import (
	"context"
	"time"
)

type AgentInput struct {
	DoctorId string `json:"doctor_id"`
}

// BaseAgent TODO: use period to controller the task which need to do first
type BaseAgent interface {
	Name() string
	//Period() int
}

type StreamAgent interface {
	BaseAgent
	RunStream(ctx context.Context, input *AgentInput) <-chan StreamOutput
}

type StreamOutput struct {
	DoctorID string
	Source   string
	Content  string
	Err      error
	Duration time.Duration
}

// RoutableAgent to distribution the agent task from top to down
type RoutableAgent interface {
	StreamAgent
	RouteKey() string
}

type OrchestratorAgent interface {
	StreamAgent
	Register(agent RoutableAgent)
}

// AgentRegister TODO:the version which use now ignore the though of race condition
type AgentRegister struct {
	agents map[string]RoutableAgent
}

func NewAgentRegister() *AgentRegister {
	return &AgentRegister{
		agents: make(map[string]RoutableAgent),
	}
}

func (a *AgentRegister) Register(agent RoutableAgent) {
	a.agents[agent.RouteKey()] = agent
}

func (a *AgentRegister) FindAgent(agentKey string) RoutableAgent {
	routableAgent, ok := a.agents[agentKey]
	if ok {
		return routableAgent
	}
	return nil
}
