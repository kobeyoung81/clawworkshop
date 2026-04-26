package config

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/supremelosclaws/clawworkshop/backend/internal/models"
)

func EnsureBootstrapSchema(db *gorm.DB) error {
	return db.AutoMigrate(&models.AppConfig{})
}

func SeedDefaults(db *gorm.DB, bootstrap Config) error {
	defaults := []models.AppConfig{
		{ConfigKey: "port", ConfigValue: extractPort(bootstrap.HTTP.Address, "8080"), Description: "HTTP server port", Public: false},
		{ConfigKey: "environment", ConfigValue: bootstrap.Environment, Description: "Runtime environment label", Public: true},
		{ConfigKey: "frontend_url", ConfigValue: bootstrap.Public.FrontendURL, Description: "Canonical workshop frontend URL", Public: true},
		{ConfigKey: "allowed_origins", ConfigValue: strings.Join(bootstrap.HTTP.AllowedOrigins, ","), Description: "CORS allowed origins", Public: false},
		{ConfigKey: "auth_enabled", ConfigValue: strconv.FormatBool(bootstrap.Auth.Enabled), Description: "Whether JWT auth middleware is enabled", Public: false},
		{ConfigKey: "auth_jwks_url", ConfigValue: bootstrap.Auth.JWKSURL, Description: "Los Claws JWKS endpoint for JWT validation", Public: true},
		{ConfigKey: "auth_cookie_name", ConfigValue: bootstrap.Auth.CookieName, Description: "Browser auth cookie name", Public: false},
		{ConfigKey: "auth_jwks_cache_ttl", ConfigValue: bootstrap.Auth.JWKSCacheTTL.String(), Description: "JWKS cache TTL", Public: false},
		{ConfigKey: "auth_base_url", ConfigValue: bootstrap.Public.AuthBaseURL, Description: "ClawAuth base URL for browser auth checks", Public: true},
		{ConfigKey: "portal_base_url", ConfigValue: bootstrap.Public.PortalBaseURL, Description: "Los Claws portal URL for cross-links", Public: true},
		{ConfigKey: "artifact_base_url", ConfigValue: bootstrap.Public.ArtifactBaseURL, Description: "Canonical artifact API base URL", Public: true},
		{ConfigKey: "clawworkshop_skill_url", ConfigValue: bootstrap.Public.ClawWorkshopSkillURL, Description: "ClawWorkshop skill URL for agent installation instructions", Public: true},
		{ConfigKey: "max_artifact_bytes", ConfigValue: strconv.FormatInt(bootstrap.HTTP.MaxBodyBytes, 10), Description: "Maximum request body size for inline artifact payloads", Public: false},
	}

	for i := range defaults {
		row := defaults[i]
		var existing models.AppConfig
		if err := db.First(&existing, "config_key = ?", row.ConfigKey).Error; err == nil {
			continue
		}
		if err := db.Create(&row).Error; err != nil {
			return fmt.Errorf("seeding config key %q: %w", row.ConfigKey, err)
		}
	}

	return nil
}

func (cfg *Config) LoadFromDB(db *gorm.DB) error {
	values, err := loadFromDB(db)
	if err != nil {
		return fmt.Errorf("loading config from db: %w", err)
	}

	cfg.Environment = dbGet(values, "environment", cfg.Environment)
	cfg.HTTP.Address = normalizeListenAddress(dbGet(values, "port", extractPort(cfg.HTTP.Address, "8080")), cfg.HTTP.Address)
	cfg.HTTP.AllowedOrigins = parseCSV(dbGet(values, "allowed_origins", strings.Join(cfg.HTTP.AllowedOrigins, ",")), cfg.HTTP.AllowedOrigins)
	cfg.HTTP.MaxBodyBytes = dbGetInt64(values, "max_artifact_bytes", cfg.HTTP.MaxBodyBytes)
	cfg.Auth.Enabled = dbGetBool(values, "auth_enabled", cfg.Auth.Enabled)
	cfg.Auth.JWKSURL = dbGet(values, "auth_jwks_url", cfg.Auth.JWKSURL)
	cfg.Auth.CookieName = dbGet(values, "auth_cookie_name", cfg.Auth.CookieName)
	cfg.Auth.JWKSCacheTTL = dbGetDuration(values, "auth_jwks_cache_ttl", cfg.Auth.JWKSCacheTTL)
	cfg.Public.Environment = cfg.Environment
	cfg.Public.FrontendURL = dbGet(values, "frontend_url", cfg.Public.FrontendURL)
	cfg.Public.AuthJWKSURL = dbGet(values, "auth_jwks_url", cfg.Public.AuthJWKSURL)
	cfg.Public.AuthBaseURL = dbGet(values, "auth_base_url", cfg.Public.AuthBaseURL)
	cfg.Public.PortalBaseURL = dbGet(values, "portal_base_url", cfg.Public.PortalBaseURL)
	cfg.Public.ArtifactBaseURL = dbGet(values, "artifact_base_url", cfg.Public.ArtifactBaseURL)
	cfg.Public.ClawWorkshopSkillURL = dbGet(values, "clawworkshop_skill_url", cfg.Public.ClawWorkshopSkillURL)

	return nil
}

func loadFromDB(db *gorm.DB) (map[string]string, error) {
	var rows []models.AppConfig
	if err := db.Find(&rows).Error; err != nil {
		return nil, err
	}

	values := make(map[string]string, len(rows))
	for _, row := range rows {
		values[row.ConfigKey] = row.ConfigValue
	}

	return values, nil
}

func dbGet(values map[string]string, key string, fallback string) string {
	if value, ok := values[key]; ok && strings.TrimSpace(value) != "" {
		return value
	}

	return fallback
}

func dbGetBool(values map[string]string, key string, fallback bool) bool {
	value, ok := values[key]
	if !ok || strings.TrimSpace(value) == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func dbGetInt64(values map[string]string, key string, fallback int64) int64 {
	value, ok := values[key]
	if !ok || strings.TrimSpace(value) == "" {
		return fallback
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}

	return parsed
}

func dbGetDuration(values map[string]string, key string, fallback time.Duration) time.Duration {
	value, ok := values[key]
	if !ok || strings.TrimSpace(value) == "" {
		return fallback
	}

	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}

	return parsed
}
