package model

type TodoItem struct {
	ID       string `gorm:"primaryKey"`
	Type     string
	Priority int
	Detail   string
	Status   string // pending, done
}

type TodoResult struct {
	Date     string
	DoctorID string
	Items    []*TodoItem
}

type ResearchInput struct {
	Topics   []string
	DoctorID string
}

type ResearchOutput struct {
	Summaries []string
}

type PatientDataInput struct {
	PatientIDs []string
}
