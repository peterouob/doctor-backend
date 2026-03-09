package router

import (
	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/services"
)

func InitRouter(r *gin.Engine) {
	r.POST("/register", services.Register)
}
