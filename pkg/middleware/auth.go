package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/peterouob/doctor-backend/pkg/verify"
)

func Cors() func(c *gin.Context) {
	return func(c *gin.Context) {
		method := c.Request.Method
		c.Header("Access-Control-Allow-Origin", c.GetHeader("Origin"))
		c.Header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Token")
		c.Header("Access-Control-Expose-Headers", "Access-Control-Allow-Headers, Token")
		c.Header("Access-Control-Allow-Credentials", "true")
		if method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}

}

func AuthByJWT() func(c *gin.Context) {
	return func(c *gin.Context) {
		authHeader := c.Request.Header.Get("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code": "-1",
				"msg:": "not have auth header",
			})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code": -1,
				"msg":  "Format of Authorization is wrong",
			})
			c.Abort()
			return
		}

		token := verify.TokenVerify(parts[1])
		if token == nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code": -1,
				"msg":  "Invalid or expired token",
			})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("userId", claims["userId"])
			c.Set("accessId", claims["access_id"])
		}

		c.Next()
	}
}
