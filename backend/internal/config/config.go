package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	ServiceName string
	Environment string
	HTTP        HTTPConfig
	MySQL       MySQLConfig
	Auth        AuthConfig
	Public      PublicConfig
}

type HTTPConfig struct {
	Address        string
	AllowedOrigins []string
}

type MySQLConfig struct {
	DSN      string
	Host     string
	Port     int
	Database string
	User     string
	Password string
	Params   string
	Required bool
}

type AuthConfig struct {
	Enabled      bool
	JWKSURL      string
	CookieName   string
	JWKSCacheTTL time.Duration
}

type PublicConfig struct {
	AuthJWKSURL     string `json:"authJwksUrl"`
	AuthBaseURL     string `json:"authBaseUrl"`
	PortalBaseURL   string `json:"portalBaseUrl"`
	FrontendURL     string `json:"frontendUrl"`
	ArtifactBaseURL string `json:"artifactBaseUrl"`
	Environment     string `json:"environment"`
}

func Load() (Config, error) {
	_ = godotenv.Load(".env", "../.env")

	cfg := Config{
		ServiceName: "clawworkshop-api",
		Environment: getEnv("CW_ENV", "development"),
		HTTP: HTTPConfig{
			Address:        getEnv("CW_HTTP_ADDR", ":8080"),
			AllowedOrigins: getCSVEnv("CW_ALLOWED_ORIGINS", []string{"http://localhost:5173", "http://127.0.0.1:5173"}),
		},
		MySQL: MySQLConfig{
			DSN:      os.Getenv("CW_MYSQL_DSN"),
			Host:     getEnv("CW_MYSQL_HOST", "127.0.0.1"),
			Port:     getIntEnv("CW_MYSQL_PORT", 3306),
			Database: getEnv("CW_MYSQL_DATABASE", "clawworkshop"),
			User:     getEnv("CW_MYSQL_USER", "clawworkshop"),
			Password: getEnv("CW_MYSQL_PASSWORD", "clawworkshop"),
			Params:   getEnv("CW_MYSQL_PARAMS", "charset=utf8mb4&parseTime=true&loc=UTC&multiStatements=true"),
			Required: getBoolEnv("CW_MYSQL_REQUIRED", false),
		},
		Auth: AuthConfig{
			Enabled:      getBoolEnv("CW_AUTH_ENABLED", true),
			JWKSURL:      getEnv("CW_AUTH_JWKS_URL", "https://losclaws.com/.well-known/jwks.json"),
			CookieName:   getEnv("CW_AUTH_COOKIE_NAME", "lc_access"),
			JWKSCacheTTL: getDurationEnv("CW_AUTH_JWKS_CACHE_TTL", 15*time.Minute),
		},
		Public: PublicConfig{
			AuthJWKSURL:     getEnv("CW_AUTH_JWKS_URL", "https://losclaws.com/.well-known/jwks.json"),
			AuthBaseURL:     getEnv("CW_AUTH_BASE_URL", "https://losclaws.com/auth"),
			PortalBaseURL:   getEnv("CW_PORTAL_BASE_URL", "https://losclaws.com"),
			FrontendURL:     getEnv("CW_FRONTEND_URL", "http://localhost:5173"),
			ArtifactBaseURL: getEnv("CW_ARTIFACT_BASE_URL", "http://localhost:8080/api/v1/artifacts"),
			Environment:     getEnv("CW_ENV", "development"),
		},
	}

	return cfg, nil
}

func (c MySQLConfig) ConnectionString() string {
	if c.DSN != "" {
		return c.DSN
	}

	if c.Host == "" || c.Database == "" || c.User == "" {
		return ""
	}

	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?%s", c.User, c.Password, c.Host, c.Port, c.Database, c.Params)
}

func getEnv(key string, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && strings.TrimSpace(value) != "" {
		return value
	}

	return fallback
}

func getIntEnv(key string, fallback int) int {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getBoolEnv(key string, fallback bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getCSVEnv(key string, fallback []string) []string {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		return fallback
	}

	parts := strings.Split(value, ",")
	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			filtered = append(filtered, trimmed)
		}
	}

	if len(filtered) == 0 {
		return fallback
	}

	return filtered
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	value, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(value) == "" {
		return fallback
	}

	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}

	return parsed
}
