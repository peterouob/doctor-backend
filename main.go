package main

import (
	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/database/cache"
	"github.com/peterouob/doctor-backend/database/db"
	"github.com/peterouob/doctor-backend/router"
)

func main() {
	go func() {
		db.ConnMysql()
		cache.ConnRedis()
	}()

	r := gin.Default()
	router.InitRouter(r)
	r.Run(":8081")
}
