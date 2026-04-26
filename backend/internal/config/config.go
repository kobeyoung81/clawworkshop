package config

import (
	"fmt"
	"os"
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
	MaxBodyBytes   int64
}

type MySQLConfig struct {
	DSN string
}

type AuthConfig struct {
	Enabled      bool
	JWKSURL      string
	CookieName   string
	JWKSCacheTTL time.Duration
}

type PublicConfig struct {
	AuthJWKSURL          string `json:"authJwksUrl"`
	AuthBaseURL          string `json:"authBaseUrl"`
	PortalBaseURL        string `json:"portalBaseUrl"`
	FrontendURL          string `json:"frontendUrl"`
	ArtifactBaseURL      string `json:"artifactBaseUrl"`
	ClawWorkshopSkillURL string `json:"clawworkshopSkillUrl,omitempty"`
	Environment          string `json:"environment"`
}

func Load() (Config, error) {
	return LoadInitial(), nil
}

func LoadInitial() Config {
	_ = godotenv.Load(".env", "../.env")

	const (
		environment          = "development"
		httpAddress          = ":8080"
		authJWKSURL          = "https://losclaws.com/.well-known/jwks.json"
		authBaseURL          = "https://losclaws.com"
		portalBaseURL        = "https://losclaws.com"
		frontendURL          = "http://localhost:5173"
		clawWorkshopSkillURL = "https://workshop.losclaws.com/skill/SKILL.md"
		maxArtifactBytes     = 8 * 1024 * 1024
	)
	allowedOrigins := []string{"http://localhost:5173", "http://127.0.0.1:5173"}
	artifactBaseURL := fmt.Sprintf("%s/api/v1/artifacts", strings.TrimRight(frontendURL, "/"))

	cfg := Config{
		ServiceName: "clawworkshop-api",
		Environment: environment,
		HTTP: HTTPConfig{
			Address:        httpAddress,
			AllowedOrigins: allowedOrigins,
			MaxBodyBytes:   maxArtifactBytes,
		},
		MySQL: MySQLConfig{
			DSN: getEnv("DB_DSN", ""),
		},
		Auth: AuthConfig{
			Enabled:      true,
			JWKSURL:      authJWKSURL,
			CookieName:   "lc_access",
			JWKSCacheTTL: 15 * time.Minute,
		},
		Public: PublicConfig{
			AuthJWKSURL:          authJWKSURL,
			AuthBaseURL:          authBaseURL,
			PortalBaseURL:        portalBaseURL,
			FrontendURL:          frontendURL,
			ArtifactBaseURL:      artifactBaseURL,
			ClawWorkshopSkillURL: clawWorkshopSkillURL,
			Environment:          environment,
		},
	}

	return cfg
}

func (c MySQLConfig) ConnectionString() string {
	return strings.TrimSpace(c.DSN)
}

func normalizeListenAddress(value string, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	if strings.HasPrefix(value, ":") {
		return value
	}
	return ":" + value
}

func extractPort(address string, fallback string) string {
	address = strings.TrimSpace(address)
	if address == "" {
		return fallback
	}
	return strings.TrimPrefix(address, ":")
}

func getEnv(key string, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && strings.TrimSpace(value) != "" {
		return value
	}

	return fallback
}

func parseCSV(value string, fallback []string) []string {
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
