package orchestrator

import "github.com/peterouob/doctor-backend/services/agent/model"

var MockTasks = []model.TodoItem{
	{
		ID:       "sim-001",
		Type:     "summarize",
		Priority: 1,
		Detail:   "患者張小明，男，45歲。主訴：持續性咳嗽兩週，伴隨輕微發燒。昨日血液檢查結果：白血球略高，其餘正常。",
		Status:   "pending",
	},
	{
		ID:       "sim-002",
		Type:     "diagnose",
		Priority: 1,
		Detail:   "影像學檢查顯示肺部右下葉有輕微浸潤陰影，痰液培養結果尚未出來。",
		Status:   "pending",
	},
	{
		ID:       "sim-003",
		Type:     "schedule",
		Priority: 2,
		Detail:   "需要為張先生安排一週後的胸部 X 光複檢與門診追蹤。",
		Status:   "pending",
	},
}
