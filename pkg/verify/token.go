package verify

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/peterouob/doctor-backend/pkg/configs"

	"sync/atomic"
	"time"
)

var (
	err      error
	TokenKey atomic.Value
)

type Token struct {
	UserId      int64         `json:"user_id"`
	AccessId    string        `json:"access_id"`
	AccessToken string        `json:"access_token"`
	Token       configs.Token `json:"token"`
}

var tokenKey = "thisistokenkey"

func NewToken(id int64) *Token {
	TokenKey.Store(tokenKey)
	token := &configs.Token{}
	token.AccessUuid = uuid.NewString()
	token.AtExpires = time.Now().Add(time.Hour * 2).Unix()
	return &Token{
		UserId: id,
		Token:  *token,
	}
}

func (t *Token) CreateToken() {
	claims := jwt.MapClaims{
		"access_id": t.Token.AccessUuid,
		"exp":       t.Token.AtExpires,
		"type":      "access",
		"userId":    t.UserId,
		"jti":       t.UserId,
		"iat":       time.Now().Unix(),
	}

	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	t.AccessToken, err = tk.SignedString([]byte(TokenKey.Load().(string)))
	t.AccessId = claims["access_id"].(string)
}

func TokenVerify(tokenString string) (*jwt.Token, error) {
	if TokenKey.Load() == nil {
		TokenKey.Store(tokenKey)
	}
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(TokenKey.Load().(string)), nil
	})

	if err != nil {
		return nil, err
	}

	return token, nil
}
