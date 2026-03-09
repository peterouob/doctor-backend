package doctor

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/database/db"
	"github.com/peterouob/doctor-backend/model"
)

func RegisterDoctor(c *gin.Context) {
	var req model.DoctorModel

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON 格式錯誤: " + err.Error()})
		return
	}

	if err := db.Db.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "資料庫寫入失敗: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "醫生註冊成功",
		"data":    req,
	})
}
