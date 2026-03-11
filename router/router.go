package router

import (
	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/pkg/kafka"
	"github.com/peterouob/doctor-backend/pkg/middleware"
	"github.com/peterouob/doctor-backend/services"
	"github.com/peterouob/doctor-backend/services/asr"
	"github.com/peterouob/doctor-backend/services/doctor"
)

func InitRouter(r *gin.Engine) {
	producer, _ := kafka.InitSaramaProducer([]string{"192.168.0.100:9092"})
	grpcClient, _ := asr.NewTritonClient("192.168.0.100:8001")
	r.StaticFile("/", "./index.html")
	r.GET("/ws", asr.WSHandleStream(producer, grpcClient))
	r.POST("/register", services.Register)
	r.Use(middleware.Cors())
	d := r.Group("/doctor")
	{
		d.POST("/register", doctor.RegisterDoctor)
		d.POST("/login", doctor.Login)
	}
	dmain := d.Group("/main")
	dmain.Use(middleware.AuthByJWT())
	{
		dmain.POST("/test", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "ok",
			})
		})
	}
}
