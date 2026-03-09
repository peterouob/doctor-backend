package doctor

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/database/db"
	"github.com/peterouob/doctor-backend/model"
	"github.com/peterouob/doctor-backend/pkg/verify"
)

type loginReq struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

func Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var doctor model.DoctorModel
	if err := db.Db.Where("name = ?", req.Name).First(&doctor).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if doctor.Password != req.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "wrong password"})
		return
	}

	token := verify.NewToken(int64(doctor.ID))
	token.CreateToken()
	c.JSON(http.StatusOK, gin.H{
		"message": "登入成功",
		"doctor":  doctor,
		"token":   token.AccessToken,
	})
}
