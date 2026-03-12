package patient

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/database/db"
	"github.com/peterouob/doctor-backend/model"
)

func InitMockPatients() {
	var count int64
	db.Db.Model(&model.Patient{}).Count(&count)
	if count > 0 {
		return
	}

	patients := []model.Patient{
		{
			Name:       "陳大文",
			Age:        45,
			Gender:     "男",
			History:    "高血壓病史 5 年，定期服用 Amlodipine。對 Penicillin 過敏。",
			Highlights: "高血壓 (HTN),藥物過敏: Penicillin",
			LastTime:   time.Now().Add(-24 * time.Hour),
			LastDoctor: "張醫師",
		},
		{
			Name:       "李小華",
			Age:        28,
			Gender:     "女",
			History:    "",
			Highlights: "",
			LastTime:   time.Now().Add(-48 * time.Hour),
			LastDoctor: "李醫師",
		},
		{
			Name:       "張老先生",
			Age:        72,
			Gender:     "男",
			History:    "2023 年曾接受過白內障手術。慢性支氣管炎長期隨訪。",
			Highlights: "慢性支氣管炎,手術史: 白內障 (2023)",
			LastTime:   time.Now().Add(-72 * time.Hour),
			LastDoctor: "王醫師",
		},
	}

	for _, p := range patients {
		db.Db.Create(&p)
	}
}

func GetPatients(c *gin.Context) {
	var patients []model.Patient
	if err := db.Db.Find(&patients).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch patients"})
		return
	}

	// Format highlights for frontend
	type patientResp struct {
		ID         uint     `json:"id"`
		Name       string   `json:"name"`
		Age        int      `json:"age"`
		Gender     string   `json:"gender"`
		History    string   `json:"history"`
		Highlights []string `json:"highlights"`
	}

	resp := make([]patientResp, len(patients))
	for i, p := range patients {
		highlights := []string{}
		if p.Highlights != "" {
			highlights = strings.Split(p.Highlights, ",")
		}
		resp[i] = patientResp{
			ID:         p.ID,
			Name:       p.Name,
			Age:        p.Age,
			Gender:     p.Gender,
			History:    p.History,
			Highlights: highlights,
		}
	}

	c.JSON(http.StatusOK, resp)
}

func SaveConsultation(c *gin.Context) {
	var req struct {
		PatientID  uint   `json:"patient_id"`
		Doctor     string `json:"doctor"`
		Transcript string `json:"transcript"`
		SOAP       string `json:"soap"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	record := model.Record{
		PatientID:  req.PatientID,
		Doctor:     req.Doctor,
		Transcript: req.Transcript,
		SOAP:       req.SOAP,
	}

	if err := db.Db.Create(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save record"})
		return
	}

	// Update patient last visit
	db.Db.Model(&model.Patient{}).Where("id = ?", req.PatientID).Updates(map[string]interface{}{
		"last_time":   time.Now(),
		"last_doctor": req.Doctor,
	})

	c.JSON(http.StatusOK, gin.H{"message": "record saved successfully", "id": record.ID})
}
