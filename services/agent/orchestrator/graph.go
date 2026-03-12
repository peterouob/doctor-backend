package orchestrator

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/compose"
	"github.com/peterouob/doctor-backend/services/agent/model"
)

type Orchestrator struct {
	singleGraph compose.Runnable[*model.TodoItem, string]
	batchGraph  compose.Runnable[any, *OrchestratorOutput]
}

type OrchestratorOutput struct {
	Items   []*model.TodoItem `json:"items"`
	Results []string          `json:"results"`
}

func NewOrchestrator(taskAgent *TaskAgent) *Orchestrator {
	// 1. Create the single-item graph
	sg := compose.NewGraph[*model.TodoItem, string]()

	sg.AddLambdaNode("summarize", compose.InvokableLambda(taskAgent.Summarize))
	sg.AddLambdaNode("diagnose", compose.InvokableLambda(taskAgent.Diagnose))
	sg.AddLambdaNode("schedule", compose.InvokableLambda(taskAgent.Schedule))
	sg.AddLambdaNode("followup", compose.InvokableLambda(taskAgent.Followup))
	sg.AddLambdaNode("default", compose.InvokableLambda(func(ctx context.Context, input *model.TodoItem) (string, error) {
		return "Unknown task type: " + input.Type, nil
	}))

	condition := func(ctx context.Context, input *model.TodoItem) (string, error) {
		switch input.Type {
		case "summarize", "diagnose", "schedule", "followup":
			return input.Type, nil
		default:
			return "default", nil
		}
	}

	sg.AddBranch(compose.START, compose.NewGraphBranch(condition, map[string]bool{
		"summarize": true,
		"diagnose":  true,
		"schedule":  true,
		"followup":  true,
		"default":   true,
	}))

	sg.AddEdge("summarize", compose.END)
	sg.AddEdge("diagnose", compose.END)
	sg.AddEdge("schedule", compose.END)
	sg.AddEdge("followup", compose.END)
	sg.AddEdge("default", compose.END)

	singleRunnable, err := sg.Compile(context.Background())
	if err != nil {
		panic(fmt.Errorf("failed to compile single orchestrator graph: %w", err))
	}

	// 2. Create the batch graph using the single runnable
	bg := compose.NewGraph[any, *OrchestratorOutput]()

	// Fetch node
	bg.AddLambdaNode("fetch", compose.InvokableLambda(taskAgent.FetchPendingTodos))

	// Batch execution node (wrap singleRunnable)
	bg.AddLambdaNode("execute_batch", compose.InvokableLambda(func(ctx context.Context, input []*model.TodoItem) (*OrchestratorOutput, error) {
		results := make([]string, len(input))
		for i, item := range input {
			res, err := singleRunnable.Invoke(ctx, item)
			if err != nil {
				return nil, err
			}
			results[i] = res
		}
		return &OrchestratorOutput{
			Items:   input,
			Results: results,
		}, nil
	}))

	// Connect
	bg.AddEdge(compose.START, "fetch")
	bg.AddEdge("fetch", "execute_batch")
	bg.AddEdge("execute_batch", compose.END)

	batchRunnable, err := bg.Compile(context.Background())
	if err != nil {
		panic(fmt.Errorf("failed to compile batch orchestrator graph: %w", err))
	}

	return &Orchestrator{
		singleGraph: singleRunnable,
		batchGraph:  batchRunnable,
	}
}

func (o *Orchestrator) Execute(ctx context.Context, item *model.TodoItem) (string, error) {
	return o.singleGraph.Invoke(ctx, item)
}

func (o *Orchestrator) ExecutePending(ctx context.Context) (*OrchestratorOutput, error) {
	return o.batchGraph.Invoke(ctx, nil)
}
