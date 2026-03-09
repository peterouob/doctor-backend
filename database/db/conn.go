package db

import (
	"fmt"

	registeredModel "github.com/peterouob/doctor-backend/model"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var Db *gorm.DB

func ConnMysql() {
	dbDSN := "root:123456@tcp(localhost:3306)/doctor?charset=utf8mb4&parseTime=True&loc=Local"

	db, err := gorm.Open(mysql.Open(dbDSN), &gorm.Config{})

	if err := db.AutoMigrate(&registeredModel.DoctorModel{},
		&registeredModel.RegisteredModel{},
		&registeredModel.DoctorModel{},
		&registeredModel.Patient{},
		&registeredModel.Record{},
		&registeredModel.Primary{},
		&registeredModel.Schedule{}); err != nil {
		panic(fmt.Errorf("error in db.auto migrate"))
	}

	if err != nil {
		panic(fmt.Errorf("failed to connect database %v\n", err))
	}

	Db = db
}
