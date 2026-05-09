package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lestrrat-go/jwx/v2/jwk"

	"github.com/supremelosclaws/clawworkshop/backend/internal/config"
)

type TokenValidator struct {
	enabled    bool
	baseURL    string
	jwksURL    string
	cookieName string
	cacheTTL   time.Duration
	client     *http.Client

	mu        sync.RWMutex
	cachedSet jwk.Set
	fetchedAt time.Time
}

func NewTokenValidator(cfg config.AuthConfig) *TokenValidator {
	return &TokenValidator{
		enabled:    cfg.Enabled,
		baseURL:    strings.TrimRight(cfg.BaseURL, "/"),
		jwksURL:    cfg.JWKSURL,
		cookieName: cfg.CookieName,
		cacheTTL:   cfg.JWKSCacheTTL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (v *TokenValidator) Enabled() bool {
	return v != nil && v.enabled
}

func (v *TokenValidator) CookieName() string {
	if v == nil || v.cookieName == "" {
		return "lc_access"
	}

	return v.cookieName
}

func (v *TokenValidator) ValidateSession(ctx context.Context, cookieHeader string) (*Actor, []string, error) {
	if strings.TrimSpace(cookieHeader) == "" {
		return nil, nil, ErrTokenMissing
	}
	if !v.Enabled() {
		return nil, nil, ErrAuthDisabled
	}
	if v.baseURL == "" {
		return nil, nil, ErrUnauthorized
	}

	actor, err := v.fetchSessionActor(ctx, cookieHeader)
	if err == nil {
		return actor, nil, nil
	}
	if !errors.Is(err, ErrUnauthorized) {
		return nil, nil, err
	}

	refreshedCookieHeader, setCookieHeaders, err := v.refreshSession(ctx, cookieHeader)
	if err != nil {
		return nil, nil, err
	}

	actor, err = v.fetchSessionActor(ctx, refreshedCookieHeader)
	if err != nil {
		return nil, nil, err
	}

	return actor, setCookieHeaders, nil
}

func (v *TokenValidator) ValidateToken(ctx context.Context, raw string, source string) (*Actor, error) {
	if raw == "" {
		return nil, ErrTokenMissing
	}
	if !v.Enabled() {
		return nil, ErrAuthDisabled
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (interface{}, error) {
		return v.lookupKey(ctx, token)
	}, jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUnauthorized, err)
	}
	if !token.Valid {
		return nil, ErrUnauthorized
	}

	return claims.ToActor(source), nil
}

func (v *TokenValidator) fetchSessionActor(ctx context.Context, cookieHeader string) (*Actor, error) {
	body, _, err := v.doSessionRequest(ctx, http.MethodGet, "/auth/v1/humans/me", cookieHeader)
	if err != nil {
		return nil, err
	}

	actor, err := decodeSessionActor(body)
	if err != nil {
		return nil, err
	}

	return actor, nil
}

func (v *TokenValidator) refreshSession(ctx context.Context, cookieHeader string) (string, []string, error) {
	_, response, err := v.doSessionRequest(ctx, http.MethodPost, "/auth/v1/token/refresh", cookieHeader)
	if err != nil {
		return "", nil, err
	}

	setCookieHeaders := response.Header.Values("Set-Cookie")
	return mergeCookieHeaders(cookieHeader, response.Cookies()), setCookieHeaders, nil
}

func (v *TokenValidator) doSessionRequest(ctx context.Context, method string, requestPath string, cookieHeader string) ([]byte, *http.Response, error) {
	endpoint, err := url.JoinPath(v.baseURL, requestPath)
	if err != nil {
		return nil, nil, fmt.Errorf("build auth request url: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, endpoint, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("build auth request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Cookie", cookieHeader)

	response, err := v.client.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("auth request %s %s: %w", method, requestPath, err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("read auth response %s %s: %w", method, requestPath, err)
	}

	if response.StatusCode == http.StatusUnauthorized {
		return nil, nil, ErrUnauthorized
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return nil, nil, fmt.Errorf("auth request %s %s returned %d", method, requestPath, response.StatusCode)
	}

	return body, response, nil
}

type sessionActorEnvelope struct {
	Data sessionActorPayload `json:"data"`
}

type sessionActorPayload struct {
	ID                string   `json:"id"`
	Subject           string   `json:"sub"`
	SubjectType       string   `json:"subjectType"`
	SubjectTypeLegacy string   `json:"subject_type"`
	Name              string   `json:"name"`
	PreferredUsername string   `json:"preferred_username"`
	Email             string   `json:"email"`
	Roles             []string `json:"roles"`
}

func decodeSessionActor(body []byte) (*Actor, error) {
	var direct sessionActorPayload
	if err := json.Unmarshal(body, &direct); err != nil {
		return nil, fmt.Errorf("decode auth session actor: %w", err)
	}
	if actor := direct.toActor(); actor != nil {
		return actor, nil
	}

	var envelope sessionActorEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("decode auth session actor envelope: %w", err)
	}
	if actor := envelope.Data.toActor(); actor != nil {
		return actor, nil
	}

	return nil, fmt.Errorf("auth session actor payload missing id")
}

func (p sessionActorPayload) toActor() *Actor {
	id := strings.TrimSpace(firstNonEmpty(p.ID, p.Subject))
	if id == "" {
		return nil
	}

	subjectType := strings.TrimSpace(firstNonEmpty(p.SubjectType, p.SubjectTypeLegacy))
	if subjectType == "" {
		subjectType = string(SubjectTypeHuman)
	}

	name := strings.TrimSpace(firstNonEmpty(p.Name, p.PreferredUsername, p.Email, id))

	return &Actor{
		ID:          id,
		SubjectType: SubjectType(subjectType),
		Name:        name,
		Email:       strings.TrimSpace(p.Email),
		Roles:       p.Roles,
		AuthSource:  "portal_session",
	}
}

func mergeCookieHeaders(original string, cookies []*http.Cookie) string {
	if len(cookies) == 0 {
		return original
	}

	values := make(map[string]string)
	for _, pair := range strings.Split(original, ";") {
		segments := strings.SplitN(strings.TrimSpace(pair), "=", 2)
		if len(segments) != 2 || segments[0] == "" {
			continue
		}
		values[segments[0]] = segments[1]
	}

	for _, cookie := range cookies {
		if cookie == nil || strings.TrimSpace(cookie.Name) == "" {
			continue
		}
		values[cookie.Name] = cookie.Value
	}

	merged := make([]string, 0, len(values))
	for name, value := range values {
		merged = append(merged, name+"="+value)
	}

	return strings.Join(merged, "; ")
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}

	return ""
}

func (v *TokenValidator) lookupKey(ctx context.Context, token *jwt.Token) (interface{}, error) {
	kid, _ := token.Header["kid"].(string)

	set, err := v.keySet(ctx, false)
	if err != nil {
		return nil, err
	}

	key, ok := selectJWK(set, kid)
	if !ok {
		set, err = v.keySet(ctx, true)
		if err != nil {
			return nil, err
		}
		key, ok = selectJWK(set, kid)
		if !ok {
			return nil, fmt.Errorf("jwks key %q not found", kid)
		}
	}

	var rawKey interface{}
	if err := key.Raw(&rawKey); err != nil {
		return nil, fmt.Errorf("extract jwk raw key: %w", err)
	}

	return rawKey, nil
}

func (v *TokenValidator) keySet(ctx context.Context, forceRefresh bool) (jwk.Set, error) {
	v.mu.RLock()
	if !forceRefresh && v.cachedSet != nil && time.Since(v.fetchedAt) < v.cacheTTL {
		defer v.mu.RUnlock()
		return v.cachedSet, nil
	}
	v.mu.RUnlock()

	v.mu.Lock()
	defer v.mu.Unlock()

	if !forceRefresh && v.cachedSet != nil && time.Since(v.fetchedAt) < v.cacheTTL {
		return v.cachedSet, nil
	}

	set, err := jwk.Fetch(ctx, v.jwksURL, jwk.WithHTTPClient(v.client))
	if err != nil {
		return nil, fmt.Errorf("fetch jwks: %w", err)
	}

	v.cachedSet = set
	v.fetchedAt = time.Now()

	return set, nil
}

func selectJWK(set jwk.Set, kid string) (jwk.Key, bool) {
	if kid != "" {
		key, ok := set.LookupKeyID(kid)
		if ok {
			return key, true
		}
	}

	if set.Len() == 1 {
		key, ok := set.Key(0)
		return key, ok
	}

	return nil, false
}
