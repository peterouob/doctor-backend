package orchestrator

import (
	"context"
	"fmt"
	"strings"

	"github.com/peterouob/doctor-backend/database/db"
	"github.com/peterouob/doctor-backend/services/agent/model"
	"github.com/peterouob/doctor-backend/services/asr"
	"gorm.io/gorm"
)

type TaskAgent struct {
	tritonClient *asr.TritonClient
	db           *gorm.DB
}

func NewTaskAgent(tritonClient *asr.TritonClient) *TaskAgent {
	return &TaskAgent{
		tritonClient: tritonClient,
		db:           db.Db,
	}
}

func (a *TaskAgent) FetchPendingTodos(ctx context.Context, _ any) ([]*model.TodoItem, error) {
	var items []*model.TodoItem
	if err := a.db.WithContext(ctx).Where("status = ?", "pending").Find(&items).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch pending todos: %w", err)
	}

	items = appendMockData(items)

	return items, nil
}

func (a *TaskAgent) Analyze(ctx context.Context, todos []*model.TodoItem) (string, error) {
	if a.tritonClient == nil {
		return "[]", nil
	}

	var sb strings.Builder
	for i, t := range todos {
		sb.WriteString(fmt.Sprintf("%d. [Priority:%d][Type:%s] %s\n", i+1, t.Priority, t.Type, t.Detail))
	}

	prompt := fmt.Sprintf(`### System:
You are a medical workflow router. Given a list of doctor's TODO items, assign each to the most appropriate specialist agent.

### AGENT TYPES:
- "summarize"  : Summarise patient notes or lab results
- "diagnose"   : Differential diagnosis assistance
- "schedule"   : Appointment or follow-up scheduling
- "followup"   : Patient follow-up action items

### CONSTRAINTS:
- Respond ONLY with a valid JSON array. 
- No markdown code blocks. 
- No conversation. 
- Each element must be: {"type": string, "label": string, "todoRef": string, "priority": number}

### TODOs:
%s

### JSON Output:
[`, sb.String())

	res, err := a.tritonClient.InferLLM(ctx, prompt)
	if err != nil {
		return "[]", err
	}

	// Ensure the result starts with [ if the LLM omitted it due to our prompt ending
	if !strings.HasPrefix(strings.TrimSpace(res), "[") {
		res = "[" + res
	}
	return res, nil
}

func (a *TaskAgent) RunSpecificAgent(ctx context.Context, agentType string, todoRef string) (string, error) {
	if a.tritonClient == nil {
		return "Default agent result.", nil
	}

	prompts := map[string]string{
		"summarize": "Summarise the following medical note in 3–4 concise bullet points for the attending physician.",
		"diagnose":  "Provide a brief differential diagnosis (top 3) and suggested next steps based on this clinical note.",
		"schedule":  "Draft a scheduling action plan with suggested timeframes for the following task.",
		"followup":  "List concrete follow-up action items with priority levels (High/Medium/Low) for the following task.",
	}

	basePrompt := prompts[agentType]
	if basePrompt == "" {
		basePrompt = prompts["followup"]
	}

	prompt := fmt.Sprintf(`You are a specialist medical AI agent. Be concise and clinically precise. Use plain markdown.

%s

Task: %s`, basePrompt, todoRef)

	return a.tritonClient.InferLLM(ctx, prompt)
}

func (a *TaskAgent) UpdateTodoStatus(ctx context.Context, id string, status string) error {
	return a.db.WithContext(ctx).Model(&model.TodoItem{}).Where("id = ?", id).Update("status", status).Error
}

func (a *TaskAgent) Summarize(ctx context.Context, item *model.TodoItem) (string, error) {
	if a.tritonClient == nil {
		_ = a.UpdateTodoStatus(ctx, item.ID, "done")
		return "已為您摘要：患者症狀輕微，建議觀察一週。", nil
	}
	if strings.TrimSpace(item.Detail) == "" {
		return "No content to summarize.", nil
	}
	prompt := fmt.Sprintf(`Summarize this medical note in 3-4 bullet points. No hallucination. No conversation.

Note:
%s

Summary:`, item.Detail)
	res, err := a.tritonClient.InferLLM(ctx, prompt)
	if err == nil {
		_ = a.UpdateTodoStatus(ctx, item.ID, "done")
	}
	return res, err
}

func (a *TaskAgent) Diagnose(ctx context.Context, item *model.TodoItem) (string, error) {
	if a.tritonClient == nil {
		_ = a.UpdateTodoStatus(ctx, item.ID, "done")
		return "初步建議：可能為上呼吸道感染，需等待培養結果。", nil
	}
	if strings.TrimSpace(item.Detail) == "" {
		return "No content to diagnose.", nil
	}
	prompt := fmt.Sprintf(`Provide top 3 differential diagnoses and next steps. No hallucination. No conversation.

Note:
%s

Diagnosis:`, item.Detail)
	res, err := a.tritonClient.InferLLM(ctx, prompt)
	if err == nil {
		_ = a.UpdateTodoStatus(ctx, item.ID, "done")
	}
	return res, err
}

func (a *TaskAgent) Schedule(ctx context.Context, item *model.TodoItem) (string, error) {
	if a.tritonClient == nil {
		_ = a.UpdateTodoStatus(ctx, item.ID, "done")
		return "排程建議：已將一週後 X 光預約掛號至門診清單。", nil
	}
	if strings.TrimSpace(item.Detail) == "" {
		return "No content to schedule.", nil
	}
	prompt := fmt.Sprintf(`Draft a scheduling plan based on this task. No hallucination. No conversation.

Note:
%s

Plan:`, item.Detail)
	res, err := a.tritonClient.InferLLM(ctx, prompt)
	if err == nil {
		_ = a.UpdateTodoStatus(ctx, item.ID, "done")
	}
	return res, err
}

func (a *TaskAgent) Followup(ctx context.Context, item *model.TodoItem) (string, error) {
	if a.tritonClient == nil {
		_ = a.UpdateTodoStatus(ctx, item.ID, "done")
		return "追蹤清單：已建立張先生的電話回訪排程 (High Priority)。", nil
	}
	if strings.TrimSpace(item.Detail) == "" {
		return "No content for follow-up.", nil
	}
	prompt := fmt.Sprintf(`List concrete follow-up items with priority (High/Med/Low). No hallucination. No conversation.

Note:
%s

Follow-up:`, item.Detail)
	res, err := a.tritonClient.InferLLM(ctx, prompt)
	if err == nil {
		_ = a.UpdateTodoStatus(ctx, item.ID, "done")
	}
	return res, err
}

func appendMockData(items []*model.TodoItem) []*model.TodoItem {
	if items == nil || len(items) == 0 {
		for i := range MockTasks {
			items = append(items, &MockTasks[i])
		}
	}
	return items
}
