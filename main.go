package main

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/database/cache"
	"github.com/peterouob/doctor-backend/database/db"
	"github.com/peterouob/doctor-backend/pkg/kafka"
	"github.com/peterouob/doctor-backend/router"
	"github.com/peterouob/doctor-backend/services/agent"
	"github.com/peterouob/doctor-backend/services/agent/orchestrator"
	"github.com/peterouob/doctor-backend/services/agent/scribe"
	"github.com/peterouob/doctor-backend/services/agent/synthesizer"
	"github.com/peterouob/doctor-backend/services/asr"
	"github.com/peterouob/doctor-backend/services/patient"
)

func main() {
	db.ConnMysql()
	cache.ConnRedis()

	// Initialize mock data
	patient.InitMockPatients()

	tritonAddr := "localhost:8001"
	tritonClient, err := asr.NewTritonClient(tritonAddr)
	if err != nil {
		panic(err)
	}

	kafkaBrokers := []string{"localhost:9092"}
	producer, err := kafka.InitSaramaProducer(kafkaBrokers)
	if err != nil {
		panic(err)
	}

	scribeAgent := scribe.NewScribeAgent(tritonClient)
	scribeConsumer, err := scribe.NewScribeConsumer(scribeAgent, kafkaBrokers)
	if err != nil {
		panic(err)
	}
	go scribeConsumer.Start(context.Background(), "medical-asr-events")

	synthesizerAgent := synthesizer.NewSynthesizerAgent(tritonClient)

	taskAgent := orchestrator.NewTaskAgent(tritonClient)
	taskOrchestrator := orchestrator.NewOrchestrator(taskAgent)

	agentHandler := agent.NewAgentHandler(synthesizerAgent, taskAgent, taskOrchestrator)

	r := gin.Default()
	router.InitRouter(r, producer, tritonClient, agentHandler)

	r.Run(":8081")
}
