package models

import "time"

type AppConfig struct {
	ConfigKey   string    `gorm:"column:config_key;primaryKey;size:128"`
	ConfigValue string    `gorm:"column:config_value;type:text;not null"`
	Description string    `gorm:"column:description;type:text"`
	Public      bool      `gorm:"column:public;not null;default:false"`
	UpdatedAt   time.Time `gorm:"column:updated_at;not null"`
}

func (AppConfig) TableName() string {
	return "app_configs"
}
