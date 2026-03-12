package model

import (
	"time"

	"gorm.io/gorm"
)

type RegisteredModel struct {
	gorm.Model
	Name       string `json:"name" gorm:"index"`
	Time       int    `json:"time"`
	DoctorName string `json:"dname"`
}

type DoctorModel struct {
	ID        uint       `json:"id" gorm:"primarykey"`
	Name      string     `json:"name"`
	Password  string     `json:"password"`
	Primaries []Primary  `gorm:"foreignKey:DoctorID"`
	Times     []Schedule `gorm:"foreignKey:DoctorID"`
}

type Primary struct {
	ID       uint   `json:"-" gorm:"primarykey"`
	DoctorID uint   `json:"-"`
	Skill    string `json:"skill"`
}

type Schedule struct {
	ID       uint      `json:"-" gorm:"primarykey"`
	DoctorID uint      `json:"-"`
	Time     time.Time `json:"time"`
}

type Patient struct {
	gorm.Model
	Name       string    `json:"name" gorm:"index:idx_name"`
	Age        int       `json:"age"`
	Gender     string    `json:"gender"`
	History    string    `json:"history"`
	Highlights string    `json:"highlights"` // Store as comma separated or JSON string
	LastTime   time.Time `json:"last_time"`
	LastDoctor string    `json:"last_doctor"`
	Records    []Record  `json:"records" gorm:"foreignKey:PatientID"`
}

type Record struct {
	gorm.Model
	PatientID  uint   `json:"patient_id" gorm:"index"`
	Doctor     string `json:"doctor"`
	Transcript string `json:"transcript" gorm:"type:text"`
	SOAP       string `json:"soap" gorm:"type:text"`
	Diagnosis  string `json:"diagnosis"`
}
