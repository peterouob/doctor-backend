package router

import (
	"github.com/IBM/sarama"
	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/pkg/middleware"
	"github.com/peterouob/doctor-backend/services"
	"github.com/peterouob/doctor-backend/services/agent"
	"github.com/peterouob/doctor-backend/services/asr"
	"github.com/peterouob/doctor-backend/services/doctor"
)

func InitRouter(r *gin.Engine, producer sarama.AsyncProducer, tritonClient *asr.TritonClient, agentHandler *agent.AgentHandler) {
	r.Use(middleware.Cors())
	r.StaticFile("/", "./index.html")

	r.GET("/ws", asr.WSHandleStream(producer, tritonClient))

	r.POST("/register", services.Register)

	doctorGroup := r.Group("/doctor")
	{
		doctorGroup.POST("/register", doctor.RegisterDoctor)
		doctorGroup.POST("/login", doctor.Login)
	}

	mainGroup := r.Group("/main")
	mainGroup.Use(middleware.AuthByJWT())
	{
		mainGroup.POST("/test", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "ok"})
		})
		mainGroup.POST("/synthesize", agentHandler.Synthesize)
		mainGroup.POST("/process-todos", agentHandler.ProcessTodos)
	}
}
