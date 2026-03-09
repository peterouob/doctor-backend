package services

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/peterouob/doctor-backend/database/cache"
	registeredModel "github.com/peterouob/doctor-backend/model/registered"
)

var luaScript = `
	local slotKey = KEYS[1]
	local patientKey = KEYS[2]
	local reqTime = tonumber(ARGV[1])
	local patient = ARGV[2]

	local targetSlot = nil
	local allSlots = redis.call("HKEYS",slotKey)

	for _, slot in ipairs(allSlots) do
		local start_t,end_t = string.match(slot,"^(%d+):(%d+)$")
		
		if start_t and end_t then
			if reqTime >= tonumber(start_t) and reqTime <= tonumber(end_t) then
				targetSlot = slot
				break
			end
		end
	end

	if not targetSlot then
		return -2	
	end

	if redis.call('HEXISTS', patientKey, patient) == 1 then
		return -1
	end

	local currentCount = redis.call('HGET',slotKey,targetSlot)

	if currentCount == 0 or tonumber(currentCount) <= 0 then
		return 0
	end

	redis.call('HINCRBY', slotKey, targetSlot, -1)
	redis.call('HSET', patientKey, patient, targetSlot)

	return 1
`

func Register(c *gin.Context) {
	var req registeredModel.RegisteredModel
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	today := time.Now().Format("2006-01-02")
	slotKey := fmt.Sprintf("doctor:%s:%s", req.DoctorName, today)
	fmt.Println(slotKey)
	patientKey := fmt.Sprintf("doctor:%s:%s", req.DoctorName, today)

	result, err := cache.Rdb.Eval(context.Background(), luaScript, []string{slotKey, patientKey}, req.Time, req.Name).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	status := result.(int64)
	switch status {
	case -2:
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "doctor not time"})
		return
	case -1:
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "already registered"})
		return
	case 0:
		c.JSON(http.StatusInternalServerError, gin.H{"msg": "full in the time"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"msg":  "success",
		"data": slotKey,
	})
}
